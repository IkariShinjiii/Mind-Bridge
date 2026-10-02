import type { Appointment, Assessment, ChatMessage, UserProfile } from "../types";

/** Everything one person can read about themselves, as loaded from the database. */
export interface MyData {
  profile: (UserProfile & { id?: string }) | null;
  assessments: ReadonlyArray<Assessment>;
  appointments: ReadonlyArray<Appointment>;
  messages: ReadonlyArray<ChatMessage>;
}

export interface DataExport {
  exportedAt: string;
  about: string;
  notIncluded: string;
  profile: Record<string, unknown> | null;
  checkIns: Array<Record<string, unknown>>;
  appointments: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
}

/**
 * JSON-safe copy: Firestore timestamps become ISO strings, `undefined` is dropped, and nothing keeps a reference
 * to the original object.
 */
export function toPlain(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value === undefined ? undefined : value;
  if (value instanceof Date) return value.toISOString();
  const maybeTimestamp = value as { toDate?: unknown };
  if (typeof maybeTimestamp.toDate === "function") {
    const date = (maybeTimestamp.toDate as () => Date)();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
  }
  if (Array.isArray(value)) return value.map((item) => toPlain(item) ?? null);
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const plain = toPlain(item);
    if (plain !== undefined) out[key] = plain;
  }
  return out;
}

/**
 * Builds the "download my data" file. Notes that guidance staff wrote about a person (`counselorNotes` on a check-in,
 * `counselorNote` on an appointment) are left out: they are confidential case notes the app does not show to
 * students. The file says so and points to the Guidance Office.
 */
export function buildDataExport(data: MyData, now: Date = new Date()): DataExport {
  const { id: _profileId, ...profile } = data.profile ?? ({} as UserProfile & { id?: string });
  return {
    exportedAt: now.toISOString(),
    about:
      "A copy of the personal data Mind Bridge holds about you: your profile, your check-ins, your appointments and your chat messages.",
    notIncluded:
      "Notes written by guidance staff are not included. To ask about them, contact the Guidance Services and Testing Center (guidance@usa.edu.ph).",
    profile: data.profile ? (toPlain(profile) as Record<string, unknown>) : null,
    checkIns: data.assessments.map((a) => {
      const { id: _id, counselorNotes: _notes, ...rest } = a;
      return toPlain(rest) as Record<string, unknown>;
    }),
    appointments: data.appointments.map((a) => {
      const { id: _id, counselorNote: _note, ...rest } = a as Appointment & { counselorNote?: string };
      return toPlain(rest) as Record<string, unknown>;
    }),
    messages: data.messages.map((m) => {
      const { id: _id, ...rest } = m;
      return toPlain(rest) as Record<string, unknown>;
    }),
  };
}

/** File name for the download, e.g. `mind-bridge-my-data-2026-10-03.json`. */
export function dataExportFileName(now: Date = new Date()): string {
  return `mind-bridge-my-data-${now.toISOString().slice(0, 10)}.json`;
}

/** Saves an object as a pretty-printed JSON file through the browser's download. */
export function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
