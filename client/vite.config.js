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
  build: {
    // The two vendor chunks left over 500 kB are Firebase (Firestore) and Recharts; both are split out and cached.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Heavy vendors get their own long-cached chunks instead of landing inside whichever route imports them first.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          const path = id.replace(/\\/g, "/");
          if (/\/node_modules\/(recharts|d3-[^/]+|victory-vendor|es-toolkit|decimal\.js-light|react-smooth)\//.test(path)) return "charts";
          if (/\/node_modules\/(@firebase|firebase|re2js)\//.test(path)) return "firebase";
          return undefined;
        },
      },
    },
  },
  // Playwright specs live in e2e/ and must not be picked up by `npm test`.
  test: { exclude: ["e2e/**", "node_modules/**"] },
}));
