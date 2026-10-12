import { addDays, isDayKey } from "./dates";

export interface StreakInfo {
  current: number;
  best: number;
  practicedToday: boolean;
}

/**
 * Consecutive practice days. Repeated days count once. The current streak stays
 * alive until the end of the day after the last practice.
 */
export function calculateStreak(practiceDays: readonly string[], today: string): StreakInfo {
  const days = new Set(practiceDays.filter(isDayKey).filter((day) => day <= today));
  const practicedToday = days.has(today);

  let current = 0;
  let cursor = practicedToday ? today : addDays(today, -1);
  while (days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of [...days].sort()) {
    run = previous !== null && addDays(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }

  return { current, best: Math.max(best, current), practicedToday };
}

/** Adds a day keeping the list unique and sorted. */
export function addPracticeDay(practiceDays: readonly string[], day: string): string[] {
  if (practiceDays.includes(day)) return [...practiceDays];
  return [...practiceDays, day].sort();
}
