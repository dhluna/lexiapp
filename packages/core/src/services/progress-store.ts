import { toDayKey } from "../domain/dates";
import {
  applyAnswer,
  applyManualStatus,
  clampSessionSize,
  clampSpeechRate,
  createEmptyState,
  MAX_STORED_SESSIONS,
} from "../domain/progress";
import { isOptionalPackId } from "../data/packs";
import type { PracticeSession } from "../domain/session";
import { summarize } from "../domain/session";
import { addPracticeDay } from "../domain/streak";
import type {
  LearningStatus,
  PackId,
  Preferences,
  StoredStatus,
  UserProgressState,
  WordId,
} from "../domain/types";
import type { PersistenceIssue, ProgressRepository } from "../persistence/progress-repository";
import { CURRENT_VERSION, sanitizePackList } from "../persistence/schema";

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
  private readonly localChangeListeners = new Set<Listener>();

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

  /** Called only for changes made by the user on this device (what sync must upload). */
  subscribeLocalChanges(listener: Listener): () => void {
    this.localChangeListeners.add(listener);
    return () => this.localChangeListeners.delete(listener);
  }

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
      removedWords: withoutKey(state.removedWords, wordId),
      practiceDays: addPracticeDay(state.practiceDays, toDayKey(now)),
    }));
  }

  /**
   * Manual change from the word sheet. `new` forgets the word's progress and leaves a
   * dated deletion mark, so another device cannot bring it back when syncing.
   */
  setWordStatus(wordId: WordId, status: LearningStatus): void {
    this.update((state, now) => {
      if (status === "new") {
        if (!state.words[wordId]) return state;
        return {
          ...state,
          words: withoutKey(state.words, wordId),
          removedWords: { ...state.removedWords, [wordId]: now.toISOString() },
        };
      }
      return {
        ...state,
        words: { ...state.words, [wordId]: applyManualStatus(state.words[wordId], status, now) },
        removedWords: withoutKey(state.removedWords, wordId),
      };
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
        packId: session.packId,
        total: summary.total,
        learned: summary.learned.length,
        review: summary.review.length,
      };
      return { ...state, sessions: [...state.sessions, record].slice(-MAX_STORED_SESSIONS) };
    });
  }

  updatePreferences(patch: Partial<Preferences>): void {
    this.update((state, now) => ({
      ...state,
      preferencesUpdatedAt: now.toISOString(),
      preferences: {
        sessionSize: clampSessionSize(patch.sessionSize ?? state.preferences.sessionSize),
        speechRate: clampSpeechRate(patch.speechRate ?? state.preferences.speechRate),
        autoPronounce: patch.autoPronounce ?? state.preferences.autoPronounce,
        activePacks: sanitizePackList(patch.activePacks ?? state.preferences.activePacks),
      },
    }));
  }

  /**
   * Adds an optional pack to practice or removes it. Removing never deletes progress: the
   * words just stop counting until the pack is added again. The core pack cannot change.
   */
  setPackActive(packId: PackId, active: boolean): void {
    if (!isOptionalPackId(packId)) return;
    const current = this.getSnapshot().state.preferences.activePacks;
    if (current.includes(packId) === active) return;
    const next = active ? [...current, packId] : current.filter((id) => id !== packId);
    this.updatePreferences({ activePacks: next });
  }

  /** Deletes all progress, here and (through `resetAt`) on every synced device. */
  resetProgress(): void {
    this.update((state, now) => ({
      ...createEmptyState(now, CURRENT_VERSION),
      preferences: state.preferences,
      preferencesUpdatedAt: state.preferencesUpdatedAt,
      resetAt: now.toISOString(),
    }));
  }

  /** Applies a state coming from sync. Not a local change: it does not trigger an upload. */
  replaceState(state: UserProgressState): void {
    this.commit({ ...state, version: CURRENT_VERSION });
  }

  /** Forgets this device's progress (sign-out). It is not a deletion to propagate. */
  clearLocal(): void {
    this.commit(createEmptyState(this.now(), CURRENT_VERSION));
  }

  private update(change: (state: UserProgressState, now: Date) => UserProgressState): void {
    const current = this.getSnapshot();
    const now = this.now();
    const changed = change(current.state, now);
    if (changed === current.state) return;
    this.commit({ ...changed, version: CURRENT_VERSION, updatedAt: now.toISOString() });
    for (const listener of this.localChangeListeners) listener();
  }

  private commit(next: UserProgressState): void {
    const current = this.getSnapshot();
    const saved = this.repository.save(next);
    const issue = saved ? (current.issue === "write-failed" ? null : current.issue) : "write-failed";
    this.snapshot = { state: next, issue };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  const copy = { ...record };
  delete copy[key];
  return copy;
}
