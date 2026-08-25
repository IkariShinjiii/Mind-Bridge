import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

export default function Verify() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify-email?token=${token}`)
      .then(async (res) => {
        if (!res.ok) {
          setStatus("error");
          setMessage("This verification link is invalid or expired.");
          return;
        }

        setStatus("success");
        setMessage("Your email has been verified successfully.");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Unable to verify your email right now.");
      });
  }, [searchParams]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-mist via-[#eef1f8] to-[#e8f5f1] flex items-center justify-center px-4 py-8 sm:px-6">
      <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-teal/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-ink/10 blur-3xl" />

      <div className="relative w-full max-w-md rounded-[30px] border border-ink/5 bg-white/95 p-6 text-center shadow-[0_20px_60px_rgba(17,24,39,0.12)] sm:p-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal/10 text-2xl">
          {status === "success" ? "✓" : status === "error" ? "!" : "…"}
        </div>

        <h1 className="font-display text-2xl sm:text-3xl text-ink mb-3">
          {status === "success"
            ? "Email Verified"
            : status === "error"
              ? "Verification Failed"
              : "Verifying..."}
        </h1>

        <p className="text-sm sm:text-base text-ink/70 mb-6">{message}</p>

        {status === "success" && (
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-teal px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-95"
          >
            Continue to app
          </Link>
        )}
      </div>
    </div>
  );
}
