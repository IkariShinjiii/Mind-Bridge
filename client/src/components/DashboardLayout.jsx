import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../AuthContext.jsx";
import icon from "../assets/mindbridge-icon.png";
import usaLogo from "../assets/usa-logo.png";

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
    cyan: "from-cyan-500 to-blue-600",
    purple: "from-purple-500 to-indigo-600",
    emerald: "from-emerald-500 to-teal-600",
    amber: "from-amber-500 to-orange-600",
    rose: "from-rose-500 to-pink-600",
  };
  const currentGradient = gradientMap[userData?.avatarGradient] || "from-cyan-500 to-blue-600";

  const isLinkActive = (path) => location.pathname === path;

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-gray-950 text-gray-100 font-sans">
      {/* ── Fixed Viewport Mesh Background ── */}
      <div className="app-mesh-bg" aria-hidden="true" />

      {/* ── Desktop & Tablet Header Bar ── */}
      <header className="sticky top-0 z-40 w-full shrink-0 border-b border-white/[0.08] bg-gray-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo & Branding */}
          <Link to="/" className="flex items-center gap-3 group shrink-0 interactive-tap">
            <div className="flex items-center gap-2">
              <img 
                src={usaLogo} 
                alt="University of San Agustin seal" 
                className="h-8 w-auto object-contain transition-transform group-hover:scale-105" 
              />
              <span className="h-4 w-px bg-gray-700/80" />
              <img 
                src={icon} 
                alt="Mind Bridge logo" 
                className="h-8 w-8 rounded-xl object-cover shadow-md transition-transform group-hover:scale-105" 
              />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Mind Bridge
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-1.5 md:flex">
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

            {userRole === "counselor" && (
              <>
                <NavLink to="/counselor/dashboard" active={isLinkActive("/counselor/dashboard")}>
                  Triage Dashboard
                </NavLink>
                <NavLink to="/appointments" active={isLinkActive("/appointments")}>
                  Appointments
                </NavLink>
              </>
            )}

            {userRole === "admin" && (
              <>
                <NavLink to="/admin/dashboard" active={isLinkActive("/admin/dashboard")}>
                  Admin Panel
                </NavLink>
                <NavLink to="/appointments" active={isLinkActive("/appointments")}>
                  Appointments
                </NavLink>
              </>
            )}
          </nav>

          {/* User Profile & Dropdown */}
          <div className="relative flex items-center gap-3" ref={dropdownRef}>
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-semibold text-gray-200 max-w-[130px] truncate">
                {safeName}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                {safeRole}
              </span>
            </div>

            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-gray-900/90 shadow-md transition-all hover:border-cyan-500/50 hover:bg-gray-800 interactive-tap overflow-hidden"
              aria-label="Open user menu"
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
                      <span className="text-base">⚙️</span>
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
                        <span className="text-base">🆘</span>
                        <span>Crisis Resources</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-white/[0.08] pt-1.5">
                    <button
                      onClick={handleLogout}
                      className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition interactive-tap"
                    >
                      <span className="text-base">🚪</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── Scroll-Isolated Inner Content ── */}
      <main className="relative flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-3.5 py-6 sm:px-6 sm:py-8 lg:px-8 pb-28 md:pb-12">
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
              <MobileNavItem to="/student/dashboard" icon="📊" label="Dashboard" active={isLinkActive("/student/dashboard")} />
              <MobileNavItem to="/appointments" icon="📅" label="Booking" active={isLinkActive("/appointments")} />
              <MobileNavItem to="/resources" icon="🆘" label="Resources" active={isLinkActive("/resources")} />
              <MobileNavItem to="/settings" icon="⚙️" label="Settings" active={isLinkActive("/settings")} />
            </>
          )}

          {userRole === "counselor" && (
            <>
              <MobileNavItem to="/counselor/dashboard" icon="📋" label="Triage" active={isLinkActive("/counselor/dashboard")} />
              <MobileNavItem to="/appointments" icon="📅" label="Schedule" active={isLinkActive("/appointments")} />
              <MobileNavItem to="/settings" icon="⚙️" label="Settings" active={isLinkActive("/settings")} />
            </>
          )}

          {userRole === "admin" && (
            <>
              <MobileNavItem to="/admin/dashboard" icon="🛡️" label="Admin" active={isLinkActive("/admin/dashboard")} />
              <MobileNavItem to="/appointments" icon="📅" label="Bookings" active={isLinkActive("/appointments")} />
              <MobileNavItem to="/settings" icon="⚙️" label="Settings" active={isLinkActive("/settings")} />
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
          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm"
          : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavItem({ to, icon, label, active }) {
  return (
    <Link
      to={to}
      className={`flex min-h-[44px] min-w-[58px] flex-col items-center justify-center rounded-xl px-2 py-1 text-center transition-all interactive-tap ${
        active ? "text-cyan-400" : "text-gray-400 hover:text-gray-200"
      }`}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="mt-1 text-[10px] font-semibold tracking-tight">{label}</span>
      {active && <div className="mt-0.5 h-1 w-4 rounded-full bg-cyan-400" />}
    </Link>
  );
}