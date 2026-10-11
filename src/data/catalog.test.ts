import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_IDS } from "./categories";
import { getWord, WORDS } from "./catalog";

describe("catalog", () => {
  it("has at least 80 words", () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(80);
  });

  it("covers the 8 categories with at least 10 words each", () => {
    expect(CATEGORIES).toHaveLength(8);
    for (const id of CATEGORY_IDS) {
      expect(WORDS.filter((w) => w.category === id).length, id).toBeGreaterThanOrEqual(10);
    }
  });

  it("uses unique, stable ids prefixed by the category", () => {
    const ids = WORDS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const w of WORDS) {
      expect(w.id).toMatch(/^[a-z-]+$/);
      expect(w.id.startsWith(`${w.category}-`), w.id).toBe(true);
      expect(getWord(w.id)).toBe(w);
    }
  });

  it("documents every word completely", () => {
    for (const w of WORDS) {
      expect(w.term.trim(), w.id).not.toBe("");
      expect(w.translation.trim(), w.id).not.toBe("");
      expect(w.definition.length, w.id).toBeGreaterThan(10);
      expect(w.examples.length, w.id).toBeGreaterThanOrEqual(2);
      for (const ex of w.examples) {
        expect(ex.en.trim(), w.id).not.toBe("");
        expect(ex.es.trim(), w.id).not.toBe("");
      }
    }
  });

  it("has a well-formed IPA transcription for every word", () => {
    // Broad IPA only: no slashes, no ASCII "g" (IPA uses ɡ), no c/q/x/y.
    const allowed = /^[abdefhijklmnoprstuvwzæɑɔəɚɛɝɡɪŋθðʃʒʊʌˈˌ ]+$/;
    for (const w of WORDS) {
      expect(w.ipa, w.id).toMatch(allowed);
      // Multi-syllable single words carry a primary stress mark.
      const vowels = w.ipa.match(/(aɪ|aʊ|eɪ|oʊ|ɔɪ|[iɪuʊɛæɑɔʌəɚɝ])/g) ?? [];
      if (!w.ipa.includes(" ") && vowels.length > 1) expect(w.ipa, w.id).toContain("ˈ");
      expect(w.ipa.split("ˈ").length, w.id).toBeLessThanOrEqual(w.term.split(" ").length + 1);
    }
  });

  it("has past and past participle for every verb", () => {
    for (const w of WORDS.filter((x) => x.partOfSpeech === "verb" || x.partOfSpeech === "phrasal-verb")) {
      expect(w.verbForms, w.id).toBeDefined();
      expect(w.verbForms?.past, w.id).toBeTruthy();
      expect(w.verbForms?.pastParticiple, w.id).toBeTruthy();
    }
    for (const w of WORDS.filter((x) => x.partOfSpeech !== "verb" && x.partOfSpeech !== "phrasal-verb")) {
      expect(w.verbForms, w.id).toBeUndefined();
    }
  });

  it("marks regular verbs with -ed forms", () => {
    for (const w of WORDS) {
      if (!w.verbForms || w.verbForms.irregular) continue;
      const past = w.verbForms.past.split(" / ")[0].split(" ")[0];
      expect(past.endsWith("ed"), w.id).toBe(true);
    }
  });

  it("uses each example in at most one word", () => {
    const examples = WORDS.flatMap((w) => w.examples.map((e) => e.en));
    expect(new Set(examples).size).toBe(examples.length);
  });
});
