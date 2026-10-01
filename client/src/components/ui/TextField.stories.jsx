import React from "react";
import { Field } from "./AuthFrame";
import Spinner from "./Spinner";

/**
 * `Field` (exported from `AuthFrame.jsx`) is the labelled text input. `hint` and `error` render below the input and
 * are linked with `aria-describedby`; every other prop (`disabled`, `required`, `type`...) goes to the `<input>`.
 */
export default {
  title: "Design System/Form inputs/Text field",
  component: Field,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  args: { id: "email", label: "Email", type: "email", placeholder: "you@usa.edu.ph" },
};

export const Default = {};

export const Required = { args: { required: true } };

export const WithHint = { args: { hint: "Use your university email." } };

export const Filled = { args: { defaultValue: "kosarmiento@usa.edu.ph" } };

export const Disabled = {
  args: { disabled: true, defaultValue: "kosarmiento@usa.edu.ph", hint: "Your email cannot be changed." },
};

export const Error = {
  args: { defaultValue: "kosarmiento@usa", error: "Enter a complete email address, like name@usa.edu.ph." },
};

export const Loading = {
  name: "Loading (form submitting)",
  render: (args) => (
    <form onSubmit={(e) => e.preventDefault()} aria-busy="true" className="space-y-4">
      <Field {...args} defaultValue="kosarmiento@usa.edu.ph" disabled />
      <Field id="password" label="Password" type="password" defaultValue="password123" disabled />
      <button type="submit" disabled className="mb-btn mb-btn-solid w-full">
        <Spinner size={16} />
        Signing in...
      </button>
    </form>
  ),
};
