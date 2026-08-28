import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  const userInitials = (safeName || "U").slice(0, 2).toUpperCase();

  const isLinkActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-gray-800/80 bg-gray-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          
          {/* LEFT: Logo & Branding */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="flex items-center gap-1.5">
              <img src={usaLogo} alt="University of San Agustin seal" className="h-7 w-auto object-contain transition-transform group-hover:scale-105" />
              <span className="h-4 w-px bg-gray-700" />
              <img src={icon} alt="Mind Bridge logo" className="h-7 w-7 rounded-lg object-cover transition-transform group-hover:scale-105 shadow-sm" />
            </div>
            <div className="text-lg font-bold tracking-tight text-white">
              <span>Mind Bridge</span>
            </div>
          </Link>

          {/* CENTER: Desktop Navigation Links */}
          <nav className="hidden items-center justify-center gap-6 text-sm text-gray-300 md:flex">
            {userRole === "admin" && (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`transition-colors py-1 ${isLinkActive("/admin/dashboard") ? "text-cyan-400 font-semibold border-b-2 border-cyan-400" : "hover:text-white"}`}
                >
                  Admin Panel
                </Link>
                <Link
                  to="/appointments"
                  className={`transition-colors py-1 ${isLinkActive("/appointments") ? "text-cyan-400 font-semibold border-b-2 border-cyan-400" : "hover:text-white"}`}
                >
                  Appointments
                </Link>
              </>
            )}

            {userRole === "counselor" && (
              <>
                <Link
                  to="/counselor/dashboard"
                  className={`transition-colors py-1 ${isLinkActive("/counselor/dashboard") ? "text-cyan-400 font-semibold border-b-2 border-cyan-400" : "hover:text-white"}`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/appointments"
                  className={`transition-colors py-1 ${isLinkActive("/appointments") ? "text-cyan-400 font-semibold border-b-2 border-cyan-400" : "hover:text-white"}`}
                >
                  Appointments
                </Link>
              </>
            )}

            {userRole === "student" && (
              <>
                <Link
                  to="/student/dashboard"
                  className={`transition-colors py-1 ${isLinkActive("/student/dashboard") ? "text-cyan-400 font-semibold border-b-2 border-cyan-400" : "hover:text-white"}`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/appointments"
                  className={`transition-colors py-1 ${isLinkActive("/appointments") ? "text-cyan-400 font-semibold border-b-2 border-cyan-400" : "hover:text-white"}`}
                >
                  Appointments
                </Link>
                <Link
                  to="/resources"
                  className={`transition-colors py-1 ${isLinkActive("/resources") ? "text-cyan-400 font-semibold border-b-2 border-cyan-400" : "hover:text-white"}`}
                >
                  Crisis Resources
                </Link>
              </>
            )}
          </nav>

          {/* RIGHT: User Profile & Dropdown */}
          <div className="flex items-center gap-2.5 sm:gap-3 relative shrink-0" ref={dropdownRef}>
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-cyan-300 font-semibold hidden sm:block">
              {safeRole}
            </span>
            <div className="hidden text-sm font-medium text-gray-200 sm:block max-w-[130px] truncate">{safeName}</div>
            
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${currentGradient} text-xs font-bold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-transform hover:scale-105`}
              aria-label="Open user menu"
            >
              {userInitials}
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-12 mt-1.5 w-56 origin-top-right rounded-2xl border border-gray-800 bg-gray-900/95 backdrop-blur-md p-1.5 shadow-2xl ring-1 ring-black/10 focus:outline-none z-50 animate-fade-up">
                <div className="px-3.5 py-2.5 border-b border-gray-800/80">
                  <p className="text-sm font-semibold text-white truncate">{safeName}</p>
                  <p className="text-xs text-gray-400 truncate">{currentUser?.email || safeRole}</p>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate("/settings");
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-gray-200 hover:bg-gray-800 hover:text-white rounded-xl transition-colors"
                  >
                    <span>⚙️</span>
                    <span>Account Settings</span>
                  </button>

                  {userRole === "student" && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate("/resources");
                      }}
                      className="flex md:hidden w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-gray-200 hover:bg-gray-800 hover:text-white rounded-xl transition-colors"
                    >
                      <span>🆘</span>
                      <span>Crisis Resources</span>
                    </button>
                  )}
                </div>

                <div className="pt-1 border-t border-gray-800/80">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors"
                  >
                    <span>🚪</span>
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-6xl px-3.5 py-6 sm:px-6 sm:py-8 lg:px-8 pb-24 md:pb-12 flex-1">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar (< md) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-gray-800/90 bg-gray-950/90 backdrop-blur-lg px-2 py-1.5 shadow-2xl">
        <div className="flex items-center justify-around">
          {userRole === "student" && (
            <>
              <Link
                to="/student/dashboard"
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
                  isLinkActive("/student/dashboard") ? "text-cyan-400 font-semibold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="text-base">📊</span>
                <span className="text-[10px] tracking-tight">Dashboard</span>
              </Link>

              <Link
                to="/appointments"
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
                  isLinkActive("/appointments") ? "text-cyan-400 font-semibold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="text-base">📅</span>
                <span className="text-[10px] tracking-tight">Appointments</span>
              </Link>

              <Link
                to="/resources"
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
                  isLinkActive("/resources") ? "text-cyan-400 font-semibold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="text-base">🆘</span>
                <span className="text-[10px] tracking-tight">Resources</span>
              </Link>

              <Link
                to="/settings"
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
                  isLinkActive("/settings") ? "text-cyan-400 font-semibold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="text-base">⚙️</span>
                <span className="text-[10px] tracking-tight">Settings</span>
              </Link>
            </>
          )}

          {userRole === "counselor" && (
            <>
              <Link
                to="/counselor/dashboard"
                className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition ${
                  isLinkActive("/counselor/dashboard") ? "text-cyan-400 font-semibold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="text-base">📋</span>
                <span className="text-[10px] tracking-tight">Triage</span>
              </Link>

              <Link
                to="/appointments"
                className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition ${
                  isLinkActive("/appointments") ? "text-cyan-400 font-semibold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="text-base">📅</span>
                <span className="text-[10px] tracking-tight">Appointments</span>
              </Link>

              <Link
                to="/settings"
                className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition ${
                  isLinkActive("/settings") ? "text-cyan-400 font-semibold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="text-base">⚙️</span>
                <span className="text-[10px] tracking-tight">Settings</span>
              </Link>
            </>
          )}

          {userRole === "admin" && (
            <>
              <Link
                to="/admin/dashboard"
                className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition ${
                  isLinkActive("/admin/dashboard") ? "text-cyan-400 font-semibold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="text-base">🛡️</span>
                <span className="text-[10px] tracking-tight">Admin</span>
              </Link>

              <Link
                to="/appointments"
                className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition ${
                  isLinkActive("/appointments") ? "text-cyan-400 font-semibold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="text-base">📅</span>
                <span className="text-[10px] tracking-tight">Appointments</span>
              </Link>

              <Link
                to="/settings"
                className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition ${
                  isLinkActive("/settings") ? "text-cyan-400 font-semibold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="text-base">⚙️</span>
                <span className="text-[10px] tracking-tight">Settings</span>
              </Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}