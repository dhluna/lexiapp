/** Approximate visual width in "average letters": m/w are wide, i/l/t/f/r/j narrow. */
export function visualLength(word: string): number {
  let units = 0;
  for (const ch of word) units += "mw".includes(ch) ? 1.4 : "il".includes(ch) ? 0.5 : "tfrj".includes(ch) ? 0.65 : 1;
  return units;
}

/**
 * Size step for the term so long words fit next to the audio button on a 375 pt phone
 * without breaking mid-word (thresholds measured with the display font for all 88 words).
 */
export function termScale(term: string): "lg" | "md" | "sm" {
  const longest = Math.max(...term.split(" ").map(visualLength));
  if (longest > 12.5) return "sm";
  if (longest > 8.2) return "md";
  return "lg";
}
