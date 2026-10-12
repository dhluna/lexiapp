import { isCategoryId } from "@/data/categories";
import { isDayKey } from "@/domain/dates";
import {
  clampSessionSize,
  clampSpeechRate,
  createEmptyState,
  DEFAULT_PREFERENCES,
  EPOCH,
  MAX_STORED_SESSIONS,
} from "@/domain/progress";
import type { SessionRecord, UserProgressState, WordProgress } from "@/domain/types";

export const CURRENT_VERSION = 4;

type UnknownRecord = Record<string, unknown>;

/**
 * Migrations keyed by the version they upgrade FROM. When v2 arrives:
 * `1: (s) => ({ ...s, version: 2, newField: default })`.
 */
export const MIGRATIONS: Record<number, (state: UnknownRecord) => UnknownRecord> = {
  // v2 adds automatic pronunciation in practice, on by default.
  1: (state) => ({
    ...state,
    version: 2,
    preferences: { ...(isRecord(state.preferences) ? state.preferences : {}), autoPronounce: true },
  }),
  // v3 moves the speed options to 0.8 / 1 / 1.2 (1 = native speed, cleanest audio).
  2: (state) => {
    const preferences = isRecord(state.preferences) ? state.preferences : {};
    const old = preferences.speechRate;
    const mapped = old === 0.7 ? 0.8 : old === 0.9 ? 1 : old === 1.1 ? 1.2 : old;
    return { ...state, version: 3, preferences: { ...preferences, speechRate: mapped } };
  },
  // v4 records deletions and preference dates so progress can sync between devices.
  3: (state) => ({
    ...state,
    version: 4,
    removedWords: {},
    resetAt: null,
    preferencesUpdatedAt: EPOCH,
  }),
};

export class UnsupportedVersionError extends Error {
  constructor(readonly found: unknown) {
    super(`Unsupported progress version: ${String(found)}`);
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isIso = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

const count = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;

function sanitizeWordProgress(value: unknown): WordProgress | null {
  if (!isRecord(value)) return null;
  if (value.status !== "learned" && value.status !== "review") return null;
  const fallback = [value.updatedAt, value.lastReviewedAt, value.firstSeenAt].find(isIso);
  if (!fallback) return null;
  return {
    status: value.status,
    timesSeen: count(value.timesSeen),
    timesLearned: count(value.timesLearned),
    timesReview: count(value.timesReview),
    firstSeenAt: isIso(value.firstSeenAt) ? value.firstSeenAt : fallback,
    lastReviewedAt: isIso(value.lastReviewedAt) ? value.lastReviewedAt : fallback,
    updatedAt: isIso(value.updatedAt) ? value.updatedAt : fallback,
  };
}

function sanitizeSession(value: unknown): SessionRecord | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || !isIso(value.completedAt) || !isDayKey(value.day)) {
    return null;
  }
  return {
    id: value.id,
    startedAt: isIso(value.startedAt) ? value.startedAt : value.completedAt,
    completedAt: value.completedAt,
    day: value.day,
    categoryId: isCategoryId(value.categoryId) ? value.categoryId : null,
    total: count(value.total),
    learned: count(value.learned),
    review: count(value.review),
  };
}

/** Normalizes field by field: one broken entry never discards the whole document. */
export function sanitizeState(raw: UnknownRecord, now: Date): UserProgressState {
  const state = createEmptyState(now, CURRENT_VERSION);

  if (isIso(raw.updatedAt)) state.updatedAt = raw.updatedAt;

  if (isRecord(raw.words)) {
    for (const [id, value] of Object.entries(raw.words)) {
      const progress = sanitizeWordProgress(value);
      if (progress) state.words[id] = progress;
    }
  }

  if (Array.isArray(raw.practiceDays)) {
    state.practiceDays = [...new Set(raw.practiceDays.filter(isDayKey))].sort();
  }

  if (Array.isArray(raw.sessions)) {
    state.sessions = raw.sessions
      .map(sanitizeSession)
      .filter((s): s is SessionRecord => s !== null)
      .slice(-MAX_STORED_SESSIONS);
  }

  if (isRecord(raw.preferences)) {
    const { sessionSize, speechRate, autoPronounce } = raw.preferences;
    state.preferences = {
      sessionSize:
        typeof sessionSize === "number" ? clampSessionSize(sessionSize) : DEFAULT_PREFERENCES.sessionSize,
      speechRate:
        typeof speechRate === "number" ? clampSpeechRate(speechRate) : DEFAULT_PREFERENCES.speechRate,
      autoPronounce:
        typeof autoPronounce === "boolean" ? autoPronounce : DEFAULT_PREFERENCES.autoPronounce,
    };
  }

  if (isIso(raw.preferencesUpdatedAt)) state.preferencesUpdatedAt = raw.preferencesUpdatedAt;
  if (isIso(raw.resetAt)) state.resetAt = raw.resetAt;
  if (isRecord(raw.removedWords)) {
    for (const [id, at] of Object.entries(raw.removedWords)) {
      if (isIso(at)) state.removedWords[id] = at;
    }
  }

  return state;
}

/** Parses a stored document, applying migrations. Throws on corrupt or future data. */
export function parseState(
  serialized: string,
  now: Date,
  { migrations = MIGRATIONS, targetVersion = CURRENT_VERSION } = {},
): UserProgressState {
  const parsed: unknown = JSON.parse(serialized);
  if (!isRecord(parsed)) throw new SyntaxError("Progress document is not an object");

  let doc = parsed;
  const found = doc.version;
  if (typeof found !== "number" || !Number.isInteger(found) || found < 1) {
    throw new UnsupportedVersionError(found);
  }
  let version: number = found;
  if (version > targetVersion) throw new UnsupportedVersionError(version);

  while (version < targetVersion) {
    const migrate = migrations[version];
    if (!migrate) throw new UnsupportedVersionError(version);
    doc = migrate(doc);
    if (typeof doc.version !== "number" || doc.version <= version) {
      throw new UnsupportedVersionError(doc.version);
    }
    version = doc.version;
  }

  return sanitizeState(doc, now);
}
