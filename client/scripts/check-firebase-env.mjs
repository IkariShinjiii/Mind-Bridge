// Fails the build when the Firebase web config is missing, so a broken build never replaces the last good deployment.
// Reads the same files Vite reads (.env.production, Vercel's environment) and never prints a value.
import { loadEnv } from "vite";

const REQUIRED = ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_PROJECT_ID"];
const env = { ...loadEnv("production", process.cwd(), "VITE_"), ...process.env };
const missing = REQUIRED.filter((name) => !env[name]);

if (missing.length > 0) {
  console.error(`Build stopped: missing ${missing.join(", ")}.`);
  console.error("Set them as environment variables (Vercel: Project Settings > Environment Variables) or in client/.env.local.");
  process.exit(1);
}
