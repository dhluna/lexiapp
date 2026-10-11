import { describe, expect, it } from "vitest";
import { CATEGORY_IDS } from "@/data/categories";
import { WORDS } from "@/data/catalog";
import {
  applyAnswer,
  applyManualStatus,
  clampSessionSize,
  computeStats,
  createEmptyState,
  getWordStatus,
} from "./progress";

const now = new Date("2026-10-10T12:00:00Z");

describe("applyAnswer", () => {
  it("creates progress on the first answer", () => {
    const p = applyAnswer(undefined, "review", now);
    expect(p).toMatchObject({ status: "review", timesSeen: 1, timesReview: 1, timesLearned: 0 });
    expect(p.firstSeenAt).toBe(now.toISOString());
  });

  it("accumulates counters and keeps the first-seen date", () => {
    const first = applyAnswer(undefined, "review", now);
    const later = new Date("2026-10-11T12:00:00Z");
    const second = applyAnswer(first, "learned", later);
    expect(second).toMatchObject({ status: "learned", timesSeen: 2, timesReview: 1, timesLearned: 1 });
    expect(second.firstSeenAt).toBe(now.toISOString());
    expect(second.lastReviewedAt).toBe(later.toISOString());
  });
});

describe("applyManualStatus", () => {
  it("changes status without counting a practice", () => {
    const manual = applyManualStatus(undefined, "learned", now);
    expect(manual).toMatchObject({ status: "learned", timesSeen: 0 });
    const answered = applyAnswer(undefined, "review", now);
    expect(applyManualStatus(answered, "learned", now)).toMatchObject({ status: "learned", timesSeen: 1 });
  });
});

describe("computeStats", () => {
  it("derives every figure from the real state", () => {
    const state = createEmptyState(now, 1);
    const [a, b, c] = WORDS;
    state.words[a.id] = applyAnswer(undefined, "learned", now);
    state.words[b.id] = applyAnswer(undefined, "learned", now);
    state.words[c.id] = applyAnswer(undefined, "review", now);
    state.words["removed-from-catalog"] = applyAnswer(undefined, "learned", now);
    state.practiceDays = ["2026-10-09", "2026-10-10"];

    const stats = computeStats(state, WORDS, CATEGORY_IDS, "2026-10-10");
    expect(stats).toMatchObject({
      totalWords: WORDS.length,
      studied: 3,
      learned: 2,
      review: 1,
      newWords: WORDS.length - 3,
      sessionsCompleted: 0,
      practiceDaysCount: 2,
    });
    expect(stats.streak.current).toBe(2);
    const cat = stats.byCategory[a.category];
    expect(cat.learned + cat.review).toBe(cat.studied);
    const totalByCategory = Object.values(stats.byCategory).reduce((n, x) => n + x.total, 0);
    expect(totalByCategory).toBe(WORDS.length);
  });

  it("reports zero for an empty state", () => {
    const stats = computeStats(createEmptyState(now, 1), WORDS, CATEGORY_IDS, "2026-10-10");
    expect(stats.studied).toBe(0);
    expect(stats.streak.current).toBe(0);
    expect(getWordStatus(null, WORDS[0].id)).toBe("new");
  });
});

describe("clampSessionSize", () => {
  it("keeps the size within limits", () => {
    expect(clampSessionSize(2)).toBe(5);
    expect(clampSessionSize(50)).toBe(20);
    expect(clampSessionSize(Number.NaN)).toBe(10);
  });
});
