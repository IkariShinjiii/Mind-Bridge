import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, provider } from "../../lib/firebase";
import AuthFrame, { GoogleIcon, Spinner, Field } from "../../components/ui/AuthFrame";
import { validateSignup, SCHOOL_EMAIL_DOMAIN } from "../../utils/validation";
import { friendlyError, isPopupDismissed } from "../../utils/errors";
import { focusById } from "../../utils/dom";
import type { FieldErrors } from "../../types";

export default function Signup() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const consent = form.get("consent") === "on";

    const errors = validateSignup({ name, email, password, consent });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setErrorMessage("");
      focusById(["name", "email", "password", "consent"].find((k) => errors[k]));
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
      const msg = friendlyError(error, "Unable to create account. Please try again.");
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
      if (!user.email?.toLowerCase().endsWith(SCHOOL_EMAIL_DOMAIN)) {
        await signOut(auth);
        setErrorMessage(
          "Sign-Up with Google is only available for @usa.edu.ph accounts. Please use your school email.",
        );
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
      if (!isPopupDismissed(error)) {
        setErrorMessage(friendlyError(error, "Google sign-up failed. Please try again."));
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
        {errorMessage ? (
          <div className="mb-alert mb-5" role="alert">
            {errorMessage}
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field id="name" label="Full name" type="text" autoComplete="name" required error={fieldErrors.name} />
        <Field
          id="email"
          label="School email"
          type="email"
          placeholder="you@usa.edu.ph"
          autoComplete="email"
          required
          error={fieldErrors.email}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 6 characters."
          required
          error={fieldErrors.password}
        />

        <div>
          <div className="flex items-start gap-3">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              required
              aria-invalid={fieldErrors.consent ? true : undefined}
              aria-describedby={fieldErrors.consent ? "consent-error" : undefined}
              className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--mb-panel)]"
            />
            <label htmlFor="consent" className="text-[color:var(--mb-muted)]">
              I agree to the{" "}
              <a href="/terms" className="text-[color:var(--mb-ink)] underline">
                Terms and Conditions
              </a>{" "}
              and{" "}
              <a href="/privacy-policy" className="text-[color:var(--mb-ink)] underline">
                Privacy Policy
              </a>
              , and I consent to my data being collected and processed as they describe.
            </label>
          </div>
          {fieldErrors.consent && (
            <p id="consent-error" role="alert" className="mt-1 font-medium text-[color:var(--mb-urgent)]">
              {fieldErrors.consent}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isGoogleLoading}
          aria-busy={isSubmitting}
          className="mb-btn mb-btn-solid w-full"
        >
          {isSubmitting && <Spinner />}
          {isSubmitting ? "Creating account…" : "Create account"}
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
          {isGoogleLoading ? "Signing up…" : "Sign up with Google"}
        </button>
      </form>
    </AuthFrame>
  );
}
