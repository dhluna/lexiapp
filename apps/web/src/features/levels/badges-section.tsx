import { Check } from "lucide-react";
import { LevelBadge } from "@/components/level-badge";
import { PackIcon } from "@/components/pack-icon";
import { formatPoints, LEVELS, POINTS_PER_WORD, type LevelStatus, type PackBadge } from "@lexi/core/domain/levels";
import { cn } from "@/lib/cn";

/** Progress page: every level (earned or still locked) and one badge per completed pack. */
export function BadgesSection({ status, packs }: { status: LevelStatus; packs: PackBadge[] }) {
  return (
    <section aria-labelledby="insignias" className="rounded-3xl bg-surface p-6 sm:p-8">
      <h2 id="insignias" className="scroll-mt-6 font-display text-xl font-semibold">
        Insignias
      </h2>
      <p className="mt-1 text-ink-soft">
        Ganas {POINTS_PER_WORD} puntos por cada palabra aprendida. Llevas {formatPoints(status.points)}.
      </p>

      <h3 className="mt-6 text-sm font-semibold text-ink-soft">Niveles</h3>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LEVELS.map((level) => {
          const earned = status.achieved >= level.words;
          return (
            <li
              key={level.number}
              aria-label={`Nivel ${level.number}, ${level.name}: ${earned ? "conseguido" : `${level.words} palabras`}`}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border p-3 text-center",
                level.number === status.level.number ? "border-accent" : "border-line",
              )}
            >
              <LevelBadge level={level.number} earned={earned} />
              <span className={cn("text-sm font-semibold", !earned && "text-ink-soft")}>{level.name}</span>
              <span className="text-xs text-ink-soft">
                {level.words === 0 ? "Al empezar" : `${level.words} palabras`}
              </span>
            </li>
          );
        })}
      </ul>

      <h3 className="mt-6 text-sm font-semibold text-ink-soft">Paquetes completados</h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {packs.map((pack) => (
          <li
            key={pack.packId}
            aria-label={`${pack.name}: ${pack.complete ? "completado" : `${pack.achieved} de ${pack.total}`}`}
            className="flex items-center gap-3 rounded-2xl border border-line p-3"
          >
            <span
              aria-hidden
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                pack.complete ? "bg-accent-soft text-accent ring-2 ring-accent/25" : "bg-sunken text-ink-soft/60",
              )}
            >
              <PackIcon id={pack.packId} />
            </span>
            <span className={cn("min-w-0 flex-1 font-semibold", !pack.complete && "text-ink-soft")}>{pack.name}</span>
            {pack.complete ? (
              <Check aria-hidden className="size-5 text-learned" strokeWidth={3} />
            ) : (
              <span className="text-sm text-ink-soft tabular-nums">
                {pack.achieved}/{pack.total}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
