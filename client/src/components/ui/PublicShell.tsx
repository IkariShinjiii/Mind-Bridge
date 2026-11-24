import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { Moon, Sun, Phone } from "lucide-react";
import Logo from "./Logo";

export function Brand({ small = false, hideNameOnPhone = false }) {
  return (
    <Link to="/" className="inline-flex min-h-[44px] items-center gap-3 no-underline text-[color:var(--mb-ink)]">
      <Logo className={small ? "h-8 w-8 rounded" : "h-10 w-10 rounded"} />
      <span className="leading-tight max-[379px]:sr-only">
        <span
          className={`mb-sign block whitespace-nowrap text-2xl font-bold${hideNameOnPhone ? " max-sm:sr-only" : ""}`}
        >
          Mind Bridge
        </span>
        {!small && (
          <span className="hidden text-sm text-[color:var(--mb-muted)] lg:block">
            University of San Agustin Guidance Services
          </span>
        )}
      </span>
    </Link>
  );
}

/** The crisis line, in the header on every public page so it is one tap away without scrolling. */
export function CrisisLink() {
  return (
    <a
      href="tel:1553"
      title="National Center for Mental Health crisis hotline. Free, open 24/7."
      className="mb-plate-amber mb-sign inline-flex min-h-[44px] items-center gap-2 px-3 text-lg font-bold no-underline"
      style={{ color: "var(--mb-amber-ink)" }}
    >
      <Phone className="h-4 w-4" aria-hidden="true" />
      <span className="max-sm:sr-only">Crisis </span>1553
      <span className="hidden text-base font-semibold lg:inline">· free, 24/7</span>
    </a>
  );
}

const quietLink =
  "inline-flex min-h-[44px] items-center whitespace-nowrap rounded-lg px-3 font-bold text-[color:var(--mb-ink)] no-underline transition-colors hover:bg-[color:var(--mb-brand-bg)]";

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
      {/* One bar, kept in view: the brand, the crisis line, then the account actions with a single solid button.
          Phones show only the crisis line, the theme switch and (when signed in) Dashboard; the page itself carries
          the sign-up and log-in buttons right under the headline. */}
      <header className="sticky top-0 z-30 border-b border-[color:var(--mb-line)] bg-[color:var(--mb-surface)]">
        <div className="flex h-16 w-full items-center gap-3 px-4 sm:px-6">
          <Brand hideNameOnPhone={Boolean(currentUser && showAuthLinks)} />
          <nav className="ml-auto flex items-center gap-1 sm:gap-2" aria-label="Account">
            <CrisisLink />
            {currentUser ? (
              <>
                <button type="button" onClick={logout} className={`${quietLink} max-sm:hidden`}>
                  Log out
                </button>
                {showAuthLinks && (
                  <Link to={dashboard} className="mb-btn mb-btn-solid whitespace-nowrap">
                    Dashboard
                  </Link>
                )}
              </>
            ) : (
              showAuthLinks && (
                <>
                  <Link to="/login" className={`${quietLink} max-md:hidden`}>
                    Log in
                  </Link>
                  <Link to="/signup" className="mb-btn mb-btn-solid whitespace-nowrap max-sm:hidden">
                    Create account
                  </Link>
                </>
              )
            )}
            <button
              type="button"
              onClick={toggle}
              aria-label={`Switch to ${next} mode`}
              className={`${quietLink} w-11 justify-center !px-0`}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Moon className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>

      <footer className="mt-16 border-t border-[color:var(--mb-line)]">
        <div className="grid w-full gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto]">
          <address className="not-italic text-[color:var(--mb-muted)]">
            <p className="font-bold text-[color:var(--mb-ink)]">University of San Agustin, Guidance Services</p>
            <p>General Luna Street, City Proper, Iloilo City 5000</p>
            <p>
              Phone{" "}
              <a href="tel:+639511896559" className="text-[color:var(--mb-ink)]">
                0951 189 6559
              </a>{" "}
              ·{" "}
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
        <p className="w-full px-4 pb-8 text-sm text-[color:var(--mb-muted)] sm:px-6">
          © {new Date().getFullYear()} Mind Bridge. Screening results are a guide for peer facilitators and students,
          not a medical diagnosis.
        </p>
      </footer>
    </div>
  );
}
