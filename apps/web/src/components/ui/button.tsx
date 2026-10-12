import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "learned" | "review" | "danger";
type Size = "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110 active:brightness-95",
  secondary: "bg-surface text-ink border border-line hover:border-ink-soft",
  ghost: "text-ink-soft hover:text-ink hover:bg-sunken",
  learned: "bg-learned text-surface hover:brightness-110",
  review: "bg-review-soft text-review border border-review/40 hover:border-review",
  danger: "bg-danger-soft text-danger border border-danger/40 hover:border-danger",
};

const SIZES: Record<Size, string> = {
  md: "min-h-11 px-4 text-base gap-2",
  lg: "min-h-14 px-6 text-lg gap-2.5",
  icon: "size-11 shrink-0",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-xl font-semibold whitespace-nowrap transition-[filter,background-color,border-color,color]",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

interface StyleProps {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
