import type { SessionSummary } from "./session";

/** How a finished session is celebrated. */
export type Celebration = "none" | "normal" | "perfect";

/**
 * No celebration if nothing was answered; "perfect" when every word was learned (the same
 * rule as the "Todas aprendidas" title); otherwise the normal one.
 */
export function celebrationFor(summary: SessionSummary): Celebration {
  const answered = summary.learned.length + summary.review.length;
  if (answered === 0) return "none";
  return summary.learned.length === summary.total ? "perfect" : "normal";
}

/** One note of the celebration chime. Times in seconds, gain in [0, 1]. */
export interface ChimeNote {
  frequency: number;
  start: number;
  duration: number;
  gain: number;
}

const C6 = 1046.5;
const E6 = 1318.51;
const G6 = 1567.98;
const C7 = 2093.0;
const E7 = 2637.02;

const ARPEGGIO: ChimeNote[] = [
  { frequency: C6, start: 0, duration: 0.5, gain: 0.5 },
  { frequency: E6, start: 0.09, duration: 0.5, gain: 0.5 },
  { frequency: G6, start: 0.18, duration: 0.55, gain: 0.55 },
  { frequency: C7, start: 0.27, duration: 0.8, gain: 0.6 },
];

/**
 * The bright arpeggio (C6–E6–G6–C7) and, for a perfect session, a sparkling chord on top.
 * Pure data: the web synthesizes it with Web Audio and the mobile WAVs are rendered from it.
 */
export const CHIME: Record<Exclude<Celebration, "none">, readonly ChimeNote[]> = {
  normal: ARPEGGIO,
  perfect: [
    ...ARPEGGIO,
    { frequency: G6, start: 0.5, duration: 1.1, gain: 0.35 },
    { frequency: C7, start: 0.5, duration: 1.1, gain: 0.35 },
    { frequency: E7, start: 0.5, duration: 1.1, gain: 0.4 },
  ],
};

/** Total length of a chime, in seconds. */
export function chimeLength(notes: readonly ChimeNote[]): number {
  return Math.max(...notes.map((n) => n.start + n.duration));
}
