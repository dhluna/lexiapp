import { chooseExercise, type Exercise } from "./exercise";
import type { PackId, StoredStatus, UserProgressState, Word, WordId } from "./types";

/** Answers given in a session. Words left unanswered count as skipped in the summary. */
export type SessionAnswer = StoredStatus;

export interface PracticeSession {
  id: string;
  startedAt: string;
  packId: PackId | null;
  wordIds: WordId[];
  index: number;
  answers: Record<WordId, SessionAnswer>;
  finished: boolean;
  /** Only in "Ponerme a prueba": the exercise chosen for each word. */
  exercises?: Record<WordId, Exercise>;
}

export interface SelectOptions {
  size: number;
  packId?: PackId | null;
  /** Returns a number in [0, 1). Injected for deterministic tests. */
  random?: () => number;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Picks unique words: pending review first (oldest first), then new words in
 * random order, then learned words (oldest first) to fill the session.
 */
export function selectSessionWords(
  catalog: readonly Word[],
  state: UserProgressState,
  { size, packId = null, random = Math.random }: SelectOptions,
): WordId[] {
  const pool = packId ? catalog.filter((w) => w.pack === packId) : catalog;
  const byOldest = (a: Word, b: Word) =>
    (state.words[a.id]?.lastReviewedAt ?? "").localeCompare(
      state.words[b.id]?.lastReviewedAt ?? "",
    );

  const review = pool.filter((w) => state.words[w.id]?.status === "review").sort(byOldest);
  const fresh = shuffle(
    pool.filter((w) => !state.words[w.id]),
    random,
  );
  const learned = pool.filter((w) => state.words[w.id]?.status === "learned").sort(byOldest);

  const ids = new Set<WordId>();
  for (const word of [...review, ...fresh, ...learned]) {
    if (ids.size >= size) break;
    ids.add(word.id);
  }
  return [...ids];
}

export function createSession(
  wordIds: readonly WordId[],
  now: Date,
  packId: PackId | null = null,
): PracticeSession {
  const unique = [...new Set(wordIds)];
  return {
    id: `s-${now.getTime().toString(36)}`,
    startedAt: now.toISOString(),
    packId,
    wordIds: unique,
    index: 0,
    answers: {},
    finished: unique.length === 0,
  };
}

/** A "Ponerme a prueba" session: the same flow, with an exercise chosen for each word. */
export function createQuiz(
  words: readonly Word[],
  now: Date,
  packId: PackId | null = null,
  random: () => number = Math.random,
): PracticeSession {
  const session = createSession(
    words.map((w) => w.id),
    now,
    packId,
  );
  const exercises: Record<WordId, Exercise> = {};
  for (const word of words) exercises[word.id] = chooseExercise(word, random);
  return { ...session, exercises };
}

export function isQuiz(session: PracticeSession): boolean {
  return session.exercises !== undefined;
}

export function currentWordId(session: PracticeSession): WordId | null {
  return session.finished ? null : (session.wordIds[session.index] ?? null);
}

/** Moves forward. Past the last word the session finishes (unanswered words count as skipped). */
export function goNext(session: PracticeSession): PracticeSession {
  if (session.finished) return session;
  if (session.index >= session.wordIds.length - 1) return { ...session, finished: true };
  return { ...session, index: session.index + 1 };
}

/** Moves back to review or change a previous answer. */
export function goPrevious(session: PracticeSession): PracticeSession {
  if (session.finished || session.index === 0) return session;
  return { ...session, index: session.index - 1 };
}

export function isLastWord(session: PracticeSession): boolean {
  return session.index >= session.wordIds.length - 1;
}

/** Records the answer for the current word without moving (quiz: the result is shown first). */
export function recordCurrent(session: PracticeSession, answer: SessionAnswer): PracticeSession {
  const wordId = currentWordId(session);
  if (!wordId) return session;
  return { ...session, answers: { ...session.answers, [wordId]: answer } };
}

/** Records (or changes) the answer for the current word and moves forward. */
export function answerCurrent(session: PracticeSession, answer: SessionAnswer): PracticeSession {
  const wordId = currentWordId(session);
  if (!wordId) return session;
  return goNext({ ...session, answers: { ...session.answers, [wordId]: answer } });
}

export interface SessionSummary {
  total: number;
  learned: WordId[];
  review: WordId[];
  skipped: WordId[];
}

export function summarize(session: PracticeSession): SessionSummary {
  const summary: SessionSummary = { total: session.wordIds.length, learned: [], review: [], skipped: [] };
  for (const id of session.wordIds) {
    const answer = session.answers[id];
    if (answer === "learned") summary.learned.push(id);
    else if (answer === "review") summary.review.push(id);
    else summary.skipped.push(id);
  }
  return summary;
}

/** Fraction of the session already answered, 0..1. */
export function sessionProgress(session: PracticeSession): number {
  if (session.wordIds.length === 0) return 1;
  return Object.keys(session.answers).length / session.wordIds.length;
}

/** Headline of the end-of-session summary. "Todas aprendidas" only if every word was learned. */
export function summaryTitle(summary: SessionSummary): string {
  const answered = summary.learned.length + summary.review.length;
  if (answered === 0) return "Sesión terminada";
  if (summary.learned.length === summary.total) return "Todas aprendidas";
  return "Sesión completada";
}
