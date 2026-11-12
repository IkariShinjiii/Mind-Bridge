#!/usr/bin/env node
// One command to run every local check and print a summary:  npm run test:all [-- --e2e] [-- --fast]
//   default : typecheck, unit tests (vitest), contrast check, production build
//   --e2e   : also run the Playwright suite (uses in-memory Firebase fakes; no credentials, no network)
//   --fast  : skip the build
// Exits 1 when any step fails. Nothing here talks to real Firebase, Vercel or email.
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

// The build refuses to run without Firebase config; dummies are fine because only the bundle is produced.
const buildEnv = {
  ...process.env,
  VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY ?? "ci",
  VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN ?? "ci",
  VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID ?? "ci",
};

const steps = [
  { name: "typecheck", cmd: npx, args: ["tsc", "--noEmit"] },
  { name: "unit tests", cmd: npx, args: ["vitest", "run"] },
  { name: "contrast", cmd: process.execPath, args: ["scripts/check-contrast.mjs"] },
];
if (!args.has("--fast")) steps.push({ name: "build", cmd: npx, args: ["vite", "build"], env: buildEnv });
if (args.has("--e2e")) steps.push({ name: "e2e (Playwright)", cmd: npx, args: ["playwright", "test", "--reporter=line"] });

const results = [];
for (const step of steps) {
  console.log(`\n=== ${step.name} ===`);
  const t0 = Date.now();
  const r = spawnSync(step.cmd, step.args, { cwd: root, stdio: "inherit", env: step.env ?? process.env, shell: process.platform === "win32" && step.cmd.endsWith(".cmd") });
  results.push({ name: step.name, ok: r.status === 0, optional: step.optional, secs: ((Date.now() - t0) / 1000).toFixed(1) });
}

console.log("\n=== summary ===");
for (const r of results) console.log(`${r.ok ? "PASS" : r.optional ? "WARN" : "FAIL"}  ${r.name.padEnd(20)} ${r.secs}s`);
const failed = results.filter((r) => !r.ok && !r.optional);
console.log(failed.length ? `\n${failed.length} step(s) failed.` : "\nAll required steps passed.");
process.exit(failed.length ? 1 : 0);
