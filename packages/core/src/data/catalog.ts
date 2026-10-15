import type { PackId, UserProgressState, Word, WordId } from "../domain/types";
import { CORE_PACK_ID, isOptionalPackId, PACK_IDS } from "./packs";
import { emotionsWords } from "./words/emotions";
import { essentialsWords } from "./words/essentials";
import { foodWords } from "./words/food";
import { phrasalVerbsWords } from "./words/phrasal-verbs";
import { technologyWords } from "./words/technology";
import { travelWords } from "./words/travel";
import { workWords } from "./words/work";

/** Every word of every pack, active or not. */
export const WORDS: readonly Word[] = [
  ...essentialsWords,
  ...technologyWords,
  ...foodWords,
  ...workWords,
  ...travelWords,
  ...phrasalVerbsWords,
  ...emotionsWords,
];

const byId = new Map<WordId, Word>(WORDS.map((word) => [word.id, word]));

export function getWord(id: WordId): Word | undefined {
  return byId.get(id);
}

export function getWordsByPack(packId: PackId): Word[] {
  return WORDS.filter((word) => word.pack === packId);
}

/** The core pack plus the optional packs this learner added, in catalog order. */
export function activePackIds(state: UserProgressState | null): PackId[] {
  const added = new Set((state?.preferences.activePacks ?? []).filter(isOptionalPackId));
  return PACK_IDS.filter((id) => id === CORE_PACK_ID || added.has(id));
}

export function isPackActive(state: UserProgressState | null, packId: PackId): boolean {
  return activePackIds(state).includes(packId);
}

/** Words that count for practice and statistics: those of the active packs. */
export function getActiveWords(state: UserProgressState | null): Word[] {
  const active = new Set(activePackIds(state));
  return WORDS.filter((word) => active.has(word.pack));
}
