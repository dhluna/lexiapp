"use client";

import { BookOpen, ChartNoAxesColumn, House, Layers, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LevelBadge } from "@/components/level-badge";
import { useSync } from "@/hooks/use-account";
import { useProgress } from "@/hooks/use-progress";
import { cn } from "@/lib/cn";
import { achievedCount, levelFor } from "@lexi/core/domain/levels";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/practicar", label: "Practicar", icon: Layers },
  { href: "/vocabulario", label: "Vocabulario", icon: BookOpen },
  { href: "/progreso", label: "Progreso", icon: ChartNoAxesColumn },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="hidden md:block">
      <ul className="flex items-center gap-1">
        {NAV_ITEMS.map(({ href, label }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-xl px-4 font-semibold transition-colors",
                  active ? "bg-accent-soft text-accent" : "text-ink-soft hover:text-ink",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Current level, always in sight: its badge links to the badges in Progreso (name in the label and tooltip). */
export function LevelLink() {
  const snapshot = useProgress();
  if (!snapshot) return <span aria-hidden className="size-11" />;
  const { level } = levelFor(achievedCount(snapshot.state));
  return (
    <Link
      href="/progreso#insignias"
      aria-label={`Nivel ${level.number}, ${level.name}: ver insignias`}
      title={`Nivel ${level.number} · ${level.name}`}
      className="inline-flex size-11 items-center justify-center rounded-full transition-colors hover:bg-sunken"
    >
      <LevelBadge level={level.number} size="xs" />
    </Link>
  );
}

/** Settings live outside the main tabs: a gear in the header, on every screen size. */
export function SettingsLink() {
  const pathname = usePathname();
  const active = isActive(pathname, "/ajustes");
  const syncFailed = useSync().snapshot?.status === "error";
  return (
    <Link
      href="/ajustes"
      aria-label={syncFailed ? "Ajustes: no se pudo sincronizar" : "Ajustes"}
      title={syncFailed ? "No se pudo sincronizar" : "Ajustes"}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full transition-colors",
        active ? "bg-accent-soft text-accent" : "text-ink-soft hover:bg-sunken hover:text-ink",
      )}
    >
      <span className="relative">
        <Settings aria-hidden className="size-5" />
        {syncFailed && (
          <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-danger ring-2 ring-paper" />
        )}
      </span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold",
                  active ? "text-accent" : "text-ink-soft",
                )}
              >
                <Icon aria-hidden className="size-6" strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
