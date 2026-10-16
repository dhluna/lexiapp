import { describe, expect, it } from "vitest";
import { getWord, WORDS } from "../data/catalog";
import { checkAnswer, chooseExercise, findGap, selectQuizWords, wordCount, wordForms, type Exercise } from "./exercise";
import { applyAnswer, createEmptyState } from "./progress";
import { createQuiz, isQuiz } from "./session";

const word = (id: string) => {
  const w = getWord(id);
  if (!w) throw new Error(`Missing ${id}`);
  return w;
};

const dictation = (answer: string): Exercise => ({ kind: "dictation", answer });

describe("findGap", () => {
  it("blanks out the exact form used in the sentence", () => {
    const gap = findGap(word("travel-flight"))!;
    expect(gap.answer.toLowerCase()).toBe("flight");
    expect(`${gap.before}_____${gap.after}`).toBe("Our _____ leaves at noon.");
    expect(gap.translation).toBe("Nuestro vuelo sale a mediodía.");
  });

  it("finds irregular past forms of phrasal verbs and irregular plurals", () => {
    const giveUp = findGap(word("phrasal-verbs-give-up"))!;
    expect(["give up", "gave up"]).toContain(giveUp.answer.toLowerCase());
    expect(findGap(word("essentials-child"))!.answer).toBe("children");
    expect(wordForms(word("essentials-be"))).not.toContain("bed");
  });

  it("skips sentences where the word appears twice", () => {
    // "What do you do on weekends?" would give the answer away.
    const gap = findGap(word("essentials-do"))!;
    expect(gap.before + gap.after).not.toMatch(/\bdo\b/i);
  });

  it("gives every word of the catalog a valid exercise", () => {
    for (const w of WORDS) {
      const gap = findGap(w);
      if (gap) {
        expect(gap.answer.trim(), w.id).not.toBe("");
        expect(`${gap.before}${gap.answer}${gap.after}`, w.id).toBe(
          w.examples.find((e) => e.es === gap.translation)!.en,
        );
      }
      const always = chooseExercise(w, () => 0);
      expect(always.kind, w.id).toBe(gap ? "gap" : "dictation");
      expect(chooseExercise(w, () => 0.9)).toEqual({ kind: "dictation", answer: w.term });
    }
    // Most words can be practiced in a sentence.
    expect(WORDS.filter((w) => findGap(w)).length / WORDS.length).toBeGreaterThan(0.8);
  });
});

describe("checkAnswer", () => {
  it("ignores case, accents, spacing and curly apostrophes", () => {
    expect(checkAnswer("  Give   UP ", dictation("give up"), "give up").result).toBe("correct");
    expect(checkAnswer("cafè", dictation("café"), "café").result).toBe("correct");
    expect(checkAnswer("I’m", dictation("I'm"), "I'm").result).toBe("correct");
  });

  it("accepts one wrong letter with a note, only in words of four letters or more", () => {
    expect(checkAnswer("pasport", dictation("passport"), "passport")).toEqual({
      result: "almost",
      note: "Casi: se escribe «passport».",
    });
    expect(checkAnswer("tame", dictation("time"), "time").result).toBe("almost");
    expect(checkAnswer("bat", dictation("bad"), "bad").result).toBe("wrong");
    expect(checkAnswer("pspt", dictation("passport"), "passport").result).toBe("wrong");
  });

  it("in a gap, accepts the base form and tells which form the sentence uses", () => {
    const gap: Exercise = { kind: "gap", before: "Two ", answer: "flights", after: " left.", translation: "" };
    expect(checkAnswer("flights", gap, "flight").result).toBe("correct");
    expect(checkAnswer("flight", gap, "flight")).toEqual({ result: "correct", note: "En esta frase va «flights»." });
  });

  it("counts an empty answer as wrong", () => {
    expect(checkAnswer("   ", dictation("time"), "time").result).toBe("wrong");
  });

  it("counts the words of an answer for the dictation hint", () => {
    expect(wordCount("look forward to")).toBe(3);
    expect(wordCount("flight")).toBe(1);
  });
});

describe("quiz sessions", () => {
  const now = new Date("2026-10-16T10:00:00Z");

  it("tests only words already seen: pending review first, then learned, oldest first", () => {
    const state = createEmptyState(now, 5);
    state.words["essentials-eat"] = applyAnswer(undefined, "learned", new Date("2026-10-01T10:00:00Z"));
    state.words["essentials-time"] = applyAnswer(undefined, "review", new Date("2026-10-10T10:00:00Z"));
    state.words["essentials-go"] = applyAnswer(undefined, "review", new Date("2026-10-05T10:00:00Z"));
    expect(selectQuizWords(WORDS, state, { size: 10 })).toEqual(["essentials-go", "essentials-time", "essentials-eat"]);
    expect(selectQuizWords(WORDS, state, { size: 2 })).toEqual(["essentials-go", "essentials-time"]);
    expect(selectQuizWords(WORDS, state, { size: 10, packId: "travel" })).toEqual([]);
  });

  it("creates a quiz with one exercise per word", () => {
    const words = [word("essentials-eat"), word("travel-flight")];
    const quiz = createQuiz(words, now, null, () => 0.9);
    expect(isQuiz(quiz)).toBe(true);
    expect(quiz.wordIds).toEqual(["essentials-eat", "travel-flight"]);
    expect(quiz.exercises?.["travel-flight"]).toEqual({ kind: "dictation", answer: "flight" });
  });
});
