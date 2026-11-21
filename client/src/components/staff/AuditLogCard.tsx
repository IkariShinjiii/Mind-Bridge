import { useEffect, useState } from "react";
import { getAuditLog } from "../../lib/api";
import { formatDateTime } from "../../utils/dates";
import Spinner from "../ui/Spinner";
import { LoadError } from "../ui/LoadError";
import type { AuditAction, AuditEntry } from "../../types";

const LABEL: Record<AuditAction, string> = {
  case_viewed: "Viewed case",
  case_updated: "Updated case",
  assignment_changed: "Changed assignment",
  appointment_updated: "Updated session",
  report_exported: "Exported report",
  checkin_abandoned: "Student left check-in unfinished",
  checkin_submitted: "Student submitted check-in",
  appointment_booked: "Student booked a session",
  appointment_cancelled: "Student cancelled a session",
};

/** Admin-only list of the most recent staff actions on cases and assignments. */
export default function AuditLogCard() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    getAuditLog().then(setEntries, () => setFailed(true));
  };
  useEffect(load, []);

  return (
    <section aria-labelledby="audit-heading" className="mb-card">
      <h2 id="audit-heading" className="text-2xl font-bold text-[color:var(--mb-ink)]">
        Audit log
      </h2>
      <p className="mt-1 max-w-[65ch] text-[color:var(--mb-muted)]">
        What staff did with cases, sessions and assignments, and what students did with check-ins and bookings (progress only, never their answers). The 200 most recent entries; entries cannot be edited or
        deleted.
      </p>
      {failed ? (
        <LoadError message="The audit log could not load." onRetry={load} />
      ) : entries === null ? (
        <div className="mt-4">
          <Spinner size={20} />
        </div>
      ) : entries.length === 0 ? (
        <p className="mt-4 text-[color:var(--mb-muted)]">Nothing has been recorded yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Recent staff actions on cases</caption>
            <thead>
              <tr className="border-b border-[color:var(--mb-line)]">
                <th scope="col" className="py-2 pr-4">When</th>
                <th scope="col" className="py-2 pr-4">Who</th>
                <th scope="col" className="py-2 pr-4">Action</th>
                <th scope="col" className="py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-[color:var(--mb-line)] align-top">
                  <td className="py-2 pr-4 whitespace-nowrap">{formatDateTime(e.at)}</td>
                  <td className="py-2 pr-4">{e.actorName}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{LABEL[e.action] ?? e.action}</td>
                  <td className="py-2">{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
