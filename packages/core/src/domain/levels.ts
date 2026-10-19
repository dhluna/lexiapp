import { getWordsByPack, WORDS } from "../data/catalog";
import { PACKS } from "../data/packs";
import type { PackId, UserProgressState, Word } from "./types";

export const POINTS_PER_WORD = 100;

export interface Level {
  /** 1-based. */
  number: number;
  name: string;
  /** Words needed to reach it. */
  words: number;
}

/** Fast at first, slower later: there is always a goal close at hand. 330 = the whole catalog. */
export const LEVELS: readonly Level[] = [
  { number: 1, name: "Recién llegado", words: 0 },
  { number: 2, name: "Básico", words: 10 },
  { number: 3, name: "Explorador", words: 25 },
  { number: 4, name: "Conversador", words: 50 },
  { number: 5, name: "Fluido", words: 100 },
  { number: 6, name: "Avanzado", words: 150 },
  { number: 7, name: "Experto", words: 225 },
  { number: 8, name: "Maestro", words: 330 },
];

/**
 * A word counts once it has been learned, even if it later went back to review: points are
 * earned, not lost. Only forgetting its progress ("Marcar como nueva", "Borrar progreso")
 * takes it away.
 */
export function isAchieved(state: UserProgressState, word: Word): boolean {
  const progress = state.words[word.id];
  return progress !== undefined && (progress.status === "learned" || progress.timesLearned > 0);
}

/** Achieved words in the whole catalog (removing a pack does not take them away). */
export function achievedCount(state: UserProgressState, catalog: readonly Word[] = WORDS): number {
  return catalog.filter((word) => isAchieved(state, word)).length;
}

export interface LevelStatus {
  level: Level;
  next: Level | null;
  achieved: number;
  points: number;
  /** null at the top level. */
  wordsToNext: number | null;
  pointsToNext: number | null;
  /** Progress from the current level to the next, 0..1 (1 at the top). */
  progress: number;
}

export function levelFor(achieved: number): LevelStatus {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i += 1) if (achieved >= LEVELS[i].words) index = i;
  const level = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const wordsToNext = next ? next.words - achieved : null;
  return {
    level,
    next,
    achieved,
    points: achieved * POINTS_PER_WORD,
    wordsToNext,
    pointsToNext: wordsToNext === null ? null : wordsToNext * POINTS_PER_WORD,
    progress: next ? (achieved - level.words) / (next.words - level.words) : 1,
  };
}

/** The level reached between two moments, if it went up. */
export function levelUp(before: number, after: number): Level | null {
  const from = levelFor(before).level;
  const to = levelFor(after).level;
  return to.number > from.number ? to : null;
}

export interface PackBadge {
  packId: PackId;
  name: string;
  achieved: number;
  total: number;
  complete: boolean;
}

/** One badge per pack, earned when every word of it has been achieved. */
export function packBadges(state: UserProgressState): PackBadge[] {
  return PACKS.map((pack) => {
    const words = getWordsByPack(pack.id);
    const achieved = words.filter((word) => isAchieved(state, word)).length;
    return { packId: pack.id, name: pack.name, achieved, total: words.length, complete: words.length > 0 && achieved === words.length };
  });
}

/** "1.600" */
export function formatPoints(points: number): string {
  return String(points).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
