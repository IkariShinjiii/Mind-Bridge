import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const fake = (name) => fileURLToPath(new URL(`./e2e/fakes/${name}.js`, import.meta.url));

// `vite --mode e2e` swaps the Firebase SDK for in-memory fakes so the Playwright suite
// runs offline and never touches the real project.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias:
      mode === "e2e"
        ? [
            { find: /^firebase\/app$/, replacement: fake("firebase-app") },
            { find: /^firebase\/auth$/, replacement: fake("firebase-auth") },
            { find: /^firebase\/firestore$/, replacement: fake("firebase-firestore") },
          ]
        : [],
  },
  // Playwright specs live in e2e/ and must not be picked up by `npm test`.
  test: { exclude: ["e2e/**", "node_modules/**"] },
}));
