import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

const ToastContext = createContext(null);

// Errors stay longer: they usually say what to do next, and a missed failure looks like success.
const DURATION_MS = { success: 5000, error: 9000 };

/**
 * Holds the toast queue. Wrap the app once, render `<ToastViewport />` inside a `.mb` themed area, and call
 * `useToast()` anywhere below to report the outcome of an action.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const push = useCallback((type, message) => {
    const id = (nextId.current += 1);
    // Repeating the same message replaces it instead of stacking duplicates.
    setToasts((all) =>
      [...all.filter((t) => !(t.type === type && t.message === message)), { id, type, message }].slice(-4),
    );
    return id;
  }, []);

  const api = useMemo(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      dismiss,
    }),
    [push, dismiss],
  );

  return <ToastContext.Provider value={{ api, toasts }}>{children}</ToastContext.Provider>;
}

/** @returns {{ success: (message: string) => number, error: (message: string) => number, dismiss: (id: number) => void }} */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.api;
}

function ToastItem({ toast, onDismiss }) {
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const isError = toast.type === "error";

  // Slide out first, then remove; the short delay matches the exit animation in theme.css.
  const leave = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 180);
  }, [onDismiss, toast.id]);

  // Hovering or focusing a toast holds it open so it can be read, and it never vanishes under the pointer.
  useEffect(() => {
    if (paused) return undefined;
    const t = setTimeout(leave, DURATION_MS[toast.type]);
    return () => clearTimeout(t);
  }, [paused, toast.type, leave]);

  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div
      data-leaving={leaving || undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`mb-toast pointer-events-auto flex items-start gap-3 rounded-lg border border-l-4 bg-[color:var(--mb-surface)] py-3 pl-4 pr-2 shadow-mb-lg ${
        isError ? "border-[color:var(--mb-urgent)]" : "border-[color:var(--mb-safe)]"
      }`}
    >
      <Icon
        className={`mt-1 h-5 w-5 shrink-0 ${isError ? "text-[color:var(--mb-urgent)]" : "text-[color:var(--mb-safe)]"}`}
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 pt-1 font-medium text-[color:var(--mb-ink)]">{toast.message}</p>
      <button
        type="button"
        onClick={leave}
        aria-label={`Dismiss: ${toast.message}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[color:var(--mb-muted)] hover:bg-[color:var(--mb-surface-2)] hover:text-[color:var(--mb-ink)]"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Where toasts appear. Render it inside the `.mb` themed wrapper so the colour tokens resolve.
 * Both live regions are always mounted, because screen readers only announce content added to a region
 * that already exists: successes are announced politely, errors interrupt.
 */
export function ToastViewport() {
  const { api, toasts } = useContext(ToastContext) || {};
  if (!api) return null;
  const render = (type) =>
    toasts.filter((t) => t.type === type).map((t) => <ToastItem key={t.id} toast={t} onDismiss={api.dismiss} />);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex flex-col items-end gap-3 lg:bottom-6 lg:left-auto lg:right-6 lg:w-[26rem]">
      <div role="status" aria-live="polite" className="flex w-full flex-col gap-3">
        {render("success")}
      </div>
      <div role="alert" aria-live="assertive" className="flex w-full flex-col gap-3">
        {render("error")}
      </div>
    </div>
  );
}
