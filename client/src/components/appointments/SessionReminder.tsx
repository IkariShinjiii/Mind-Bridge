import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import type { Appointment } from "../../types";
import { parseDate } from "../../utils/dates";
import { firstName } from "../../utils/names";
import { sessionsSoon, whenText } from "../../utils/reminders";

interface SessionReminderProps {
  appointments: ReadonlyArray<Appointment>;
  role: "student" | "counselor";
}

/** A reminder for confirmed sessions in the next 24 hours. Renders nothing when there are none. */
export default function SessionReminder({ appointments, role }: SessionReminderProps) {
  const now = new Date();
  const soon = sessionsSoon(appointments, now);
  const next = soon[0];
  const start = next ? parseDate(next.start || next.date || null) : null;
  if (!next || !start) return null;

  const when = whenText(start, now);
  const who = role === "student" ? next.counselorName || "your counselor" : firstName(next.studentName, "a student");
  const text =
    soon.length > 1
      ? `Reminder: you have ${soon.length} sessions in the next 24 hours. The first, with ${who}, is ${when}.`
      : `Reminder: your session with ${who} is ${when}.`;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-brand-bg)] p-3 font-medium text-[color:var(--mb-ink)]"
    >
      <span className="flex items-center gap-2">
        <Bell className="h-5 w-5 shrink-0 text-[color:var(--mb-brand)]" aria-hidden="true" />
        {text}
      </span>
      <Link to="/appointments" className="inline-flex min-h-[44px] items-center font-bold text-[color:var(--mb-brand)] underline">
        View details
      </Link>
    </div>
  );
}
