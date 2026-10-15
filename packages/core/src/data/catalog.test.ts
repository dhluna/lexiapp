import { describe, expect, it } from "vitest";
import { activePackIds, getActiveWords, getWord, getWordsByPack, WORDS } from "./catalog";
import { CORE_PACK_ID, PACK_IDS, PACKS } from "./packs";
import { createEmptyState } from "../domain/progress";

describe("catalog", () => {
  it("has 150 essentials and at least 25 words in every other pack", () => {
    expect(getWordsByPack(CORE_PACK_ID)).toHaveLength(150);
    for (const id of PACK_IDS.filter((p) => p !== CORE_PACK_ID)) {
      expect(getWordsByPack(id).length, id).toBeGreaterThanOrEqual(25);
    }
    expect(PACKS.filter((p) => p.core).map((p) => p.id)).toEqual([CORE_PACK_ID]);
  });

  it("puts every word in an existing pack, with unique ids prefixed by the pack", () => {
    const ids = WORDS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const w of WORDS) {
      expect(PACK_IDS, w.id).toContain(w.pack);
      expect(w.id).toMatch(/^[a-z-]+$/);
      expect(w.id.startsWith(`${w.pack}-`), w.id).toBe(true);
      expect(getWord(w.id)).toBe(w);
    }
  });

  it("never repeats a term across packs", () => {
    const terms = WORDS.map((w) => w.term.toLowerCase());
    const repeated = terms.filter((t, i) => terms.indexOf(t) !== i);
    expect(repeated).toEqual([]);
  });

  it("counts only the essentials until the learner adds a pack", () => {
    const state = createEmptyState(new Date("2026-10-15T10:00:00Z"), 5);
    expect(activePackIds(state)).toEqual([CORE_PACK_ID]);
    expect(getActiveWords(state)).toHaveLength(150);

    state.preferences.activePacks = ["travel", "essentials", "unknown" as never];
    expect(activePackIds(state)).toEqual([CORE_PACK_ID, "travel"]);
    expect(getActiveWords(state).every((w) => w.pack === CORE_PACK_ID || w.pack === "travel")).toBe(true);
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
