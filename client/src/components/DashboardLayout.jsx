import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import icon from "../assets/mindbridge-icon.png";

export default function DashboardLayout({ children }) {
  // Added userData here to pull from your Firestore database!
  const { currentUser, userRole, userData, logout } = useAuth();
  const navigate = useNavigate();

  // Now it checks Firestore FIRST, then Google, then falls back to "Student"
  const safeName = userData?.name || currentUser?.displayName || "Student";
  const safeRole = (userRole || "student").toUpperCase();

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
      <header className="border-b border-white/10 bg-gray-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          
          <div className="flex items-center gap-3">
            <img src={icon} alt="Mind Bridge logo" className="h-8 w-8 rounded-md object-cover" />
            <div className="text-lg font-semibold tracking-tight">Mind Bridge</div>
          </div>

          <nav className="hidden items-center gap-4 text-sm text-gray-300 md:flex">
            <Link to="/" className="transition hover:text-white">Home</Link>
            
            {userRole === "admin" && (
              <Link to="/admin/dashboard" className="transition hover:text-cyan-400 font-semibold">Admin Panel</Link>
            )}
            {userRole === "counselor" && (
              <Link to="/counselor/dashboard" className="transition hover:text-cyan-400 font-semibold">Counselor Dashboard</Link>
            )}
            {userRole === "student" && (
              <Link to="/student/dashboard" className="transition hover:text-cyan-400">Dashboard</Link>
            )}
            
            <button onClick={handleLogout} className="transition hover:text-white">Log out</button>
          </nav>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200">
              {safeRole}
            </span>
            <div className="hidden text-sm text-gray-200 sm:block">{safeName}</div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600" />
          </div>

        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}