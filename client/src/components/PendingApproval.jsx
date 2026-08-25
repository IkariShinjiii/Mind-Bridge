import { useAuth } from "../AuthContext.jsx";

export default function PendingApproval() {
  const { logout } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-mist via-[#eef1f8] to-[#e8f5f1] flex items-center justify-center px-4 py-8 sm:px-6">
      <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-teal/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-ink/10 blur-3xl" />

      <div className="relative w-full max-w-md rounded-[30px] border border-ink/5 bg-white/95 p-6 text-center shadow-[0_20px_60px_rgba(17,24,39,0.12)] sm:p-8">
        <p className="text-teal font-semibold tracking-[0.2em] text-[10px] sm:text-xs mb-3">ACCOUNT PENDING</p>
        <h1 className="font-display text-2xl sm:text-3xl text-ink mb-3">Waiting on admin approval</h1>
        <p className="text-sm sm:text-base text-ink/60 mb-6">
          Your counselor account has been created, but an administrator needs to approve it before you can view
          student check-ins. This keeps confidential wellness data limited to verified staff.
        </p>
        <button
          onClick={() => logout()}
          className="rounded-lg border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink transition hover:border-ink/40"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
