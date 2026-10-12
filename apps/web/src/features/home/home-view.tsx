"use client";

import { Flame } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { toDayKey } from "@lexi/core/domain/dates";
import { useProgress, useStats } from "@/hooks/use-progress";
import { PracticeCalendar } from "@/features/progress/practice-calendar";
import { planSession, planText } from "@lexi/core/planning/session-plan";

export function HomeView() {
  const snapshot = useProgress();
  const stats = useStats();

  if (!snapshot || !stats) {
    return (
      <div className="grid gap-4" aria-busy="true" aria-label="Cargando tu progreso">
        <Skeleton className="h-56" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { state } = snapshot;
  const plan = planSession(state, state.preferences.sessionSize);
  const { streak } = stats;
  const firstTime = stats.studied === 0;

  return (
    <div className="grid gap-8">
      <section aria-labelledby="hoy" className="rounded-3xl bg-surface p-6 shadow-[0_1px_0_var(--line)] sm:p-8">
        <h1 id="hoy" className="font-display text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
          {firstTime ? (
            <>
              Tus primeras <span className="marker animate-marker">palabras</span>
            </>
          ) : streak.practicedToday ? (
            "Hoy ya practicaste"
          ) : (
            "Tu práctica de hoy"
          )}
        </h1>
        <p className="mt-3 max-w-prose text-lg text-ink-soft">
          {streak.practicedToday && !firstTime ? "Puedes hacer otra ronda. " : ""}
          {planText(plan)}
        </p>
        <ButtonLink href="/practicar?empezar=1" size="lg" className="mt-6 w-full sm:w-auto">
          {streak.practicedToday ? "Practicar otra vez" : "Empezar práctica"}
        </ButtonLink>
      </section>

      <section aria-labelledby="racha" className="grid gap-6 sm:grid-cols-[1fr_1.2fr]">
        <div className="rounded-3xl bg-surface p-6">
          <h2 id="racha" className="flex items-center gap-2 font-display text-xl font-semibold">
            <Flame aria-hidden className={streak.current > 0 ? "size-5 text-review" : "size-5 text-ink-soft"} />
            {streak.current === 0
              ? "Sin racha activa"
              : `Racha de ${streak.current} ${streak.current === 1 ? "día" : "días"}`}
          </h2>
          <p className="mt-1 text-ink-soft">
            {streak.current === 0
              ? "Practica hoy para empezar una."
              : streak.practicedToday
                ? "Vuelve mañana para mantenerla."
                : "Practica hoy para no perderla."}
            {streak.best > streak.current && ` Tu mejor racha: ${streak.best} días.`}
          </p>
          <div className="mt-5">
            <PracticeCalendar practiceDays={state.practiceDays} today={toDayKey(new Date())} />
          </div>
        </div>

        <div className="rounded-3xl bg-surface p-6">
          <h2 className="font-display text-xl font-semibold">Tu vocabulario</h2>
          <p className="mt-1 text-ink-soft">
            Has estudiado {stats.studied} de {stats.totalWords} palabras.
          </p>
          <ProgressBar
            className="mt-5 h-3"
            value={stats.learned}
            secondary={stats.review}
            max={stats.totalWords}
            label="Palabras aprendidas del catálogo"
          />
          <dl className="mt-5 grid grid-cols-3 gap-3">
            <Figure term="Aprendidas" value={stats.learned} tone="text-learned" />
            <Figure term="Por repasar" value={stats.review} tone="text-review" />
            <Figure term="Sesiones" value={stats.sessionsCompleted} tone="text-ink" />
          </dl>
        </div>
      </section>
    </div>
  );
}

function Figure({ term, value, tone }: { term: string; value: number; tone: string }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{term}</dt>
      <dd className={`font-display text-3xl font-bold ${tone}`}>{value}</dd>
    </div>
  );
}
