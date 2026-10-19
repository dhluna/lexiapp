import { LevelBadge } from "@/components/level-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatPoints, type LevelStatus } from "@lexi/core/domain/levels";

/** Current level, points and what is left for the next one (home "Tu vocabulario" card). */
export function LevelSummary({ status }: { status: LevelStatus }) {
  const { level, next, points, wordsToNext } = status;
  return (
    <div className="flex items-center gap-4">
      <LevelBadge level={level.number} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg leading-tight font-semibold">
          Nivel {level.number} · {level.name}
        </p>
        <p className="text-sm text-ink-soft">{formatPoints(points)} puntos</p>
        <ProgressBar
          className="mt-2 h-2"
          value={next ? status.achieved - level.words : 1}
          max={next ? next.words - level.words : 1}
          label={next ? `Progreso hacia el nivel ${next.name}` : "Nivel máximo"}
        />
        <p className="mt-1.5 text-sm text-ink-soft">
          {next && wordsToNext !== null
            ? `${wordsToNext} ${wordsToNext === 1 ? "palabra" : "palabras"} para ${next.name}`
            : "¡Nivel máximo! Has aprendido todo el catálogo."}
        </p>
      </div>
    </div>
  );
}
