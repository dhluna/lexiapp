"use client";

import { Check, ChevronLeft, Repeat, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getWordStatus } from "@/domain/progress";
import type { LearningStatus, Word } from "@/domain/types";
import { useProgress, useProgressActions } from "@/hooks/use-progress";
import { WordDetails } from "./word-details";
import { WordHeading } from "./word-heading";

const DATE = new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric" });

export function WordSheet({ word }: { word: Word }) {
  const snapshot = useProgress();
  const { setWordStatus } = useProgressActions();
  const progress = snapshot?.state.words[word.id];
  const status = snapshot ? getWordStatus(snapshot.state, word.id) : null;

  const change = (next: LearningStatus) => setWordStatus(word.id, next);

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <Link
        href="/vocabulario"
        className="inline-flex min-h-11 w-fit items-center gap-1 rounded-xl pr-3 font-semibold text-ink-soft hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-5" />
        Vocabulario
      </Link>

      <article className="rounded-3xl bg-surface p-6 sm:p-8">
        <WordHeading word={word} as="h1" />
        <div className="mt-8 border-t border-line pt-6">
          <WordDetails word={word} />
        </div>
      </article>

      <section aria-labelledby="estado" className="rounded-3xl bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="estado" className="font-display text-xl font-semibold">
            Tu progreso
          </h2>
          {status && <StatusBadge status={status} />}
        </div>

        {!snapshot || !status ? (
          <Skeleton className="mt-4 h-14" />
        ) : (
          <>
            <p className="mt-2 text-ink-soft" aria-live="polite">
              {progress
                ? progress.timesSeen > 0
                  ? `Practicada ${progress.timesSeen} ${progress.timesSeen === 1 ? "vez" : "veces"}. Último cambio: ${DATE.format(new Date(progress.updatedAt))}.`
                  : `Marcada a mano el ${DATE.format(new Date(progress.updatedAt))}.`
                : "Todavía no la has practicado."}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button
                size="lg"
                variant="learned"
                disabled={status === "learned"}
                onClick={() => change("learned")}
              >
                <Check aria-hidden className="size-5" strokeWidth={3} />
                {status === "learned" ? "Ya la aprendiste" : "Marcar como aprendida"}
              </Button>
              <Button
                size="lg"
                variant="review"
                disabled={status === "review"}
                onClick={() => change("review")}
              >
                <Repeat aria-hidden className="size-5" />
                {status === "review" ? "Está para repasar" : "Marcar para repasar"}
              </Button>
            </div>
            {status !== "new" && (
              <Button variant="ghost" className="mt-3" onClick={() => change("new")}>
                <RotateCcw aria-hidden className="size-4" />
                Reiniciar esta palabra
              </Button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
