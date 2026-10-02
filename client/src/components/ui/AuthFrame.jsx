import React from "react";
import PublicShell from "./PublicShell";
import icon from "../../assets/mindbridge-icon.png";

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Labelled text input used by the auth forms; same component as the rest of the app.
export { default as Field } from "./Input";

// Calm, centred frame: a short welcome above one 450px card. The gradient background is the only decoration.
export default function AuthFrame({ title, intro, children, footer }) {
  return (
    <PublicShell showAuthLinks={false} calm>
      <div className="mx-auto w-full max-w-[450px] px-4 py-12 sm:py-16">
        <div className="mb-8 text-center">
          <img src={icon} alt="" className="mx-auto mb-4 h-14 w-14 rounded-lg shadow-mb-md" />
          <h1 className="mb-sign text-4xl font-bold">{title}</h1>
          <p className="mx-auto mt-2 max-w-[40ch] text-[color:var(--mb-muted)]">{intro}</p>
        </div>

        <div className="mb-card shadow-mb-md sm:!p-8">
          {children}
          {footer ? <div className="mt-8 border-t border-[color:var(--mb-line)] pt-6 text-center">{footer}</div> : null}
        </div>
      </div>
    </PublicShell>
  );
}
