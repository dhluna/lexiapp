import { createEmptyState } from "@/domain/progress";
import type { UserProgressState } from "@/domain/types";
import { CURRENT_VERSION, parseState } from "./schema";
import type { KeyValueStorage } from "./storage";

export const STORAGE_KEY = "lexi:progress";

export type PersistenceIssue = "unavailable" | "recovered" | "write-failed";

export interface LoadResult {
  state: UserProgressState;
  issue: PersistenceIssue | null;
}

/** Contract every persistence backend must honor (LocalStorage now, API later). */
export interface ProgressRepository {
  load(): LoadResult;
  /** Returns false if the state could not be persisted. */
  save(state: UserProgressState): boolean;
}

export class LocalStorageProgressRepository implements ProgressRepository {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly now: () => Date = () => new Date(),
    private readonly key: string = STORAGE_KEY,
  ) {}

  load(): LoadResult {
    let serialized: string | null;
    try {
      serialized = this.storage.getItem(this.key);
    } catch {
      return { state: createEmptyState(this.now(), CURRENT_VERSION), issue: "unavailable" };
    }

    if (serialized === null) {
      return { state: createEmptyState(this.now(), CURRENT_VERSION), issue: null };
    }

    try {
      return { state: parseState(serialized, this.now()), issue: null };
    } catch {
      // Corrupt or newer-than-supported data: keep a copy, never destroy it silently.
      this.backup(serialized);
      return { state: createEmptyState(this.now(), CURRENT_VERSION), issue: "recovered" };
    }
  }

  save(state: UserProgressState): boolean {
    try {
      this.storage.setItem(this.key, JSON.stringify({ ...state, version: CURRENT_VERSION }));
      return true;
    } catch {
      return false;
    }
  }

  private backup(serialized: string): void {
    try {
      this.storage.setItem(`${this.key}:backup-${this.now().getTime()}`, serialized);
    } catch {
      // Nothing else we can do; the original key is left untouched until the next save.
    }
  }
}

/** Used when no storage is available: progress lives only for this visit. */
export class InMemoryProgressRepository implements ProgressRepository {
  private state: UserProgressState | null = null;

  constructor(
    private readonly now: () => Date = () => new Date(),
    private readonly issue: PersistenceIssue | null = null,
  ) {}

  load(): LoadResult {
    return {
      state: this.state ?? createEmptyState(this.now(), CURRENT_VERSION),
      issue: this.issue,
    };
  }

  save(state: UserProgressState): boolean {
    this.state = state;
    return true;
  }
}
