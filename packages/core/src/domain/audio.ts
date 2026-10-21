import { findGap } from "./exercise";
import type { Word } from "./types";

/** 32-bit FNV-1a, as 8 hex digits: pure and the same on every platform. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * File name (without extension) of the recording of `text`: a readable slug plus a hash of the
 * exact text. Used by `scripts/generate-audio.ts` and the web alike.
 */
export function audioKey(text: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return `${slug || "x"}-${fnv1a(text.trim())}`;
}

/** Everything the apps can pronounce for these words: terms, examples, verb forms and quiz answers. */
export function spokenTexts(words: readonly Word[], extra: readonly string[] = []): string[] {
  const texts = new Set<string>(extra);
  for (const word of words) {
    texts.add(word.term);
    for (const example of word.examples) texts.add(example.en);
    if (word.verbForms) {
      for (const form of [word.verbForms.past, word.verbForms.pastParticiple]) {
        for (const variant of form.split(" / ")) texts.add(variant.trim());
      }
    }
    const gap = findGap(word);
    if (gap) texts.add(gap.answer);
  }
  return [...new Set([...texts].map((t) => t.trim()).filter(Boolean))];
}
