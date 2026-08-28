import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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

  // Close dropdown if you click outside of it
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
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto grid max-w-6xl grid-cols-3 items-center px-4 py-3 sm:px-6 lg:px-8">
          
          {/* LEFT: Logo */}
          <div className="flex items-center gap-3 justify-self-start">
            <Link to="/" className="flex items-center gap-3 group">
              <img src={icon} alt="Mind Bridge logo" className="h-8 w-8 rounded-md object-cover transition-transform group-hover:scale-105" />
              <div className="text-lg font-semibold tracking-tight hidden sm:block text-white">Mind Bridge</div>
            </Link>
          </div>

          {/* CENTER: Navigation Links */}
          <nav className="hidden items-center justify-center gap-6 text-sm text-gray-300 md:flex justify-self-center">
            {userRole === "admin" && (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`transition ${isLinkActive("/admin/dashboard") ? "text-cyan-400 font-semibold" : "hover:text-white"}`}
                >
                  Admin Panel
                </Link>
                <Link
                  to="/appointments"
                  className={`transition ${isLinkActive("/appointments") ? "text-cyan-400 font-semibold" : "hover:text-white"}`}
                >
                  Appointments
                </Link>
              </>
            )}

            {userRole === "counselor" && (
              <>
                <Link
                  to="/counselor/dashboard"
                  className={`transition ${isLinkActive("/counselor/dashboard") ? "text-cyan-400 font-semibold" : "hover:text-white"}`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/appointments"
                  className={`transition ${isLinkActive("/appointments") ? "text-cyan-400 font-semibold" : "hover:text-white"}`}
                >
                  Appointments
                </Link>
                <Link
                  to="/resources"
                  className={`transition ${isLinkActive("/resources") ? "text-cyan-400 font-semibold" : "hover:text-white"}`}
                >
                  Crisis Resources
                </Link>
              </>
            )}

            {userRole === "student" && (
              <>
                <Link
                  to="/student/dashboard"
                  className={`transition ${isLinkActive("/student/dashboard") ? "text-cyan-400 font-semibold" : "hover:text-white"}`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/appointments"
                  className={`transition ${isLinkActive("/appointments") ? "text-cyan-400 font-semibold" : "hover:text-white"}`}
                >
                  Appointments
                </Link>
                <Link
                  to="/resources"
                  className={`transition ${isLinkActive("/resources") ? "text-cyan-400 font-semibold" : "hover:text-white"}`}
                >
                  Crisis Resources
                </Link>
              </>
            )}
          </nav>

          {/* RIGHT: User Profile & Dropdown */}
          <div className="flex items-center gap-3 justify-self-end relative" ref={dropdownRef}>
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200 hidden sm:block">
              {safeRole}
            </span>
            <div className="hidden text-sm text-gray-200 sm:block">{safeName}</div>
            
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${currentGradient} text-xs font-bold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-transform hover:scale-105`}
              aria-label="Open user settings menu"
            >
              {userInitials}
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-12 mt-2 w-52 origin-top-right rounded-xl border border-gray-800 bg-gray-900 py-1.5 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-fade-up">
                <div className="px-4 py-2 border-b border-gray-800">
                  <p className="text-sm font-medium text-white truncate">{safeName}</p>
                  <p className="text-xs text-gray-400">{currentUser?.email || safeRole}</p>
                </div>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/settings");
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <span>⚙️</span>
                  <span>Account Settings</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors border-t border-gray-800/60"
                >
                  <span>🚪</span>
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}