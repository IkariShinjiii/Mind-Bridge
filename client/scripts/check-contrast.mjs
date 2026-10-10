// Checks the light-theme token pairs against the 7:1 (WCAG AAA) promise in DESIGN.md. Usage: node scripts/check-contrast.mjs
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/theme.css", import.meta.url), "utf8");
const lightBlock = css.slice(css.indexOf(".mb {"), css.indexOf('.mb[data-theme="dark"]'));
const tokens = Object.fromEntries([...lightBlock.matchAll(/--mb-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
tokens.white = "#ffffff";

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [text token, background token, minimum ratio]
const pairs = [
  ["ink", "ground", 7], ["ink", "surface", 7], ["ink", "surface-2", 7], ["ink", "brand-bg", 7],
  ["muted", "ground", 7], ["muted", "surface", 7], ["muted", "surface-2", 7], ["muted", "brand-bg", 7],
  ["panel-ink", "panel", 7], ["panel-soft", "panel", 7],
  ["brand", "surface", 7], ["brand", "brand-bg", 7], ["brand", "ground", 7],
  ["link", "surface", 7], ["link", "ground", 7],
  ["safe", "safe-bg", 7], ["warn", "warn-bg", 7], ["urgent", "urgent-bg", 7], ["error-ink", "error-bg", 7],
  ["violet", "violet-bg", 7],
  ["white", "safe-solid", 7], ["white", "urgent-solid", 7], ["white", "violet-solid", 7],
  ["amber-ink", "amber", 7],
  ["field-line", "surface", 3], ["field-line", "ground", 3],
];

let failed = 0;
for (const [fg, bg, min] of pairs) {
  if (!tokens[fg] || !tokens[bg]) { console.error(`missing token: ${fg} or ${bg}`); failed++; continue; }
  const r = ratio(tokens[fg], tokens[bg]);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${fg} on ${bg}: ${r.toFixed(2)} (needs ${min})`);
}
process.exit(failed ? 1 : 0);
