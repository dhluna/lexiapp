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

/** Literal classes per level (Tailwind only generates classes it can read in the source). */
const COLORS: Record<number, string> = {
  1: "bg-lv1-soft text-lv1 ring-lv1/25",
  2: "bg-lv2-soft text-lv2 ring-lv2/25",
  3: "bg-lv3-soft text-lv3 ring-lv3/25",
  4: "bg-lv4-soft text-lv4 ring-lv4/25",
  5: "bg-lv5-soft text-lv5 ring-lv5/25",
  6: "bg-lv6-soft text-lv6 ring-lv6/25",
  7: "bg-lv7-soft text-lv7 ring-lv7/25",
  8: "bg-lv8-soft text-lv8 ring-lv8/25",
};

const SIZES = {
  xs: { box: "size-8", icon: "size-4" },
  sm: { box: "size-10", icon: "size-5" },
  md: { box: "size-12", icon: "size-6" },
  lg: { box: "size-14", icon: "size-7" },
} as const;

/** Round badge of a level in its own color: full with a ring when earned, faded while locked. Decorative. */
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
      data-earned={earned}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        SIZES[size].box,
        COLORS[level] ?? COLORS[1],
        earned ? "ring-2" : "opacity-45 dark:opacity-60",
      )}
    >
      <Icon className={SIZES[size].icon} strokeWidth={2.25} />
    </span>
  );
}
