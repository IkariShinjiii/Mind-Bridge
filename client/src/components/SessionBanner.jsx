import { useAuth } from "../AuthContext.jsx";

export default function SessionBanner() {
  const { hoursLeft, extendSession } = useAuth();
  if (!hoursLeft) return null;

  return (
    <div className="bg-amber-100 border-b border-amber-200 text-amber-800 text-sm px-6 py-2 flex items-center justify-between">
      <span>
        Your session will expire in about {hoursLeft} hour{hoursLeft === 1 ? "" : "s"}.
      </span>
      <button
        onClick={extendSession}
        className="font-semibold underline hover:no-underline"
      >
        Stay logged in
      </button>
    </div>
  );
}
