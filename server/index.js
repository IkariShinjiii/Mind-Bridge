import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { scoreSurvey, SURVEY_QUESTIONS } from "./scoring.js";
import {
  hashPassword,
  comparePassword,
  signToken,
  requireAuth,
  requireRole,
  requireVerified,
  requireApproved,
} from "./auth.js";
import { generateToken, expiresInHours, isExpired } from "./tokens.js";
import { sendMail } from "./mailer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "data.json");
// Used to build links in dev-mode emails. Set APP_URL in production.
const APP_URL = process.env.APP_URL || "http://localhost:5173";

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { users: [], responses: [], appointments: [], availability: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function publicUser(u) {
  const { password, verifyToken, verifyTokenExpires, resetToken, resetTokenExpires, ...rest } = u;
  return rest;
}

const app = express();
app.use(cors());
app.use(express.json());

// Runs after requireAuth. Loads the full DB record (JWT payload only has
// id/name/role) so route guards can check emailVerified/approved/active.
function loadCurrentUser(req, res, next) {
  const data = readData();
  const user = data.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(401).json({ error: "Account no longer exists" });
  if (user.active === false) {
    return res.status(403).json({ error: "This account has been deactivated." });
  }
  req.currentUser = user;
  req._data = data; // reuse the already-read data in the route handler
  next();
}

/* ---------- AUTH (Login page in the flow) ---------- */

// Register a new student or counselor account.
// Admin accounts are not self-service — see server/seed-admin.js.
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "name, email, password, and role are required" });
  }
  if (!["student", "counselor"].includes(role)) {
    return res.status(400).json({ error: "role must be 'student' or 'counselor'" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const data = readData();
  const existing = data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const verifyToken = generateToken();
  const user = {
    id: Date.now().toString(),
    name,
    email,
    password: await hashPassword(password),
    role,
    emailVerified: false,
    verifyToken,
    verifyTokenExpires: expiresInHours(24),
    resetToken: null,
    resetTokenExpires: null,
    // Students (and admins, seeded separately) don't need approval.
    // Counselors do, since an approved counselor account can see
    // confidential student check-ins.
    approved: role === "student",
    active: true,
    createdAt: new Date().toISOString(),
  };
  data.users.push(user);
  writeData(data);

  const { devLink } = sendMail({
    to: user.email,
    subject: "Verify your Student Wellness account",
    link: `${APP_URL.replace(/\/$/, "")}/verify?token=${verifyToken}`,
  });
  // The actual verification click hits the backend directly (see the
  // /api/auth/verify-email route below), not the frontend URL above —
  // devLink here points at that backend route so it works without any
  // frontend routing.
  const devVerifyLink = devLink
    ? `http://localhost:4000/api/auth/verify-email?token=${verifyToken}`
    : undefined;

  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user), devVerifyLink });
});

