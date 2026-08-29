import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, provider } from "../firebase";
import icon from "../assets/mindbridge-icon.png";
import usaLogo from "../assets/usa-logo.png";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 4 1.5l2.7-2.6C16.8 3.2 14.7 2.4 12 2.4 6.9 2.4 2.8 6.5 2.8 11.6S6.9 20.8 12 20.8c6.9 0 11.5-4.8 11.5-11.6 0-.8-.1-1.3-.2-1.9H12Z"
      />
      <path
        fill="#34A853"
        d="M3.8 7.2l3.5 2.6c1-1.9 3-3.2 5.7-3.2 1.9 0 3.2.8 4 1.5l2.7-2.6C16.8 3.2 14.7 2.4 12 2.4 8.3 2.4 5.2 4.6 3.8 7.2Z"
      />
      <path
        fill="#FBBC05"
        d="M3.8 16c1.6 2.7 4.8 4.6 8.2 4.6 2.5 0 4.7-.9 6.3-2.5l-2.9-2.5c-.8.5-1.9.9-3.4.9-2.5 0-4.7-1.7-5.4-4l-3.4 2.6C2.7 13.5 3.8 16 3.8 16Z"
      />
      <path
        fill="#4285F4"
        d="M12 21.2c2.4 0 4.4-.8 5.9-2.1l-2.8-2.4c-.8.6-1.9 1.1-3.1 1.1-2.9 0-5.3-2.3-5.4-5.2L2.7 9c-1.3 2.6-1.2 5.7.2 8.2C4.1 19.5 7.7 21.2 12 21.2Z"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-90" />
    </svg>
  );
}

function navigateByRole(role, navigate) {
  if (role === "admin" || role === "counselor") navigate("/admin/dashboard", { replace: true });
  else navigate("/student/dashboard", { replace: true });
}

export default function Login() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "").trim();

    if (!email || !password) {
      setErrorMessage("Please enter both your email and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", credential.user.uid));

      if (!userDoc.exists()) {
        throw new Error("No profile found for this account.");
      }

      const profile = userDoc.data();
      if (profile.active === false) {
        throw new Error("This account has been deactivated. Contact an administrator.");
      }

      const role = (profile.role || "student").toLowerCase();
      navigateByRole(role, navigate);
    } catch (error) {
      setErrorMessage(error.message || "Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    setErrorMessage("");

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // New user via Google — enforce institutional email domain
        if (!user.email?.toLowerCase().endsWith("@usa.edu.ph")) {
          await signOut(auth);
          setErrorMessage("Google Sign-In is only available for @usa.edu.ph accounts. Please use your school email.");
          return;
        }
        // Create a new student profile in Firestore
        await setDoc(userRef, {
          name: user.displayName || user.email.split("@")[0],
          email: user.email,
          role: "student",
          emailVerified: true,
          approved: true,
          active: true,
          createdAt: serverTimestamp(),
        });
        navigate("/student/dashboard", { replace: true });
      } else {
        // Existing user — sign in normally
        const profile = userDoc.data();
        if (profile.active === false) {
          await signOut(auth);
          throw new Error("This account has been deactivated. Contact an administrator.");
        }
        const role = (profile.role || "student").toLowerCase();
        navigateByRole(role, navigate);
      }
    } catch (error) {
      if (error.code !== "auth/popup-closed-by-user" && error.code !== "auth/cancelled-popup-request") {
        setErrorMessage(error.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 font-sans text-white auth-page auth-card-enter-right">
      <div className="bg-gray-900 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-gray-800 transform transition-all duration-300 hover:shadow-[0_18px_40px_rgba(6,182,212,0.12)]">
        <div className="w-full md:w-1/2 p-8 bg-gray-900">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img src={usaLogo} alt="University of San Agustin seal" className="h-9 w-auto object-contain" />
              <span className="h-5 w-px bg-gray-700" />
              <img src={icon} alt="Mind Bridge logo" className="h-9 w-9 rounded-lg object-cover" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-semibold">Mind Bridge • USA</p>
              <h2 className="text-2xl font-semibold text-white mt-0.5">Welcome back</h2>
            </div>
          </div>
          <p className="text-sm text-gray-300 mb-6">Log in to continue to your dashboard</p>

          {errorMessage ? (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{errorMessage}</div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm text-gray-300 block mb-1">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@school.edu"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm text-gray-300 block mb-1">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <input id="remember" name="remember" type="checkbox" className="h-4 w-4 text-cyan-600 bg-gray-800 border-gray-700 rounded" />
                <label htmlFor="remember" className="text-sm text-gray-300">Remember me</label>
              </div>
              <a href="#" className="text-cyan-400 hover:text-cyan-300">Forgot password?</a>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isSubmitting}
                className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg px-4 py-3 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isGoogleLoading ? <Spinner /> : <GoogleIcon />}
                <span>{isGoogleLoading ? "Signing in..." : "Continue with Google"}</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isGoogleLoading}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {isSubmitting && <Spinner />}
                {isSubmitting ? "Signing in..." : "Log in"}
              </button>
            </div>
          </form>
        </div>

        <div className="w-full md:w-1/2 p-8 bg-gray-950 flex flex-col items-center justify-center text-center">
          <div className="max-w-xs">
            <h3 className="text-xl font-semibold text-white mb-2">New here?</h3>
            <p className="text-sm text-white/80 mb-6">Create an account to book counseling sessions, track your wellness, and get support from counselors.</p>
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="border-2 border-gray-600 hover:border-gray-400 text-white px-8 py-2 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
