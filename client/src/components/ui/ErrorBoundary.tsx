import { Component, type ErrorInfo, type ReactNode } from "react";
import { toAppError } from "../../utils/errors";
import type { AppErrorShape } from "../../types";

export interface ErrorBoundaryProps {
  children?: ReactNode;
  /** When this value changes (for example the route), a shown error is cleared. */
  resetKey?: unknown;
  /** Custom fallback. Receives the standardised error and a function that clears it. */
  fallback?: (error: AppErrorShape, reset: () => void) => ReactNode;
  /** Called once per caught error, for logging or reporting. */
  onError?: (error: AppErrorShape, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: AppErrorShape | null;
}

/** The default recovery screen. Crisis lines are always shown, because a crash must never hide them. */
export function DefaultErrorFallback() {
  return (
    <div className="mb flex min-h-[100dvh] items-center justify-center p-4" role="alert">
      <div className="mb-plate w-full max-w-xl p-6 sm:p-8">
        <p className="mb-sign text-xl font-bold opacity-90">Something broke</p>
        <h1 className="mb-sign mt-1 text-4xl font-bold leading-tight">This page could not load</h1>
        <p className="mt-3 text-[color:var(--mb-panel-soft)]">
          Nothing you entered was lost on our side. Reload the page to try again. If it keeps happening, tell the
          guidance office.
        </p>
        <p className="mt-3 text-[color:var(--mb-panel-soft)]">
          If you need to talk to someone right now, call the NCMH crisis hotline on{" "}
          <a href="tel:1553" className="font-bold underline">
            1553
          </a>{" "}
          (free, 24/7).
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mb-btn border-[color:var(--mb-panel-ink)] bg-[color:var(--mb-panel-ink)] text-[color:var(--mb-panel)]"
          >
            Reload page
          </button>
          <a
            href="/"
            className="mb-btn border-[color:var(--mb-panel-ink)] bg-transparent text-[color:var(--mb-panel-ink)] no-underline"
          >
            Go to home
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Catches render errors in its subtree and shows a recovery screen instead of a blank page.
 * Errors are converted to the app-wide `AppError` shape before they reach `fallback` / `onError`.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toAppError(error, "This page could not load.") };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error("Unhandled UI error:", error, info.componentStack);
    if (this.state.error) this.props.onError?.(this.state.error, info);
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) this.reset();
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return this.props.fallback ? this.props.fallback(error, this.reset) : <DefaultErrorFallback />;
  }
}
