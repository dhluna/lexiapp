import { toDayKey } from "@/domain/dates";
import {
  applyAnswer,
  applyManualStatus,
  clampSessionSize,
  clampSpeechRate,
  createEmptyState,
  MAX_STORED_SESSIONS,
} from "@/domain/progress";
import type { PracticeSession } from "@/domain/session";
import { summarize } from "@/domain/session";
import { addPracticeDay } from "@/domain/streak";
import type {
  LearningStatus,
  Preferences,
  StoredStatus,
  UserProgressState,
  WordId,
} from "@/domain/types";
import type { PersistenceIssue, ProgressRepository } from "@/persistence/progress-repository";
import { CURRENT_VERSION } from "@/persistence/schema";

export interface ProgressSnapshot {
  state: UserProgressState;
  issue: PersistenceIssue | null;
}

type Listener = () => void;

/**
 * Application use cases over the user's progress. Framework-agnostic: React consumes it
 * through `useSyncExternalStore`, a React Native client could do the same.
 */
export class ProgressStore {
  private snapshot: ProgressSnapshot | null = null;
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly repository: ProgressRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  getSnapshot = (): ProgressSnapshot => {
    if (!this.snapshot) {
      const { state, issue } = this.repository.load();
      this.snapshot = { state, issue };
    }
    return this.snapshot;
  };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Re-reads storage (e.g. another tab changed it). */
  reload(): void {
    this.snapshot = null;
    this.getSnapshot();
    this.emit();
  }

  /** Practice answer: persisted immediately and counts as a practice day. */
  recordAnswer(wordId: WordId, status: StoredStatus): void {
    this.update((state, now) => ({
      ...state,
      words: { ...state.words, [wordId]: applyAnswer(state.words[wordId], status, now) },
      practiceDays: addPracticeDay(state.practiceDays, toDayKey(now)),
    }));
  }

  /** Manual change from the word sheet. `new` forgets the word's progress. */
  setWordStatus(wordId: WordId, status: LearningStatus): void {
    this.update((state, now) => {
      const words = { ...state.words };
      if (status === "new") delete words[wordId];
      else words[wordId] = applyManualStatus(words[wordId], status, now);
      return { ...state, words };
    });
  }

  completeSession(session: PracticeSession): void {
    if (!session.finished || session.wordIds.length === 0) return;
    const summary = summarize(session);
    this.update((state, now) => {
      if (state.sessions.some((s) => s.id === session.id)) return state;
      const record = {
        id: session.id,
        startedAt: session.startedAt,
        completedAt: now.toISOString(),
        day: toDayKey(now),
        categoryId: session.categoryId,
        total: summary.total,
        learned: summary.learned.length,
        review: summary.review.length,
      };
      return { ...state, sessions: [...state.sessions, record].slice(-MAX_STORED_SESSIONS) };
    });
  }

  updatePreferences(patch: Partial<Preferences>): void {
    this.update((state) => ({
      ...state,
      preferences: {
        sessionSize: clampSessionSize(patch.sessionSize ?? state.preferences.sessionSize),
        speechRate: clampSpeechRate(patch.speechRate ?? state.preferences.speechRate),
        autoPronounce: patch.autoPronounce ?? state.preferences.autoPronounce,
      },
    }));
  }

  resetProgress(): void {
    this.update((state, now) => ({
      ...createEmptyState(now, CURRENT_VERSION),
      preferences: state.preferences,
    }));
  }

  private update(change: (state: UserProgressState, now: Date) => UserProgressState): void {
    const current = this.getSnapshot();
    const now = this.now();
    const changed = change(current.state, now);
    if (changed === current.state) return;
    const next = { ...changed, version: CURRENT_VERSION, updatedAt: now.toISOString() };
    const saved = this.repository.save(next);
    const issue = saved ? (current.issue === "write-failed" ? null : current.issue) : "write-failed";
    this.snapshot = { state: next, issue };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
