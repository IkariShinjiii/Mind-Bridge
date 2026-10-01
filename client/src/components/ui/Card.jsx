import React from "react";
import PanelHead from "./PanelHead";
import Spinner from "./Spinner";

const TONES = {
  default: "border-[color:var(--mb-line)] bg-[color:var(--mb-surface)]",
  brand: "border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)]",
  safe: "border-[color:var(--mb-safe)] bg-[color:var(--mb-safe-bg)]",
  warn: "border-[color:var(--mb-warn)] bg-[color:var(--mb-warn-bg)]",
  urgent: "border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)]",
};

/**
 * The app card: a 2px-bordered surface with an optional heading, body and footer.
 *
 * States:
 * - `loading`: replaces the body with a spinner and `loadingLabel`, and sets `aria-busy`.
 * - `error`: replaces the body with an alert message; pass `onRetry` to add a "Try again" button.
 * - `disabled`: dims the card and marks it `aria-disabled` (the section is unavailable, not just inert).
 * - `dashed`: dashed border for empty states.
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
 * @param {React.ReactNode} [props.footer] - actions row, separated by a rule
 * @param {React.ElementType} [props.as="section"]
 * @param {string} [props.className]
 */
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
  footer,
  as: Tag = "section",
  className = "",
  children,
  ...rest
}) {
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
      className={`rounded-md border-2 ${dashed ? "border-dashed" : ""} p-5 sm:p-6 ${TONES[tone] || TONES.default}${
        disabled ? " opacity-60" : ""
      }${className ? ` ${className}` : ""}`}
      {...rest}
    >
      {title && (
        <PanelHead title={title} as={headingAs}>
          {description}
        </PanelHead>
      )}
      {body}
      {footer && !loading && (
        <div className="mt-5 flex flex-wrap justify-end gap-3 border-t-2 border-[color:var(--mb-line)] pt-4">
          {footer}
        </div>
      )}
    </Tag>
  );
}