// Log in to an existing account
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const data = readData();
  const user = data.users.find((u) => u.email.toLowerCase() === (email || "").toLowerCase());

  if (!user || !(await comparePassword(password || "", user.password))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (user.active === false) {
    return res.status(403).json({ error: "This account has been deactivated. Contact an administrator." });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

// Used on app load (and after a background refresh) to confirm a stored
// token still maps to a real, active account, and to get fresh flags
// (emailVerified / approved / active) that don't live in the JWT itself.
app.get("/api/auth/me", requireAuth, loadCurrentUser, (req, res) => {
  res.json({ user: publicUser(req.currentUser) });
});

// Session refresh: called by the frontend when a session is about to
// expire. Issues a new token with a fresh 7-day expiry.
app.post("/api/auth/refresh", requireAuth, loadCurrentUser, (req, res) => {
  const token = signToken(req.currentUser);
  res.json({ token, user: publicUser(req.currentUser) });
});

/* ---- Email verification ---- */

// This is the link a user actually clicks (from the console-logged dev
// email). It's a plain HTML response, not JSON, since it's opened directly
// in a browser tab rather than called from the React app.
app.get("/api/auth/verify-email", (req, res) => {
  const { token } = req.query;
  const data = readData();
  const user = data.users.find((u) => u.verifyToken === token);

  const page = (title, message, ok) => `
    <html><body style="font-family: sans-serif; max-width: 480px; margin: 80px auto; text-align: center; color: #1F1C3F;">
      <h2>${ok ? "✅" : "⚠️"} ${title}</h2>
      <p>${message}</p>
      <p style="color: #888; font-size: 14px;">You can close this tab and return to the app.</p>
    </body></html>`;

  if (!user || isExpired(user.verifyTokenExpires)) {
    return res.status(400).send(page("Link expired or invalid", "Please request a new verification email from the app.", false));
  }

  user.emailVerified = true;
  user.verifyToken = null;
  user.verifyTokenExpires = null;
  writeData(data);

  res.send(page("Email verified", "Your account is now verified.", true));
});

// Lets a logged-in but unverified user request a new link.
app.post("/api/auth/resend-verification", requireAuth, loadCurrentUser, (req, res) => {
  if (req.currentUser.emailVerified) {
    return res.json({ message: "Already verified." });
  }
  const data = req._data;
  const user = data.users.find((u) => u.id === req.currentUser.id);
  user.verifyToken = generateToken();
  user.verifyTokenExpires = expiresInHours(24);
  writeData(data);

  const { devLink } = sendMail({
    to: user.email,
    subject: "Verify your Student Wellness account",
    link: `${APP_URL.replace(/\/$/, "")}/verify?token=${user.verifyToken}`,
  });
  const devVerifyLink = devLink
    ? `http://localhost:4000/api/auth/verify-email?token=${user.verifyToken}`
    : undefined;

  res.json({ message: "Verification email sent.", devVerifyLink });
});

/* ---- Password reset ---- */

app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  const data = readData();
  const user = data.users.find((u) => u.email.toLowerCase() === (email || "").toLowerCase());

  // Always return the same generic message whether or not the account
  // exists — this stops the endpoint being used to check which emails
  // are registered.
  const generic = { message: "If an account with that email exists, a reset link has been sent." };

  if (!user) return res.json(generic);

  user.resetToken = generateToken();
  user.resetTokenExpires = expiresInHours(1);
  writeData(data);

  const { devLink } = sendMail({
    to: user.email,
    subject: "Reset your Student Wellness password",
    link: `${APP_URL.replace(/\/$/, "")}/reset?token=${user.resetToken}`,
  });

  res.json({ ...generic, devResetToken: devLink ? user.resetToken : undefined });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 6) {
    return res.status(400).json({ error: "A valid token and a password of at least 6 characters are required" });
  }

  const data = readData();
  const user = data.users.find((u) => u.resetToken === token);
  if (!user || isExpired(user.resetTokenExpires)) {
    return res.status(400).json({ error: "That reset link is invalid or has expired." });
  }

  user.password = await hashPassword(password);
  user.resetToken = null;
  user.resetTokenExpires = null;
  writeData(data);

  res.json({ message: "Password updated. You can now log in." });
});

/* ---------- WELLNESS SURVEY + AI RISK ASSESSMENT ---------- */

app.get("/api/survey", requireAuth, (req, res) => {
  res.json({ questions: SURVEY_QUESTIONS });
});

app.post(
  "/api/responses",
  requireAuth,
  requireRole("student"),
  loadCurrentUser,
  requireVerified,
  (req, res) => {
    const { answers } = req.body;
    if (!answers) return res.status(400).json({ error: "answers are required" });

    const result = scoreSurvey(answers);
    const data = req._data;

    const record = {
      id: Date.now().toString(),
      studentId: req.user.id,
      studentName: req.user.name,
      answers,
      ...result,
      status: "open",
      submittedAt: new Date().toISOString(),
    };

    data.responses.unshift(record);
    writeData(data);
    res.json(record);
  }
);

app.get(
  "/api/responses",
  requireAuth,
  requireRole("counselor"),
  loadCurrentUser,
  requireVerified,
  requireApproved,
  (req, res) => {
    res.json(req._data.responses);
  }
);

app.patch(
  "/api/responses/:id",
  requireAuth,
  requireRole("counselor"),
  loadCurrentUser,
  requireVerified,
  requireApproved,
  (req, res) => {
    const { status } = req.body;
    const data = req._data;
    const record = data.responses.find((r) => r.id === req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });
    record.status = status;
    writeData(data);
    res.json(record);
  }
);

