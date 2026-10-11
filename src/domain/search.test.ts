import { describe, expect, it } from "vitest";
import { WORDS } from "@/data/catalog";
import { applyAnswer, createEmptyState } from "./progress";
import { filterWords, normalizeText } from "./search";

describe("filterWords", () => {
  it("normalizes accents and case", () => {
    expect(normalizeText("  Canción ")).toBe("cancion");
  });

  it("finds by English term", () => {
    const results = filterWords(WORDS, null, { query: "Deadline" });
    expect(results[0].id).toBe("business-deadline");
  });

  it("finds by Spanish translation ignoring accents", () => {
    const results = filterWords(WORDS, null, { query: "contrasena" });
    expect(results.map((w) => w.id)).toContain("technology-password");
  });

  it("ranks exact and prefix matches first", () => {
    const results = filterWords(WORDS, null, { query: "re" });
    expect(results[0].term.startsWith("re") || results[0].translation.startsWith("re")).toBe(true);
  });

  it("filters by category and status", () => {
    const state = createEmptyState(new Date(), 1);
    state.words["food-recipe"] = applyAnswer(undefined, "learned", new Date());

    const food = filterWords(WORDS, state, { categoryId: "food" });
    expect(food.every((w) => w.category === "food")).toBe(true);

    expect(filterWords(WORDS, state, { status: "learned" }).map((w) => w.id)).toEqual(["food-recipe"]);
    expect(filterWords(WORDS, state, { categoryId: "food", status: "new" })).toHaveLength(food.length - 1);
  });

  it("returns nothing for unknown words", () => {
    expect(filterWords(WORDS, null, { query: "zzzz" })).toEqual([]);
  });
});
