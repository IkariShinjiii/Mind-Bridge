import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import ErrorBoundary from "./ErrorBoundary";

function Broken(): ReactNode {
  throw new Error("Storybook demo: render failed");
}

const meta = {
  title: "Components/ErrorBoundary",
  component: ErrorBoundary,
  tags: ["autodocs"],
  parameters: { docs: { story: { inline: false, iframeHeight: 520 } } },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Healthy: Story = {
  render: () => (
    <ErrorBoundary>
      <p>Everything rendered fine.</p>
    </ErrorBoundary>
  ),
};

export const ErrorState: Story = {
  name: "Error (recovery screen)",
  render: () => (
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>
  ),
};
