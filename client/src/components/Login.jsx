import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, provider } from "../firebase";
import icon from "../assets/mindbridge-icon.png";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <path fill="none" d="M0 0h48v48H0z" />
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
                placeholder="you@usa.edu.ph"
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
