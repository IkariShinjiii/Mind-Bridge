import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarX } from "lucide-react";
import Card, { type CardTone } from "./Card";
import Button from "./Button";

/**
 * `Card` from `components/ui/Card.jsx`: a 2px-bordered surface with an optional heading (PanelHead), body and
 * footer. `loading`, `error` and `disabled` swap or dim the body so every card handles those states the same
 * way. `tone` tints the card for status (brand, safe, warn, urgent). The solid signage blocks
 * (`mb-plate`, `mb-plate-amber`) are a separate pattern and are shown at the bottom.
 */
const meta = {
  title: "Design System/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
  args: {
    title: "Upcoming sessions",
    description: "Your next appointments with Guidance Services.",
    tone: "default",
    loading: false,
    disabled: false,
    dashed: false,
  },
  argTypes: {
    tone: { control: "inline-radio", options: ["default", "brand", "safe", "warn", "urgent"] },
    footer: { control: false },
    onRetry: { control: false },
  },
  render: (args) => (
    <Card {...args}>
      <p>Tuesday, 14 October at 10:00 with Ms. Reyes.</p>
    </Card>
  ),
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithFooter: Story = {
  args: {
    footer: (
      <>
        <Button variant="line">Reschedule</Button>
        <Button>View details</Button>
      </>
    ),
  },
};

export const Loading: Story = { args: { loading: true, loadingLabel: "Loading your appointments…" } };

export const Error: Story = {
  args: { error: "We could not load your appointments. Check your connection and try again.", onRetry: () => {} },
};

export const Disabled: Story = {
  name: "Disabled (unavailable section)",
  args: { title: "Confidential chat", description: "Chat is offline outside guidance office hours.", disabled: true },
  render: (args) => (
    <Card {...args}>
      <Button disabled>Start chat</Button>
    </Card>
  ),
};

export const Empty: Story = {
  args: { title: undefined, description: undefined, dashed: true },
  render: (args) => (
    <Card {...args}>
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CalendarX className="h-8 w-8 text-[color:var(--mb-muted)]" aria-hidden="true" />
        <h3 className="text-xl font-bold">No sessions booked</h3>
        <p className="max-w-[40ch] text-[color:var(--mb-muted)]">Book a time with a counselor whenever you are ready.</p>
        <Button>Book a session</Button>
      </div>
    </Card>
  ),
};

export const Tones: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="space-y-4">
      {([
        ["default", "Default", "Neutral content."],
        ["brand", "Brand", "Information from Guidance Services."],
        ["safe", "Safe", "Your check-in was saved."],
        ["warn", "Warn", "Your session request is waiting for review."],
        ["urgent", "Urgent", "Priority support is available right now."],
      ] as Array<[CardTone, string, string]>).map(([tone, title, text]) => (
        <Card key={tone} tone={tone} title={title}>
          <p>{text}</p>
        </Card>
      ))}
    </div>
  ),
};

export const AllStates: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-4">
      <Card title="Default">
        <p>Body content.</p>
      </Card>
      <Card title="Loading" loading />
      <Card title="Error" error="Something went wrong." onRetry={() => {}} />
      <Card title="Disabled" disabled>
        <p>Unavailable right now.</p>
      </Card>
      <Card title="Empty" dashed>
        <p>Nothing here yet.</p>
      </Card>
    </div>
  ),
};

export const Plate: Story = {
  render: () => (
    <div className="mb-plate p-8">
      <p className="mb-sign text-xl font-bold opacity-90">You are here</p>
      <h3 className="mb-sign mt-6 text-5xl font-bold leading-none">Sign in</h3>
    </div>
  ),
};

export const PlateAmber: Story = {
  name: "Plate (amber, crisis notice)",
  render: () => (
    <div className="mb-plate-amber p-4">
      <p className="font-semibold">In crisis right now? The NCMH hotline is free and open 24/7.</p>
      <a href="tel:1553" className="mb-sign text-xl font-bold" style={{ color: "inherit" }}>
        Call 1553
      </a>
    </div>
  ),
};
