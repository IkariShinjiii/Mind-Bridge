import { describe, it, expect, vi, afterEach } from "vitest";
import { downloadAssessmentsCsv, formatDateTime, RISK_STYLES, STATUS_STYLES } from "./adminExport";

describe("formatDateTime", () => {
  it("shows an em dash for missing values", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
    expect(formatDateTime("")).toBe("—");
  });
  it("returns an unparseable value as given", () => expect(formatDateTime("not a date")).toBe("not a date"));
  it("formats ISO strings, numbers and Firestore-style timestamps", () => {
    const d = new Date("2026-10-03T08:30:00.000Z");
    const expected = d.toLocaleString();
    expect(formatDateTime(d.toISOString())).toBe(expected);
    expect(formatDateTime(d.getTime())).toBe(expected);
    expect(formatDateTime({ toDate: () => d })).toBe(expected);
  });
});

describe("style maps", () => {
  it("cover every risk level and case status", () => {
    expect(Object.keys(RISK_STYLES).sort()).toEqual(["high", "low", "medium"]);
    expect(Object.keys(STATUS_STYLES).sort()).toEqual(["escalated", "open", "reviewed"]);
  });
});

describe("downloadAssessmentsCsv", () => {
  afterEach(() => vi.unstubAllGlobals());

  function capture() {
    let blob: Blob | undefined;
    const link = { href: "", download: "", click: vi.fn() };
    vi.stubGlobal("URL", { createObjectURL: (b: Blob) => ((blob = b), "blob:x"), revokeObjectURL: vi.fn() });
    vi.stubGlobal("document", {
      createElement: () => link,
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });
    return { link, text: () => blob!.text() };
  }

  it("anonymises students: sequential ids, no names or emails", async () => {
    const c = capture();
    downloadAssessmentsCsv([
      { riskLevel: "HIGH" as never, status: "open", total: 14, createdAt: "2026-10-01T00:00:00.000Z" },
      {
        riskLevel: "low",
        status: "reviewed",
        total: 3,
        createdAt: "2026-10-02T00:00:00.000Z",
        reviewedAt: "2026-10-03T00:00:00.000Z",
      },
      { ...({ studentName: "Ana Student", studentEmail: "ana@usa.edu.ph" } as object) },
    ]);
    const lines = (await c.text()).split("\n");
    expect(lines[0]).toBe("student_id,risk_level,status,score,created_at,reviewed_at");
    expect(lines[1]).toBe('"ST-0001","high","open","14","2026-10-01T00:00:00.000Z",""');
    expect(lines[2]).toContain('"ST-0002","low","reviewed","3"');
    expect(lines[3]).toBe('"ST-0003","low","open","n/a","",""');
    expect(lines.join("\n")).not.toMatch(/Ana|usa\.edu\.ph/);
    expect(c.link.click).toHaveBeenCalledOnce();
    expect(c.link.download).toMatch(/^mindbridge-compliance-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("exports a single placeholder row when there are no assessments", async () => {
    const c = capture();
    downloadAssessmentsCsv([]);
    const lines = (await c.text()).split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('"ST-0000","low","n/a","n/a","",""');
  });

  it("doubles quotes inside values", async () => {
    const c = capture();
    downloadAssessmentsCsv([{ status: 'say "hi"' as never, total: 1 }]);
    expect(await c.text()).toContain('"say ""hi"""');
  });
});