/* ---------- APPOINTMENT SCHEDULING ---------- */

app.get("/api/availability", requireAuth, (req, res) => {
  const data = readData();
  res.json(data.availability.filter((s) => !s.booked));
});

app.post(
  "/api/availability",
  requireAuth,
  requireRole("counselor"),
  loadCurrentUser,
  requireVerified,
  requireApproved,
  (req, res) => {
    const { slot } = req.body;
    if (!slot) return res.status(400).json({ error: "slot is required" });

    const data = req._data;
    const entry = {
      id: Date.now().toString(),
      counselorId: req.user.id,
      counselorName: req.user.name,
      slot,
      booked: false,
    };
    data.availability.unshift(entry);
    writeData(data);
    res.json(entry);
  }
);

app.delete(
  "/api/availability/:id",
  requireAuth,
  requireRole("counselor"),
  loadCurrentUser,
  requireVerified,
  requireApproved,
  (req, res) => {
    const data = req._data;
    data.availability = data.availability.filter((s) => s.id !== req.params.id);
    writeData(data);
    res.json({ deleted: true });
  }
);

app.get(
  "/api/availability/mine",
  requireAuth,
  requireRole("counselor"),
  loadCurrentUser,
  requireVerified,
  requireApproved,
  (req, res) => {
    res.json(req._data.availability.filter((s) => s.counselorId === req.user.id));
  }
);

app.post(
  "/api/appointments",
  requireAuth,
  requireRole("student"),
  loadCurrentUser,
  requireVerified,
  (req, res) => {
    const { availabilityId } = req.body;
    const data = req._data;
    const slot = data.availability.find((s) => s.id === availabilityId && !s.booked);
    if (!slot) return res.status(400).json({ error: "That slot is no longer available" });

    slot.booked = true;
    const appt = {
      id: Date.now().toString(),
      studentId: req.user.id,
      studentName: req.user.name,
      counselorId: slot.counselorId,
      counselorName: slot.counselorName,
      slot: slot.slot,
      status: "confirmed",
    };
    data.appointments.unshift(appt);
    writeData(data);
    res.json(appt);
  }
);

app.get("/api/appointments", requireAuth, (req, res) => {
  const data = readData();
  const mine =
    req.user.role === "student"
      ? data.appointments.filter((a) => a.studentId === req.user.id)
      : data.appointments.filter((a) => a.counselorId === req.user.id);
  res.json(mine);
});

/* ---------- ADMIN: manage counselor accounts ---------- */

app.get("/api/admin/users", requireAuth, requireRole("admin"), (req, res) => {
  const data = readData();
  res.json(data.users.map(publicUser));
});

app.post("/api/admin/users/:id/approve", requireAuth, requireRole("admin"), (req, res) => {
  const data = readData();
  const user = data.users.find((u) => u.id === req.params.id);
  if (!user || user.role !== "counselor") {
    return res.status(400).json({ error: "Not a pending counselor account" });
  }
  user.approved = true;
  writeData(data);
  res.json({ user: publicUser(user) });
});

app.post("/api/admin/users/:id/reject", requireAuth, requireRole("admin"), (req, res) => {
  const data = readData();
  const user = data.users.find((u) => u.id === req.params.id);
  if (!user || user.role !== "counselor" || user.approved) {
    return res.status(400).json({ error: "Not a pending counselor account" });
  }
  data.users = data.users.filter((u) => u.id !== req.params.id);
  writeData(data);
  res.json({ rejected: true });
});

app.post("/api/admin/users/:id/deactivate", requireAuth, requireRole("admin"), (req, res) => {
  const data = readData();
  const user = data.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  if (user.role === "admin") return res.status(400).json({ error: "Cannot deactivate an admin account" });
  user.active = false;
  writeData(data);
  res.json({ user: publicUser(user) });
});

app.post("/api/admin/users/:id/reactivate", requireAuth, requireRole("admin"), (req, res) => {
  const data = readData();
  const user = data.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  user.active = true;
  writeData(data);
  res.json({ user: publicUser(user) });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Wellness API running on http://localhost:${PORT}`);
});
