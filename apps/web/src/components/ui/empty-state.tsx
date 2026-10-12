import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-xl font-semibold">{title}</p>
      {children && <div className="mt-2 text-ink-soft">{children}</div>}
    </div>
  );
}

export function Skeleton({ className = "h-24" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-2xl bg-sunken ${className}`} />;
}
