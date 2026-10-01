import React from "react";

/**
 * Small inline loading ring. Inherits the surrounding text colour unless `color` is given.
 * Decorative by default (the parent label says what is loading); pass `label` to announce it.
 * @param {{ size?: number, color?: string, className?: string, label?: string }} props
 */
export default function Spinner({ size = 16, color, className = "", label }) {
  return (
    <span
      className={`inline-block animate-[spin_0.9s_linear_infinite] rounded-full border-2 border-transparent border-t-current motion-reduce:animate-none motion-reduce:border-current ${className}`}
      style={{ width: size, height: size, ...(color ? { color, borderTopColor: color } : null) }}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
