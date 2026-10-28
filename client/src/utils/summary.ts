import type { RiskLevel } from "../types";

export interface SummaryInput {
  name: string;
  date: string;
  /** "Quick check-in" or "Full check-in". */
  kind: string;
  total: number;
  max: number;
  level: RiskLevel;
  /** Only for the full check-in. */
  scales?: ReadonlyArray<{ label: string; score: number; max: number; band: string }>;
  wellLines: ReadonlyArray<string>;
}

const HEADLINE: Record<RiskLevel, string> = {
  high: "Priority support suggested",
  medium: "Some stress is showing",
  low: "Steady right now",
};

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/**
 * A one-page, self-contained HTML summary of a check-in, for printing or saving as a PDF to bring to the Guidance
 * Center. Built in the browser from what the student just saw; nothing is sent anywhere. Every value is escaped.
 */
export function buildSummaryHtml(s: SummaryInput): string {
  const li = (t: string) => `<li>${escapeHtml(t)}</li>`;
  const scales = (s.scales ?? [])
    .map((x) => li(`${x.label}: ${x.score} of ${x.max}, ${x.band.toLowerCase()}`))
    .join("");
  const well = s.wellLines.length ? `<h2>What is going well</h2><ul>${s.wellLines.map(li).join("")}</ul>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Mind Bridge check-in summary</title>
<style>
body{font:16px/1.5 system-ui,sans-serif;color:#1a1a1a;margin:40px auto;max-width:680px;padding:0 24px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:24px 0 6px}p,ul{margin:6px 0}
.meta{color:#555}.box{border:1px solid #999;border-radius:6px;padding:12px 16px;margin-top:16px}
small{color:#555}
</style></head><body>
<h1>Mind Bridge check-in summary</h1>
<p class="meta">${escapeHtml(s.name)} &middot; ${escapeHtml(s.date)} &middot; ${escapeHtml(s.kind)}</p>
<div class="box"><strong>${HEADLINE[s.level]}</strong><p>Total score: ${s.total} of ${s.max}</p>${
    scales ? `<ul>${scales}</ul>` : ""
  }</div>
${well}
<h2>Where to get support</h2>
<ul>
<li>University of San Agustin Guidance Center, Main Campus, Ground Floor, Blanco Hall. Monday to Friday, 8:00 AM to 5:00 PM.</li>
<li>NCMH Crisis Hotline: 1553 (toll-free, 24/7).</li>
</ul>
<p><small>This is a screening aid, not a diagnosis. It only reflects how you answered on this day.</small></p>
</body></html>`;
}

/** Print a document through a hidden frame, so it needs no pop-up window and the app page is left untouched. */
export function printHtml(html: string): void {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
}
