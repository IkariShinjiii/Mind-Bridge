import type { Meta, StoryObj } from "@storybook/react-vite";
import { Alert, FieldError, Notice } from "./Alert";

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
    <Alert role="alert" className="font-medium">
      That time was just taken. Pick another open time.
    </Alert>
  ),
};

export const Note: Story = {
  render: () => (
    <Alert role="note" className="font-medium">
      Sessions cancelled within 24 hours cannot be rebooked online.
    </Alert>
  ),
};

export const Success: Story = {
  render: () => (
    <Notice role="status" className="font-medium">
      Password reset email sent. Check your inbox.
    </Notice>
  ),
};

export const Field: Story = {
  render: () => <FieldError>Enter your school email address.</FieldError>,
};
