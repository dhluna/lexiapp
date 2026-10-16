"use client";

import { Check, CircleHelp, Flag, Snail, Sparkles, Volume2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import { VoiceNotice } from "@/components/voice-notice";
import { getWord } from "@lexi/core/data/catalog";
import { checkAnswer, wordCount, type Exercise, type ExerciseCheck } from "@lexi/core/domain/exercise";
import { isLastWord, type PracticeSession, type SessionAnswer } from "@lexi/core/domain/session";
import type { Word } from "@lexi/core/domain/types";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/cn";

const SLOW_RATE = 0.7;

interface ExerciseCardProps {
  session: PracticeSession;
  /** Saves the result right away (correct and "almost" count as learned). */
  onCheck: (answer: SessionAnswer) => void;
  onNext: () => void;
}

/** "Ponerme a prueba": the progress header and the current exercise. No going back: it is a test. */
export function ExerciseCard({ session, onCheck, onNext }: ExerciseCardProps) {
  const word = getWord(session.wordIds[session.index]);
  const exercise = word ? session.exercises?.[word.id] : undefined;
  const position = session.index + 1;
  const total = session.wordIds.length;

  if (!word || !exercise) return null;

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-sunken hover:text-ink"
          aria-label="Salir de la prueba. Tus respuestas ya están guardadas."
          title="Salir (tus respuestas ya están guardadas)"
        >
          <X aria-hidden className="size-6" />
        </Link>
        <ol aria-label={`Palabra ${position} de ${total}`} className="flex flex-1 gap-1">
          {session.wordIds.map((id, i) => {
            const answer = session.answers[id];
            return (
              <li
                key={id}
                aria-hidden
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  answer === "learned" && "bg-learned",
                  answer === "review" && "bg-review",
                  !answer && (i < session.index ? "bg-ink-soft/30" : "bg-sunken"),
                  i === session.index && "outline-2 outline-offset-2 outline-accent",
                )}
              />
            );
          })}
        </ol>
        <span className="min-w-9 text-center text-sm font-semibold text-ink-soft tabular-nums">
          {position}/{total}
        </span>
      </div>

      <VoiceNotice />

      {/* A new key per word resets the answer field and the result. */}
      <ExerciseBody
        key={word.id}
        word={word}
        exercise={exercise}
        last={isLastWord(session)}
        animate={session.index > 0}
        onCheck={onCheck}
        onNext={onNext}
      />
    </div>
  );
}

