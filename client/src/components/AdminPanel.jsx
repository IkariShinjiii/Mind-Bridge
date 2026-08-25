import { useEffect, useState } from "react";
import {
  getAdminUsers,
  approveCounselor,
  rejectCounselor,
  deactivateUser,
  reactivateUser,
} from "../api";

const ROLE_BADGE = {
  student: "bg-teal/10 text-teal border-teal/30",
  counselor: "bg-amber-100 text-amber-700 border-amber-200",
  admin: "bg-ink/10 text-ink border-ink/20",
};

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setUsers(await getAdminUsers());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const pending = users.filter((u) => u.role === "counselor" && !u.approved);
  const others = users.filter((u) => !(u.role === "counselor" && !u.approved));

  async function handle(action, id) {
    await action(id);
    load();
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <p className="text-teal font-semibold tracking-widest text-xs mb-2">
        ADMIN
      </p>
      <h1 className="font-display text-3xl text-ink mb-6">Manage counselor accounts</h1>

      {loading && <p className="text-ink/50 text-sm">Loading…</p>}

      {!loading && pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-ink/70 uppercase tracking-wide mb-3">
            Pending approval ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((u) => (
              <div
                key={u.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-ink/50">{u.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handle(approveCounselor, u.id)}
                    className="text-sm bg-ink text-white rounded-lg px-4 py-2 hover:brightness-110"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handle(rejectCounselor, u.id)}
                    className="text-sm text-red-600 border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && (
        <div>
          <h2 className="text-sm font-semibold text-ink/70 uppercase tracking-wide mb-3">
            All accounts
          </h2>
          <div className="space-y-2">
            {others.map((u) => (
              <div
                key={u.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-ink/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-ink/50">{u.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${ROLE_BADGE[u.role]}`}>
                    {u.role}
                  </span>
                  {!u.emailVerified && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-ink/5 text-ink/40 border-ink/10">
                      Unverified
                    </span>
                  )}
                  {u.active === false && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-200">
                      Deactivated
                    </span>
                  )}
                </div>
                {u.role !== "admin" && (
                  <button
                    onClick={() => handle(u.active === false ? reactivateUser : deactivateUser, u.id)}
                    className={`text-sm rounded-lg px-4 py-2 border ${
                      u.active === false
                        ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        : "border-red-200 text-red-600 hover:bg-red-50"
                    }`}
                  >
                    {u.active === false ? "Reactivate" : "Deactivate"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
