import React from "react";

export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-800/60 ${className}`}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr className="border-b border-gray-800/60">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton() {
  return (
    <div className="h-60 w-full rounded-xl border border-gray-800 bg-gray-950/40 p-4 flex flex-col justify-between">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex items-end justify-between gap-3 h-40 pt-4">
        <Skeleton className="h-20 flex-1" />
        <Skeleton className="h-32 flex-1" />
        <Skeleton className="h-16 flex-1" />
        <Skeleton className="h-28 flex-1" />
        <Skeleton className="h-36 flex-1" />
        <Skeleton className="h-24 flex-1" />
      </div>
    </div>
  );
}
