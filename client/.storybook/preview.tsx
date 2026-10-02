import React from "react";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import "../src/styles/index.css";
import "../src/styles/theme.css";
import "./preview.css";

/** @type {import('@storybook/react-vite').Preview} */
export default {
  globalTypes: {
    theme: {
      description: "Mind Bridge theme",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    // Every component styles itself from the --mb-* tokens, which only exist inside .mb.
    (Story, { globals }) => (
      <MotionConfig reducedMotion="user">
        <LazyMotion features={domAnimation} strict>
          <div className="mb p-6" data-theme={globals.theme} style={{ minHeight: "100vh" }}>
            <Story />
          </div>
        </LazyMotion>
      </MotionConfig>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    controls: { matchers: { color: /(background|color)$/i } },
    a11y: { test: "todo" },
  },
};
