import { isCategoryId } from "@lexi/core/data/categories";
import { WORDS } from "@lexi/core/data/catalog";
import {
  answerCurrent,
  createSession,
  goNext,
  goPrevious,
  selectSessionWords,
  type PracticeSession,
  type SessionAnswer,
} from "@lexi/core/domain/session";
import type { CategoryId, UserProgressState } from "@lexi/core/domain/types";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useProgress, useProgressActions } from "@/hooks/use-progress";
import { PracticeCard } from "./practice-card";
import { PracticeSetup } from "./practice-setup";
import { PracticeSummary } from "./practice-summary";

function buildSession(state: UserProgressState, categoryId: CategoryId | null): PracticeSession {
  const ids = selectSessionWords(WORDS, state, { size: state.preferences.sessionSize, categoryId });
  return createSession(ids, new Date(), categoryId);
}

/**
 * Same flow as the web's PracticeView. Links can start a session directly
 * (`?empezar=1` or `?categoria=…`); `t` makes a repeated link start a new one, because
 * tab screens stay mounted.
 */
export function PracticeScreen() {
  const params = useLocalSearchParams<{ empezar?: string; categoria?: string; t?: string }>();
  const linkedCategory = isCategoryId(params.categoria) ? params.categoria : null;
  const linkToken = params.empezar === "1" || linkedCategory ? (params.t ?? "inicial") : null;

  const { state } = useProgress();
  const actions = useProgressActions();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [handledLink, setHandledLink] = useState<string | null>(null);

  // Start from a link during render (React re-renders before painting): no flash of the setup screen.
  if (linkToken && linkToken !== handledLink) {
    setHandledLink(linkToken);
    setSession(buildSession(state, linkedCategory));
  }

  const start = (categoryId: CategoryId | null) => setSession(buildSession(state, categoryId));

  if (!session) return <PracticeSetup state={state} onStart={start} />;

  if (session.finished) {
    return (
      <PracticeSummary
        session={session}
        onRestart={() => start(session.categoryId)}
        onChooseCategory={() => setSession(null)}
      />
    );
  }

  const finishIfDone = (next: PracticeSession) => {
    if (next.finished) actions.completeSession(next);
    setSession(next);
  };

  const answer = (value: SessionAnswer) => {
    const wordId = session.wordIds[session.index];
    // Saved immediately; confirming the same answer again after going back is not counted twice.
    if (session.answers[wordId] !== value) actions.recordAnswer(wordId, value);
    finishIfDone(answerCurrent(session, value));
  };

  return (
    <PracticeCard
      session={session}
      autoPronounce={state.preferences.autoPronounce}
      onToggleAutoPronounce={() => actions.updatePreferences({ autoPronounce: !state.preferences.autoPronounce })}
      onAnswer={answer}
      onNext={() => finishIfDone(goNext(session))}
      onPrevious={() => setSession(goPrevious(session))}
    />
  );
}
