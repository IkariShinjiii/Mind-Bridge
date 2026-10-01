import React from "react";
import Input from "./Input";

/**
 * `Input` from `components/ui/Input.jsx`: a labelled text input. The hint and error are linked to the input with
 * `aria-describedby`; an error also sets `aria-invalid` and is announced. `loading` makes the field read-only and
 * shows a spinner while a value is checked or saved.
 *
 * The **Hover** story sets `data-force-hover` (a hook in `theme.css`) so the hover border can be reviewed
 * without a pointer. Focus is shown with the 3px focus ring: click or tab into any field to see it.
 */
export default {
  title: "Design System/Input",
  component: Input,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  args: { label: "School email", type: "email", placeholder: "you@usa.edu.ph", autoComplete: "email" },
  argTypes: { loading: { control: "boolean" }, disabled: { control: "boolean" }, required: { control: "boolean" } },
};

export const Default = {};

export const Required = { args: { required: true } };

export const WithHint = { args: { hint: "Use the address ending in @usa.edu.ph." } };

export const Filled = { args: { defaultValue: "ana@usa.edu.ph" } };

export const Hover = { name: "Hover (forced)", args: { "data-force-hover": "" } };

export const Error = {
  args: {
    defaultValue: "ana@gmail",
    required: true,
    error: "Student registrations must use an @usa.edu.ph email address.",
  },
};

export const Disabled = {
  args: { disabled: true, defaultValue: "ana@usa.edu.ph", hint: "Your email cannot be changed." },
};

export const Loading = {
  name: "Loading (checking value)",
  args: { loading: true, defaultValue: "ana@usa.edu.ph", hint: "Checking that this address is free…" },
};

export const Password = {
  args: {
    label: "Password",
    type: "password",
    autoComplete: "new-password",
    required: true,
    hint: "At least 6 characters.",
  },
};

export const AllStates = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="space-y-5">
      <Input label="Default" placeholder="Placeholder" />
      <Input label="Hover" placeholder="Placeholder" data-force-hover="" />
      <Input label="Filled" defaultValue="ana@usa.edu.ph" />
      <Input label="Error" required defaultValue="ana@gmail" error="Use your @usa.edu.ph email." />
      <Input label="Disabled" disabled defaultValue="Cannot be changed" />
      <Input label="Loading" loading defaultValue="Checking…" />
    </div>
  ),
};
