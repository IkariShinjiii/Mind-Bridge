import React from "react";
import { MemoryRouter } from "react-router-dom";
import CookieConsent from "./CookieConsent";

const KEY = "mindbridge_cookie_consent";

/** The notice shows only when no consent is stored, so each story sets storage before mounting. */
function WithConsent({ stored }) {
  try {
    if (stored) localStorage.setItem(KEY, stored);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the notice just shows */
  }
  return <CookieConsent />;
}

export default {
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
};

export const Default = { render: () => <WithConsent /> };

export const AlreadyAccepted = {
  name: "Already accepted (renders nothing)",
  render: () => <WithConsent stored="accepted" />,
};
