import type { LearningStatus, PartOfSpeech } from "./types";

export const PART_OF_SPEECH_LABELS: Record<PartOfSpeech, string> = {
  noun: "Sustantivo",
  verb: "Verbo",
  "phrasal-verb": "Verbo frasal",
  adjective: "Adjetivo",
  adverb: "Adverbio",
};

export const STATUS_LABELS: Record<LearningStatus, string> = {
  new: "Sin practicar",
  review: "Por repasar",
  learned: "Aprendida",
};
