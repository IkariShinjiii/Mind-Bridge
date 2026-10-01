import type { Meta, StoryObj } from "@storybook/react-vite";
import { Send, Trash2 } from "lucide-react";
import { Fragment } from "react";
import Button, { type ButtonVariant } from "./Button";

/** Forces the :hover style without a pointer (hook defined in styles/theme.css). */
const FORCE_HOVER = { "data-force-hover": "" } as Record<string, string>;

/**
 * `Button` from `components/ui/Button.jsx`. Variants: `solid` (main action), `line` (secondary) and
 * `danger` (destructive, filled). `loading` disables the button and shows a spinner; keep the label in the
 * "-ing" form so the state is announced.
 *
 * The **Hover** stories set `data-force-hover`, a hook in `theme.css` that applies the hover style without a
 * pointer so it can be reviewed and snapshotted. The app never sets it.
 */
const meta = {
  title: "Design System/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { variant: "solid", children: "Book a session", disabled: false, loading: false, fullWidth: false },
  argTypes: {
    variant: { control: "inline-radio", options: ["solid", "line", "danger"] },
    icon: { control: false },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Line: Story = { args: { variant: "line", children: "Cancel" } };

export const Danger: Story = {
  args: { variant: "danger", children: "Cancel appointment", icon: <Trash2 className="h-5 w-5" aria-hidden="true" /> },
};

export const Hover: Story = {
  name: "Hover (forced)",
  args: { ...FORCE_HOVER },
};

export const HoverLine: Story = {
  name: "Hover, line (forced)",
  args: { variant: "line", children: "Cancel", ...FORCE_HOVER },
};

export const Disabled: Story = { args: { disabled: true } };

export const Loading: Story = { args: { loading: true, children: "Saving…" } };

export const LoadingLine: Story = { args: { variant: "line", loading: true, children: "Cancelling…" } };

export const WithIcon: Story = { args: { icon: <Send className="h-5 w-5" aria-hidden="true" />, children: "Send message" } };

export const FullWidth: Story = { args: { fullWidth: true } };

export const Submit: Story = {
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
export const AllStates: Story = {
  parameters: { controls: { disable: true } },
  render: () => {
    const cols: Array<[string, { disabled?: boolean; loading?: boolean } & Record<string, string | boolean | undefined>]> = [
      ["Default", {}],
      ["Hover", { ...FORCE_HOVER }],
      ["Disabled", { disabled: true }],
      ["Loading", { loading: true }],
    ];
    const rows: Array<[ButtonVariant, string, string]> = [
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
          <Fragment key={variant}>
            <span className="text-[color:var(--mb-muted)]">{variant}</span>
            {cols.map(([name, props]) => (
              <Button key={name} variant={variant} {...props}>
                {props.loading ? busy : label}
              </Button>
            ))}
          </Fragment>
        ))}
      </div>
    );
  },
};
