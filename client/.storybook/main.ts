import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const fake = (name: string) => fileURLToPath(new URL(`../e2e/fakes/${name}.ts`, import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
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
          : Object.entries(config.resolve?.alias ?? {}).map(([find, replacement]) => ({
              find,
              replacement: String(replacement),
            }))),
        { find: /^firebase\/app$/, replacement: fake("firebase-app") },
        { find: /^firebase\/auth$/, replacement: fake("firebase-auth") },
        { find: /^firebase\/firestore$/, replacement: fake("firebase-firestore") },
      ],
    },
  }),
};

export default config;
