import { describe, expect, it } from "vitest";
import { WORDS } from "../data/catalog";
import { applyAnswer, createEmptyState } from "./progress";
import {
  answerCurrent,
  createSession,
  currentWordId,
  goNext,
  goPrevious,
  isLastWord,
  selectSessionWords,
  sessionProgress,
  summaryTitle,
  summarize,
} from "./session";

const now = new Date("2026-10-10T12:00:00Z");
const seeded = () => {
  let seed = 42;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
};

describe("selectSessionWords", () => {
  it("returns unique ids of the requested size", () => {
    const ids = selectSessionWords(WORDS, createEmptyState(now, 1), { size: 20, random: seeded() });
    expect(ids).toHaveLength(20);
    expect(new Set(ids).size).toBe(20);
  });

  it("puts review words first (oldest first), then new, then learned", () => {
    const state = createEmptyState(now, 1);
    const [r1, r2, l1] = WORDS;
    state.words[r1.id] = applyAnswer(undefined, "review", new Date("2026-10-09T00:00:00Z"));
    state.words[r2.id] = applyAnswer(undefined, "review", new Date("2026-10-01T00:00:00Z"));
    state.words[l1.id] = applyAnswer(undefined, "learned", now);

    const ids = selectSessionWords(WORDS, state, { size: 5, random: seeded() });
    expect(ids.slice(0, 2)).toEqual([r2.id, r1.id]);
    expect(ids).not.toContain(l1.id);
  });

  it("fills with learned words when nothing new is left", () => {
    const state = createEmptyState(now, 1);
    const pool = WORDS.filter((w) => w.category === "travel");
    for (const w of pool) state.words[w.id] = applyAnswer(undefined, "learned", now);
    const ids = selectSessionWords(WORDS, state, { size: 5, categoryId: "travel" });
    expect(ids).toHaveLength(5);
  });

  it("limits the session to the category pool", () => {
    const ids = selectSessionWords(WORDS, createEmptyState(now, 1), { size: 20, categoryId: "food" });
    const foodCount = WORDS.filter((w) => w.category === "food").length;
    expect(ids).toHaveLength(Math.min(20, foodCount));
    expect(ids.every((id) => id.startsWith("food-"))).toBe(true);
  });
});

describe("summaryTitle", () => {
  const sum = (learned: number, review: number, skipped: number) => ({
    total: learned + review + skipped,
    learned: Array.from({ length: learned }, (_, i) => `l${i}`),
    review: Array.from({ length: review }, (_, i) => `r${i}`),
    skipped: Array.from({ length: skipped }, (_, i) => `s${i}`),
  });

  it("says all learned only when every word was learned", () => {
    expect(summaryTitle(sum(5, 0, 0))).toBe("Todas aprendidas");
    expect(summaryTitle(sum(1, 0, 4))).toBe("Sesión completada"); // 4 left unanswered
    expect(summaryTitle(sum(3, 2, 0))).toBe("Sesión completada");
    expect(summaryTitle(sum(0, 0, 5))).toBe("Sesión terminada");
  });
});

describe("practice session", () => {
  it("walks through words without repeating and summarizes", () => {
    let s = createSession(["a", "b", "a", "c"], now);
    expect(s.wordIds).toEqual(["a", "b", "c"]);
    expect(currentWordId(s)).toBe("a");

    s = answerCurrent(s, "learned");
    expect(currentWordId(s)).toBe("b");
    s = answerCurrent(s, "review");
    expect(sessionProgress(s)).toBeCloseTo(2 / 3);
    expect(isLastWord(s)).toBe(true);
    s = goNext(s); // leaves "c" unanswered

    expect(s.finished).toBe(true);
    expect(currentWordId(s)).toBeNull();
    expect(answerCurrent(s, "learned")).toBe(s);
    expect(summarize(s)).toEqual({ total: 3, learned: ["a"], review: ["b"], skipped: ["c"] });
  });

  it("moves back and forth and lets an answer be changed", () => {
    let s = createSession(["a", "b", "c"], now);
    expect(goPrevious(s)).toBe(s);

    s = goNext(s);
    expect(currentWordId(s)).toBe("b");
    s = goPrevious(s);
    expect(currentWordId(s)).toBe("a");

    s = answerCurrent(s, "review");
    s = goPrevious(s);
    s = answerCurrent(s, "learned");
    expect(s.answers).toEqual({ a: "learned" });
    expect(currentWordId(s)).toBe("b");
  });

  it("finishes when the last word is answered, even if earlier ones were skipped", () => {
    let s = createSession(["a", "b"], now);
    s = goNext(s);
    s = answerCurrent(s, "learned");
    expect(s.finished).toBe(true);
    expect(summarize(s).skipped).toEqual(["a"]);
  });

  it("is finished immediately when empty", () => {
    expect(createSession([], now).finished).toBe(true);
  });
});
