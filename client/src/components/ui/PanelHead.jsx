import React from "react";

/**
 * Heading for a card section: a title with an optional one-line description,
 * underlined with the same 2px rule used across Settings, Crisis Resources and dialogs.
 * @param {{ title: string, as?: "h1"|"h2"|"h3", children?: React.ReactNode }} props
 */
export default function PanelHead({ title, as: Tag = "h2", children }) {
  return (
    <div className="mb-5 border-b-2 border-[color:var(--mb-line)] pb-4">
      <Tag className="text-2xl font-bold text-[color:var(--mb-ink)]">{title}</Tag>
      {children && <p className="mt-1 max-w-[65ch] text-[color:var(--mb-muted)]">{children}</p>}
    </div>
  );
}
