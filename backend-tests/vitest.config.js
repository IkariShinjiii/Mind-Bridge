import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// client/src/lib/api.js lives outside this package and would otherwise resolve
// firebase/* from client/node_modules, giving a second SDK instance that rejects the
// Firestore handles created by @firebase/rules-unit-testing. Resolve every firebase/*
// import as if it came from this package.
const singleFirebase = {
  name: "single-firebase-instance",
  enforce: "pre",
  async resolveId(source, importer, options) {
    if (!/^firebase\/(firestore|app|auth)$/.test(source) || !importer) return null;
    return this.resolve(source, here("./package.json"), { ...options, skipSelf: true });
  },
};

export default defineConfig({
  plugins: [singleFirebase],
  resolve: {
    alias: [
      // functions/ has its own node_modules that isn't installed here; swap in recording stubs.
      { find: /^firebase-functions\/v2\/firestore$/, replacement: here("./stubs/functions-firestore.js") },
      { find: /^firebase-functions\/params$/, replacement: here("./stubs/functions-params.js") },
      { find: /^firebase-admin\/app$/, replacement: here("./stubs/admin-app.js") },
      { find: /^firebase-admin\/firestore$/, replacement: here("./stubs/admin-firestore.js") },
      { find: /^nodemailer$/, replacement: here("./stubs/nodemailer.js") },
    ],
  },
  server: { fs: { strict: false } },
  test: {
    include: ["**/*.test.js"],
    exclude: ["node_modules/**"],
    testTimeout: 20000,
    fileParallelism: false, // all files share one emulator database
    server: { deps: { inline: [/firebase/, /@firebase\//] } },
  },
});
