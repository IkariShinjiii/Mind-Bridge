import React from "react";
import { ToastProvider, ToastViewport, useToast } from "./Toast";

/**
 * Outcome messages for actions: saved, booked, failed. Successes are announced politely and clear after 5 seconds;
 * errors are announced immediately and stay for 9. Hovering or focusing a toast holds it open, and the X dismisses it.
 * `ToastViewport` goes inside the themed `.mb` area; call `useToast()` from anywhere below the provider.
 */
export default {
  title: "Design System/Toast",
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { story: { inline: false, iframeHeight: 360 } } },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
        <ToastViewport />
      </ToastProvider>
    ),
  ],
};

function Trigger({ children }) {
  const toast = useToast();
  return <div className="flex flex-wrap gap-3">{children(toast)}</div>;
}

export const Triggers = {
  name: "Success and error",
  render: () => (
    <Trigger>
      {(toast) => (
        <>
          <button type="button" className="mb-btn mb-btn-solid" onClick={() => toast.success("Appointment requested. Your counselor will confirm.")}>
            Show success
          </button>
          <button type="button" className="mb-btn mb-btn-line" onClick={() => toast.error("Could not save your profile. Your changes are still here, try again.")}>
            Show error
          </button>
        </>
      )}
    </Trigger>
  ),
};

export const Stacked = {
  render: () => (
    <Trigger>
      {(toast) => (
        <button
          type="button"
          className="mb-btn mb-btn-solid"
          onClick={() => {
            toast.success("Profile saved.");
            toast.success("Emergency contact saved.");
            toast.error("That time was just taken. Pick another open time.");
          }}
        >
          Show three at once
        </button>
      )}
    </Trigger>
  ),
};
