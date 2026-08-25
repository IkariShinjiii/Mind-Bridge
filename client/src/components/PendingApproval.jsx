import { useAuth } from "../AuthContext.jsx";

export default function PendingApproval() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-mist px-6">
      <div className="max-w-md text-center">
        <p className="text-teal font-semibold tracking-widest text-xs mb-2">
          ACCOUNT PENDING
        </p>
        <h1 className="font-display text-2xl text-ink mb-3">
          Waiting on admin approval
        </h1>
        <p className="text-ink/60 mb-6">
          Your counselor account has been created, but an administrator
          needs to approve it before you can view student check-ins. This
          keeps confidential wellness data limited to verified staff.
        </p>
        <button
          onClick={() => logout()}
          className="text-sm border border-ink/15 rounded-lg px-4 py-2 hover:border-ink/40"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
