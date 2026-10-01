import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun, Phone } from "lucide-react";
import icon from "../../assets/mindbridge-icon.png";

const THEME_KEY = "mindbridge_theme";

function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* private mode: theme just won't persist */
    }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}

export function Brand({ small = false }) {
  return (
    <Link to="/" className="inline-flex items-center gap-3 no-underline text-[color:var(--mb-ink)]">
      <img src={icon} alt="" className={small ? "h-8 w-8 rounded" : "h-10 w-10 rounded"} />
      <span className="leading-tight">
        <span className="mb-sign block whitespace-nowrap text-2xl font-bold">Mind Bridge</span>
        {!small && (
          <span className="hidden text-sm text-[color:var(--mb-muted)] sm:block">
            University of San Agustin Guidance Services
          </span>
        )}
      </span>
    </Link>
  );
}

export function CrisisStrip() {
  return (
    <div className="mb-plate-amber">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
        <p className="font-semibold">In crisis right now? The NCMH hotline is free and open 24/7.</p>
        <a
          href="tel:1553"
          className="mb-sign inline-flex items-center gap-2 text-xl font-bold no-underline hover:underline"
          style={{ color: "inherit" }}
        >
          <Phone className="h-5 w-5" aria-hidden="true" />
          Call 1553
        </a>
      </div>
    </div>
  );
}

export default function PublicShell({ children, showAuthLinks = true }) {
  const [theme, toggle] = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <div className="mb h-[100dvh] overflow-y-auto overflow-x-hidden" data-theme={theme}>
      <CrisisStrip />
      <header className="border-b-2 border-[color:var(--mb-line)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Brand />
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Account">
            <button
              type="button"
              onClick={toggle}
              aria-label={`Switch to ${next} mode`}
              className="mb-btn mb-btn-line !min-h-[44px] !px-3"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Moon className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            {showAuthLinks && (
              <>
                <Link to="/login" className="mb-btn mb-btn-line hidden sm:inline-flex">
                  Log in
                </Link>
                <Link to="/signup" className="mb-btn mb-btn-solid whitespace-nowrap">
                  <span className="sm:hidden">Sign up</span>
                  <span className="hidden sm:inline">Create account</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-20 border-t-2 border-[color:var(--mb-line)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto]">
          <address className="not-italic text-[color:var(--mb-muted)]">
            <p className="font-bold text-[color:var(--mb-ink)]">University of San Agustin, Guidance Services</p>
            <p>General Luna Street, City Proper, Iloilo City 5000</p>
            <p>
              Phone 0951 189 6559 ·{" "}
              <a href="mailto:guidance@usa.edu.ph" className="text-[color:var(--mb-ink)]">
                guidance@usa.edu.ph
              </a>
            </p>
            <p>Messenger: USA- Guidance Services and Testing Center</p>
          </address>
          <nav aria-label="Legal" className="flex flex-col gap-2 md:items-end">
            <Link to="/privacy-policy" className="text-[color:var(--mb-ink)]">Privacy Policy</Link>
            <Link to="/terms" className="text-[color:var(--mb-ink)]">Terms and Conditions</Link>
            <Link to="/cookie-policy" className="text-[color:var(--mb-ink)]">Cookie Policy</Link>
          </nav>
        </div>
        <p className="mx-auto max-w-6xl px-4 pb-8 text-sm text-[color:var(--mb-muted)] sm:px-6">
          © {new Date().getFullYear()} Mind Bridge. Screening results are a guide for counselors and students, not a medical diagnosis.
        </p>
      </footer>
    </div>
  );
}
