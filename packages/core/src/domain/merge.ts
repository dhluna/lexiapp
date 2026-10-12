import { isDayKey, toDayKey } from "./dates";
import { MAX_STORED_SESSIONS } from "./progress";
import type { SessionRecord, UserProgressState, WordId, WordProgress } from "./types";

const time = (iso: string | null | undefined) => (iso ? Date.parse(iso) : Number.NEGATIVE_INFINITY);

/** Stable text form used only to break ties, so the result never depends on argument order. */
function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
}

/** The more recent of two values by `dateOf`; ties resolved by content. */
function newest<T>(a: T | undefined, b: T | undefined, dateOf: (value: T) => string): T | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  const diff = time(dateOf(a)) - time(dateOf(b));
  if (diff !== 0) return diff > 0 ? a : b;
  return stable(a) >= stable(b) ? a : b;
}

function latestIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return time(a) >= time(b) ? a : b;
}

/**
 * Merges the progress of two devices (or a device and the account). Pure and deterministic:
 * commutative, idempotent, and nothing is dropped unless a later deletion or reset says so.
 */
export function mergeStates(a: UserProgressState, b: UserProgressState): UserProgressState {
  const resetAt = latestIso(a.resetAt, b.resetAt);
  const resetTime = time(resetAt);
  const resetDay = resetAt ? toDayKey(new Date(resetAt)) : null;

  const words: Record<WordId, WordProgress> = {};
  const removedWords: Record<WordId, string> = {};
  const ids = new Set([
    ...Object.keys(a.words),
    ...Object.keys(b.words),
    ...Object.keys(a.removedWords),
    ...Object.keys(b.removedWords),
  ]);

  for (const id of ids) {
    let word = newest(a.words[id], b.words[id], (w) => w.updatedAt);
    const removed = newest(a.removedWords[id], b.removedWords[id], (at) => at);

    if (word && time(word.updatedAt) <= resetTime) word = undefined;
    // A deletion at the same instant as an update wins: the user's last explicit action.
    if (word && removed && time(removed) >= time(word.updatedAt)) word = undefined;

    if (word) words[id] = word;
    else if (removed && time(removed) > resetTime) removedWords[id] = removed;
  }

  const practiceDays = [...new Set([...a.practiceDays, ...b.practiceDays])]
    .filter((day) => isDayKey(day) && (resetDay === null || day >= resetDay))
    .sort();

  const sessionsById = new Map<string, SessionRecord>();
  for (const session of [...a.sessions, ...b.sessions]) {
    sessionsById.set(session.id, newest(sessionsById.get(session.id), session, (s) => s.completedAt)!);
  }
  const sessions = [...sessionsById.values()]
    .filter((s) => time(s.completedAt) > resetTime)
    .sort((x, y) => time(x.completedAt) - time(y.completedAt) || x.id.localeCompare(y.id))
    .slice(-MAX_STORED_SESSIONS);

  // Preferences travel as a block. On a date tie, decide by their content, not by side.
  const preferencesDiff = time(a.preferencesUpdatedAt) - time(b.preferencesUpdatedAt);
  const preferencesWinner =
    preferencesDiff !== 0
      ? preferencesDiff > 0
        ? a
        : b
      : stable(a.preferences) >= stable(b.preferences)
        ? a
        : b;

  return {
    version: Math.max(a.version, b.version),
    updatedAt: latestIso(a.updatedAt, b.updatedAt) ?? a.updatedAt,
    words,
    removedWords,
    practiceDays,
    sessions,
    preferences: { ...preferencesWinner.preferences },
    preferencesUpdatedAt: preferencesWinner.preferencesUpdatedAt,
    resetAt,
  };
}
