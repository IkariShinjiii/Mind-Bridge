import type { Meta, StoryObj } from "@storybook/react-vite";
import AccountNotice from "./AccountNotice";

const meta = {
  title: "Components/AccountNotice",
  component: AccountNotice,
  tags: ["autodocs"],
  parameters: { docs: { story: { inline: false, iframeHeight: 420 } } },
  args: {
    status: "pending-approval",
    onLogout: () => undefined,
    onCheckAgain: () => new Promise<void>((resolve) => setTimeout(resolve, 600)),
  },
} satisfies Meta<typeof AccountNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A counselor who has signed up but has not been approved by an administrator yet. */
export const PendingApproval: Story = {};

/** An account an administrator has switched off. There is nothing to retry, only Log out. */
export const Deactivated: Story = { args: { status: "deactivated" } };

/** The profile could not be read (offline, or a Firestore error), so the app will not guess a role. */
export const Unavailable: Story = { args: { status: "unavailable" } };
