"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { getWord } from "@lexi/core/data/catalog";
import { celebrationFor } from "@lexi/core/domain/celebration";
import { isQuiz, summarize, summaryTitle, type PracticeSession } from "@lexi/core/domain/session";
import type { WordId } from "@lexi/core/domain/types";
import { useServices } from "@/hooks/services-context";

interface PracticeSummaryProps {
  session: PracticeSession;
  onRestart: () => void;
  onChangeSettings: () => void;
}

export function PracticeSummary({ session, onRestart, onChangeSettings }: PracticeSummaryProps) {
  const summary = summarize(session);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  // Celebrate once per finished session (the ref survives re-renders and StrictMode's re-run).
  const { celebrator } = useServices();
  const celebrated = useRef<string | null>(null);
  const kind = celebrationFor(summary);
  useEffect(() => {
    if (celebrated.current === session.id) return;
    celebrated.current = session.id;
    celebrator().celebrate(kind);
  }, [celebrator, session.id, kind]);

  const answered = summary.learned.length + summary.review.length;
  const quiz = isQuiz(session);
  const baseTitle = summaryTitle(summary);
  const title = quiz && baseTitle === "Todas aprendidas" ? "Todas correctas" : baseTitle;

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <section className="animate-card-in rounded-3xl bg-surface p-6 sm:p-8">
        <h1 ref={headingRef} tabIndex={-1} className="font-display text-4xl font-bold tracking-tight outline-none">
          {title}
        </h1>
        <p className="mt-2 text-lg text-ink-soft">
          {answered === 0
            ? "No respondiste ninguna palabra, así que no hay cambios en tu progreso."
            : `Respondiste ${answered} de ${summary.total} palabras. Ya está todo guardado.`}
        </p>
        <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
          <Count term={quiz ? "Acertadas" : "Aprendidas"} value={summary.learned.length} className="bg-learned-soft text-learned" />
          <Count term="Por repasar" value={summary.review.length} className="bg-review-soft text-review" />
          <Count term="Sin responder" value={summary.skipped.length} className="bg-sunken text-ink-soft" />
        </dl>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={onRestart}>
            Otra sesión
          </Button>
          <Button size="lg" variant="secondary" onClick={onChangeSettings}>
            Elegir otro paquete
          </Button>
          <ButtonLink href="/" size="lg" variant="ghost">
            Volver al inicio
          </ButtonLink>
        </div>
      </section>

      <WordList title="Para repasar" ids={summary.review} />
      <WordList title="Aprendidas" ids={summary.learned} />
      <WordList title="Sin responder" ids={summary.skipped} />
    </div>
  );
}

function Count({ term, value, className }: { term: string; value: number; className: string }) {
  return (
    <div className={`flex flex-col-reverse rounded-2xl p-3 ${className}`}>
      <dt className="text-sm font-semibold">{term}</dt>
      <dd className="font-display text-3xl font-bold">{value}</dd>
    </div>
  );
}

function WordList({ title, ids }: { title: string; ids: WordId[] }) {
  if (ids.length === 0) return null;
  return (
    <section>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {ids.map((id) => {
          const word = getWord(id);
          if (!word) return null;
          return (
            <li key={id}>
              <Link
                href={`/vocabulario/${id}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 hover:border-accent"
              >
                <span lang="en" className="font-semibold">
                  {word.term}
                </span>
                <span className="text-ink-soft">{word.translation}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
