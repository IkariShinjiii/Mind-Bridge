import { describe, it, expect } from "vitest";
import { buildSummaryHtml } from "./summary";

const base = {
  name: "Ana",
  date: "Oct 28, 2026",
  kind: "Quick check-in",
  total: 7,
  max: 21,
  level: "medium" as const,
  wellLines: ["You are sleeping reasonably well."],
};

describe("buildSummaryHtml", () => {
  it("includes the headline, total, going-well lines and support details", () => {
    const html = buildSummaryHtml(base);
    expect(html).toContain("Some stress is showing");
    expect(html).toContain("Total score: 7 of 21");
    expect(html).toContain("You are sleeping reasonably well.");
    expect(html).toContain("1553");
    expect(html).toContain("not a diagnosis");
  });

  it("lists each scale of the full check-in with its band", () => {
    const html = buildSummaryHtml({
      ...base,
      kind: "Full check-in",
      max: 48,
      scales: [{ label: "Depression (PHQ-9)", score: 12, max: 27, band: "Moderate" }],
    });
    expect(html).toContain("Depression (PHQ-9): 12 of 27, moderate");
  });

  it("leaves out the going-well section when there is nothing to say", () => {
    expect(buildSummaryHtml({ ...base, wellLines: [] })).not.toContain("What is going well");
  });

  it("escapes anything that could be markup", () => {
    const html = buildSummaryHtml({ ...base, name: '<img src=x onerror="alert(1)">' });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
