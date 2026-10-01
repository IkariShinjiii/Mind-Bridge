import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  LifeBuoy,
  Settings,
  LogOut,
  Users,
  Moon,
  Sun,
  Phone,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../ui/PublicShell";
import icon from "../../assets/mindbridge-icon.png";

const GRADIENTS = {
  cyan: "from-teal-500 to-cyan-600",
  purple: "from-indigo-500 to-slate-700",
  emerald: "from-emerald-500 to-teal-700",
  amber: "from-amber-500 to-orange-600",
  rose: "from-rose-500 to-pink-600",
};

export default function DashboardLayout({ children }) {
  const { currentUser, userRole, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, toggleTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const safeName = userData?.name || currentUser?.displayName || "Student";
  const isStaff = userRole === "admin" || userRole === "counselor";
  const roleLabel = isStaff ? "Staff" : "Student";
  const initials = (safeName || "U").slice(0, 2).toUpperCase();
  const showGoogleAvatar = userData?.useGoogleAvatar !== false && currentUser?.photoURL;
  const gradient = GRADIENTS[userData?.avatarGradient] || GRADIENTS.cyan;
  const next = theme === "dark" ? "light" : "dark";

  const isAccountsTab = location.pathname === "/admin/dashboard" && location.search.includes("tab=accounts");
  const isHere = (path) => location.pathname === path;

  const links = isStaff
    ? [
        { to: "/admin/dashboard", label: "Dashboard", short: "Dashboard", icon: LayoutDashboard, active: location.pathname === "/admin/dashboard" && !isAccountsTab },
        { to: "/appointments", label: "Schedule and appointments", short: "Schedule", icon: Calendar, active: isHere("/appointments") },
        { to: "/admin/dashboard?tab=accounts", label: "Accounts and assignments", short: "Accounts", icon: Users, active: isAccountsTab },
      ]
    : [
        { to: "/student/dashboard", label: "Dashboard", short: "Dashboard", icon: LayoutDashboard, active: isHere("/student/dashboard") },
        { to: "/appointments", label: "Appointments", short: "Booking", icon: Calendar, active: isHere("/appointments") },
        { to: "/resources", label: "Crisis resources", short: "Resources", icon: LifeBuoy, active: isHere("/resources") },
      ];

  useEffect(() => {
    function onDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <div className="mb flex h-[100dvh] w-full flex-col overflow-hidden" data-theme={theme}>
      <header className="shrink-0 border-b-2 border-[color:var(--mb-ink)] bg-[color:var(--mb-surface)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2.5 text-[color:var(--mb-ink)] no-underline">
            <img src={icon} alt="" className="h-8 w-8 rounded" />
            <span className="mb-sign whitespace-nowrap text-2xl font-bold">Mind Bridge</span>
          </Link>

          <nav className="mx-4 hidden flex-1 items-center gap-1 md:flex" aria-label="Main">
            {links.map(({ to, label, active }) => (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[44px] items-center rounded px-4 font-bold no-underline transition-colors ${
                  active
                    ? "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)]"
                    : "text-[color:var(--mb-ink)] hover:bg-[color:var(--mb-ground)]"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="relative ml-auto flex shrink-0 items-center gap-2" ref={menuRef}>
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
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${next} mode`}
              className="mb-btn mb-btn-line !min-h-[44px] !px-3"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-[color:var(--mb-ink)]"
            >
              {showGoogleAvatar ? (
                <img src={currentUser.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} text-sm font-bold text-white`}>
                  {initials}
                </span>
              )}
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-14 z-50 w-64 rounded-md border-2 border-[color:var(--mb-ink)] bg-[color:var(--mb-surface)] p-2"
              >
                <div className="border-b-2 border-[color:var(--mb-line)] px-3 py-2">
                  <p className="truncate font-bold">{safeName}</p>
                  <p className="truncate text-sm text-[color:var(--mb-muted)]">{currentUser?.email}</p>
                  <p className="text-sm font-bold text-[color:var(--mb-muted)]">{roleLabel}</p>
                </div>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/settings");
                  }}
                  className="mt-1 flex min-h-[44px] w-full items-center gap-3 rounded px-3 font-bold hover:bg-[color:var(--mb-ground)]"
                >
                  <Settings className="h-5 w-5" aria-hidden="true" /> Account settings
                </button>
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded px-3 font-bold text-[color:var(--mb-error-ink)] hover:bg-[color:var(--mb-error-bg)]"
                >
                  <LogOut className="h-5 w-5" aria-hidden="true" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-24 sm:px-6 md:pb-8 lg:px-8">
        <div key={location.pathname} className="mx-auto w-full max-w-6xl">
          {children}
        </div>
      </main>

      <nav
        aria-label="Main"
        className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-[color:var(--mb-ink)] bg-[color:var(--mb-surface)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex h-16 items-stretch justify-around">
          {[...links, { to: "/settings", short: "Settings", icon: Settings, active: isHere("/settings") }].map(
            ({ to, short, icon: Icon, active }) => (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-[64px] flex-1 flex-col items-center justify-center gap-0.5 no-underline ${
                  active
                    ? "bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)]"
                    : "text-[color:var(--mb-ink)]"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-bold">{short}</span>
              </Link>
            )
          )}
        </div>
      </nav>
    </div>
  );
}
