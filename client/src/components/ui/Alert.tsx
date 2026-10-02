import type { HTMLMotionProps } from "framer-motion";
import { m } from "framer-motion";
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { fadePreset, useMotionPreset } from "../../lib/motion";

type MessageProps = Omit<HTMLMotionProps<"div">, "children" | "initial" | "animate" | "exit"> & {
  children?: ReactNode;
};

function useFade() {
  return useMotionPreset(fadePreset);
}

/**
 * Error banner (`mb-alert`). Fades in on mount, and out too when it sits inside an `AnimatePresence`.
 * Use `role="alert"` for errors that appear after an action, `role="note"` for static notices.
 */
export function Alert({ className = "", children, ...rest }: MessageProps) {
  return (
    <m.div {...useFade()} className={`mb-alert${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </m.div>
  );
}

/** Success banner (`mb-notice`). Same motion as `Alert`; announce with `role="status"`. */
export function Notice({ className = "", children, ...rest }: MessageProps) {
  return (
    <m.div {...useFade()} className={`mb-notice${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </m.div>
  );
}

/** Validation message under a field (`mb-field-error`) with its icon. Pass the id the input's `aria-describedby` points at. */
export function FieldError({ className = "", children, ...rest }: MessageProps) {
  return (
    <m.div role="alert" {...useFade()} className={`mb-field-error${className ? ` ${className}` : ""}`} {...rest}>
      <AlertCircle className="mt-[3px] h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </m.div>
  );
}
