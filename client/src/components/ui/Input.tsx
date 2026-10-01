import { forwardRef, useId, type InputHTMLAttributes } from "react";
import Spinner from "./Spinner";

/**
 * Labelled text input. Uses the `mb-field` class (3:1 border, 48px tall) from `styles/theme.css`.
 *
 * The hint and error render under the input and are linked with `aria-describedby`; an error also sets
 * `aria-invalid` and is announced as an alert. `loading` makes the field read-only, shows a spinner and sets
 * `aria-busy` (use while a value is being checked or saved). Every other prop (`type`, `autoComplete`,
 * `required`, `disabled`, `value`/`onChange`...) goes to the `<input>`.
 *
 * @param {object} props
 * @param {string} props.label - visible label (required for accessibility)
 * @param {string} [props.id] - generated when omitted
 * @param {string} [props.hint] - help text under the input
 * @param {string} [props.error] - validation message; puts the field in the error state
 * @param {boolean} [props.loading]
 * @param {string} [props.className] - extra classes for the `<input>`
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible label (required for accessibility). */
  label: string;
  /** Help text under the input. */
  hint?: string | undefined;
  /** Validation message; puts the field in the error state. */
  error?: string | undefined;
  /** Read-only with a spinner while a value is checked or saved. */
  loading?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, id: idProp, hint, error, loading = false, required, className = "", style, ...rest },
  ref
) {
  const generated = useId();
  const id = idProp || generated;
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-bold">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          name={rest.name ?? idProp ?? undefined}
          required={required}
          readOnly={loading || rest.readOnly}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-busy={loading || undefined}
          className={`mb-field${loading ? " pr-11" : ""}${className ? ` ${className}` : ""}`}
          style={error ? { borderColor: "var(--mb-urgent)", ...style } : style}
          {...rest}
        />
        {loading && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--mb-brand)]">
            <Spinner size={18} />
          </span>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 font-medium text-[color:var(--mb-urgent)]">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-sm text-[color:var(--mb-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
