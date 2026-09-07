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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 p-4 shadow-2xl animate-fade-up">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 text-sm text-gray-300">
          We use essential cookies to ensure our platform functions securely and to provide you with the best experience. By continuing to use Mind Bridge, you consent to our use of these strictly necessary cookies.{" "}
          <Link to="/cookie-policy" className="text-teal-400 hover:underline">
            Learn more
          </Link>
          .
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleAccept}
            className="bg-teal-500 hover:bg-teal-400 text-teal-950 px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Accept & Continue
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
