import { describe, expect, it } from "vitest";
import { WORDS } from "../data/catalog";
import { VOICE_SAMPLE } from "../data/voices";
import { audioKey, spokenTexts } from "./audio";
import { findGap } from "./exercise";

describe("recorded audio keys", () => {
  it("are readable, stable and only depend on the exact text", () => {
    expect(audioKey("night")).toMatch(/^night-[0-9a-f]{8}$/);
    expect(audioKey("night")).toBe(audioKey("night"));
    expect(audioKey("Good night!")).toMatch(/^good-night-[0-9a-f]{8}$/);
    expect(audioKey("night")).not.toBe(audioKey("Night"));
    expect(audioKey("¿?")).toMatch(/^x-[0-9a-f]{8}$/);
  });

  it("are unique for everything the catalog can pronounce", () => {
    const texts = spokenTexts(WORDS, [VOICE_SAMPLE]);
    expect(new Set(texts.map(audioKey)).size).toBe(texts.length);
  });

  it("cover terms, examples, verb forms and the quiz answers", () => {
    const texts = new Set(spokenTexts(WORDS));
    for (const word of WORDS) {
      expect(texts.has(word.term)).toBe(true);
      for (const example of word.examples) expect(texts.has(example.en)).toBe(true);
      const gap = findGap(word);
      if (gap) expect(texts.has(gap.answer)).toBe(true);
    }
  });
});
