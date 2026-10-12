export type CategoryId =
  | "daily-life"
  | "business"
  | "travel"
  | "technology"
  | "health"
  | "food"
  | "education"
  | "communication";

export type PartOfSpeech =
  | "noun"
  | "verb"
  | "phrasal-verb"
  | "adjective"
  | "adverb";

export type WordId = string;

export interface Example {
  en: string;
  es: string;
}

export interface VerbForms {
  past: string;
  pastParticiple: string;
  irregular: boolean;
}

export interface Word {
  id: WordId;
  term: string;
  /** Broad General American IPA, without slashes (e.g. `ˈpæswɝd`). */
  ipa: string;
  translation: string;
  definition: string;
  category: CategoryId;
  partOfSpeech: PartOfSpeech;
  verbForms?: VerbForms;
  examples: Example[];
}

/** `new` is never stored: a word without progress is new. */
export type LearningStatus = "new" | "review" | "learned";
export type StoredStatus = Exclude<LearningStatus, "new">;

export interface WordProgress {
  status: StoredStatus;
  timesSeen: number;
  timesLearned: number;
  timesReview: number;
  firstSeenAt: string;
  lastReviewedAt: string;
  updatedAt: string;
}

export interface SessionRecord {
  id: string;
  startedAt: string;
  completedAt: string;
  day: string;
  categoryId: CategoryId | null;
  total: number;
  learned: number;
  review: number;
}

export interface Preferences {
  sessionSize: number;
  speechRate: number;
  /** Speak each word automatically when it appears in practice. */
  autoPronounce: boolean;
}

export interface UserProgressState {
  version: number;
  updatedAt: string;
  words: Record<WordId, WordProgress>;
  practiceDays: string[];
  sessions: SessionRecord[];
  preferences: Preferences;
  /** When `preferences` last changed by the user (EPOCH = never: defaults lose any merge). */
  preferencesUpdatedAt: string;
  /** Deletion marks: word reset to "new" at that time, so sync does not bring it back. */
  removedWords: Record<WordId, string>;
  /** Last "delete all progress": anything older is discarded when merging. */
  resetAt: string | null;
}
