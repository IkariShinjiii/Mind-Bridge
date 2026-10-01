import React, { useState } from "react";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { Field } from "./AuthFrame";

/**
 * The dialog traps focus, closes on Escape and backdrop click, and locks body scroll while open.
 * Stories render inside an iframe on the docs page because the overlay is `position: fixed`.
 */
function Host({ initiallyOpen = true, children, footer, ...props }) {
  const [open, setOpen] = useState(initiallyOpen);
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" className="mb-btn mb-btn-solid" onClick={() => setOpen(true)}>Open dialog</button>
      <Modal isOpen={open} onClose={close} {...props} footer={typeof footer === "function" ? footer(close) : footer}>
        {children}
      </Modal>
    </>
  );
}

export default {
  title: "Design System/Modal",
  component: Modal,
  tags: ["autodocs"],
  parameters: { docs: { story: { inline: false, iframeHeight: 480 } } },
  argTypes: { maxWidth: { control: "select", options: ["max-w-md", "max-w-lg", "max-w-xl", "max-w-2xl"] } },
};

const confirmFooter = (close) => (
  <>
    <button type="button" className="mb-btn mb-btn-line" onClick={close}>Keep session</button>
    <button type="button" className="mb-btn mb-btn-solid" onClick={close}>Cancel session</button>
  </>
);

export const Default = {
  render: (args) => (
    <Host {...args} title="Cancel this session?" description="Tuesday, 14 October at 10:00 with Ms. Reyes." footer={confirmFooter}>
      <p>Your counselor will be told right away. You can book another time afterwards.</p>
    </Host>
  ),
};

export const Loading = {
  render: (args) => (
    <Host
      {...args}
      title="Choose a time"
      description="Open times in the next two weeks."
      footer={() => (
        <>
          <button type="button" className="mb-btn mb-btn-line">Back</button>
          <button type="button" className="mb-btn mb-btn-solid" disabled>Confirm</button>
        </>
      )}
    >
      <div role="status" className="flex min-h-[120px] items-center justify-center gap-3 text-[color:var(--mb-muted)]">
        <Spinner size={18} /> Loading open times...
      </div>
    </Host>
  ),
};

export const Error = {
  render: (args) => (
    <Host
      {...args}
      title="Choose a time"
      footer={(close) => <button type="button" className="mb-btn mb-btn-line" onClick={close}>Close</button>}
    >
      <p role="alert" className="mb-alert font-medium">We could not load open times. Check your connection and try again.</p>
    </Host>
  ),
};

export const FormSubmitting = {
  name: "Form (submitting, disabled)",
  render: (args) => (
    <Host
      {...args}
      title="Add a note"
      footer={() => (
        <>
          <button type="button" className="mb-btn mb-btn-line" disabled>Cancel</button>
          <button type="submit" className="mb-btn mb-btn-solid" disabled>
            <Spinner size={16} /> Saving...
          </button>
        </>
      )}
    >
      <Field id="subject" label="Subject" defaultValue="Follow-up" disabled />
      <textarea className="mb-field" rows={3} defaultValue="Talked through exam stress." disabled aria-label="Note" />
    </Host>
  ),
};

export const FormError = {
  render: (args) => (
    <Host {...args} title="Add a note" footer={confirmFooter}>
      <Field id="subject-error-demo" label="Subject" error="Add a subject." />
    </Host>
  ),
};

export const Wide = {
  args: { maxWidth: "max-w-2xl" },
  render: (args) => (
    <Host
      {...args}
      title="Session history"
      footer={(close) => <button type="button" className="mb-btn mb-btn-solid" onClick={close}>Done</button>}
    >
      {Array.from({ length: 12 }, (_, i) => (
        <p key={i}>Session {i + 1}: notes are kept private to your counselor.</p>
      ))}
    </Host>
  ),
};

export const Narrow = {
  args: { maxWidth: "max-w-md" },
  render: (args) => (
    <Host {...args} title="Sign out?" footer={confirmFooter}>
      <p>You will need to log in again to see your check-ins.</p>
    </Host>
  ),
};

export const TitleOnly = {
  name: "Title without description",
  render: (args) => (
    <Host {...args} title="Crisis resources" footer={(close) => <button type="button" className="mb-btn mb-btn-solid" onClick={close}>Got it</button>}>
      <p>If you are in immediate danger, call your local emergency number now.</p>
    </Host>
  ),
};

export const LongTitle = {
  render: (args) => (
    <Host
      {...args}
      title="Reschedule your session with Dr. Maria Concepcion Villanueva-Santos"
      description="Pick a new time. Your counselor is told as soon as you confirm."
      footer={confirmFooter}
    >
      <p>The header wraps instead of pushing the close button out of view.</p>
    </Host>
  ),
};

export const NoHeader = {
  name: "No title (body only)",
  render: (args) => (
    <Host {...args} footer={(close) => <button type="button" className="mb-btn mb-btn-solid" onClick={close}>OK</button>}>
      <p>Without a title or description the header, and its close button, are left out. Escape and backdrop click still close it.</p>
    </Host>
  ),
};

export const NoFooter = {
  render: (args) => (
    <Host {...args} title="Privacy notice" description="Close with the X, Escape, or a click outside.">
      <p>Dialogs that only inform do not need a footer.</p>
    </Host>
  ),
};

export const Closed = {
  render: (args) => <Host {...args} initiallyOpen={false} title="Closed by default" />,
};
