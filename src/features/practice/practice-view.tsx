"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { isCategoryId } from "@/data/categories";
import { WORDS } from "@/data/catalog";
import {
  answerCurrent,
  createSession,
  goNext,
  goPrevious,
  selectSessionWords,
  type PracticeSession,
  type SessionAnswer,
} from "@/domain/session";
import type { CategoryId, UserProgressState } from "@/domain/types";
import { useProgress, useProgressActions } from "@/hooks/use-progress";
import { PracticeCard } from "./practice-card";
import { PracticeSkeleton } from "./practice-skeleton";
import { PracticeSetup } from "./practice-setup";
import { PracticeSummary } from "./practice-summary";

const ANSWER_MESSAGES: Record<SessionAnswer, string> = {
  learned: "Guardada como aprendida.",
  review: "Guardada para repasar.",
};

function buildSession(state: UserProgressState, categoryId: CategoryId | null): PracticeSession {
  const ids = selectSessionWords(WORDS, state, { size: state.preferences.sessionSize, categoryId });
  return createSession(ids, new Date(), categoryId);
}

export function PracticeView() {
  const params = useSearchParams();
  const linkedCategory = params.get("categoria");
  const categoryId = isCategoryId(linkedCategory) ? linkedCategory : null;
  // "Empezar práctica" (home) and "Practicar <categoría>" (progress) go straight to the card.
  const autoStart = params.get("empezar") === "1" || categoryId !== null;

  const snapshot = useProgress();
  const actions = useProgressActions();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // Coming from a direct link: the setup screen is skipped entirely.
  const [autoStartPending, setAutoStartPending] = useState(autoStart);

  const start = (category: CategoryId | null) => {
    if (!snapshot) return;
    setAnnouncement("");
    setSession(buildSession(snapshot.state, category));
  };

  // Coming from "Empezar práctica": start during render (React re-renders before
  // committing), so neither the setup screen nor an empty frame is ever painted.
  if (autoStartPending && snapshot) {
    setAutoStartPending(false);
    setSession(buildSession(snapshot.state, categoryId));
  }

  if (!snapshot || autoStartPending) {
    return <PracticeSkeleton />;
  }

  if (!session) {
    return (
      <PracticeSetup
        state={snapshot.state}
        onStart={start}
      />
    );
  }

  if (session.finished) {
    return (
      <PracticeSummary
        session={session}
        onRestart={() => start(session.categoryId)}
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
