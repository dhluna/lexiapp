"use client";

import { Check, ChevronLeft, Minus, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useState, type ReactNode } from "react";
import { PackIcon } from "@/components/pack-icon";
import { SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { isPackActive, WORDS } from "@lexi/core/data/catalog";
import { getPack, isPackId, PACKS } from "@lexi/core/data/packs";
import { STATUS_LABELS } from "@lexi/core/domain/labels";
import { getWordStatus } from "@lexi/core/domain/progress";
import { filterWords } from "@lexi/core/domain/search";
import type { LearningStatus, PackId } from "@lexi/core/domain/types";
import { useProgress, useProgressActions } from "@/hooks/use-progress";
import { cn } from "@/lib/cn";
import { PackGrid } from "./pack-grid";

const STATUSES: readonly LearningStatus[] = ["new", "review", "learned"];

export function VocabularyView() {
  const params = useSearchParams();
  const paramPack = params.get("paquete");
  // The open pack lives in the URL, so the browser's back button returns to the grid.
  const packId = isPackId(paramPack) ? paramPack : null;
  const pack = packId ? getPack(packId) : undefined;

  const snapshot = useProgress();
  const { setPackActive } = useProgressActions();
  const state = snapshot?.state ?? null;
  const [confirmation, setConfirmation] = useState("");

  const togglePack = (id: PackId, active: boolean) => {
    setPackActive(id, active);
    const name = getPack(id)?.name ?? id;
    setConfirmation(
      active ? `${name} se añadió a tu práctica.` : `${name} ya no está en tu práctica. Su progreso se conserva.`,
    );
  };

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LearningStatus | null>(null);

  // Opening another pack starts with a clean filter.
  const [lastPack, setLastPack] = useState(packId);
  if (packId !== lastPack) {
    setLastPack(packId);
    setQuery("");
    setStatus(null);
    setConfirmation("");
  }

  const deferredQuery = useDeferredValue(query);
  const showGrid = !packId && deferredQuery.trim() === "";

  // The React Compiler memoizes these: no manual useMemo needed.
  const results = filterWords(WORDS, state, { query: deferredQuery, packId, status });
  const statusCounts: Record<LearningStatus, number> = { new: 0, review: 0, learned: 0 };
  for (const word of filterWords(WORDS, state, { query: deferredQuery, packId })) {
    statusCounts[getWordStatus(state, word.id)] += 1;
  }

  const clearFilters = () => {
    setQuery("");
    setStatus(null);
  };

  return (
    <div className="grid gap-6">
      {pack ? (
        <div>
          <Link
            href="/vocabulario"
            className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-xl pr-3 font-semibold text-ink-soft hover:text-ink"
          >
            <ChevronLeft aria-hidden className="size-5" />
            Todos los paquetes
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <PackIcon id={pack.id} className="size-6" />
              </span>
              <div className="min-w-0">
                <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{pack.name}</h1>
                <p className="text-ink-soft">{pack.description}</p>
              </div>
            </div>
            {state &&
              (pack.core ? (
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft">
                  <Check aria-hidden className="size-4 text-learned" />
                  Siempre en tu práctica
                </p>
              ) : isPackActive(state, pack.id) ? (
                <Button variant="secondary" onClick={() => togglePack(pack.id, false)}>
                  <Minus aria-hidden className="size-4" />
                  Quitar de mi práctica
                </Button>
              ) : (
                <Button onClick={() => togglePack(pack.id, true)}>
                  <Plus aria-hidden className="size-4" />
                  Añadir a mi práctica
                </Button>
              ))}
          </div>
          {state && !pack.core && !isPackActive(state, pack.id) && (
            <p className="mt-3 text-sm text-ink-soft">
              Puedes ver y escuchar sus palabras. Al añadirlo, entrarán en tu práctica diaria y en tu progreso.
            </p>
          )}
        </div>
      ) : (
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Vocabulario</h1>
          <p className="mt-2 text-lg text-ink-soft">
            {WORDS.length} palabras en {PACKS.length} paquetes. Elige uno o busca en inglés o en español.
          </p>
        </div>
      )}

      <p aria-live="polite" className={cn("text-sm font-semibold text-learned", !confirmation && "sr-only")}>
        {confirmation}
      </p>

      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-soft" />
        <label htmlFor="buscar" className="sr-only">
          {pack ? `Buscar en ${pack.name}` : "Buscar palabra o traducción"}
        </label>
        <input
          id="buscar"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={pack ? `Buscar en ${pack.name}` : "Busca «deadline» o «plazo»"}
          autoComplete="off"
          className="min-h-14 w-full rounded-2xl border border-line bg-surface pr-4 pl-12 text-lg placeholder:text-ink-soft/80 focus-visible:border-accent"
        />
      </div>

      {showGrid ? (
        <PackGrid state={state} onAdd={(id) => togglePack(id, true)} />
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
