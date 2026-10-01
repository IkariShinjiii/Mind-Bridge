import type { Meta, StoryObj } from "@storybook/react-vite";
import PanelHead from "./PanelHead";

const meta = {
  title: "Design System/PanelHead",
  component: PanelHead,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { title: "Notifications", as: "h2" },
  argTypes: { as: { control: "inline-radio", options: ["h1", "h2", "h3"] } },
} satisfies Meta<typeof PanelHead>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TitleOnly: Story = {};

export const WithDescription: Story = { args: { children: "Choose how Mind Bridge reaches you about appointments." } };

export const Levels: Story = {
  name: "Heading levels",
  render: () => (
    <div className="space-y-6">
      {(["h1", "h2", "h3"] as const).map((as) => (
        <PanelHead key={as} as={as} title={`Rendered as ${as}`}>
          The visual size is the same; only the document outline changes.
        </PanelHead>
      ))}
    </div>
  ),
};

export const LongDescription: Story = {
  args: {
    title: "Emergency contact",
    children:
      "Counselors see this only when one of your check-ins is flagged for immediate review. Add someone who can be reached quickly, and tell them they are listed. The line stops at a readable measure instead of running the full width.",
  },
};

export const InsideCard: Story = {
  name: "Inside a settings card",
  render: () => (
    <section className="max-w-xl rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-5 sm:p-6">
      <PanelHead title="Profile">Your name appears on appointments and in messages to your counselor.</PanelHead>
      <label htmlFor="ph-name" className="mb-1 block font-bold">
        Full name
      </label>
      <input id="ph-name" className="mb-field" defaultValue="Ana Student" />
    </section>
  ),
};
