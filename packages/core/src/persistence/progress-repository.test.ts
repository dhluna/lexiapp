import { describe, expect, it } from "vitest";
import { applyAnswer, createEmptyState } from "../domain/progress";
import { LocalStorageProgressRepository, STORAGE_KEY } from "./progress-repository";
import { CURRENT_VERSION, parseState } from "./schema";
import { MemoryStorage, type KeyValueStorage } from "./storage";

const now = new Date("2026-10-10T12:00:00Z");
const clock = () => now;

function stateWithProgress() {
  const state = createEmptyState(now, CURRENT_VERSION);
  state.words["travel-luggage"] = applyAnswer(undefined, "learned", now);
  state.practiceDays = ["2026-10-10"];
  state.preferences.sessionSize = 15;
  return state;
}

describe("LocalStorageProgressRepository", () => {
  it("starts empty when nothing is stored, without writing anything", () => {
    const storage = new MemoryStorage();
    const { state, issue } = new LocalStorageProgressRepository(storage, clock).load();
    expect(issue).toBeNull();
    expect(state.words).toEqual({});
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("round-trips the saved state (survives a reload)", () => {
    const storage = new MemoryStorage();
    const saved = stateWithProgress();
    expect(new LocalStorageProgressRepository(storage, clock).save(saved)).toBe(true);

    const reloaded = new LocalStorageProgressRepository(storage, clock).load();
    expect(reloaded.issue).toBeNull();
    expect(reloaded.state).toEqual(saved);
  });

  it("backs up corrupt data instead of destroying it", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    const { state, issue } = new LocalStorageProgressRepository(storage, clock).load();
    expect(issue).toBe("recovered");
    expect(state.words).toEqual({});
    expect(storage.getItem(`${STORAGE_KEY}:backup-${now.getTime()}`)).toBe("{not json");
  });

  it("backs up data written by a newer app version", () => {
    const storage = new MemoryStorage();
    const future = JSON.stringify({ ...stateWithProgress(), version: CURRENT_VERSION + 1 });
    storage.setItem(STORAGE_KEY, future);
    const { issue } = new LocalStorageProgressRepository(storage, clock).load();
    expect(issue).toBe("recovered");
    expect(storage.keys().some((k) => k.startsWith(`${STORAGE_KEY}:backup-`))).toBe(true);
  });

  it("drops only the invalid entries of a partially broken document", () => {
    const storage = new MemoryStorage();
    const doc = {
      version: 1,
      words: {
        good: applyAnswer(undefined, "review", now),
        badStatus: { ...applyAnswer(undefined, "review", now), status: "mastered" },
        notAnObject: 3,
      },
      practiceDays: ["2026-10-10", "2026-10-10", "garbage", "2026-10-09"],
      sessions: [{ id: "x" }],
      preferences: { sessionSize: 999, speechRate: "fast" },
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(doc));
    const { state, issue } = new LocalStorageProgressRepository(storage, clock).load();
    expect(issue).toBeNull();
    expect(Object.keys(state.words)).toEqual(["good"]);
    expect(state.practiceDays).toEqual(["2026-10-09", "2026-10-10"]);
    expect(state.sessions).toEqual([]);
    expect(state.preferences).toEqual({ sessionSize: 20, speechRate: 1, autoPronounce: true });
  });

  it("reports storage failures instead of throwing", () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
    };
    const repo = new LocalStorageProgressRepository(broken, clock);
    expect(repo.load().issue).toBe("unavailable");
    expect(repo.save(stateWithProgress())).toBe(false);
  });
});

describe("migrations", () => {
  it("upgrades a real v1 document to the current version keeping all progress", () => {
    const storage = new MemoryStorage();
    const v1 = {
      version: 1,
      updatedAt: now.toISOString(),
      words: { "travel-luggage": applyAnswer(undefined, "learned", now) },
      practiceDays: ["2026-10-09", "2026-10-10"],
      sessions: [],
      preferences: { sessionSize: 15, speechRate: 0.7 },
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(v1));
    const { state, issue } = new LocalStorageProgressRepository(storage, clock).load();
    expect(issue).toBeNull();
    expect(state.version).toBe(CURRENT_VERSION);
    expect(state.words["travel-luggage"].status).toBe("learned");
    expect(state.practiceDays).toEqual(v1.practiceDays);
    // v2 adds autoPronounce; v3 maps the old "Lenta" speed 0.7 to 0.8.
    expect(state.preferences).toEqual({ sessionSize: 15, speechRate: 0.8, autoPronounce: true });
    // v4 adds the sync fields with neutral values.
    expect(state.removedWords).toEqual({});
    expect(state.resetAt).toBeNull();
    expect(state.preferencesUpdatedAt).toBe("1970-01-01T00:00:00.000Z");
  });

  it("upgrades old documents step by step before sanitizing", () => {
    const migrations = {
      1: (doc: Record<string, unknown>) => ({ ...doc, version: 2, words: doc.legacyWords }),
      2: (doc: Record<string, unknown>) => ({ ...doc, version: 3 }),
    };
    const legacy = JSON.stringify({
      version: 1,
      legacyWords: { "food-eat": applyAnswer(undefined, "learned", now) },
    });
    const state = parseState(legacy, now, { migrations, targetVersion: 3 });
    expect(state.words["food-eat"]?.status).toBe("learned");
  });

  it("fails when a migration step is missing", () => {
    const doc = JSON.stringify({ version: 1 });
    expect(() => parseState(doc, now, { migrations: {}, targetVersion: 2 })).toThrow();
  });

  it("rejects documents without a valid version", () => {
    expect(() => parseState(JSON.stringify({ words: {} }), now)).toThrow();
    expect(() => parseState(JSON.stringify({ version: 0 }), now)).toThrow();
    expect(() => parseState("[]", now)).toThrow();
  });
});
