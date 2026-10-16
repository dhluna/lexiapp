"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { getActiveWords, getWord, isPackActive } from "@lexi/core/data/catalog";
import { isPackId } from "@lexi/core/data/packs";
import { selectQuizWords } from "@lexi/core/domain/exercise";
import {
  answerCurrent,
  createQuiz,
  createSession,
  goNext,
  goPrevious,
  isQuiz,
  recordCurrent,
  selectSessionWords,
  type PracticeSession,
  type SessionAnswer,
} from "@lexi/core/domain/session";
import type { PackId, UserProgressState, Word } from "@lexi/core/domain/types";
import { useProgress, useProgressActions } from "@/hooks/use-progress";
import { ExerciseCard } from "./exercise-card";
import { PracticeCard } from "./practice-card";
import { PracticeSkeleton } from "./practice-skeleton";
import { PracticeSetup } from "./practice-setup";
import { PracticeSummary } from "./practice-summary";

const ANSWER_MESSAGES: Record<SessionAnswer, string> = {
  learned: "Guardada como aprendida.",
  review: "Guardada para repasar.",
};

export type PracticeMode = "cards" | "quiz";

/**
 * A session over the active packs (or one of them): flashcards, or "Ponerme a prueba"
 * with the words already seen.
 */
function buildSession(state: UserProgressState, packId: PackId | null, mode: PracticeMode = "cards"): PracticeSession {
  const pack = packId && isPackActive(state, packId) ? packId : null;
  const options = { size: state.preferences.sessionSize, packId: pack };
  if (mode === "quiz") {
    const words = selectQuizWords(getActiveWords(state), state, options).flatMap((id): Word[] => {
      const word = getWord(id);
      return word ? [word] : [];
    });
    return createQuiz(words, new Date(), pack);
  }
  return createSession(selectSessionWords(getActiveWords(state), state, options), new Date(), pack);
}

export function PracticeView() {
  const params = useSearchParams();
  const linkedPack = params.get("paquete");
  const packId = isPackId(linkedPack) ? linkedPack : null;
  const linkedMode: PracticeMode = params.get("prueba") === "1" ? "quiz" : "cards";
  // "Empezar práctica" (home) and "Practicar <paquete>" (progress) go straight to the card.
  const autoStart = params.get("empezar") === "1" || linkedMode === "quiz" || packId !== null;

  const snapshot = useProgress();
  const actions = useProgressActions();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // Coming from a direct link: the setup screen is skipped entirely.
  const [autoStartPending, setAutoStartPending] = useState(autoStart);

  const start = (pack: PackId | null, mode: PracticeMode = "cards") => {
    if (!snapshot) return;
    setAnnouncement("");
    setSession(buildSession(snapshot.state, pack, mode));
  };

  // Coming from "Empezar práctica": start during render (React re-renders before
  // committing), so neither the setup screen nor an empty frame is ever painted.
  if (autoStartPending && snapshot) {
    setAutoStartPending(false);
    setSession(buildSession(snapshot.state, packId, linkedMode));
  }

  if (!snapshot || autoStartPending) {
    return <PracticeSkeleton />;
  }

  if (!session) {
    return (
      <PracticeSetup
        state={snapshot.state}
        onStart={(pack) => start(pack)}
        onStartQuiz={() => start(null, "quiz")}
      />
    );
  }

  if (session.finished) {
    return (
      <PracticeSummary
        session={session}
        onRestart={() => start(session.packId, isQuiz(session) ? "quiz" : "cards")}
        onChangeSettings={() => setSession(null)}
      />
    );
  }

  const finishIfDone = (next: PracticeSession) => {
    if (next.finished) actions.completeSession(next);
    setSession(next);
  };

  const answer = (value: SessionAnswer) => {
    const wordId = session.wordIds[session.index];
    // Saved immediately, so leaving mid-session loses nothing. Re-confirming the same
    // answer after going back is not counted twice.
    if (session.answers[wordId] !== value) actions.recordAnswer(wordId, value);
    setAnnouncement(ANSWER_MESSAGES[value]);
    finishIfDone(answerCurrent(session, value));
  };

  if (isQuiz(session)) {
    // Saved as soon as it is checked; "Siguiente" only moves on.
    const check = (value: SessionAnswer) => {
      const wordId = session.wordIds[session.index];
      if (!session.answers[wordId]) actions.recordAnswer(wordId, value);
      setSession(recordCurrent(session, value));
    };
    return <ExerciseCard session={session} onCheck={check} onNext={() => finishIfDone(goNext(session))} />;
  }

  return (
    <>
      <PracticeCard
        session={session}
        autoPronounce={snapshot.state.preferences.autoPronounce}
        onToggleAutoPronounce={() =>
          actions.updatePreferences({ autoPronounce: !snapshot.state.preferences.autoPronounce })
        }
        onAnswer={answer}
        onNext={() => finishIfDone(goNext(session))}
        onPrevious={() => setSession(goPrevious(session))}
      />
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
