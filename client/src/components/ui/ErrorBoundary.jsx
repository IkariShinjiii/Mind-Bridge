import React from "react";

/**
 * Catches render errors in its subtree and shows a recovery screen instead of a blank page.
 * Pass `resetKey` (for example the current route) so navigating away clears the error.
 * Crisis lines are always shown, because a crash must never hide them.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

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
}
