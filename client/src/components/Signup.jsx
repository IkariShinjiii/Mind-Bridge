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
import AuthFrame, { GoogleIcon, Spinner, Field } from "./ui/AuthFrame";

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
    <AuthFrame
      title="Create account"
      intro="Student accounts use your @usa.edu.ph email. It takes under a minute."
      footer={
        <p>
          Already have an account?{" "}
          <button type="button" onClick={() => navigate("/login")} className="font-bold underline underline-offset-4">
            Log in
          </button>
        </p>
      }
    >
      <div aria-live="polite">
        {errorMessage ? <div className="mb-alert mb-5" role="alert">{errorMessage}</div> : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field id="name" label="Full name" type="text" autoComplete="name" required />
        <Field id="email" label="School email" type="email" placeholder="you@usa.edu.ph" autoComplete="email" required />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 6 characters."
          required
        />

        <div className="flex items-start gap-3">
          <input id="consent" name="consent" type="checkbox" required className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--mb-panel)]" />
          <label htmlFor="consent" className="text-[color:var(--mb-muted)]">
            I agree to the{" "}
            <a href="/terms" className="text-[color:var(--mb-ink)]">Terms and Conditions</a> and{" "}
            <a href="/privacy-policy" className="text-[color:var(--mb-ink)]">Privacy Policy</a>, and I consent to my data being collected and processed as they describe.
          </label>
        </div>

        <button type="submit" disabled={isSubmitting || isGoogleLoading} className="mb-btn mb-btn-solid w-full">
          {isSubmitting && <Spinner />}
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>

        <div className="flex items-center gap-3 text-[color:var(--mb-muted)]" aria-hidden="true">
          <span className="h-0.5 flex-1 bg-[color:var(--mb-line)]" />
          <span>or</span>
          <span className="h-0.5 flex-1 bg-[color:var(--mb-line)]" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isGoogleLoading || isSubmitting}
          className="mb-btn mb-btn-line w-full"
        >
          {isGoogleLoading ? <Spinner /> : <GoogleIcon />}
          {isGoogleLoading ? "Signing up..." : "Sign up with Google"}
        </button>
      </form>
    </AuthFrame>
  );
}
