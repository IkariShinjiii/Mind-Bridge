import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import icon from "../assets/mindbridge-icon.png";

export default function DashboardLayout({ children }) {
  const { currentUser, userRole, userData, logout } = useAuth();
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto grid max-w-6xl grid-cols-3 items-center px-4 py-3 sm:px-6 lg:px-8">
          
          {/* LEFT: Logo */}
          <div className="flex items-center gap-3 justify-self-start">
            <img src={icon} alt="Mind Bridge logo" className="h-8 w-8 rounded-md object-cover" />
            <div className="text-lg font-semibold tracking-tight hidden sm:block">Mind Bridge</div>
          </div>

          {/* CENTER: Navigation Links */}
          <nav className="hidden items-center justify-center gap-6 text-sm text-gray-300 md:flex justify-self-center">
            <Link to="/" className="transition hover:text-white">Home</Link>
            {userRole === "admin" && <Link to="/admin/dashboard" className="transition hover:text-cyan-400 font-semibold">Admin Panel</Link>}
            {userRole === "counselor" && <Link to="/counselor/dashboard" className="transition hover:text-cyan-400 font-semibold">Counselor Dashboard</Link>}
            {userRole === "student" && <Link to="/student/dashboard" className="transition hover:text-cyan-400">Dashboard</Link>}
          </nav>

          {/* RIGHT: User Profile & Dropdown */}
          <div className="flex items-center gap-3 justify-self-end relative" ref={dropdownRef}>
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200 hidden sm:block">
              {safeRole}
            </span>
            <div className="hidden text-sm text-gray-200 sm:block">{safeName}</div>
            
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-transform hover:scale-105"
            />

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-12 mt-2 w-48 origin-top-right rounded-xl border border-gray-800 bg-gray-900 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="px-4 py-2 border-b border-gray-800 sm:hidden">
                  <p className="text-sm font-medium text-white">{safeName}</p>
                  <p className="text-xs text-gray-400">{safeRole}</p>
                </div>
                <button onClick={() => setDropdownOpen(false)} className="block w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                  Account Settings
                </button>
                <button onClick={handleLogout} className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors">
                  Log out
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