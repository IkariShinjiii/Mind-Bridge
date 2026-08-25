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
    <div className="min-h-screen flex items-center justify-center bg-mist px-6">
      <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-lg text-center">
        <h1 className="text-2xl font-semibold text-ink mb-4">
          {status === "success"
            ? "Email Verified"
            : status === "error"
              ? "Verification Failed"
              : "Verifying..."}
        </h1>

        <p className="text-ink/70 mb-6">{message}</p>

        {status === "success" && (
          <Link
            to="/"
            className="inline-block bg-teal text-ink font-semibold rounded-lg px-5 py-2.5"
          >
            Continue to app
          </Link>
        )}
      </div>
    </div>
  );
}
