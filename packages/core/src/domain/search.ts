import type { LearningStatus, PackId, UserProgressState, Word } from "./types";
import { getWordStatus } from "./progress";

/** Lowercase without accents, so "cancion" finds "canción". */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export interface WordFilter {
  query?: string;
  packId?: PackId | null;
  status?: LearningStatus | null;
}

export function filterWords(
  catalog: readonly Word[],
  state: UserProgressState | null,
  { query = "", packId = null, status = null }: WordFilter,
): Word[] {
  const needle = normalizeText(query);
  const results = catalog.filter((word) => {
    if (packId && word.pack !== packId) return false;
    if (status && getWordStatus(state, word.id) !== status) return false;
    if (!needle) return true;
    return (
      normalizeText(word.term).includes(needle) ||
      normalizeText(word.translation).includes(needle)
    );
  });

  if (!needle) return results;
  // Exact and prefix matches on the English term first.
  const rank = (word: Word) => {
    const term = normalizeText(word.term);
    const translation = normalizeText(word.translation);
    if (term === needle || translation === needle) return 0;
    if (term.startsWith(needle) || translation.startsWith(needle)) return 1;
    return 2;
  };
  return [...results].sort((a, b) => rank(a) - rank(b));
}
