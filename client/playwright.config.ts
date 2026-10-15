import { defineConfig, devices } from "@playwright/test";

const PORT = 5174;

// The app runs under `vite --mode e2e`, which replaces the Firebase SDK with in-memory fakes
// (see e2e/fakes). Nothing here talks to the real Firebase project.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" } }],
  webServer: {
    command: `npx vite --mode e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // main.tsx refuses to start without these. The e2e mode swaps Firebase for fakes, so any value works; supplying
    // them here means a fresh clone can run the suite with no setup (CI sets the same dummies).
    env: {
      VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY ?? "e2e",
      VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN ?? "e2e",
      VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID ?? "e2e",
    },
  },
});
