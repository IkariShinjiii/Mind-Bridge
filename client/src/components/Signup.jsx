import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, provider } from "../firebase";
import icon from "../assets/mindbridge-icon.png";
import usaLogo from "../assets/usa-logo.png";

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

export default function Signup() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "").trim();

    if (!name || !email || !password) return;

    if (!email.toLowerCase().endsWith("@usa.edu.ph")) {
      setErrorMessage("Student registrations must use an @usa.edu.ph email address.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });

      // Create the Firestore user document
      await setDoc(doc(db, "users", credential.user.uid), {
        name,
        email,
        role: "student",
        emailVerified: false,
        approved: true,
        active: true,
        createdAt: serverTimestamp(),
      });

      navigate("/student/dashboard", { replace: true });
    } catch (error) {
      const msg =
        error.code === "auth/email-already-in-use"
          ? "An account with that email already exists. Try logging in instead."
          : error.code === "auth/weak-password"
            ? "Password must be at least 6 characters."
            : error.message || "Unable to create account. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignUp() {
    setIsGoogleLoading(true);
    setErrorMessage("");

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Enforce institutional email domain
      if (!user.email?.toLowerCase().endsWith("@usa.edu.ph")) {
        await signOut(auth);
        setErrorMessage("Sign-Up with Google is only available for @usa.edu.ph accounts. Please use your school email.");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // New user — create their Firestore profile
        await setDoc(userRef, {
          name: user.displayName || user.email.split("@")[0],
          email: user.email,
          role: "student",
          emailVerified: true,
          approved: true,
          active: true,
          createdAt: serverTimestamp(),
        });
      }
      // Whether new or existing, navigate to dashboard
      navigate("/student/dashboard", { replace: true });
    } catch (error) {
      if (error.code !== "auth/popup-closed-by-user" && error.code !== "auth/cancelled-popup-request") {
        setErrorMessage(error.message || "Google sign-up failed. Please try again.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 font-sans text-white auth-page auth-card-enter-left">
      <div className="bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-800 transform transition-all duration-300 hover:shadow-[0_18px_40px_rgba(6,182,212,0.12)]">
        <div className="p-8">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <img src={usaLogo} alt="University of San Agustin seal" className="h-9 w-auto object-contain" />
              <span className="h-5 w-px bg-gray-700" />
              <img src={icon} alt="Mind Bridge logo" className="h-9 w-9 rounded-lg object-cover" />
            </div>
            <div className="text-left">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-semibold">Mind Bridge • USA</p>
              <h2 className="text-2xl font-semibold text-white mt-0.5">Create account</h2>
            </div>
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{errorMessage}</div>
          ) : null}

          {/* Google Sign-Up */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading || isSubmitting}
            className="w-full mb-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg px-4 py-3 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? <Spinner /> : <GoogleIcon />}
            <span>{isGoogleLoading ? "Signing up..." : "Sign up with Google"}</span>
          </button>

          <div className="relative flex items-center gap-3 mb-4">
            <div className="flex-1 border-t border-gray-700" />
            <span className="text-xs text-gray-500 flex-shrink-0">or sign up with school email</span>
            <div className="flex-1 border-t border-gray-700" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm text-gray-300 block mb-1">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Jane Doe"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

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
                placeholder="At least 6 characters"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isGoogleLoading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {isSubmitting && <Spinner />}
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-300">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-cyan-400 hover:text-cyan-300 font-medium transition-all duration-200 hover:underline"
            >
              Log in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
