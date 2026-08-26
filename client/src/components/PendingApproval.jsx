import { useAuth } from "../AuthContext.jsx";

export default function PendingApproval() {
  const { logout } = useAuth();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-mist via-[#eef1f8] to-[#e8f5f1] px-4 py-8 sm:px-6">
      <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-teal/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-ink/10 blur-3xl" />

      <div className="animate-fade-up relative w-full max-w-md rounded-[30px] border border-ink/5 bg-white/95 p-6 text-center shadow-[0_20px_60px_rgba(17,24,39,0.12)] transition-all duration-200 hover:shadow-[0_24px_70px_rgba(17,24,39,0.16)] sm:p-8">
        <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-teal sm:text-xs">ACCOUNT PENDING</p>
        <h1 className="mb-3 font-display text-2xl text-ink sm:text-3xl">Waiting on admin approval</h1>
        <p className="mb-6 text-sm text-ink/60 sm:text-base">
          Your counselor account has been created, but an administrator needs to approve it before you can view
          student check-ins. This keeps confidential wellness data limited to verified staff.
        </p>
        <button
          onClick={() => logout()}
          className="soft-button rounded-lg border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink hover:border-ink/40 hover:bg-mist"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
