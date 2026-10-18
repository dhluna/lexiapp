import type {
  LearningStatus,
  PackId,
  Preferences,
  StoredStatus,
  UserProgressState,
  Word,
  WordId,
  WordProgress,
} from "./types";
import { calculateStreak, type StreakInfo } from "./streak";

/** Rate 1 is the engine's native speed: other rates are resampled and can sound grainy. */
export const DEFAULT_PREFERENCES: Readonly<Preferences> = Object.freeze({
  sessionSize: 10,
  speechRate: 1,
  autoPronounce: true,
  activePacks: Object.freeze([]) as unknown as PackId[],
});

/** A fresh, mutable copy of the default preferences. */
export function defaultPreferences(): Preferences {
  return { ...DEFAULT_PREFERENCES, activePacks: [] };
}
export const SESSION_SIZE_MIN = 5;
export const SESSION_SIZE_MAX = 20;
export const MAX_STORED_SESSIONS = 365;

/** "Never": the date given to defaults so any real change wins a merge. */
export const EPOCH = "1970-01-01T00:00:00.000Z";

export function createEmptyState(now: Date, version: number): UserProgressState {
  return {
    version,
    updatedAt: now.toISOString(),
    words: {},
    practiceDays: [],
    sessions: [],
    preferences: defaultPreferences(),
    preferencesUpdatedAt: EPOCH,
    removedWords: {},
    resetAt: null,
  };
}

export function getWordStatus(state: UserProgressState | null, wordId: WordId): LearningStatus {
  return state?.words[wordId]?.status ?? "new";
}

/** Registers an answer given during practice. */
export function applyAnswer(
  previous: WordProgress | undefined,
  status: StoredStatus,
  now: Date,
): WordProgress {
  const iso = now.toISOString();
  return {
    status,
    timesSeen: (previous?.timesSeen ?? 0) + 1,
    timesLearned: (previous?.timesLearned ?? 0) + (status === "learned" ? 1 : 0),
    timesReview: (previous?.timesReview ?? 0) + (status === "review" ? 1 : 0),
    firstSeenAt: previous?.firstSeenAt ?? iso,
    lastReviewedAt: iso,
    updatedAt: iso,
  };
}

/** Manual status change from the word sheet: it is not a practice answer. */
export function applyManualStatus(
  previous: WordProgress | undefined,
  status: StoredStatus,
  now: Date,
): WordProgress {
  const iso = now.toISOString();
  if (!previous) {
    return {
      status,
      timesSeen: 0,
      timesLearned: 0,
      timesReview: 0,
      firstSeenAt: iso,
      lastReviewedAt: iso,
      updatedAt: iso,
    };
  }
  return { ...previous, status, updatedAt: iso };
}

export interface PackStats {
  packId: PackId;
  total: number;
  learned: number;
  review: number;
  studied: number;
}

export interface ProgressStats {
  totalWords: number;
  studied: number;
  learned: number;
  review: number;
  newWords: number;
  sessionsCompleted: number;
  practiceDaysCount: number;
  streak: StreakInfo;
  /** Only the packs passed to `computeStats` (the active ones), in that order. */
  byPack: Partial<Record<PackId, PackStats>>;
}

/**
 * Derives every figure shown in the UI from the real state and the words that count
 * (those of the active packs).
 */
export function computeStats(
  state: UserProgressState,
  catalog: readonly Word[],
  packIds: readonly PackId[],
  today: string,
): ProgressStats {
  const byPack: Partial<Record<PackId, PackStats>> = Object.fromEntries(
    packIds.map((packId) => [packId, { packId, total: 0, learned: 0, review: 0, studied: 0 }]),
  );

  let learned = 0;
  let review = 0;
  for (const word of catalog) {
    const bucket = byPack[word.pack];
    const status = getWordStatus(state, word.id);
    if (bucket) bucket.total += 1;
    if (status === "learned") {
      learned += 1;
      if (bucket) bucket.learned += 1;
    } else if (status === "review") {
      review += 1;
      if (bucket) bucket.review += 1;
    }
  }
  for (const bucket of Object.values(byPack)) {
    if (bucket) bucket.studied = bucket.learned + bucket.review;
  }

  return {
    totalWords: catalog.length,
    studied: learned + review,
    learned,
    review,
    newWords: catalog.length - learned - review,
    sessionsCompleted: state.sessions.length,
    practiceDaysCount: new Set(state.practiceDays).size,
    streak: calculateStreak(state.practiceDays, today),
    byPack,
  };
}

export function clampSessionSize(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PREFERENCES.sessionSize;
  return Math.min(SESSION_SIZE_MAX, Math.max(SESSION_SIZE_MIN, Math.round(value)));
}

/**
 * Rate the voice actually plays for a speed preference. The stored options stay 0.8 / 1 / 1.2
 * (saved data and sync keep working), but "Lenta" plays at 0.6: at 0.8 a single word is only
 * ~25 % longer and sounds the same as "Normal" (measured with Google US English in Chrome).
 */
export const SLOW_PLAYBACK_RATE = 0.6;
export function playbackRate(preference: number): number {
  return preference < 1 ? SLOW_PLAYBACK_RATE : preference;
}

/** "Más lento" in dictation: always slower than the slowest preference. */
export const EXTRA_SLOW_PLAYBACK_RATE = 0.5;

export function clampSpeechRate(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PREFERENCES.speechRate;
  return Math.min(1.2, Math.max(0.6, Math.round(value * 10) / 10));
}
