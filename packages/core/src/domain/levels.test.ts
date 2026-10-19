import { describe, expect, it } from "vitest";
import { getWordsByPack, WORDS } from "../data/catalog";
import { achievedCount, formatPoints, LEVELS, levelFor, levelUp, packBadges } from "./levels";
import { applyAnswer, createEmptyState } from "./progress";

const now = new Date("2026-10-18T10:00:00Z");
const learn = (state: ReturnType<typeof createEmptyState>, ids: string[]) => {
  for (const id of ids) state.words[id] = applyAnswer(undefined, "learned", now);
};

describe("levels", () => {
  it("climbs at the thresholds and stops at the top", () => {
    expect(levelFor(0).level.name).toBe("Recién llegado");
    expect(levelFor(9)).toMatchObject({ level: { number: 1 }, wordsToNext: 1, pointsToNext: 100, points: 900 });
    expect(levelFor(10)).toMatchObject({ level: { number: 2, name: "Básico" }, next: { name: "Explorador" }, points: 1000 });
    expect(levelFor(16).progress).toBeCloseTo(6 / 15);
    const top = levelFor(330);
    expect(top).toMatchObject({ level: { name: "Maestro" }, next: null, wordsToNext: null, progress: 1 });
    // The last level is the whole catalog.
    expect(LEVELS.at(-1)!.words).toBe(WORDS.length);
  });

  it("detects a level up between two counts", () => {
    expect(levelUp(9, 10)?.name).toBe("Básico");
    expect(levelUp(10, 12)).toBeNull();
    expect(levelUp(24, 60)?.name).toBe("Conversador");
  });

  it("keeps words learned once, even back in review, and only forgets erased progress", () => {
    const state = createEmptyState(now, 5);
    learn(state, ["essentials-eat", "essentials-time"]);
    state.words["essentials-go"] = applyAnswer(undefined, "review", now);
    expect(achievedCount(state)).toBe(2);

    // Learned, then failed: still counts.
    state.words["essentials-eat"] = applyAnswer(state.words["essentials-eat"], "review", now);
    expect(achievedCount(state)).toBe(2);

    // "Marcar como nueva" removes the progress: it no longer counts.
    delete state.words["essentials-time"];
    expect(achievedCount(state)).toBe(1);
    // Words that are no longer in the catalog are ignored.
    state.words["retired-word"] = applyAnswer(undefined, "learned", now);
    expect(achievedCount(state)).toBe(1);
  });

  it("awards a pack badge only when every word of the pack is achieved", () => {
    const state = createEmptyState(now, 5);
    const travel = getWordsByPack("travel").map((w) => w.id);
    learn(state, travel.slice(0, 18));
    expect(packBadges(state).find((b) => b.packId === "travel")).toMatchObject({ achieved: 18, total: 30, complete: false });
    learn(state, travel);
    expect(packBadges(state).find((b) => b.packId === "travel")?.complete).toBe(true);
    expect(packBadges(state).find((b) => b.packId === "food")?.complete).toBe(false);
  });

  it("formats points with thousands separators", () => {
    expect(formatPoints(1600)).toBe("1.600");
    expect(formatPoints(33000)).toBe("33.000");
    expect(formatPoints(900)).toBe("900");
  });
});
