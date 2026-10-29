import type { Appointment } from "../types";
import { parseDate } from "./dates";

/** Where sessions happen (same text as the printable summary). */
const LOCATION = "University of San Agustin Guidance Center, Main Campus, Ground Floor, Blanco Hall";

const pad = (n: number) => String(n).padStart(2, "0");
const HOUR_MS = 3_600_000;

/** A time typed into a datetime-local input has no zone ("2026-11-02T10:00"): keep it as a "floating" local time. */
const FLOATING = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/;

function utcStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** An iCalendar date-time for a stored start or end, or null when it is missing or not a date. */
function icsTime(value: string | null | undefined): string | null {
  if (typeof value === "string") {
    const m = FLOATING.exec(value);
    if (m) return `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}00`;
  }
  const d = parseDate(value);
  return d ? utcStamp(d) : null;
}

/** Escapes text for an iCalendar value (RFC 5545 section 3.3.11). */
const escapeText = (s: string): string =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Folds a line to 75 characters, continuing on lines that start with a space (RFC 5545 section 3.1). */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

/** Whether a booking has a start time to put in a calendar. */
export const canAddToCalendar = (apt: Pick<Appointment, "start">): boolean => icsTime(apt.start) !== null;

/**
 * An .ics calendar file with one event for a booked session, ready for Google Calendar, Outlook or Apple Calendar.
 * Returns null when the booking has no usable start time. With no end time the event lasts one hour.
 * `now` is injectable so the tests do not depend on the clock.
 */
export function buildIcs(apt: Appointment, now: Date = new Date()): string | null {
  const start = icsTime(apt.start);
  if (!start) return null;
  let end = icsTime(apt.end);
  if (!end || end <= start) {
    const s = parseDate(apt.start);
    // Add an hour to the same kind of time the start used (floating or UTC)
    const floating = typeof apt.start === "string" && FLOATING.test(apt.start);
    const plusHour = s ? new Date(s.getTime() + HOUR_MS) : null;
    end = !plusHour
      ? start
      : floating
        ? `${plusHour.getFullYear()}${pad(plusHour.getMonth() + 1)}${pad(plusHour.getDate())}T${pad(plusHour.getHours())}${pad(plusHour.getMinutes())}00`
        : utcStamp(plusHour);
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mind Bridge//Guidance sessions//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${apt.id}@mind-bridge`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeText(apt.title || "Counseling session")}`,
    `LOCATION:${escapeText(LOCATION)}`,
    `DESCRIPTION:${escapeText(
      `Confidential session with ${apt.counselorName || "your counselor"} through Mind Bridge. If you need to change it, use the Appointments page.`,
    )}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Counseling session in 1 hour",
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** Saves a session as an .ics file through the browser's download. Returns false when there is nothing to save. */
export function downloadIcs(apt: Appointment): boolean {
  const ics = buildIcs(apt);
  if (!ics) return false;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mind-bridge-session.ics";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
