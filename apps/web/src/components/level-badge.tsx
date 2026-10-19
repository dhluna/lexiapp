import { BookOpen, Compass, Crown, Footprints, Gem, MessagesSquare, Rocket, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const ICONS: Record<number, LucideIcon> = {
  1: Footprints,
  2: BookOpen,
  3: Compass,
  4: MessagesSquare,
  5: Zap,
  6: Rocket,
  7: Gem,
  8: Crown,
};

const SIZES = {
  sm: { box: "size-10", icon: "size-5" },
  md: { box: "size-12", icon: "size-6" },
  lg: { box: "size-14", icon: "size-7" },
} as const;

/** Round badge of a level: brand colors when earned, muted while locked. Decorative. */
export function LevelBadge({
  level,
  earned = true,
  size = "md",
}: {
  level: number;
  earned?: boolean;
  size?: keyof typeof SIZES;
}) {
  const Icon = ICONS[level] ?? Footprints;
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        SIZES[size].box,
        earned ? "bg-accent-soft text-accent ring-2 ring-accent/25" : "bg-sunken text-ink-soft/60",
      )}
    >
      <Icon className={SIZES[size].icon} strokeWidth={2.25} />
    </span>
  );
}
