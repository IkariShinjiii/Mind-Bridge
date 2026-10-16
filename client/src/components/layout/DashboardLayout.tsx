import { useRef, useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Calendar, LifeBuoy, Settings, Users, Phone } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import AccountMenu from "./AccountMenu";
import { ToastViewport } from "../ui/Toast";
import icon from "../../assets/mindbridge-icon.png";

export default function DashboardLayout({ children }: { children?: ReactNode }) {
  const { userRole } = useAuth();
  const location = useLocation();
  const [theme] = useTheme();
  const mainRef = useRef<HTMLElement>(null);

  const isStaff = userRole === "admin";

  const isAccountsTab = location.pathname === "/admin/dashboard" && location.search.includes("tab=accounts");
  const isHere = (path: string) => location.pathname === path;

  const links = isStaff
    ? [
        {
          to: "/admin/dashboard",
          label: "Dashboard",
          short: "Dashboard",
          icon: LayoutDashboard,
          active: location.pathname === "/admin/dashboard" && !isAccountsTab,
        },
        {
          to: "/appointments",
          label: "Schedule and appointments",
          short: "Schedule",
          icon: Calendar,
          active: isHere("/appointments"),
        },
        {
          to: "/admin/dashboard?tab=accounts",
          label: "Accounts and assignments",
          short: "Accounts",
          icon: Users,
          active: isAccountsTab,
        },
      ]
    : [
        {
          to: "/student/dashboard",
          label: "Dashboard",
          short: "Dashboard",
          icon: LayoutDashboard,
          active: isHere("/student/dashboard"),
        },
        {
          to: "/appointments",
          label: "Appointments",
          short: "Booking",
          icon: Calendar,
          active: isHere("/appointments"),
        },
        {
          to: "/resources",
          label: "Crisis resources",
          short: "Resources",
          icon: LifeBuoy,
          active: isHere("/resources"),
        },
      ];

  // After navigating, move focus to the page so keyboard and screen reader users start at the top of it.
  // App remounts this layout on every route change, so "first render" can't tell a navigation from the initial
  // load; the router gives the first entry the key "default" and every later one a unique key.
  useEffect(() => {
    if (location.key === "default") return;
    mainRef.current?.focus({ preventScroll: true });
    mainRef.current?.scrollTo({ top: 0 });
  }, [location.key]);

  return (
    <div className="mb flex h-[100dvh] w-full overflow-hidden" data-theme={theme}>
      <a href="#main-content" className="mb-skip">
        Skip to main content
      </a>

      <aside className="hidden w-72 shrink-0 flex-col border-r border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] lg:flex">
        <Link to="/" className="flex min-h-[44px] items-center gap-3 px-6 py-5 text-[color:var(--mb-ink)] no-underline">
          <img src={icon} alt="" className="h-8 w-8 rounded-md" />
          <span className="mb-sign whitespace-nowrap text-2xl font-bold">Mind Bridge</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Main">
          {links.map(({ to, label, active, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 font-bold no-underline transition-colors ${
                active
                  ? "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)]"
                  : "text-[color:var(--mb-ink)] hover:bg-[color:var(--mb-brand-bg)]"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="space-y-1 border-t border-[color:var(--mb-line)] p-3">
          {!isStaff && (
            <a
              href="tel:1553"
              className="mb-plate-amber mb-sign mb-2 flex min-h-[44px] items-center justify-center gap-2 px-3 text-lg font-bold no-underline"
              style={{ color: "var(--mb-amber-ink)" }}
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Crisis 1553
            </a>
          )}
          <Link
            to="/settings"
            aria-current={isHere("/settings") ? "page" : undefined}
            className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 font-bold no-underline transition-colors ${
              isHere("/settings")
                ? "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)]"
                : "text-[color:var(--mb-ink)] hover:bg-[color:var(--mb-brand-bg)]"
            }`}
          >
            <Settings className="h-5 w-5 shrink-0" aria-hidden="true" />
            Settings
          </Link>
          <AccountMenu placement="above" showName />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phones have no sidebar, so they keep a slim top bar. From lg up everything lives in the sidebar. */}
        <header className="relative z-30 shrink-0 border-b border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] lg:hidden">
          <div className="flex h-16 w-full items-center gap-3 px-4 sm:px-6">
            <Link to="/" className="flex min-h-[44px] shrink-0 items-center gap-3 text-[color:var(--mb-ink)] no-underline">
              <img src={icon} alt="" className="h-8 w-8 rounded-md" />
              <span className="mb-sign whitespace-nowrap text-2xl font-bold">Mind Bridge</span>
            </Link>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              {!isStaff && (
                <a
                  href="tel:1553"
                  className="mb-plate-amber mb-sign hidden min-h-[44px] items-center gap-2 px-3 text-lg font-bold no-underline sm:inline-flex"
                  style={{ color: "var(--mb-amber-ink)" }}
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  Crisis 1553
                </a>
              )}
              <AccountMenu placement="below" />
            </div>
          </div>
        </header>

        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="relative flex-1 focus:outline-none overflow-y-auto overflow-x-hidden px-4 py-6 pb-24 sm:px-6 lg:pb-8 lg:px-8"
        >
          <div key={location.pathname} className="w-full">
            {children}
          </div>
        </main>
      </div>

      <ToastViewport />

      <nav
        aria-label="Main"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] shadow-mb-lg lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex h-16 items-stretch justify-around gap-1 px-3 py-1">
          {[...links, { to: "/settings", short: "Settings", icon: Settings, active: isHere("/settings") }].map(
            ({ to, short, icon: Icon, active }) => (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-md no-underline transition-colors ${
                  active
                    ? "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)]"
                    : "text-[color:var(--mb-ink)] hover:bg-[color:var(--mb-brand-bg)]"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-bold">{short}</span>
              </Link>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}
