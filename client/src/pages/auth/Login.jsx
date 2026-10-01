import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, signOut, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, provider } from "../../lib/firebase";
import AuthFrame, { GoogleIcon, Spinner, Field } from "../../components/ui/AuthFrame";
import { validateLogin, isEmail } from "../../lib/validation";
import { friendlyError, isPopupDismissed } from "../../lib/errors";

function navigateByRole(role, navigate) {
  if (role === "admin" || role === "counselor") navigate("/admin/dashboard", { replace: true });
  else navigate("/student/dashboard", { replace: true });
}

export default function Login() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isResetting, setIsResetting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    const errors = validateLogin({ email, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setErrorMessage("");
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", credential.user.uid));

      if (!userDoc.exists()) {
        await signOut(auth);
        throw new Error("No profile found for this account.");
      }

      const profile = userDoc.data();
      if (profile.active === false) {
        await signOut(auth);
        throw new Error("This account has been deactivated. Contact an administrator.");
      }

      const role = (profile.role || "student").toLowerCase();
      navigateByRole(role, navigate);
    } catch (error) {
      // Errors we throw ourselves carry a plain message; Firebase errors carry a code
      setErrorMessage(
        error.code ? friendlyError(error, "Unable to sign in. Please try again.") : error.message || "Unable to sign in. Please try again."
      );
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
      if (!isPopupDismissed(error)) {
        setErrorMessage(
          error.code ? friendlyError(error, "Google sign-in failed. Please try again.") : error.message || "Google sign-in failed. Please try again."
        );
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }


  async function handleForgotPassword() {
    const email = String(document.getElementById("email")?.value || "").trim();
    setInfoMessage("");
    if (!isEmail(email)) {
      setFieldErrors({ email: "Type your email here first, then choose Forgot password." });
      document.getElementById("email")?.focus();
      return;
    }
    setErrorMessage("");
    setFieldErrors({});
    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      // Same message either way so the form can't be used to find out who has an account.
      if (error.code !== "auth/user-not-found" && error.code !== "auth/invalid-email") {
        setErrorMessage(friendlyError(error, "We could not send the reset email. Please try again."));
        setIsResetting(false);
        return;
      }
    }
    setIsResetting(false);
    setInfoMessage("If an account exists for that email, a reset link is on its way.");
  }

  return (
    <AuthFrame
      title="Welcome back"
      intro="Log in to check in, see your results, or manage your sessions."
      footer={
        <p>
          New here?{" "}
          <button type="button" onClick={() => navigate("/signup")} className="font-bold underline underline-offset-4">
            Create a student account
          </button>
        </p>
      }
    >
      <div aria-live="polite">
        {errorMessage ? <div className="mb-alert mb-5" role="alert">{errorMessage}</div> : null}
        {infoMessage ? <div role="status" className="mb-5 rounded-md border-2 border-[color:var(--mb-safe)] px-4 py-3">{infoMessage}</div> : null}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field id="email" label="Email" type="email" placeholder="you@usa.edu.ph" autoComplete="email" required error={fieldErrors.email} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" required error={fieldErrors.password} />

        <div className="text-right">
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={isResetting || isSubmitting}
            className="inline-flex min-h-[44px] items-center gap-2 font-bold underline underline-offset-4 disabled:opacity-60"
          >
            {isResetting && <Spinner />}
            {isResetting ? "Sending…" : "Forgot password?"}
          </button>
        </div>

        <button type="submit" disabled={isSubmitting || isGoogleLoading} aria-busy={isSubmitting} className="mb-btn mb-btn-solid w-full">
          {isSubmitting && <Spinner />}
          {isSubmitting ? "Signing in…" : "Log in"}
        </button>

        <div className="flex items-center gap-3 text-[color:var(--mb-muted)]" aria-hidden="true">
          <span className="h-0.5 flex-1 bg-[color:var(--mb-line)]" />
          <span>or</span>
          <span className="h-0.5 flex-1 bg-[color:var(--mb-line)]" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isSubmitting}
          className="mb-btn mb-btn-line w-full"
        >
          {isGoogleLoading ? <Spinner /> : <GoogleIcon />}
          {isGoogleLoading ? "Signing in…" : "Continue with Google"}
        </button>
      </form>
    </AuthFrame>
  );
}
