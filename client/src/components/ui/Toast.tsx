import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type ToastType = "success" | "error";

interface ToastData {
  id: number;
  type: ToastType;
  message: string;
}

/** What `useToast()` returns. `success` and `error` return the toast id so it can be dismissed early. */
export interface ToastApi {
  success: (message: string) => number;
  error: (message: string) => number;
  dismiss: (id: number) => void;
}

interface ToastContextValue {
  api: ToastApi;
  toasts: ToastData[];
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Errors stay longer: they usually say what to do next, and a missed failure looks like success.
const DURATION_MS: Record<ToastType, number> = { success: 5000, error: 9000 };

/**
 * Holds the toast queue. Wrap the app once, render `<ToastViewport />` inside a `.mb` themed area, and call
 * `useToast()` anywhere below to report the outcome of an action.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const push = useCallback((type: ToastType, message: string) => {
    nextId.current += 1;
    const id = nextId.current;
    // Repeating the same message replaces it instead of stacking duplicates.
    setToasts((all) =>
      [...all.filter((t) => !(t.type === type && t.message === message)), { id, type, message }].slice(-4),
    );
    return id;
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      dismiss,
    }),
    [push, dismiss],
  );

  const value = useMemo(() => ({ api, toasts }), [api, toasts]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

/**
 * Report the outcome of an action: `toast.success("Saved.")`, `toast.error(friendlyError(err))`.
 * @throws {Error} when used outside `ToastProvider`
 */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.api;
}

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const isError = toast.type === "error";

  // Hovering or focusing a toast holds it open so it can be read, and it never vanishes under the pointer.
  useEffect(() => {
    if (paused) return undefined;
    const t = setTimeout(() => onDismiss(toast.id), DURATION_MS[toast.type]);
    return () => clearTimeout(t);
  }, [paused, toast.id, toast.type, onDismiss]);

  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`mb-toast pointer-events-auto flex items-start gap-3 rounded-md border-2 bg-[color:var(--mb-surface)] py-3 pl-4 pr-2 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.35)] ${
        isError ? "border-[color:var(--mb-urgent)]" : "border-[color:var(--mb-safe)]"
      }`}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${isError ? "text-[color:var(--mb-urgent)]" : "text-[color:var(--mb-safe)]"}`}
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 pt-0.5 font-medium text-[color:var(--mb-ink)]">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
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
  const ctx = useContext(ToastContext);
  if (!ctx) return null;
  const { api, toasts } = ctx;
  const render = (type: ToastType) =>
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
