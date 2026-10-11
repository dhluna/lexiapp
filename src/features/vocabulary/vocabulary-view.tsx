"use client";

import { ChevronLeft, Search, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { CATEGORIES, getCategory, isCategoryId } from "@/data/categories";
import { WORDS } from "@/data/catalog";
import { STATUS_LABELS } from "@/domain/labels";
import { getWordStatus } from "@/domain/progress";
import { filterWords } from "@/domain/search";
import type { LearningStatus } from "@/domain/types";
import { useProgress, useStats } from "@/hooks/use-progress";
import { cn } from "@/lib/cn";
import { CategoryGrid } from "./category-grid";

const STATUSES: readonly LearningStatus[] = ["new", "review", "learned"];

export function VocabularyView() {
  const params = useSearchParams();
  const paramCategory = params.get("categoria");
  // The open category lives in the URL, so the browser's back button returns to the grid.
  const categoryId = isCategoryId(paramCategory) ? paramCategory : null;
  const category = categoryId ? getCategory(categoryId) : undefined;

  const snapshot = useProgress();
  const stats = useStats();
  const state = snapshot?.state ?? null;

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LearningStatus | null>(null);

  // Opening another category starts with a clean filter.
  const [lastCategory, setLastCategory] = useState(categoryId);
  if (categoryId !== lastCategory) {
    setLastCategory(categoryId);
    setQuery("");
    setStatus(null);
  }

  const deferredQuery = useDeferredValue(query);
  const showGrid = !categoryId && deferredQuery.trim() === "";

  const results = useMemo(
    () => filterWords(WORDS, state, { query: deferredQuery, categoryId, status }),
    [state, deferredQuery, categoryId, status],
  );

  const statusCounts = useMemo(() => {
    const pool = filterWords(WORDS, state, { query: deferredQuery, categoryId });
    const counts: Record<LearningStatus, number> = { new: 0, review: 0, learned: 0 };
    for (const word of pool) counts[getWordStatus(state, word.id)] += 1;
    return counts;
  }, [state, deferredQuery, categoryId]);

  const clearFilters = () => {
    setQuery("");
    setStatus(null);
  };

  return (
    <div className="grid gap-6">
      {category ? (
        <div>
          <Link
            href="/vocabulario"
            className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-xl pr-3 font-semibold text-ink-soft hover:text-ink"
          >
            <ChevronLeft aria-hidden className="size-5" />
            Todas las categorías
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <CategoryIcon id={category.id} className="size-6" />
            </span>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{category.name}</h1>
              <p className="text-ink-soft">{category.description}</p>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Vocabulario</h1>
          <p className="mt-2 text-lg text-ink-soft">
            {WORDS.length} palabras en {CATEGORIES.length} categorías. Elige una o busca en inglés o en español.
          </p>
        </div>
      )}

      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-soft" />
        <label htmlFor="buscar" className="sr-only">
          {category ? `Buscar en ${category.name}` : "Buscar palabra o traducción"}
        </label>
        <input
          id="buscar"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={category ? `Buscar en ${category.name}` : "Busca «deadline» o «plazo»"}
          autoComplete="off"
          className="min-h-14 w-full rounded-2xl border border-line bg-surface pr-4 pl-12 text-lg placeholder:text-ink-soft/80 focus-visible:border-accent"
        />
      </div>

      {showGrid ? (
        <section aria-labelledby="categorias">
          <h2 id="categorias" className="mb-4 font-display text-2xl font-semibold">
            Categorías
          </h2>
          <CategoryGrid stats={stats} />
        </section>
      ) : (
        <>
          <div role="group" aria-label="Estado" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <FilterChip active={status === null} onClick={() => setStatus(null)}>
              Todas
            </FilterChip>
            {STATUSES.map((s) => (
              <FilterChip key={s} active={status === s} onClick={() => setStatus(s)} disabled={!state}>
                {STATUS_LABELS[s]}
                {state && <span className="ml-1.5 tabular-nums opacity-75">{statusCounts[s]}</span>}
              </FilterChip>
            ))}
          </div>

          <p role="status" aria-live="polite" className="text-sm font-semibold text-ink-soft">
            {results.length === 1 ? "1 palabra" : `${results.length} palabras`}
          </p>

          {results.length === 0 ? (
            <EmptyState title="No hay palabras con estos filtros">
              <p>Prueba con otra palabra o quita algún filtro.</p>
              <Button variant="secondary" className="mt-4" onClick={clearFilters}>
                <X aria-hidden className="size-4" />
                Quitar filtros
              </Button>
            </EmptyState>
          ) : (
            <ul aria-label="Palabras" className="grid gap-2 lg:grid-cols-2">
              {results.map((word) => (
                <li
                  key={word.id}
                  className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-2 pl-4 transition-colors hover:border-accent"
                >
                  <Link href={`/vocabulario/${word.id}`} className="min-w-0 flex-1 py-2">
                    <span lang="en" className="block truncate font-display text-xl font-semibold">
                      {word.term}
                    </span>
                    <span className="block truncate text-ink-soft">{word.translation}</span>
                  </Link>
                  {state && <StatusBadge status={getWordStatus(state, word.id)} className="hidden sm:inline-flex" />}
                  <SpeakButton text={word.term} label={`Escuchar «${word.term}»`} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 font-semibold whitespace-nowrap transition-colors disabled:opacity-50",
        active ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface hover:border-ink-soft",
      )}
    >
      {children}
    </button>
  );
}
