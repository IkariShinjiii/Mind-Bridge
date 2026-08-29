import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  LifeBuoy,
  Settings,
  ClipboardList,
  ShieldCheck,
  LogOut,
  AlertCircle,
  Users,
} from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import icon from "../assets/mindbridge-icon.png";

export default function DashboardLayout({ children }) {
  const { currentUser, userRole, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const safeName = userData?.name || currentUser?.displayName || "Student";
  const safeRole = (userRole || "student").toUpperCase();
  const userInitials = (safeName || "U").slice(0, 2).toUpperCase();

  // Check if we should display the Google profile picture (Defaults to true if undefined)
  const showGoogleAvatar = userData?.useGoogleAvatar !== false && currentUser?.photoURL;

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const gradientMap = {
    cyan: "from-teal-500 to-cyan-600",
    purple: "from-indigo-500 to-slate-700",
    emerald: "from-emerald-500 to-teal-700",
    amber: "from-amber-500 to-orange-600",
    rose: "from-rose-500 to-pink-600",
  };
  const currentGradient = gradientMap[userData?.avatarGradient] || "from-teal-500 to-cyan-600";

  const isLinkActive = (path) => location.pathname === path;

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-gray-950 text-gray-100 font-sans">
      {/* ── Fixed Viewport Mesh Background ── */}
      <div className="app-mesh-bg" aria-hidden="true" />

      {/* ── Desktop & Tablet Header Bar ── */}
      <header className="sticky top-0 z-40 w-full shrink-0 border-b border-white/[0.08] bg-gray-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo & Branding - Flush Left */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0 interactive-tap">
            <img 
              src={icon} 
              alt="Mind Bridge logo" 
              className="h-8 w-8 rounded-xl object-cover shadow-md transition-transform group-hover:scale-105" 
            />
            <span className="text-lg font-bold tracking-tight text-white">
              Mind Bridge
            </span>
          </Link>

          {/* Desktop Navigation Links - Centered */}
          <nav className="hidden items-center justify-center gap-1.5 md:flex flex-1 mx-4">
            {userRole === "student" && (
              <>
                <NavLink to="/student/dashboard" active={isLinkActive("/student/dashboard")}>
                  Dashboard
                </NavLink>
                <NavLink to="/appointments" active={isLinkActive("/appointments")}>
                  Appointments
                </NavLink>
                <NavLink to="/resources" active={isLinkActive("/resources")}>
                  Crisis Resources
                </NavLink>
              </>
            )}

            {(userRole === "admin" || userRole === "counselor") && (
              <>
                <NavLink
                  to="/admin/dashboard"
                  active={location.pathname === "/admin/dashboard" && !location.search.includes("tab=accounts")}
                >
                  Dashboard
                </NavLink>
                <NavLink to="/appointments" active={isLinkActive("/appointments")}>
                  Schedule & Appointments
                </NavLink>
                <NavLink
                  to="/admin/dashboard?tab=accounts"
                  active={location.pathname === "/admin/dashboard" && location.search.includes("tab=accounts")}
                >
                  Manage Accounts & Assignments
                </NavLink>
              </>
            )}
          </nav>

          {/* User Profile & Dropdown Trigger - Flush Right */}
          <div className="relative flex items-center gap-3 shrink-0" ref={dropdownRef}>
            <div className="hidden flex-col items-end text-right sm:flex">
              <span className="text-xs font-semibold text-white truncate max-w-[130px]">
                {safeName}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-400">
                {(userRole === "admin" || userRole === "counselor") ? "STAFF / ADMIN" : safeRole}
              </span>
            </div>

            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-gray-900 shadow-md transition hover:border-teal-400 overflow-hidden interactive-tap"
              aria-label="User Profile Menu"
            >
              {showGoogleAvatar ? (
                <img
                  src={currentUser.photoURL}
                  alt="Profile"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={`h-full w-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${currentGradient}`}>
                  {userInitials}
                </div>
              )}
            </button>

            {/* Dropdown Card */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-14 w-60 origin-top-right rounded-2xl border border-white/10 bg-gray-900/95 p-2 shadow-2xl backdrop-blur-2xl z-50"
                >
                  <div className="border-b border-white/[0.08] px-3 py-2.5">
                    <p className="text-sm font-semibold text-white truncate">{safeName}</p>
                    <p className="text-xs text-gray-400 truncate">{currentUser?.email || safeRole}</p>
                  </div>

                  <div className="py-1.5 space-y-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate("/settings");
                      }}
                      className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-xs font-medium text-gray-200 hover:bg-white/[0.06] hover:text-white transition interactive-tap"
                    >
                      <Settings className="h-4 w-4 text-gray-400" />
                      <span>Account Settings</span>
                    </button>

                    {userRole === "student" && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate("/resources");
                        }}
                        className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-xs font-medium text-gray-200 hover:bg-white/[0.06] hover:text-white md:hidden transition interactive-tap"
                      >
                        <AlertCircle className="h-4 w-4 text-rose-400" />
                        <span>Crisis Resources</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-white/[0.08] pt-1.5">
                    <button
                      onClick={handleLogout}
                      className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition interactive-tap"
                    >
                      <LogOut className="h-4 w-4 text-rose-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── Scrollable Body Area ── */}
      <main className="relative flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-3.5 py-6 sm:px-6 lg:px-8 pb-24 md:pb-8">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mx-auto max-w-6xl w-full"
        >
          {children}
        </motion.div>
      </main>

      {/* ── Mobile Bottom Navigation Bar (< md) ── */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 block border-t border-white/[0.08] bg-gray-950/90 backdrop-blur-2xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 6px)" }}
      >
        <div className="flex h-16 items-center justify-around px-2">
          {userRole === "student" && (
            <>
              <MobileNavItem to="/student/dashboard" icon={LayoutDashboard} label="Dashboard" active={isLinkActive("/student/dashboard")} />
              <MobileNavItem to="/appointments" icon={Calendar} label="Booking" active={isLinkActive("/appointments")} />
              <MobileNavItem to="/resources" icon={LifeBuoy} label="Resources" active={isLinkActive("/resources")} />
              <MobileNavItem to="/settings" icon={Settings} label="Settings" active={isLinkActive("/settings")} />
            </>
          )}

          {(userRole === "admin" || userRole === "counselor") && (
            <>
              <MobileNavItem
                to="/admin/dashboard"
                icon={LayoutDashboard}
                label="Dashboard"
                active={location.pathname === "/admin/dashboard" && !location.search.includes("tab=accounts")}
              />
              <MobileNavItem to="/appointments" icon={Calendar} label="Schedule" active={isLinkActive("/appointments")} />
              <MobileNavItem
                to="/admin/dashboard?tab=accounts"
                icon={Users}
                label="Accounts"
                active={location.pathname === "/admin/dashboard" && location.search.includes("tab=accounts")}
              />
              <MobileNavItem to="/settings" icon={Settings} label="Settings" active={isLinkActive("/settings")} />
            </>
          )}
        </div>
      </nav>
    </div>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`min-h-[44px] flex items-center px-4 rounded-xl text-sm font-medium transition-all interactive-tap ${
        active
          ? "bg-teal-500/10 text-teal-300 border border-teal-500/20 shadow-sm"
          : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavItem({ to, icon: Icon, label, active }) {
  return (
    <Link
      to={to}
      className={`flex min-h-[44px] min-w-[58px] flex-col items-center justify-center rounded-xl px-2 py-1 text-center transition-all interactive-tap ${
        active ? "text-teal-400" : "text-gray-400 hover:text-gray-200"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="mt-1 text-[10px] font-semibold tracking-tight">{label}</span>
      {active && <div className="mt-0.5 h-1 w-4 rounded-full bg-teal-400" />}
    </Link>
  );
}