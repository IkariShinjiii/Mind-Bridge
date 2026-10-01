import type { Meta, StoryObj } from "@storybook/react-vite";
import Spinner from "./Spinner";

const meta = {
  title: "Design System/Spinner",
  component: Spinner,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { size: 24 },
  argTypes: { color: { control: "color" } },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Announced: Story = {
  name: "Announced to screen readers",
  args: { label: "Loading appointments" },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6 text-[color:var(--mb-brand)]">
      {[16, 20, 28, 40].map((size) => (
        <Spinner key={size} size={size} />
      ))}
    </div>
  ),
};

export const CustomColor: Story = { args: { color: "#a3271b" } };

export const InButton: Story = {
  name: "Inside a button",
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-wrap gap-3">
      <button type="button" className="mb-btn mb-btn-solid" disabled>
        <Spinner size={16} /> Saving...
      </button>
      <button type="button" className="mb-btn mb-btn-line" disabled>
        <Spinner size={16} /> Signing in...
      </button>
    </div>
  ),
};

export const LoadingRegion: Story = {
  name: "Loading region with status role",
  parameters: { layout: "padded" },
  render: () => (
    <div
      role="status"
      className="flex min-h-[160px] items-center justify-center gap-3 rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] text-[color:var(--mb-muted)]"
    >
      <Spinner size={20} /> Loading your sessions...
    </div>
  ),
};

export const OnBrandPanel: Story = {
  name: "On a teal panel",
  parameters: { layout: "padded" },
  render: () => (
    <div className="mb-plate flex items-center gap-3 p-6">
      <Spinner size={20} className="text-[color:var(--mb-panel-ink)]" /> Evaluating...
    </div>
  ),
};
