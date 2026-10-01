import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import CookieConsent from "./CookieConsent";

const KEY = "mindbridge_cookie_consent";

/** The notice shows only when no consent is stored, so each story sets storage before mounting. */
function WithConsent({ stored }: { stored?: string }) {
  try {
    if (stored) localStorage.setItem(KEY, stored);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the notice just shows */
  }
  return <CookieConsent />;
}

const meta = {
  title: "Components/CookieConsent",
  component: CookieConsent,
  parameters: { docs: { story: { inline: false, iframeHeight: 220 } } },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof CookieConsent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <WithConsent /> };

export const AlreadyAccepted: Story = {
  name: "Already accepted (renders nothing)",
  render: () => <WithConsent stored="accepted" />,
};
