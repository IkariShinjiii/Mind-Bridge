import { describe, expect, it } from "vitest";
import type { Appointment } from "../types";
import { buildIcs, canAddToCalendar } from "./calendar";

const NOW = new Date("2026-10-30T01:02:03.000Z");
const apt = (over: Partial<Appointment> = {}): Appointment => ({
  id: "a1",
  studentName: "Ana",
  studentEmail: "ana@usa.edu.ph",
  slotId: null,
  title: "Session with Dr. Reyes",
  counselorName: "Dr. Reyes",
  start: "2026-11-02T10:00",
  end: "2026-11-02T11:00",
  status: "Confirmed",
  createdAt: "2026-10-29T00:00:00.000Z",
  ...over,
});

describe("buildIcs", () => {
  it("writes one event with CRLF line endings, keeping the typed local time floating", () => {
    const ics = buildIcs(apt(), NOW)!;
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("\r\nDTSTART:20261102T100000\r\n");
    expect(ics).toContain("\r\nDTEND:20261102T110000\r\n");
    expect(ics).toContain("\r\nDTSTAMP:20261030T010203Z\r\n");
    expect(ics).toContain("\r\nUID:a1@mind-bridge\r\n");
    expect(ics).toContain("SUMMARY:Session with Dr. Reyes");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics.replace(/\r\n/g, "").includes("\n")).toBe(false);
  });

  it("uses UTC for a time that carries a zone", () => {
    const ics = buildIcs(apt({ start: "2026-11-02T02:00:00.000Z", end: "2026-11-02T03:30:00.000Z" }), NOW)!;
    expect(ics).toContain("DTSTART:20261102T020000Z");
    expect(ics).toContain("DTEND:20261102T033000Z");
  });

  it("lasts one hour when there is no usable end", () => {
    expect(buildIcs(apt({ end: null }), NOW)).toContain("DTEND:20261102T110000");
    expect(buildIcs(apt({ end: "2026-11-02T09:00" }), NOW)).toContain("DTEND:20261102T110000");
    expect(buildIcs(apt({ start: "2026-11-02T10:00:00.000Z", end: undefined }), NOW)).toContain(
      "DTEND:20261102T110000Z",
    );
  });

  it("escapes commas, semicolons and line breaks, and folds long lines", () => {
    const ics = buildIcs(apt({ title: "Talk; plan, review\nnext" }), NOW)!;
    expect(ics).toContain("SUMMARY:Talk\\; plan\\, review\\nnext");
    for (const line of ics.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75);
    // Unfolding gives back the full description
    expect(ics.replace(/\r\n /g, "")).toContain("DESCRIPTION:Confidential session with Dr. Reyes through Mind Bridge.");
  });

  it("returns null for a booking with no start time", () => {
    expect(buildIcs(apt({ start: undefined }), NOW)).toBeNull();
    expect(buildIcs(apt({ start: "soon" }), NOW)).toBeNull();
    expect(canAddToCalendar(apt({ start: undefined }))).toBe(false);
    expect(canAddToCalendar(apt())).toBe(true);
  });
});
