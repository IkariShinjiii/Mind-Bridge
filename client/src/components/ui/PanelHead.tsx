import type { ReactNode } from "react";

/**
 * Heading for a card section: a title with an optional one-line description,
 * underlined with the same hairline rule used across Settings, Crisis Resources and dialogs.
 */
export interface PanelHeadProps {
  title: string;
  as?: "h1" | "h2" | "h3";
  children?: ReactNode;
}

export default function PanelHead({ title, as: Tag = "h2", children }: PanelHeadProps) {
  return (
    <div className="mb-6 border-b border-[color:var(--mb-line)] pb-4">
      <Tag className="text-2xl font-bold text-[color:var(--mb-ink)]">{title}</Tag>
      {children && <p className="mt-1 max-w-[65ch] text-[color:var(--mb-muted)]">{children}</p>}
    </div>
  );
}
