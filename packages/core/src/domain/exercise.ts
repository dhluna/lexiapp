import { shuffle } from "./random";
import { normalizeText } from "./search";
import type { PackId, UserProgressState, Word, WordId } from "./types";

/**
 * "Ponerme a prueba" exercises: the learner proves they know a word by writing it.
 * - dictation: Lexi says the word, the learner types it.
 * - gap: an example sentence with the word blanked out (the exact form used there).
 */
export type Exercise =
  | { kind: "dictation"; answer: string }
  | { kind: "gap"; before: string; answer: string; after: string; translation: string };

export type ExerciseResult = "correct" | "almost" | "wrong";

export interface ExerciseCheck {
  result: ExerciseResult;
  /** Shown with the result: the right spelling, or the form this sentence uses. */
  note?: string;
}

/** Irregular plurals that appear in the catalog's examples. */
const IRREGULAR_PLURALS: Record<string, string> = {
  man: "men",
  woman: "women",
  child: "children",
  person: "people",
  life: "lives",
};

const CONSONANT = /[bcdfghjklmnpqrstvwxz]$/;

/** Regular inflections of a single word: -s, -es, -ies, -ed, -d, -ied, -ing and doubled consonants. */
function inflections(word: string): string[] {
  const forms = new Set([word, `${word}s`, `${word}ed`, `${word}ing`]);
  if (/(s|x|z|ch|sh|o)$/.test(word)) forms.add(`${word}es`);
  // Very short words ("be", "do") take only -s/-es/-ing: "bed" or "bing" would be other words.
  if (word.endsWith("e") && word.length > 2) forms.add(`${word}d`);
  if (word.endsWith("y")) {
    forms.add(`${word.slice(0, -1)}ies`);
    forms.add(`${word.slice(0, -1)}ied`);
  }
  if (word.endsWith("e") && word.length > 2) forms.add(`${word.slice(0, -1)}ing`);
  if (CONSONANT.test(word)) {
    const last = word.at(-1);
    forms.add(`${word}${last}ed`);
    forms.add(`${word}${last}ing`);
  }
  const plural = IRREGULAR_PLURALS[word];
  if (plural) forms.add(plural);
  return [...forms];
}

/** Every form of a word that may appear in its examples, longest first. */
export function wordForms(word: Word): string[] {
  const term = word.term.toLowerCase();
  const [head, ...rest] = term.split(" ");
  const tail = rest.length > 0 ? ` ${rest.join(" ")}` : "";
  const forms = new Set<string>(inflections(head).map((f) => f + tail));
  if (word.verbForms) {
    for (const form of [word.verbForms.past, word.verbForms.pastParticiple]) {
      for (const variant of form.split(" / ")) forms.add(variant.trim().toLowerCase());
    }
  }
  return [...forms].sort((a, b) => b.length - a.length);
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The first example where the word (in one of its forms) can be blanked out cleanly: a
 * whole-word match that does not appear a second time in the sentence.
 */
export function findGap(word: Word): Extract<Exercise, { kind: "gap" }> | null {
  const forms = wordForms(word);
  for (const example of word.examples) {
    for (const form of forms) {
      const pattern = new RegExp(`(^|[^A-Za-z'’])(${escape(form)})(?=$|[^A-Za-z'’])`, "i");
      const match = pattern.exec(example.en);
      if (!match) continue;
      const start = match.index + match[1].length;
      const answer = example.en.slice(start, start + form.length);
      const before = example.en.slice(0, start);
      const after = example.en.slice(start + form.length);
      // The rest of the sentence must not give the answer away.
      const leftover = `${before} ${after}`.toLowerCase();
      if (forms.some((f) => new RegExp(`(^|[^a-z])${escape(f)}($|[^a-z])`).test(leftover))) break;
      return { kind: "gap", before, answer, after, translation: example.es };
    }
  }
  return null;
}

/** Dictation or a gap sentence, at random; dictation when no example has a clean gap. */
export function chooseExercise(word: Word, random: () => number = Math.random): Exercise {
  const gap = findGap(word);
  if (gap && random() < 0.5) return gap;
  return { kind: "dictation", answer: word.term };
}

/** Lowercase, no accents, straight apostrophes and single spaces. */
function normalizeAnswer(value: string): string {
  return normalizeText(value).replace(/[’‘`]/g, "'").replace(/\s+/g, " ");
}

/** Edit distance, stopping early once it is clearly above 1. */
function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * Tolerant check: case, accents and spacing are ignored; one wrong letter (in answers of
 * four letters or more) still counts, with a note; in a gap, the base form counts too.
 */
export function checkAnswer(input: string, exercise: Exercise, baseTerm: string): ExerciseCheck {
  const given = normalizeAnswer(input);
  const expected = normalizeAnswer(exercise.answer);
  if (given === "") return { result: "wrong" };
  if (given === expected) return { result: "correct" };
  if (exercise.kind === "gap" && given === normalizeAnswer(baseTerm)) {
    return { result: "correct", note: `En esta frase va «${exercise.answer}».` };
  }
  if (expected.length >= 4 && distance(given, expected) <= 1) {
    return { result: "almost", note: `Casi: se escribe «${exercise.answer}».` };
  }
  return { result: "wrong" };
}

/** Number of words in an answer, as a hint for dictation ("2 palabras"). */
export function wordCount(answer: string): number {
  return answer.trim().split(/\s+/).length;
}

export interface QuizOptions {
  size: number;
  packId?: PackId | null;
  /** Returns a number in [0, 1). Injected for deterministic tests. */
  random?: () => number;
}

/**
 * Words to test: only the learned ones (the quiz checks what the learner claims to know), from
 * the given catalog (the active packs) or one pack of it, in random order. The quiz does not
 * change progress, so ordering by last review would always pick the same words.
 */
export function selectQuizWords(
  catalog: readonly Word[],
  state: UserProgressState,
  { size, packId = null, random = Math.random }: QuizOptions,
): WordId[] {
  const pool = packId ? catalog.filter((w) => w.pack === packId) : catalog;
  const learned = pool.filter((w) => state.words[w.id]?.status === "learned");
  return shuffle(learned, random)
    .slice(0, size)
    .map((w) => w.id);
}
