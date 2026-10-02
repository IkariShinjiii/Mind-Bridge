import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("mindbridge_cookie_consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("mindbridge_cookie_consent", "accepted");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className="mb fixed bottom-0 left-0 right-0 z-50 border-t border-[color:var(--mb-ink)] bg-[color:var(--mb-surface)] p-4"
      data-theme="light"
      role="region"
      aria-label="Cookie notice"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="flex-1 text-[color:var(--mb-ink)]">
          Mind Bridge uses only essential cookies, which keep you signed in and the site secure.{" "}
          <Link to="/cookie-policy" className="font-bold text-[color:var(--mb-ink)]">
            Learn more
          </Link>
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" onClick={handleAccept} className="mb-btn mb-btn-solid">
            Accept and continue
          </button>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="mb-btn mb-btn-line !px-3"
            aria-label="Dismiss cookie notice"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
