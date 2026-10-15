import { describe, expect, it } from "vitest";
import { toDayKey } from "../domain/dates";
import { applyAnswer, createEmptyState } from "../domain/progress";
import { authErrorMessage, safeNextPath } from "../services/auth";
import { rowsToState, stateToPayload } from "./remote-progress";
import { CURRENT_VERSION } from "./schema";

const now = new Date("2026-10-11T12:00:00Z");

describe("remote rows ⇄ domain", () => {
  it("round-trips a full state through the sync_push payload and back", () => {
    const state = {
      ...createEmptyState(now, CURRENT_VERSION),
      words: {
        "travel-fly": applyAnswer(undefined, "learned", new Date("2026-10-10T09:00:00Z")),
        "essentials-eat": applyAnswer(undefined, "review", new Date("2026-10-10T10:00:00Z")),
      },
      removedWords: { "essentials-sleep": "2026-10-09T08:00:00.000Z" },
      practiceDays: ["2026-10-09", "2026-10-10"],
      sessions: [
        {
          id: "s-1",
          startedAt: "2026-10-10T08:55:00.000Z",
          completedAt: "2026-10-10T09:05:00.000Z",
          day: "2026-10-10",
          packId: "travel" as const,
          total: 10,
          learned: 6,
          review: 4,
        },
      ],
      preferences: { sessionSize: 15, speechRate: 0.8, autoPronounce: false, activePacks: ["travel" as const, "emotions" as const] },
      preferencesUpdatedAt: "2026-10-08T00:00:00.000Z",
      resetAt: "2026-10-01T00:00:00.000Z",
    };

    const payload = stateToPayload(state);
    // The reset day is a *local* date (00:00 UTC is still Sept 30 in America).
    expect(payload.settings.reset_day).toBe(toDayKey(new Date(state.resetAt)));
    expect(payload.words.find((w) => w.word_id === "essentials-sleep")).toMatchObject({ deleted: true, status: null });

    // Simulate what Postgres returns: same values, "+00:00" timestamps, day as date text.
    const pg = (iso: string | null) => (iso ? iso.replace(".000Z", "+00:00").replace("Z", "+00:00") : null);
    const back = rowsToState(
      payload.words.map((w) => ({
        ...w,
        first_seen_at: pg(w.first_seen_at),
        last_reviewed_at: pg(w.last_reviewed_at),
        updated_at: pg(w.updated_at)!,
      })),
      payload.days.map((day) => ({ day })),
      payload.sessions.map((s) => ({ ...s, started_at: pg(s.started_at)!, completed_at: pg(s.completed_at)! })),
      {
        session_size: payload.settings.session_size,
        speech_rate: payload.settings.speech_rate,
        auto_pronounce: payload.settings.auto_pronounce,
        active_packs: payload.settings.active_packs,
        preferences_updated_at: pg(payload.settings.preferences_updated_at)!,
        reset_at: pg(payload.settings.reset_at),
      },
      now,
    );

    expect(back.words).toEqual(state.words);
    expect(back.removedWords).toEqual(state.removedWords);
    expect(back.practiceDays).toEqual(state.practiceDays);
    expect(back.sessions).toEqual(state.sessions);
    expect(back.preferences).toEqual(state.preferences);
    expect(back.preferencesUpdatedAt).toBe(state.preferencesUpdatedAt);
    expect(back.resetAt).toBe(state.resetAt);
  });

  it("treats a new account (no rows) as empty progress with default preferences that never win", () => {
    const empty = rowsToState([], [], [], null, now);
    expect(empty.words).toEqual({});
    expect(empty.preferencesUpdatedAt).toBe("1970-01-01T00:00:00.000Z");
    expect(empty.resetAt).toBeNull();
  });

  it("reads accounts from before migration 0002 (no active_packs column) as no packs added", () => {
    const settings = {
      session_size: 10,
      speech_rate: 1,
      auto_pronounce: true,
      preferences_updated_at: "2026-10-08T00:00:00+00:00",
      reset_at: null,
    };
    expect(rowsToState([], [], [], settings, now).preferences.activePacks).toEqual([]);
  });

  it("drops invalid remote rows instead of breaking the app", () => {
    const state = rowsToState(
      [
        {
          word_id: "x",
          status: "mastered" as never,
          times_seen: 1,
          times_learned: 0,
          times_review: 0,
          first_seen_at: null,
          last_reviewed_at: null,
          updated_at: "2026-10-10T00:00:00+00:00",
          deleted: false,
        },
      ],
      [{ day: "not-a-day" }],
      [],
      null,
      now,
    );
    expect(state.words).toEqual({});
    expect(state.practiceDays).toEqual([]);
  });
});

describe("auth helpers", () => {
  it("translates Supabase errors into Spanish messages", () => {
    expect(authErrorMessage({ message: "x", code: "invalid_credentials" })).toBe(
      "El email o la contraseña no son correctos.",
    );
    expect(authErrorMessage({ message: "TypeError: Failed to fetch" })).toMatch(/No hay conexión/);
    expect(authErrorMessage({ message: "something odd", code: "teapot" })).toBe(
      "No se pudo completar la operación. Inténtalo de nuevo.",
    );
  });

  it("only allows same-site paths after signing in", () => {
    expect(safeNextPath("/practicar")).toBe("/practicar");
    expect(safeNextPath("https://evil.example")).toBe("/ajustes");
    expect(safeNextPath("//evil.example")).toBe("/ajustes");
    expect(safeNextPath("/\\evil.example")).toBe("/ajustes");
    expect(safeNextPath(null)).toBe("/ajustes");
  });
});
