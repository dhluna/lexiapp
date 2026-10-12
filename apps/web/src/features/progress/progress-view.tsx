"use client";

import { Flame } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CATEGORIES } from "@lexi/core/data/categories";
import { WORDS } from "@lexi/core/data/catalog";
import { toDayKey } from "@lexi/core/domain/dates";
import { useProgress, useStats } from "@/hooks/use-progress";
import { PracticeCalendar } from "./practice-calendar";

const days = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

export function ProgressView() {
  const snapshot = useProgress();
  const stats = useStats();

  if (!snapshot || !stats) {
    return (
      <div className="mx-auto grid max-w-2xl gap-4" aria-busy="true" aria-label="Cargando tu progreso">
        <Skeleton className="h-80" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { state } = snapshot;

  if (stats.studied === 0 && state.practiceDays.length === 0) {
    return (
      <div className="mx-auto grid max-w-2xl gap-6">
        <h1 className="font-display text-4xl font-bold tracking-tight">Tu progreso</h1>
        <EmptyState title="Aún no hay progreso">
          <p>Completa tu primera sesión y aquí verás tu racha y tus palabras aprendidas.</p>
          <ButtonLink href="/practicar?empezar=1" className="mt-4">
            Empezar práctica
          </ButtonLink>
        </EmptyState>
      </div>
    );
  }

  const pending = WORDS.filter((w) => state.words[w.id]?.status === "review");
  const { streak } = stats;

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h1 className="font-display text-4xl font-bold tracking-tight">Tu progreso</h1>

      <section aria-label="Resumen" className="rounded-3xl bg-surface p-6 sm:p-8">
        <dl className="grid grid-cols-3 gap-4">
          <Figure
            term={streak.current === 1 ? "Día de racha" : "Días de racha"}
            value={String(streak.current)}
            icon={<Flame aria-hidden className={streak.current > 0 ? "size-5 text-review" : "size-5 text-ink-soft"} />}
          />
          <Figure
            term="Aprendidas"
            value={String(stats.learned)}
            suffix={`/${stats.totalWords}`}
            tone="text-learned"
          />
          <Figure term="Por repasar" value={String(stats.review)} tone="text-review" />
        </dl>
        <ProgressBar
          className="mt-6 h-2.5"
          value={stats.learned}
          secondary={stats.review}
          max={stats.totalWords}
          label="Palabras aprendidas del catálogo"
        />

        <div className="mt-6 border-t border-line pt-6">
          <h2 className="mb-3 text-sm font-semibold text-ink-soft">Últimas cuatro semanas</h2>
          <PracticeCalendar practiceDays={state.practiceDays} today={toDayKey(new Date())} days={28} />
          <p className="mt-4 text-sm text-ink-soft">
            Mejor racha: {days(streak.best)}. Sesiones completadas: {stats.sessionsCompleted}.
          </p>
        </div>
      </section>

      {pending.length > 0 && (
        <section aria-labelledby="pendientes" className="rounded-3xl bg-surface p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 id="pendientes" className="font-display text-xl font-semibold">
              Por repasar
            </h2>
            <ButtonLink href="/practicar?empezar=1" variant="secondary">
              Repasar ahora
            </ButtonLink>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {pending.map((word) => (
              <li key={word.id}>
                <Link
                  href={`/vocabulario/${word.id}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sunken px-3 hover:bg-line/70"
                >
                  <span lang="en" className="font-semibold">
                    {word.term}
                  </span>
                  <span className="text-ink-soft">{word.translation}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="por-categoria" className="rounded-3xl bg-surface p-6 sm:p-8">
        <h2 id="por-categoria" className="font-display text-xl font-semibold">
          Por categoría
        </h2>
        <ul className="mt-2">
          {CATEGORIES.map((category) => {
            const c = stats.byCategory[category.id];
            return (
              <li key={category.id}>
                <Link
                  href={`/vocabulario?categoria=${category.id}`}
                  aria-label={`${category.name}: ${c.learned} de ${c.total} aprendidas`}
                  className="-mx-3 flex min-h-12 items-center gap-3 rounded-xl px-3 hover:bg-sunken"
                >
                  <CategoryIcon id={category.id} className="size-5 shrink-0 text-accent" />
                  <span className="w-28 shrink-0 truncate font-semibold sm:w-36">{category.name}</span>
                  <ProgressBar
                    className="flex-1"
                    value={c.learned}
                    secondary={c.review}
                    max={c.total}
                    label={`Progreso en ${category.name}`}
                  />
                  <span className="w-12 shrink-0 text-right text-sm text-ink-soft tabular-nums">
                    {c.learned}/{c.total}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Figure({
  term,
  value,
  tone = "text-ink",
  icon,
  suffix,
}: {
  term: string;
  value: string;
  tone?: string;
  icon?: ReactNode;
  suffix?: string;
}) {
  return (
    // Column-reverse keeps <dt> before <dd> in the markup while showing the number on top.
    <div className="flex flex-col-reverse justify-end">
      <dt className="mt-1 text-sm text-ink-soft">{term}</dt>
      <dd className={`flex items-center gap-1.5 font-display text-3xl font-bold ${tone}`}>
        {icon}
        {value}
        {suffix && <span className="text-base font-semibold text-ink-soft">{suffix}</span>}
      </dd>
    </div>
  );
}
