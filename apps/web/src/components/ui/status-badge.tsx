import { Check, Circle, Repeat } from "lucide-react";
import { STATUS_LABELS } from "@lexi/core/domain/labels";
import type { LearningStatus } from "@lexi/core/domain/types";
import { cn } from "@/lib/cn";

const STYLES: Record<LearningStatus, string> = {
  new: "bg-sunken text-ink-soft",
  review: "bg-review-soft text-review",
  learned: "bg-learned-soft text-learned",
};

const ICONS = { new: Circle, review: Repeat, learned: Check } as const;

export function StatusBadge({ status, className }: { status: LearningStatus; className?: string }) {
  const Icon = ICONS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold whitespace-nowrap",
        STYLES[status],
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={2.5} />
      {STATUS_LABELS[status]}
    </span>
  );
}
