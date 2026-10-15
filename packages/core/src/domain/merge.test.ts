import { describe, expect, it } from "vitest";
import { mergeStates } from "./merge";
import { applyAnswer, createEmptyState, EPOCH } from "./progress";
import type { SessionRecord, UserProgressState } from "./types";

const at = (iso: string) => new Date(iso);
const state = (patch: Partial<UserProgressState> = {}): UserProgressState => ({
  ...createEmptyState(at("2026-10-01T00:00:00Z"), 4),
  ...patch,
});
const session = (id: string, completedAt: string): SessionRecord => ({
  id,
  startedAt: completedAt,
  completedAt,
  day: completedAt.slice(0, 10),
  packId: null,
  total: 10,
  learned: 5,
  review: 5,
});

describe("mergeStates", () => {
  it("keeps the most recent version of each word", () => {
    const local = state({ words: { a: applyAnswer(undefined, "review", at("2026-10-05T10:00:00Z")) } });
    const remote = state({
      words: {
        a: applyAnswer(undefined, "learned", at("2026-10-06T10:00:00Z")),
        b: applyAnswer(undefined, "review", at("2026-10-04T10:00:00Z")),
      },
    });
    const merged = mergeStates(local, remote);
    expect(merged.words.a.status).toBe("learned");
    expect(merged.words.b.status).toBe("review");
  });

  it("does not resurrect a word reset after its last update", () => {
    const local = state({ removedWords: { a: "2026-10-07T00:00:00.000Z" } });
    const remote = state({ words: { a: applyAnswer(undefined, "learned", at("2026-10-06T10:00:00Z")) } });
    const merged = mergeStates(local, remote);
    expect(merged.words.a).toBeUndefined();
    expect(merged.removedWords.a).toBe("2026-10-07T00:00:00.000Z");
  });

  it("keeps a word answered again after it was reset", () => {
    const local = state({ removedWords: { a: "2026-10-07T00:00:00.000Z" } });
    const remote = state({ words: { a: applyAnswer(undefined, "learned", at("2026-10-08T10:00:00Z")) } });
    const merged = mergeStates(local, remote);
    expect(merged.words.a.status).toBe("learned");
    expect(merged.removedWords.a).toBeUndefined();
  });

  it("applies a full reset to everything older on the other side", () => {
    const local = state({ resetAt: "2026-10-07T12:00:00.000Z" });
    const remote = state({
      words: {
        old: applyAnswer(undefined, "learned", at("2026-10-06T10:00:00Z")),
        fresh: applyAnswer(undefined, "learned", at("2026-10-08T10:00:00Z")),
      },
      removedWords: { gone: "2026-10-05T00:00:00.000Z" },
      practiceDays: ["2026-10-05", "2026-10-07", "2026-10-08"],
      sessions: [session("s-old", "2026-10-06T10:00:00.000Z"), session("s-new", "2026-10-08T10:00:00.000Z")],
    });
    const merged = mergeStates(local, remote);
    expect(Object.keys(merged.words)).toEqual(["fresh"]);
    expect(merged.removedWords).toEqual({});
    expect(merged.practiceDays).toEqual(["2026-10-07", "2026-10-08"]);
    expect(merged.sessions.map((s) => s.id)).toEqual(["s-new"]);
    expect(merged.resetAt).toBe("2026-10-07T12:00:00.000Z");
  });

  it("unites practice days and sessions without duplicates", () => {
    const local = state({
      practiceDays: ["2026-10-01", "2026-10-03"],
      sessions: [session("s1", "2026-10-01T10:00:00.000Z")],
    });
    const remote = state({
      practiceDays: ["2026-10-02", "2026-10-03"],
      sessions: [session("s1", "2026-10-01T10:00:00.000Z"), session("s2", "2026-10-02T10:00:00.000Z")],
    });
    const merged = mergeStates(local, remote);
    expect(merged.practiceDays).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(merged.sessions.map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  it("keeps the most recently changed preferences, and defaults never win", () => {
    const changed = state({
      preferences: { sessionSize: 20, speechRate: 0.8, autoPronounce: false, activePacks: ["travel"] },
      preferencesUpdatedAt: "2026-10-05T00:00:00.000Z",
    });
    const fresh = state();
    expect(fresh.preferencesUpdatedAt).toBe(EPOCH);
    expect(mergeStates(fresh, changed).preferences).toEqual(changed.preferences);
    expect(mergeStates(changed, fresh).preferences).toEqual(changed.preferences);
  });

  it("compares dates as instants, whatever their text format", () => {
    const local = state({ words: { a: applyAnswer(undefined, "review", at("2026-10-05T10:00:00Z")) } });
    const remoteWord = { ...applyAnswer(undefined, "learned", at("2026-10-05T10:00:01Z")) };
    remoteWord.updatedAt = "2026-10-05T10:00:01+00:00"; // Postgres format
    const merged = mergeStates(local, state({ words: { a: remoteWord } }));
    expect(merged.words.a.status).toBe("learned");
  });

  describe("properties", () => {
    const a = state({
      words: {
        x: applyAnswer(undefined, "review", at("2026-10-05T10:00:00Z")),
        y: applyAnswer(undefined, "learned", at("2026-10-05T10:00:00Z")),
      },
      removedWords: { z: "2026-10-06T00:00:00.000Z" },
      practiceDays: ["2026-10-05"],
      sessions: [session("s1", "2026-10-05T11:00:00.000Z")],
      preferences: { sessionSize: 15, speechRate: 1, autoPronounce: true, activePacks: ["food"] },
      preferencesUpdatedAt: "2026-10-05T00:00:00.000Z",
    });
    const b = state({
      words: {
        // Same instant as a.y with a different status: a tie broken by content.
        y: applyAnswer(undefined, "review", at("2026-10-05T10:00:00Z")),
        z: applyAnswer(undefined, "learned", at("2026-10-04T10:00:00Z")),
      },
      practiceDays: ["2026-10-04", "2026-10-05"],
      sessions: [session("s2", "2026-10-04T11:00:00.000Z")],
      preferences: { sessionSize: 5, speechRate: 1, autoPronounce: false, activePacks: [] },
      preferencesUpdatedAt: "2026-10-05T00:00:00.000Z",
    });

    it("is commutative", () => {
      expect(mergeStates(a, b)).toEqual(mergeStates(b, a));
    });

    it("is idempotent", () => {
      const once = mergeStates(a, b);
      expect(mergeStates(once, b)).toEqual(once);
      expect(mergeStates(a, once)).toEqual(once);
      expect(mergeStates(once, once)).toEqual(once);
    });

    it("loses nothing that was not deleted", () => {
      const merged = mergeStates(a, b);
      expect(Object.keys(merged.words).sort()).toEqual(["x", "y"]); // z: deleted after its update
      expect(merged.practiceDays).toEqual(["2026-10-04", "2026-10-05"]);
      expect(merged.sessions).toHaveLength(2);
    });
  });
});
