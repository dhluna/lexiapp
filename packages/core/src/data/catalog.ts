import type { CategoryId, Word, WordId } from "../domain/types";
import { businessWords } from "./words/business";
import { communicationWords } from "./words/communication";
import { dailyLifeWords } from "./words/daily-life";
import { educationWords } from "./words/education";
import { foodWords } from "./words/food";
import { healthWords } from "./words/health";
import { technologyWords } from "./words/technology";
import { travelWords } from "./words/travel";

export const WORDS: readonly Word[] = [
  ...dailyLifeWords,
  ...businessWords,
  ...travelWords,
  ...technologyWords,
  ...healthWords,
  ...foodWords,
  ...educationWords,
  ...communicationWords,
];

const byId = new Map<WordId, Word>(WORDS.map((word) => [word.id, word]));

export function getWord(id: WordId): Word | undefined {
  return byId.get(id);
}

export function getWordsByCategory(categoryId: CategoryId): Word[] {
  return WORDS.filter((word) => word.category === categoryId);
}
