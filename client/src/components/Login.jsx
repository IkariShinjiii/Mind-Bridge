import { useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { apiUrl, forgotPassword, resetPassword } from "../api";
import logo from "../assets/mindbridge-logo.png";
import icon from "../assets/mindbridge-icon.png";
import Spinner from "./Spinner";
import { auth, provider } from "../firebase.js";
import { signInWithPopup } from "firebase/auth";

// Glow wraps its icon directly so it's always centered behind it,
// regardless of where the surrounding content sits vertically.
function BrandGlow({ children, size = "w-24 h-24" }) {
  return (
    <div className="relative flex items-center justify-center mb-4">
      <div
        className={`absolute ${size} bg-white/10 rounded-full blur-xl pointer-events-none`}
        aria-hidden="true"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export default function Login() {
  const { login, sessionMessage } = useAuth();
  const [mode, setMode] = useState("login"); // login | register | forgot | reset
  const [role, setRole] = useState("student");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [devVerifyLink, setDevVerifyLink] = useState(null);
  const [devResetToken, setDevResetToken] = useState(null);
  const [resetTokenInput, setResetTokenInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function switchMode(next) {
    setMode(next);
    setError("");
    setNotice("");
    setDevVerifyLink(null);
    setDevResetToken(null);
    setConfirmPassword("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (mode === "register") {
      if (form.password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (form.password !== confirmPassword) {
        setError("Passwords don't match.");
        return;
      }
    }

    setSubmitting(true);

    const endpoint = mode === "login" ? apiUrl("/auth/login") : apiUrl("/auth/register");
    const body =
      mode === "login"
        ? { email: form.email, password: form.password }
        : { ...form, role };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      if (mode === "register" && data.devVerifyLink) {
        setDevVerifyLink(data.devVerifyLink);
      }
      login(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await forgotPassword(form.email);
      setNotice(res.message);
      if (res.devResetToken) {
        setDevResetToken(res.devResetToken);
        setResetTokenInput(res.devResetToken);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await resetPassword(resetTokenInput, newPassword);
      setNotice("Password updated — you can log in now.");
      setTimeout(() => switchMode("login"), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Google Sign-In handler
  async function handleGoogleSignIn() {
    setError("");
    setSubmitting(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const res = await fetch(apiUrl("/auth/google-signin"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Google sign-in failed");

      login(data.token, data.user);
    } catch (err) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  // Rendered as plain function calls (not JSX components) on purpose — a
  // component defined inside another component's body gets recreated on
  // every render, which would make inputs lose focus on every keystroke.
  function loginFields(disabled) {
    return (
      <>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            required={!disabled}
            disabled={disabled}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal disabled:bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            required={!disabled}
            disabled={disabled}
            minLength={6}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal disabled:bg-white"
          />
          <div className="text-right mt-1.5">
            <button
              type="button"
              tabIndex={disabled ? -1 : 0}
              onClick={() => switchMode("forgot")}
              className="text-xs text-ink/50 hover:text-ink underline"
            >
              Forgot password?
            </button>
          </div>
        </div>

        {!disabled && error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          tabIndex={disabled ? -1 : 0}
          disabled={disabled || submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ink/15 py-3 font-semibold text-ink hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? (
            <>
              <Spinner size={15} className="text-ink" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <img src="/google-logo.png" alt="" className="h-4 w-4" />
              <span>Sign in with Google</span>
            </>
          )}
        </button>

        <div className="text-center my-2 text-ink/40">or</div>

        <button
          type="submit"
          tabIndex={disabled ? -1 : 0}
          disabled={disabled || submitting}
          className="action-button inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal py-3 font-semibold text-ink hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting && !disabled ? (
            <>
              <Spinner size={15} className="text-ink" />
              <span>Please wait…</span>
            </>
          ) : (
            "Log in"
          )}
        </button>
      </>
    );
  }

  function registerFields(disabled) {
    return (
      <>
        <div>
          <label className="block text-sm font-medium mb-1">Full name</label>
          <input
            type="text"
            required={!disabled}
            disabled={disabled}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal disabled:bg-white"
          />
        </div>

        <div>
          <div className="grid grid-cols-2 gap-2">
            {["student", "counselor"].map((r) => (
              <button
                type="button"
                key={r}
                tabIndex={disabled ? -1 : 0}
                onClick={() => setRole(r)}
                className={`text-sm rounded-lg py-2 border capitalize transition ${
                  role === r ? "bg-ink text-white border-ink" : "border-ink/15"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {!disabled && role === "counselor" && (
            <p className="text-xs text-ink/50 mt-2">
              Counselor accounts need admin approval before they can view
              student check-ins.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            required={!disabled}
            disabled={disabled}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal disabled:bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            required={!disabled}
            disabled={disabled}
            minLength={6}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal disabled:bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Confirm password</label>
          <input
            type="password"
            required={!disabled}
            disabled={disabled}
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal disabled:bg-white"
          />
        </div>

        {!disabled && devVerifyLink && (
          <div className="text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <p className="text-emerald-800 mb-2">
              Account created. In production a verification email would be
              sent — for now:
            </p>
            <a
              href={devVerifyLink}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-emerald-700 underline"
            >
              Dev mode: click to verify your email
            </a>
          </div>
        )}

        {!disabled && error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          tabIndex={disabled ? -1 : 0}
          disabled={disabled || submitting}
          className="action-button inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal py-3 font-semibold text-ink hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting && !disabled ? (
            <>
              <Spinner size={15} className="text-ink" />
              <span>Please wait…</span>
            </>
          ) : (
            "Create account"
          )}
        </button>
      </>
    );
  }

  if (mode === "forgot" || mode === "reset") {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-mist via-[#eef1f8] to-[#e8f5f1] flex items-center justify-center px-6 py-12">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-ink/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-3xl grid md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl">
          <div className="relative bg-gradient-to-br from-ink to-ink2 px-8 py-12 flex flex-col items-center justify-center text-center overflow-hidden">
            <BrandGlow>
              <img src={icon} alt="" className="h-14 w-14" />
            </BrandGlow>
            <h2 className="relative font-display text-2xl text-white mb-2">
              {mode === "forgot" ? "Forgot your password?" : "Almost there"}
            </h2>
            <p className="relative text-white/50 text-sm max-w-[220px]">
              {mode === "forgot"
                ? "No worries — we'll help you get back in."
                : "Choose a new password to finish resetting your account."}
            </p>
          </div>

          <div className="bg-white px-8 py-12 flex flex-col justify-center">
            {sessionMessage && (
              <p className="text-sm text-amber-700 bg-amber-100 border border-amber-200 rounded-lg px-4 py-2 mb-4">
                {sessionMessage}
              </p>
            )}

            {mode === "forgot" && (
              <form onSubmit={handleForgot} className="space-y-4">
                <h3 className="font-display text-xl text-ink mb-1">Reset your password</h3>
                <p className="text-sm text-ink/60 mb-2">
                  Enter your email and we'll send a link to reset your password.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="w-full rounded-lg border border-ink/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal"
                  />
                </div>

                {notice && <p className="text-sm text-emerald-700">{notice}</p>}
                {devResetToken && (
                  <button
                    type="button"
                    onClick={() => switchMode("reset")}
                    className="text-sm font-semibold text-emerald-700 underline"
                  >
                    Dev mode: continue to reset form
                  </button>
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="action-button inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal py-3 font-semibold text-ink shadow-sm transition-all duration-200 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? (
                    <>
                      <Spinner size={15} className="text-ink" />
                      <span>Sending…</span>
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="w-full text-sm text-ink/50 hover:text-ink"
                >
                  Back to log in
                </button>
              </form>
            )}

            {mode === "reset" && (
              <form onSubmit={handleReset} className="space-y-4">
                <h3 className="font-display text-xl text-ink mb-1">Choose a new password</h3>
                <div>
                  <label className="block text-sm font-medium mb-1">Reset token</label>
                  <input
                    type="text"
                    required
                    value={resetTokenInput}
                    onChange={(e) => setResetTokenInput(e.target.value)}
                    className="w-full rounded-lg border border-ink/15 px-4 py-2.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal"
                  />
                  <p className="text-xs text-ink/40 mt-1">
                    In production this comes from the emailed link automatically.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">New password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-ink/15 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal"
                  />
                </div>

                {notice && <p className="text-sm text-emerald-700">{notice}</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="action-button inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal py-3 font-semibold text-ink shadow-sm transition-all duration-200 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? (
                    <>
                      <Spinner size={15} className="text-ink" />
                      <span>Updating…</span>
                    </>
                  ) : (
                    "Update password"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  const overlayOnRight = mode === "login";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-mist via-[#eef1f8] to-[#e8f5f1]">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-ink/10 rounded-full blur-3xl pointer-events-none" />

      {/* ---------- Mobile: stacked layout, no sliding (a horizontal split doesn't fit a phone screen) ---------- */}
      <div className="relative md:hidden">
        <div className="relative overflow-hidden bg-gradient-to-b from-ink to-ink2 pt-10 pb-12 px-4 sm:px-6">
          <div className="relative flex flex-col items-center text-center">
            <BrandGlow size="w-32 h-32 sm:w-36 sm:h-36">
              <img src={logo} alt="Mind Bridge" className="h-20 w-auto sm:h-24 drop-shadow-lg" />
            </BrandGlow>
            <p className="text-white/50 text-sm mt-1 max-w-[260px]">
              {mode === "login" ? "A private space to check in with yourself." : "Set up your confidential account."}
            </p>
          </div>
        </div>

        <div className="flex justify-center px-4 pb-12 sm:px-6">
          <div className="w-full max-w-sm -mt-6 bg-white/95 rounded-[26px] shadow-[0_20px_60px_rgba(17,24,39,0.14)] border border-ink/5 px-5 pt-7 pb-6 sm:px-7 sm:pt-8 sm:pb-7 motion-safe:animate-rise">
            <h2 className="font-display text-xl sm:text-2xl text-ink mb-6 text-center">
              {mode === "login" ? "Welcome back" : "Create an account"}
            </h2>

            {sessionMessage && mode === "login" && (
              <p className="text-sm text-amber-700 bg-amber-100 border border-amber-200 rounded-lg px-4 py-2 mb-4">
                {sessionMessage}
              </p>
            )}

            <div className="flex bg-mist rounded-lg p-1 mb-6 border border-ink/10">
              <button
                onClick={() => switchMode("login")}
                className={`flex-1 text-sm py-2 rounded-md transition ${mode === "login" ? "bg-ink text-white" : "text-ink/60"}`}
              >
                Log in
              </button>
              <button
                onClick={() => switchMode("register")}
                className={`flex-1 text-sm py-2 rounded-md transition ${mode === "register" ? "bg-ink text-white" : "text-ink/60"}`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "login" ? loginFields(false) : registerFields(false)}
            </form>
          </div>
        </div>
      </div>

      {/* ---------- Desktop: sliding split panel ---------- */}
      <div className="hidden md:flex min-h-screen items-center justify-center px-6 py-10">
        <div className="relative w-full max-w-3xl rounded-[30px] overflow-hidden shadow-[0_30px_80px_rgba(16,24,40,0.18)] bg-white grid grid-cols-2">
          {/* Login form — lives permanently in the left cell */}
          <div className={`px-10 py-12 flex flex-col justify-center ${overlayOnRight ? "" : "invisible"}`}>
            <h2 className="font-display text-2xl text-ink mb-6">Welcome back</h2>
            {sessionMessage && (
              <p className="text-sm text-amber-700 bg-amber-100 border border-amber-200 rounded-lg px-4 py-2 mb-4">
                {sessionMessage}
              </p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {loginFields(!overlayOnRight)}
            </form>
          </div>

          {/* Register form — lives permanently in the right cell */}
          <div className={`px-10 py-12 flex flex-col justify-center ${overlayOnRight ? "invisible" : ""}`}>
            <h2 className="font-display text-2xl text-ink mb-6">Create an account</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {registerFields(overlayOnRight)}
            </form>
          </div>

          {/* Sliding colored overlay — always covers whichever side is inactive */}
          <div
            className={`absolute inset-y-0 w-1/2 z-10 bg-gradient-to-br from-ink to-ink2 flex flex-col items-center justify-center text-center px-8 overflow-hidden transition-[left] duration-700 ease-in-out ${
              overlayOnRight ? "left-1/2" : "left-0"
            }`}
          >
            <BrandGlow>
              <img src={icon} alt="" className="h-14 w-14" />
            </BrandGlow>
            <h3 className="relative font-display text-2xl text-white mb-2">
              {overlayOnRight ? "New here?" : "Already a member?"}
            </h3>
            <p className="relative text-white/50 text-sm max-w-[220px] mb-6">
              {overlayOnRight
                ? "Set up a confidential account to start checking in."
                : "Sign back in to pick up where you left off."}
            </p>
            <button
              type="button"
              onClick={() => switchMode(overlayOnRight ? "register" : "login")}
              className="relative border border-white/40 text-white rounded-full px-6 py-2 text-sm font-medium hover:bg-white/10 transition"
            >
              {overlayOnRight ? "Sign up" : "Log in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
