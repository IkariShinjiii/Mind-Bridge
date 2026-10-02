import { useEffect, useId, useRef, type ReactNode } from "react";
import { m, AnimatePresence } from "framer-motion";
import { dialogPreset, fadePreset, useMotionPreset } from "../../lib/motion";
import useFocusTrap from "../../hooks/useFocusTrap";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Tailwind max-width class, e.g. "max-w-md", "max-w-xl". */
  maxWidth?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "max-w-lg",
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen, onClose);

  // Move focus into the dialog when it opens
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      const target =
        dialogRef.current?.querySelector<HTMLElement>("[autofocus], input, textarea, select") ?? dialogRef.current;
      target?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const backdropMotion = useMotionPreset(fadePreset);
  const dialogMotion = useMotionPreset(dialogPreset);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <m.div
              {...backdropMotion}
              onClick={onClose}
              aria-hidden="true"
              className="mb-backdrop-blur fixed inset-0"
            />

            {/* Modal Dialog Card */}
            <m.div
              ref={dialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              {...dialogMotion}
              className={`relative z-10 flex w-full ${maxWidth} max-h-[90dvh] flex-col rounded-lg border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] shadow-mb-lg overflow-hidden focus:outline-none`}
            >
              {/* Header */}
              {(title || description) && (
                <div className="flex items-start justify-between border-b border-[color:var(--mb-line)] px-6 py-4 sm:px-6 sm:py-6 shrink-0 bg-[color:var(--mb-ground)]">
                  <div className="space-y-1 pr-4">
                    {title && (
                      <h2 id={titleId} className="text-xl font-bold text-[color:var(--mb-ink)] sm:text-2xl">
                        {title}
                      </h2>
                    )}
                    {description && <p className="text-[color:var(--mb-muted)]">{description}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[color:var(--mb-muted)] hover:bg-[color:var(--mb-surface-2)] hover:text-[color:var(--mb-ink)] transition-colors"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Scrollable Body Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4">{children}</div>

              {/* Optional Footer */}
              {footer && (
                <div className="border-t border-[color:var(--mb-line)] px-6 py-4 sm:px-6 sm:py-4 bg-[color:var(--mb-ground)] shrink-0 flex items-center justify-end gap-3">
                  {footer}
                </div>
              )}
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
