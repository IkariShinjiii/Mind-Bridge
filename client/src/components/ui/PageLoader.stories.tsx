import type { Meta, StoryObj } from "@storybook/react-vite";
import PageLoader from "./PageLoader";

const meta = {
  title: "Components/PageLoader",
  component: PageLoader,
  tags: ["autodocs"],
  parameters: { docs: { story: { inline: false, iframeHeight: 240 } } },
  args: { label: "Loading…" },
} satisfies Meta<typeof PageLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomLabel: Story = { args: { label: "Signing you in…" } };
