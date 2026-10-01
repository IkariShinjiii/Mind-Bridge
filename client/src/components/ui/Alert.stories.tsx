import type { Meta, StoryObj } from "@storybook/react-vite";

/** `mb-alert` is the error banner. Use `role="alert"` for errors that appear after an action, `role="note"` for static notices. */
const meta = {
  title: "Design System/Alert",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Error: Story = {
  render: () => (
    <p role="alert" className="mb-alert font-medium">
      That time was just taken. Pick another open time.
    </p>
  ),
};

export const Note: Story = {
  render: () => (
    <p role="note" className="mb-alert font-medium">
      Sessions cancelled within 24 hours cannot be rebooked online.
    </p>
  ),
};
