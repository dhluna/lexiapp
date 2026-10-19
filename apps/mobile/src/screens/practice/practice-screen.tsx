import { getActiveWords, getWord, isPackActive } from "@lexi/core/data/catalog";
import { selectQuizWords } from "@lexi/core/domain/exercise";
import { achievedCount, levelUp } from "@lexi/core/domain/levels";
import { isPackId } from "@lexi/core/data/packs";
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
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useProgress, useProgressActions } from "@/hooks/use-progress";
import { ExerciseCard } from "./exercise-card";
import { PracticeCard } from "./practice-card";
import { PracticeSetup } from "./practice-setup";
import { PracticeSummary } from "./practice-summary";

type PracticeMode = "cards" | "quiz";

/** A session over the active packs (or one of them): flashcards or "Ponerme a prueba". */
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
  // Words achieved when the session started, to tell whether it raised the level.
  const [startAchieved, setStartAchieved] = useState(0);

  // Start from a link during render (React re-renders before painting): no flash of the setup screen.
  if (linkToken && linkToken !== handledLink) {
    setHandledLink(linkToken);
    setStartAchieved(achievedCount(state));
    setSession(buildSession(state, linkedPack));
  }

  const start = (packId: PackId | null, mode: PracticeMode = "cards") => {
    setStartAchieved(achievedCount(state));
    setSession(buildSession(state, packId, mode));
  };

  if (!session) return <PracticeSetup state={state} onStart={(pack) => start(pack)} onStartQuiz={() => start(null, "quiz")} />;

  if (session.finished) {
    return (
      <PracticeSummary
        session={session}
        newLevel={levelUp(startAchieved, achievedCount(state))}
        onRestart={() => start(session.packId, isQuiz(session) ? "quiz" : "cards")}
        onChoosePack={() => setSession(null)}
      />
    );
  }

  const finishIfDone = (next: PracticeSession) => {
    // A quiz is a check apart: it is not recorded as a session nor as a practice day.
    if (next.finished && !isQuiz(next)) actions.completeSession(next);
    setSession(next);
  };

  const answer = (value: SessionAnswer) => {
    const wordId = session.wordIds[session.index];
    // Saved immediately; confirming the same answer again after going back is not counted twice.
    if (session.answers[wordId] !== value) actions.recordAnswer(wordId, value);
    finishIfDone(answerCurrent(session, value));
  };

  if (isQuiz(session)) {
    // Kept only in this session: the quiz never changes progress by itself.
    const check = (value: SessionAnswer) => setSession(recordCurrent(session, value));
    return <ExerciseCard session={session} onCheck={check} onNext={() => finishIfDone(goNext(session))} />;
  }

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
