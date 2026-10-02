import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { Moon, Sun, Phone } from "lucide-react";
import icon from "../../assets/mindbridge-icon.png";

export function Brand({ small = false }) {
  return (
    <Link to="/" className="inline-flex min-h-[44px] items-center gap-3 no-underline text-[color:var(--mb-ink)]">
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
    <div className="mb-plate-amber !rounded-none">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
        <p className="font-semibold">In crisis right now? The NCMH hotline is free and open 24/7.</p>
        <a
          href="tel:1553"
          className="mb-sign inline-flex min-h-[44px] items-center gap-2 text-xl font-bold no-underline hover:underline"
          style={{ color: "inherit" }}
        >
          <Phone className="h-5 w-5" aria-hidden="true" />
          Call 1553
        </a>
      </div>
    </div>
  );
}

export interface PublicShellProps {
  children?: ReactNode;
  showAuthLinks?: boolean;
  /** Soft gradient page background (used by the auth screens). */
  calm?: boolean;
}

export default function PublicShell({ children, showAuthLinks = true, calm = false }: PublicShellProps) {
  const [theme, toggle] = useTheme();
  const { currentUser, userRole, logout } = useAuth();
  const dashboard = userRole === "admin" ? "/admin/dashboard" : "/student/dashboard";
  const next = theme === "dark" ? "light" : "dark";

  return (
    <div className={`mb h-[100dvh] overflow-y-auto overflow-x-hidden${calm ? " mb-calm-bg" : ""}`} data-theme={theme}>
      <a href="#main-content" className="mb-skip">
        Skip to main content
      </a>
      <CrisisStrip />
      <header className="border-b border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] shadow-mb-sm">
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
            {currentUser ? (
              <>
                <Link to={dashboard} className="mb-btn mb-btn-solid whitespace-nowrap">
                  Dashboard
                </Link>
                <button type="button" onClick={logout} className="mb-btn mb-btn-line whitespace-nowrap">
                  Log out
                </button>
              </>
            ) : (
              showAuthLinks && (
                <>
                  <Link to="/login" className="mb-btn mb-btn-line hidden sm:inline-flex">
                    Log in
                  </Link>
                  <Link to="/signup" className="mb-btn mb-btn-solid whitespace-nowrap">
                    <span className="sm:hidden">Sign up</span>
                    <span className="hidden sm:inline">Create account</span>
                  </Link>
                </>
              )
            )}
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>

      <footer className="mt-16 border-t border-[color:var(--mb-line)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto]">
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
          <nav aria-label="Legal" className="flex flex-col md:items-end">
            <Link
              to="/privacy-policy"
              className="inline-flex min-h-[44px] items-center text-[color:var(--mb-ink)] underline"
            >
              Privacy Policy
            </Link>
            <Link to="/terms" className="inline-flex min-h-[44px] items-center text-[color:var(--mb-ink)] underline">
              Terms and Conditions
            </Link>
            <Link
              to="/cookie-policy"
              className="inline-flex min-h-[44px] items-center text-[color:var(--mb-ink)] underline"
            >
              Cookie Policy
            </Link>
          </nav>
        </div>
        <p className="mx-auto max-w-6xl px-4 pb-8 text-sm text-[color:var(--mb-muted)] sm:px-6">
          © {new Date().getFullYear()} Mind Bridge. Screening results are a guide for counselors and students, not a
          medical diagnosis.
        </p>
      </footer>
    </div>
  );
}
