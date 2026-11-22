import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * A collapsed section with a one-line hint, so a dashboard can offer many things without showing them all at once.
 * Uses the native <details> element: keyboard and screen-reader support come with it.
 */
export default function Disclosure({
  id,
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  id?: string;
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className="group rounded-xl border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)]"
    >
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-5 py-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-xl font-bold text-[color:var(--mb-ink)]">{title}</span>
          {hint && <span className="block text-sm text-[color:var(--mb-muted)]">{hint}</span>}
        </span>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-[color:var(--mb-muted)] transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      {/* The sections placed inside are cards already; drop their own frame so there is one border, not two. */}
      <div className="space-y-4 px-3 pb-4 sm:px-5 [&_.mb-card]:border-0 [&_.mb-card]:bg-transparent [&_.mb-card]:p-0 [&_.mb-card]:shadow-none">
        {children}
      </div>
    </details>
  );
}
