import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// In a real deployment, set this via an environment variable instead of
// hardcoding it. For local development this fallback is fine.
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";
const TOKEN_EXPIRY = "7d";

export async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(user) {
  // Only ever put non-sensitive fields in the token payload.
  return jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

export function requireRole(role) {
  const allowed = Array.isArray(role) ? role : [role];
  return (req, res, next) => {
    const userRole = req.user?.role;
    const isStaff = userRole === "admin" || userRole === "counselor";
    const allowsStaff = allowed.includes("admin") || allowed.includes("counselor");

    if (allowsStaff && isStaff) {
      return next();
    }
    if (allowed.includes(userRole)) {
      return next();
    }
    return res.status(403).json({ error: `Requires ${Array.isArray(role) ? role.join(" or ") : role} role` });
  };
}

// Blocks an action until the user has clicked their email verification link.
// Needs the full user record (not just the JWT payload), so it's applied
// after requireAuth and expects req.loadUser to have been set by the route.
export function requireVerified(req, res, next) {
  if (!req.currentUser?.emailVerified) {
    return res.status(403).json({ error: "Please verify your email to continue." });
  }
  next();
}

// Blocks counselor-only actions until an admin has approved the account.
export function requireApproved(req, res, next) {
  if (req.currentUser?.role === "counselor" && !req.currentUser?.approved) {
    return res.status(403).json({ error: "Your counselor account is awaiting admin approval." });
  }
  next();
}
