import React from "react";
import { Send, Trash2 } from "lucide-react";
import Button from "./Button";

/**
 * `Button` from `components/ui/Button.jsx`. Variants: `solid` (main action), `line` (secondary) and
 * `danger` (destructive, filled). `loading` disables the button and shows a spinner; keep the label in the
 * "-ing" form so the state is announced.
 *
 * The **Hover** stories set `data-force-hover`, a hook in `theme.css` that applies the hover style without a
 * pointer so it can be reviewed and snapshotted. The app never sets it.
 */
export default {
  title: "Design System/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { variant: "solid", children: "Book a session", disabled: false, loading: false, fullWidth: false },
  argTypes: {
    variant: { control: "inline-radio", options: ["solid", "line", "danger"] },
    icon: { control: false },
  },
};

export const Default = {};

export const Line = { args: { variant: "line", children: "Cancel" } };

export const Danger = {
  args: { variant: "danger", children: "Cancel appointment", icon: <Trash2 className="h-5 w-5" aria-hidden="true" /> },
};

export const Hover = {
  name: "Hover (forced)",
  args: { "data-force-hover": "" },
};

export const HoverLine = {
  name: "Hover, line (forced)",
  args: { variant: "line", children: "Cancel", "data-force-hover": "" },
};

export const Disabled = { args: { disabled: true } };

export const Loading = { args: { loading: true, children: "Saving…" } };

export const LoadingLine = { args: { variant: "line", loading: true, children: "Cancelling…" } };

export const WithIcon = { args: { icon: <Send className="h-5 w-5" aria-hidden="true" />, children: "Send message" } };

export const FullWidth = { args: { fullWidth: true } };

export const Submit = {
  name: "Inside a form (type=submit)",
  render: (args) => (
    <form onSubmit={(e) => e.preventDefault()} className="max-w-sm space-y-3">
      <Button {...args} type="submit" fullWidth>
        Save changes
      </Button>
      <Button variant="line" fullWidth>
        Discard (type=button, does not submit)
      </Button>
    </form>
  ),
};

/** Every variant in every state, side by side. Includes the dark theme via the toolbar. */
export const AllStates = {
  parameters: { controls: { disable: true } },
  render: () => {
    const cols = [
      ["Default", {}],
      ["Hover", { "data-force-hover": "" }],
      ["Disabled", { disabled: true }],
      ["Loading", { loading: true }],
    ];
    const rows = [
      ["solid", "Book a session", "Booking…"],
      ["line", "Cancel", "Cancelling…"],
      ["danger", "Delete account", "Deleting…"],
    ];
    return (
      <div className="grid max-w-4xl grid-cols-[6rem_repeat(4,1fr)] items-center gap-4">
        <span />
        {cols.map(([name]) => (
          <b key={name}>{name}</b>
        ))}
        {rows.map(([variant, label, busy]) => (
          <React.Fragment key={variant}>
            <span className="text-[color:var(--mb-muted)]">{variant}</span>
            {cols.map(([name, props]) => (
              <Button key={name} variant={variant} {...props}>
                {props.loading ? busy : label}
              </Button>
            ))}
          </React.Fragment>
        ))}
      </div>
    );
  },
};
