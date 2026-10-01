import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

/** Props a story row can add to the control (aria attributes, disabled, default value). */
type ControlProps = Record<string, string | boolean>;
/** [state name, element id, extra props, optional error message] */
type StateRow = [string, string, ControlProps, string?];

/**
 * Other form controls share the `mb-field` class with the text field: textarea and select, plus native
 * checkbox and radio inputs. These are plain markup (no component yet), so the stories document the pattern:
 * `aria-invalid` plus a `role="alert"` message linked with `aria-describedby`.
 */
const ERROR_BORDER = "!border-[color:var(--mb-urgent)]";

function Labelled({ id, label, error, children }: { id: string; label: string; error?: string | undefined; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-bold">{label}</label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 font-medium text-[color:var(--mb-urgent)]">{error}</p>
      ) : null}
    </div>
  );
}

const meta = {
  title: "Design System/Form inputs/Other controls",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const textareaStates: StateRow[] = [
  ["default", "notes-1", {}],
  ["error", "notes-2", { "aria-invalid": "true", "aria-describedby": "notes-2-error", className: `mb-field ${ERROR_BORDER}` }, "Add a short note before sending."],
  ["disabled", "notes-3", { disabled: true, defaultValue: "Locked while the session is closed." }],
];

export const Textarea: Story = {
  render: () => (
    <div className="space-y-6">
      {textareaStates.map(([name, id, props, error]) => (
        <Labelled key={id} id={id} label={`Notes (${name})`} error={error}>
          <textarea id={id} rows={3} className="mb-field" placeholder="Anything you want your counselor to know" {...props} />
        </Labelled>
      ))}
    </div>
  ),
};

const selectStates: StateRow[] = [
  ["default", "year-1", {}],
  ["error", "year-2", { "aria-invalid": "true", "aria-describedby": "year-2-error", className: `mb-field ${ERROR_BORDER}` }, "Choose your year level."],
  ["disabled", "year-3", { disabled: true }],
];

export const Select: Story = {
  render: () => (
    <div className="space-y-6">
      {selectStates.map(([name, id, props, error]) => (
        <Labelled key={id} id={id} label={`Year level (${name})`} error={error}>
          <select id={id} className="mb-field" defaultValue="" {...props}>
            <option value="" disabled>Select</option>
            <option>1st year</option>
            <option>2nd year</option>
          </select>
        </Labelled>
      ))}
    </div>
  ),
};

export const CheckboxAndRadio: Story = {
  render: () => (
    <div className="space-y-6">
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1.5 h-5 w-5" /> I agree to the Terms and Privacy Policy
      </label>
      <label className="flex items-start gap-3 text-[color:var(--mb-urgent)]">
        <input type="checkbox" aria-invalid="true" className="mt-1.5 h-5 w-5" /> You must agree to continue
      </label>
      <label className="flex items-start gap-3 opacity-60">
        <input type="checkbox" disabled className="mt-1.5 h-5 w-5" /> Receive email reminders (unavailable)
      </label>
      <fieldset className="space-y-2">
        <legend className="font-bold">Session type</legend>
        <label className="flex items-center gap-3"><input type="radio" name="type" defaultChecked className="h-5 w-5" /> In person</label>
        <label className="flex items-center gap-3"><input type="radio" name="type" className="h-5 w-5" /> Online</label>
        <label className="flex items-center gap-3 opacity-60"><input type="radio" name="type" disabled className="h-5 w-5" /> Phone (unavailable)</label>
      </fieldset>
    </div>
  ),
};
