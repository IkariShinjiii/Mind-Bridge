import { fileURLToPath } from "node:url";

const fake = (name) => fileURLToPath(new URL(`../e2e/fakes/${name}.js`, import.meta.url));

/** @type {import('@storybook/react-vite').StorybookConfig} */
export default {
  stories: ["../src/**/*.stories.@(js|jsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: "@storybook/react-vite",
  // Components that call useAuth() need the real AuthProvider, which imports Firebase.
  // Reuse the in-memory fakes from the E2E suite so stories render signed-out, offline.
  viteFinal: (config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      alias: [
        ...(Array.isArray(config.resolve?.alias)
          ? config.resolve.alias
          : Object.entries(config.resolve?.alias ?? {}).map(([find, replacement]) => ({ find, replacement }))),
        { find: /^firebase\/app$/, replacement: fake("firebase-app") },
        { find: /^firebase\/auth$/, replacement: fake("firebase-auth") },
        { find: /^firebase\/firestore$/, replacement: fake("firebase-firestore") },
      ],
    },
  }),
};
