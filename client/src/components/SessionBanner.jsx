import { useAuth } from "../AuthContext.jsx";

export default function SessionBanner() {
  const { hoursLeft, extendSession } = useAuth();
  if (!hoursLeft) return null;

  return (
    <div className="border-b border-amber-200 bg-gradient-to-r from-amber-50 via-amber-100 to-yellow-50 px-3 py-2 text-amber-800 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-center text-sm sm:flex-row sm:text-left">
        <span className="animate-fade-up">
          Your session will expire in about {hoursLeft} hour{hoursLeft === 1 ? "" : "s"}.
        </span>
        <button
          onClick={extendSession}
          className="soft-button rounded-full border border-amber-300 bg-white/70 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm hover:bg-white"
        >
          Stay logged in
        </button>
      </div>
    </div>
  );
}
