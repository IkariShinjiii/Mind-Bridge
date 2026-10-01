import React from "react";
import ErrorBoundary from "./ErrorBoundary";

function Broken() {
  throw new Error("Storybook demo: render failed");
}

export default {
  title: "Components/ErrorBoundary",
  component: ErrorBoundary,
  tags: ["autodocs"],
  parameters: { docs: { story: { inline: false, iframeHeight: 520 } } },
};

export const Healthy = {
  render: () => (
    <ErrorBoundary>
      <p>Everything rendered fine.</p>
    </ErrorBoundary>
  ),
};

export const Error = {
  name: "Error (recovery screen)",
  render: () => (
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>
  ),
};