function ExerciseBody({
  word,
  exercise,
  last,
  animate,
  onCheck,
  onNext,
}: {
  word: Word;
  exercise: Exercise;
  last: boolean;
  animate: boolean;
  onCheck: (answer: SessionAnswer) => void;
  onNext: () => void;
}) {
  const { availability, speak, stop } = useSpeech();
  const canSpeak = availability !== null && availability !== "unsupported";
  const [value, setValue] = useState("");
  const [check, setCheck] = useState<ExerciseCheck | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  // Without a voice, dictation shows the meaning instead of playing the word.
  const dictation = exercise.kind === "dictation";
  const listenable = dictation && canSpeak;

  useEffect(() => {
    inputRef.current?.focus();
    if (listenable) speak(exercise.answer);
  }, [listenable, speak, exercise.answer]);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (check) nextRef.current?.focus();
  }, [check]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (check || value.trim() === "") return;
    const result = checkAnswer(value, exercise, word.term);
    setCheck(result);
    onCheck(result.result === "wrong" ? "review" : "learned");
  };

  const giveUp = () => {
    if (check) return;
    setCheck({ result: "wrong" });
    onCheck("review");
  };

  return (
    <article
      className={cn("rounded-3xl bg-surface p-6 shadow-[0_1px_0_var(--line)] sm:p-8", animate && "animate-card-in")}
    >
      <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
        {dictation ? <Volume2 aria-hidden className="size-4" /> : <Sparkles aria-hidden className="size-4" />}
        {dictation ? "Escucha y escribe" : "Completa la frase"}
      </p>

      {dictation ? (
        <div className="mt-5">
          {listenable ? (
            <div className="flex flex-wrap gap-3">
              <Button size="lg" variant="secondary" onClick={() => speak(exercise.answer)}>
                <Volume2 aria-hidden className="size-5" />
                Escuchar
              </Button>
              <Button size="lg" variant="ghost" onClick={() => speak(exercise.answer, SLOW_RATE)}>
                <Snail aria-hidden className="size-5" />
                Más lento
              </Button>
            </div>
          ) : (
            <p className="font-display text-2xl font-semibold">«{word.translation}»</p>
          )}
          <p className="mt-3 text-ink-soft">
            Escribe la palabra en inglés
            {wordCount(exercise.answer) > 1 ? ` (${wordCount(exercise.answer)} palabras)` : ""}.
          </p>
        </div>
      ) : (
        <div className="mt-5">
          <p lang="en" className="font-display text-2xl leading-snug font-semibold sm:text-3xl">
            {exercise.before}
            {check ? (
              <mark className={cn("rounded-md px-1", check.result === "wrong" ? "bg-review-soft text-review" : "bg-learned-soft text-learned")}>
                {exercise.answer}
              </mark>
            ) : (
              <span aria-label="hueco" className="inline-block min-w-24 border-b-4 border-accent align-baseline">
                &nbsp;
              </span>
            )}
            {exercise.after}
          </p>
          <p className="mt-2 text-ink-soft">{exercise.translation}</p>
          <p className="mt-3 text-sm text-ink-soft">
            Pista: <span className="font-semibold text-ink">{word.translation}</span>
            {wordCount(exercise.answer) > 1 ? ` · ${wordCount(exercise.answer)} palabras` : ""}
          </p>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 grid gap-3">
        <label htmlFor="respuesta" className="sr-only">
          Tu respuesta en inglés
        </label>
        <input
          ref={inputRef}
          id="respuesta"
          lang="en"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          readOnly={check !== null}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Escribe aquí"
          className={cn(
            "min-h-14 w-full rounded-2xl border bg-paper px-4 text-xl focus-visible:border-accent",
            check === null && "border-line",
            check && check.result !== "wrong" && "border-learned",
            check?.result === "wrong" && "border-review",
          )}
        />
        {check === null && (
          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" disabled={value.trim() === ""}>
              Comprobar
            </Button>
            <Button type="button" size="lg" variant="ghost" onClick={giveUp}>
              <CircleHelp aria-hidden className="size-5" />
              No lo sé
            </Button>
          </div>
        )}
      </form>

      <div aria-live="polite">
        {check && (
          <div
            className={cn(
              "mt-5 grid gap-3 rounded-2xl p-4",
              check.result === "wrong" ? "bg-review-soft text-review" : "bg-learned-soft text-learned",
            )}
          >
            <p className="flex items-center gap-2 text-lg font-semibold">
              {check.result === "wrong" ? <X aria-hidden className="size-5" /> : <Check aria-hidden className="size-5" strokeWidth={3} />}
              {check.result === "correct" && "¡Correcto!"}
              {check.result === "almost" && "¡Casi! Cuenta como acierto."}
              {check.result === "wrong" && "No es correcto. Queda para repasar."}
            </p>
            {check.note && <p>{check.note}</p>}
            <div className="flex items-center gap-3 text-ink">
              <div className="min-w-0 flex-1">
                <p lang="en" className="font-display text-2xl font-semibold">
                  {exercise.answer}
                </p>
                <p className="text-ink-soft">{word.translation}</p>
              </div>
              <SpeakButton text={exercise.answer} label={`Escuchar «${exercise.answer}»`} />
            </div>
            {dictation && word.examples[0] && (
              <p className="text-ink-soft">
                <span lang="en" className="text-ink">
                  {word.examples[0].en}
                </span>{" "}
                {word.examples[0].es}
              </p>
            )}
          </div>
        )}
      </div>

      {check && (
        <Button ref={nextRef} size="lg" className="mt-5 w-full sm:w-auto" onClick={onNext}>
          {last ? <Flag aria-hidden className="size-5" /> : null}
          {last ? "Ver resultados" : "Siguiente"}
        </Button>
      )}
    </article>
  );
}
