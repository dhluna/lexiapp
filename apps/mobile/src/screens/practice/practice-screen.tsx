import { getActiveWords, isPackActive } from "@lexi/core/data/catalog";
import { isPackId } from "@lexi/core/data/packs";
import {
  answerCurrent,
  createSession,
  goNext,
  goPrevious,
  selectSessionWords,
  type PracticeSession,
  type SessionAnswer,
} from "@lexi/core/domain/session";
import type { PackId, UserProgressState } from "@lexi/core/domain/types";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useProgress, useProgressActions } from "@/hooks/use-progress";
import { PracticeCard } from "./practice-card";
import { PracticeSetup } from "./practice-setup";
import { PracticeSummary } from "./practice-summary";

/** A session over the active packs (or one of them). */
function buildSession(state: UserProgressState, packId: PackId | null): PracticeSession {
  const pack = packId && isPackActive(state, packId) ? packId : null;
  const ids = selectSessionWords(getActiveWords(state), state, { size: state.preferences.sessionSize, packId: pack });
  return createSession(ids, new Date(), pack);
}

/**
 * Same flow as the web's PracticeView. Links can start a session directly
 * (`?empezar=1` or `?paquete=…`); `t` makes a repeated link start a new one, because
 * tab screens stay mounted.
 */
export function PracticeScreen() {
  const params = useLocalSearchParams<{ empezar?: string; paquete?: string; t?: string }>();
  const linkedPack = isPackId(params.paquete) ? params.paquete : null;
  const linkToken = params.empezar === "1" || linkedPack ? (params.t ?? "inicial") : null;

  const { state } = useProgress();
  const actions = useProgressActions();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [handledLink, setHandledLink] = useState<string | null>(null);

  // Start from a link during render (React re-renders before painting): no flash of the setup screen.
  if (linkToken && linkToken !== handledLink) {
    setHandledLink(linkToken);
    setSession(buildSession(state, linkedPack));
  }

  const start = (packId: PackId | null) => setSession(buildSession(state, packId));

  if (!session) return <PracticeSetup state={state} onStart={start} />;

  if (session.finished) {
    return (
      <PracticeSummary
        session={session}
        onRestart={() => start(session.packId)}
        onChoosePack={() => setSession(null)}
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
