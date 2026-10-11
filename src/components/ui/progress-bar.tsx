import { cn } from "@/lib/cn";

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  className?: string;
  /** Second segment drawn after the first (e.g. words pending review). */
  secondary?: number;
}

export function ProgressBar({ value, max, label, className, secondary = 0 }: ProgressBarProps) {
  const pct = (n: number) => (max > 0 ? Math.min(100, (n / max) * 100) : 0);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("flex h-2 w-full overflow-hidden rounded-full bg-sunken", className)}
    >
      <div className="h-full bg-learned transition-[width] duration-300" style={{ width: `${pct(value)}%` }} />
      {secondary > 0 && (
        <div className="h-full bg-review/70 transition-[width] duration-300" style={{ width: `${pct(secondary)}%` }} />
      )}
    </div>
  );
}
