import type { SupabaseClient } from "@supabase/supabase-js";
import { toDayKey } from "@/domain/dates";
import { EPOCH } from "@/domain/progress";
import type { UserProgressState } from "@/domain/types";
import { CURRENT_VERSION, sanitizeState } from "./schema";

/** Remote copy of a user's progress. Async counterpart of `ProgressRepository`. */
export interface RemoteProgressSource {
  pull(): Promise<UserProgressState>;
  push(state: UserProgressState): Promise<void>;
}

export type RemoteErrorKind = "network" | "auth" | "unknown";

export class RemoteError extends Error {
  constructor(
    readonly kind: RemoteErrorKind,
    message: string,
  ) {
    super(message);
  }
}

interface WordRow {
  word_id: string;
  status: "review" | "learned" | null;
  times_seen: number;
  times_learned: number;
  times_review: number;
  first_seen_at: string | null;
  last_reviewed_at: string | null;
  updated_at: string;
  deleted: boolean;
}

interface SessionRow {
  id: string;
  started_at: string;
  completed_at: string;
  day: string;
  category_id: string | null;
  total: number;
  learned: number;
  review: number;
}

interface SettingsRow {
  session_size: number;
  speech_rate: number;
  auto_pronounce: boolean;
  preferences_updated_at: string;
  reset_at: string | null;
}

/** Postgres returns `+00:00`; the domain uses `toISOString()`. */
const iso = (value: string | null | undefined) => (value ? new Date(value).toISOString() : null);

function classify(error: { message?: string; code?: string; status?: number } | null): RemoteError {
  const message = error?.message ?? "Error desconocido";
  if (typeof navigator !== "undefined" && navigator.onLine === false) return new RemoteError("network", message);
  if (/fetch|network|timeout/i.test(message)) return new RemoteError("network", message);
  if (error?.code === "PGRST301" || error?.code === "28000" || error?.code === "42501" || error?.status === 401) {
    return new RemoteError("auth", message);
  }
  return new RemoteError("unknown", message);
}

/** Rows → domain state, validated with the same sanitizer as local data. */
export function rowsToState(
  words: WordRow[],
  days: { day: string }[],
  sessions: SessionRow[],
  settings: SettingsRow | null,
  now: Date,
): UserProgressState {
  const raw = {
    version: CURRENT_VERSION,
    updatedAt: now.toISOString(),
    words: Object.fromEntries(
      words
        .filter((w) => !w.deleted && w.status)
        .map((w) => [
          w.word_id,
          {
            status: w.status,
            timesSeen: w.times_seen,
            timesLearned: w.times_learned,
            timesReview: w.times_review,
            firstSeenAt: iso(w.first_seen_at ?? w.updated_at),
            lastReviewedAt: iso(w.last_reviewed_at ?? w.updated_at),
            updatedAt: iso(w.updated_at),
          },
        ]),
    ),
    removedWords: Object.fromEntries(words.filter((w) => w.deleted).map((w) => [w.word_id, iso(w.updated_at)])),
    practiceDays: days.map((d) => d.day),
    sessions: sessions.map((s) => ({
      id: s.id,
      startedAt: iso(s.started_at),
      completedAt: iso(s.completed_at),
      day: s.day,
      categoryId: s.category_id,
      total: s.total,
      learned: s.learned,
      review: s.review,
    })),
    preferences: settings
      ? {
          sessionSize: settings.session_size,
          speechRate: settings.speech_rate,
          autoPronounce: settings.auto_pronounce,
        }
      : undefined,
    preferencesUpdatedAt: settings ? iso(settings.preferences_updated_at) : EPOCH,
    resetAt: settings ? iso(settings.reset_at) : null,
  };
  return sanitizeState(raw, now);
}

/** Domain state → `sync_push` payload. */
export function stateToPayload(state: UserProgressState) {
  return {
    settings: {
      session_size: state.preferences.sessionSize,
      speech_rate: state.preferences.speechRate,
      auto_pronounce: state.preferences.autoPronounce,
      preferences_updated_at: state.preferencesUpdatedAt,
      reset_at: state.resetAt,
      // Practice days are local dates: the server deletes them with this device's calendar.
      reset_day: state.resetAt ? toDayKey(new Date(state.resetAt)) : null,
    },
    words: [
      ...Object.entries(state.words).map(([wordId, p]) => ({
        word_id: wordId,
        status: p.status,
        times_seen: p.timesSeen,
        times_learned: p.timesLearned,
        times_review: p.timesReview,
        first_seen_at: p.firstSeenAt,
        last_reviewed_at: p.lastReviewedAt,
        updated_at: p.updatedAt,
        deleted: false,
      })),
      ...Object.entries(state.removedWords).map(([wordId, at]) => ({
        word_id: wordId,
        status: null,
        times_seen: 0,
        times_learned: 0,
        times_review: 0,
        first_seen_at: null,
        last_reviewed_at: null,
        updated_at: at,
        deleted: true,
      })),
    ],
    days: state.practiceDays,
    sessions: state.sessions.map((s) => ({
      id: s.id,
      started_at: s.startedAt,
      completed_at: s.completedAt,
      day: s.day,
      category_id: s.categoryId,
      total: s.total,
      learned: s.learned,
      review: s.review,
    })),
  };
}

export class SupabaseRemoteProgress implements RemoteProgressSource {
  constructor(
    private readonly client: SupabaseClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async pull(): Promise<UserProgressState> {
    // RLS limits every query to the signed-in user's rows.
    const [words, days, sessions, settings] = await Promise.all([
      this.client.from("word_progress").select("*"),
      this.client.from("practice_days").select("day"),
      this.client.from("practice_sessions").select("*"),
      this.client.from("user_settings").select("*").maybeSingle(),
    ]);
    const failed = [words, days, sessions, settings].find((r) => r.error);
    if (failed?.error) throw classify(failed.error);
    return rowsToState(
      (words.data ?? []) as WordRow[],
      (days.data ?? []) as { day: string }[],
      (sessions.data ?? []) as SessionRow[],
      (settings.data ?? null) as SettingsRow | null,
      this.now(),
    );
  }

  async push(state: UserProgressState): Promise<void> {
    const { error } = await this.client.rpc("sync_push", { payload: stateToPayload(state) });
    if (error) throw classify(error);
  }
}
