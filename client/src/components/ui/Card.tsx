import type { ElementType, HTMLAttributes, ReactNode } from "react";
import PanelHead from "./PanelHead";
import Spinner from "./Spinner";

const TONES: Record<CardTone, string> = {
  default: "",
  brand: "!border-[color:var(--mb-brand)] !bg-[color:var(--mb-brand-bg)]",
  safe: "!border-[color:var(--mb-safe)] !bg-[color:var(--mb-safe-bg)]",
  warn: "!border-[color:var(--mb-warn)] !bg-[color:var(--mb-warn-bg)]",
  urgent: "!border-[color:var(--mb-urgent)] !bg-[color:var(--mb-urgent-bg)]",
};

/**
 * The app card: a softly shadowed, 1px-bordered surface with an optional heading, body and footer.
 *
 * States:
 * - `loading`: replaces the body with a spinner and `loadingLabel`, and sets `aria-busy`.
 * - `error`: replaces the body with an alert message; pass `onRetry` to add a "Try again" button.
 * - `disabled`: dims the card and marks it `aria-disabled` (the section is unavailable, not just inert).
 * - `dashed`: dashed border for empty states.
 * - `interactive`: lifts on hover; use when the whole card is a link or button target.
 *
 * @param {object} props
 * @param {"default"|"brand"|"safe"|"warn"|"urgent"} [props.tone="default"]
 * @param {string} [props.title] - heading text (rendered with PanelHead)
 * @param {string} [props.description] - one line under the heading
 * @param {"h1"|"h2"|"h3"} [props.headingAs="h2"]
 * @param {boolean} [props.loading]
 * @param {string} [props.loadingLabel="Loading…"]
 * @param {string} [props.error] - message to show instead of the body
 * @param {() => void} [props.onRetry]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.dashed]
 * @param {boolean} [props.interactive]
 * @param {React.ReactNode} [props.footer] - actions row, separated by a rule
 * @param {React.ElementType} [props.as="section"]
 * @param {string} [props.className]
 */
export type CardTone = "default" | "brand" | "safe" | "warn" | "urgent";

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  tone?: CardTone;
  /** Heading text (rendered with PanelHead). */
  title?: string | undefined;
  /** One line under the heading. */
  description?: string | undefined;
  headingAs?: "h1" | "h2" | "h3";
  loading?: boolean;
  loadingLabel?: string;
  /** Message shown instead of the body. */
  error?: string;
  onRetry?: (() => void) | undefined;
  disabled?: boolean;
  /** Dashed border for empty states. */
  dashed?: boolean;
  /** Lifts on hover; use when the whole card is a link or button target. */
  interactive?: boolean;
  /** Actions row, separated by a rule. */
  footer?: ReactNode;
  as?: ElementType;
}

export default function Card({
  tone = "default",
  title,
  description,
  headingAs = "h2",
  loading = false,
  loadingLabel = "Loading…",
  error = "",
  onRetry,
  disabled = false,
  dashed = false,
  interactive = false,
  footer,
  as: Tag = "section",
  className = "",
  children,
  ...rest
}: CardProps) {
  let body = children;
  if (loading) {
    body = (
      <div role="status" className="flex min-h-[160px] items-center justify-center gap-3 text-[color:var(--mb-muted)]">
        <Spinner size={20} className="text-[color:var(--mb-brand)]" />
        <span>{loadingLabel}</span>
      </div>
    );
  } else if (error) {
    body = (
      <div className="space-y-3">
        <p role="alert" className="mb-alert font-medium">
          {error}
        </p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mb-btn mb-btn-line">
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <Tag
      aria-busy={loading || undefined}
      aria-disabled={disabled || undefined}
      className={`mb-card${dashed ? " !border-dashed !shadow-none" : ""}${interactive ? " mb-card-interactive" : ""} ${
        TONES[tone] ?? TONES.default
      }${disabled ? " opacity-60" : ""}${className ? ` ${className}` : ""}`}
      {...rest}
    >
      {title && (
        <PanelHead title={title} as={headingAs}>
          {description}
        </PanelHead>
      )}
      {body}
      {footer && !loading && (
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[color:var(--mb-line)] pt-4">
          {footer}
        </div>
      )}
    </Tag>
  );
}
