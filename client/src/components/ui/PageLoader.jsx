import React from "react";
import Spinner from "./Spinner";

/**
 * Full-area loading state used while a route chunk or the auth session loads.
 * @param {{ label?: string }} props
 */
export default function PageLoader({ label = "Loading…" }) {
  return (
    <div className="mb flex h-full min-h-[100dvh] w-full items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-[color:var(--mb-muted)]">
        <Spinner size={32} className="text-[color:var(--mb-brand)]" />
        <span>{label}</span>
      </div>
    </div>
  );
}
