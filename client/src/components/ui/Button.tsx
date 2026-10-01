import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import Spinner from "./Spinner";

export type ButtonVariant = "solid" | "line" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  solid: "mb-btn-solid",
  line: "mb-btn-line",
  // Destructive: filled with the urgent token; the label must say what it destroys
  danger: "mb-btn-danger",
};

/**
 * The app button. Styling comes from the `mb-btn` classes in `styles/theme.css`.
 *
 * `loading` disables the button, shows a spinner before the label and sets `aria-busy`; keep the label
 * meaningful ("Saving…") so the state is announced. Always renders `type="button"` unless told otherwise,
 * so a button inside a form never submits by accident.
 *
 * @param {object} props
 * @param {"solid"|"line"|"danger"} [props.variant="solid"]
 * @param {boolean} [props.loading=false] - async work in progress
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.fullWidth=false] - fill the container (use on phones)
 * @param {React.ReactNode} [props.icon] - icon shown before the label (replaced by the spinner while loading)
 * @param {string} [props.className] - extra classes
 * @param {React.ReactNode} props.children - label
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Async work in progress: disables the button and shows a spinner. */
  loading?: boolean;
  /** Fill the container (use on phones). */
  fullWidth?: boolean;
  /** Icon shown before the label (replaced by the spinner while loading). */
  icon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "solid", loading = false, disabled = false, fullWidth = false, icon, type = "button", className = "", children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`mb-btn ${VARIANTS[variant] ?? VARIANTS.solid}${fullWidth ? " w-full" : ""}${className ? ` ${className}` : ""}`}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : icon}
      {children}
    </button>
  );
});

export default Button;
