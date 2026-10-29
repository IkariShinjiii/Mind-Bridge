import type { Appointment } from "../types";
import { parseDate } from "./dates";

/** Sessions closer than this are worth a reminder. */
export const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Confirmed or rescheduled sessions that start within the next 24 hours, soonest first. */
export function sessionsSoon(appointments: ReadonlyArray<Appointment>, now: Date = new Date()): Appointment[] {
  const from = now.getTime();
  return appointments
    .filter((a) => /^(confirmed|rescheduled)$/i.test(String(a.status ?? "").trim()))
    .map((a) => ({ a, at: parseDate(a.start || a.date || null)?.getTime() ?? Number.NaN }))
    .filter(({ at }) => at >= from && at <= from + REMINDER_WINDOW_MS)
    .sort((x, y) => x.at - y.at)
    .map(({ a }) => a);
}

const clock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** How to say when a session starts: "in 45 minutes", "today at 3:00 PM" or "tomorrow at 9:00 AM". */
export function whenText(start: Date, now: Date = new Date()): string {
  const minutes = Math.round((start.getTime() - now.getTime()) / 60000);
  if (minutes < 60) return `in ${Math.max(minutes, 1)} ${minutes === 1 ? "minute" : "minutes"}`;
  const sameDay = start.toDateString() === now.toDateString();
  return `${sameDay ? "today" : "tomorrow"} at ${clock(start)}`;
}
