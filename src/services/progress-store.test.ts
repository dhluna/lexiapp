import { describe, expect, it, vi } from "vitest";
import { createSession, answerCurrent } from "@/domain/session";
import { LocalStorageProgressRepository } from "@/persistence/progress-repository";
import { MemoryStorage } from "@/persistence/storage";
import { ProgressStore } from "./progress-store";

function setup(start = "2026-10-10T09:00:00") {
  let current = new Date(start);
  const storage = new MemoryStorage();
  const clock = () => current;
  const make = () => new ProgressStore(new LocalStorageProgressRepository(storage, clock), clock);
  return {
    storage,
    store: make(),
    /** A new store over the same storage, like reloading the page. */
    reload: make,
    setNow: (iso: string) => {
      current = new Date(iso);
    },
  };
}

describe("ProgressStore", () => {
  it("persists every answer immediately", () => {
    const { store, reload } = setup();
    store.recordAnswer("travel-luggage", "learned");
    store.recordAnswer("food-eat", "review");

    const state = reload().getSnapshot().state;
    expect(state.words["travel-luggage"].status).toBe("learned");
    expect(state.words["food-eat"].status).toBe("review");
    expect(state.practiceDays).toEqual(["2026-10-10"]);
  });

  it("counts several sessions on the same day as one practice day", () => {
    const { store, setNow } = setup();
    store.recordAnswer("travel-luggage", "learned");
    setNow("2026-10-10T21:00:00");
    store.recordAnswer("food-eat", "learned");
    setNow("2026-10-11T08:00:00");
    store.recordAnswer("food-raw", "learned");
    expect(store.getSnapshot().state.practiceDays).toEqual(["2026-10-10", "2026-10-11"]);
  });

  it("records a completed session once", () => {
    const { store, reload } = setup();
    let session = createSession(["travel-luggage", "food-eat"], new Date());
    session = answerCurrent(answerCurrent(session, "learned"), "review");
    store.completeSession(session);
    store.completeSession(session);
    const sessions = reload().getSnapshot().state.sessions;
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ total: 2, learned: 1, review: 1, day: "2026-10-10" });
  });

  it("ignores unfinished sessions", () => {
    const { store } = setup();
    store.completeSession(createSession(["travel-luggage"], new Date()));
    expect(store.getSnapshot().state.sessions).toEqual([]);
  });

  it("changes status manually without counting a practice day", () => {
    const { store } = setup();
    store.setWordStatus("travel-luggage", "learned");
    expect(store.getSnapshot().state.words["travel-luggage"].status).toBe("learned");
    expect(store.getSnapshot().state.practiceDays).toEqual([]);
    store.setWordStatus("travel-luggage", "new");
    expect(store.getSnapshot().state.words["travel-luggage"]).toBeUndefined();
  });

  it("clamps and persists preferences", () => {
    const { store, reload } = setup();
    store.updatePreferences({ sessionSize: 100, speechRate: 0.7, autoPronounce: false });
    expect(reload().getSnapshot().state.preferences).toEqual({
      sessionSize: 20,
      speechRate: 0.7,
      autoPronounce: false,
    });
  });

  it("resets progress but keeps preferences", () => {
    const { store } = setup();
    store.updatePreferences({ sessionSize: 5 });
    store.recordAnswer("travel-luggage", "learned");
    store.resetProgress();
    const { state } = store.getSnapshot();
    expect(state.words).toEqual({});
    expect(state.practiceDays).toEqual([]);
    expect(state.preferences.sessionSize).toBe(5);
  });

  it("notifies subscribers and exposes stable snapshots", () => {
    const { store } = setup();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const before = store.getSnapshot();
    expect(store.getSnapshot()).toBe(before);
    store.recordAnswer("travel-luggage", "learned");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).not.toBe(before);
    unsubscribe();
    store.recordAnswer("food-eat", "learned");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("flags write failures without losing the in-memory change", () => {
    const { storage, store } = setup();
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    store.recordAnswer("travel-luggage", "learned");
    const snapshot = store.getSnapshot();
    expect(snapshot.issue).toBe("write-failed");
    expect(snapshot.state.words["travel-luggage"].status).toBe("learned");
  });

  it("leaves a deletion mark when a word is reset, and clears it if answered again", () => {
    const { store, reload, setNow } = setup();
    store.recordAnswer("travel-luggage", "learned");
    setNow("2026-10-10T10:00:00");
    store.setWordStatus("travel-luggage", "new");
    let state = reload().getSnapshot().state;
    expect(state.words["travel-luggage"]).toBeUndefined();
    expect(state.removedWords["travel-luggage"]).toBe(new Date("2026-10-10T10:00:00").toISOString());

    store.recordAnswer("travel-luggage", "review");
    state = store.getSnapshot().state;
    expect(state.removedWords["travel-luggage"]).toBeUndefined();
  });

  it("dates preference changes and full resets", () => {
    const { store } = setup();
    expect(store.getSnapshot().state.preferencesUpdatedAt).toBe("1970-01-01T00:00:00.000Z");
    store.updatePreferences({ sessionSize: 15 });
    const prefsAt = store.getSnapshot().state.preferencesUpdatedAt;
    expect(prefsAt).not.toBe("1970-01-01T00:00:00.000Z");

    store.resetProgress();
    const state = store.getSnapshot().state;
    expect(state.resetAt).not.toBeNull();
    expect(state.preferencesUpdatedAt).toBe(prefsAt);
  });

  it("separates local changes from states applied by sync", () => {
    const { store } = setup();
    const local = vi.fn();
    const any = vi.fn();
    store.subscribeLocalChanges(local);
    store.subscribe(any);

    store.recordAnswer("travel-luggage", "learned");
    expect(local).toHaveBeenCalledTimes(1);

    store.replaceState({ ...store.getSnapshot().state, practiceDays: ["2026-10-01"] });
    store.clearLocal();
    expect(local).toHaveBeenCalledTimes(1);
    expect(any).toHaveBeenCalledTimes(3);
    expect(store.getSnapshot().state.words).toEqual({});
    expect(store.getSnapshot().state.resetAt).toBeNull();
  });
});
