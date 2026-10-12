import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RemoteError } from "@/persistence/remote-progress";
import { LocalStorageProgressRepository } from "@/persistence/progress-repository";
import { MemoryStorage } from "@/persistence/storage";
import { FakeAuth, FakeServer } from "@/test/fakes";
import { ProgressStore } from "./progress-store";
import { SYNC_KEY, SyncService } from "./sync-service";

const ANA = { id: "ana", email: "ana@example.com", provider: "email" as const };
const LUIS = { id: "luis", email: "luis@example.com", provider: "google" as const };

/** One device: its own storage, store and sync service, sharing the fake server. */
function device(server: FakeServer, options: { online?: () => boolean } = {}) {
  const storage = new MemoryStorage();
  const store = new ProgressStore(new LocalStorageProgressRepository(storage));
  const auth = new FakeAuth();
  const sync = new SyncService(store, server.sourceFor(() => auth.userId), auth, storage, {
    isOnline: options.online,
  });
  sync.start();
  return { storage, store, auth, sync };
}

const words = (d: { store: ProgressStore }) => d.store.getSnapshot().state.words;

describe("SyncService", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("stays disabled and never calls the server without a session", async () => {
    const server = new FakeServer();
    const d = device(server);
    d.store.recordAnswer("travel-luggage", "learned");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(d.sync.getSnapshot().status).toBe("disabled");
    expect(server.pulls + server.pushes).toBe(0);
  });

  it("merges progress made without an account into the account on sign-in", async () => {
    const server = new FakeServer();
    const phone = device(server);
    phone.auth.signIn(ANA);
    phone.store.recordAnswer("food-eat", "review");
    await phone.sync.syncNow();

    const laptop = device(server);
    laptop.store.recordAnswer("travel-luggage", "learned"); // anonymous practice
    laptop.auth.signIn(ANA);
    await laptop.sync.syncNow();

    expect(Object.keys(words(laptop)).sort()).toEqual(["food-eat", "travel-luggage"]);
    expect(Object.keys(server.stateOf("ana").words).sort()).toEqual(["food-eat", "travel-luggage"]);
    expect(JSON.parse(laptop.storage.getItem(SYNC_KEY)!).ownerId).toBe("ana");
    expect(laptop.sync.getSnapshot()).toMatchObject({ status: "idle", error: null });
  });

  it("never mixes accounts: another user's local progress is discarded", async () => {
    const server = new FakeServer();
    const d = device(server);
    d.auth.signIn(ANA);
    d.store.recordAnswer("travel-luggage", "learned");
    await d.sync.syncNow();

    d.auth.expire(); // session ends without the sign-out flow: data stays, owned by Ana
    d.auth.signIn(LUIS);
    await d.sync.syncNow();

    expect(words(d)).toEqual({});
    expect(server.stateOf("luis").words).toEqual({});
    expect(Object.keys(server.stateOf("ana").words)).toEqual(["travel-luggage"]);
  });

  it("syncs local changes after a short delay, then shows them on other devices", async () => {
    const server = new FakeServer();
    const a = device(server);
    const b = device(server);
    a.auth.signIn(ANA);
    b.auth.signIn(ANA);
    await vi.advanceTimersByTimeAsync(0);

    a.store.recordAnswer("travel-fly", "learned");
    expect(server.stateOf("ana").words["travel-fly"]).toBeUndefined();
    await vi.advanceTimersByTimeAsync(3_000);
    expect(server.stateOf("ana").words["travel-fly"]?.status).toBe("learned");

    await b.sync.syncNow();
    expect(words(b)["travel-fly"]?.status).toBe("learned");
  });

  it("does not bring back a word reset on another device", async () => {
    const server = new FakeServer();
    const a = device(server);
    const b = device(server);
    a.auth.signIn(ANA);
    a.store.recordAnswer("travel-fly", "learned");
    await a.sync.syncNow();
    b.auth.signIn(ANA);
    await b.sync.syncNow();
    expect(words(b)["travel-fly"]).toBeDefined();

    vi.setSystemTime(Date.now() + 60_000);
    b.store.setWordStatus("travel-fly", "new");
    await b.sync.syncNow();
    await a.sync.syncNow();

    expect(words(a)["travel-fly"]).toBeUndefined();
    expect(server.stateOf("ana").words["travel-fly"]).toBeUndefined();
  });

  it("waits while offline and syncs the practice done meanwhile when back online", async () => {
    const server = new FakeServer();
    let online = true;
    const d = device(server, { online: () => online });
    d.auth.signIn(ANA);
    await d.sync.syncNow();

    online = false;
    d.store.recordAnswer("health-fever", "review");
    await vi.advanceTimersByTimeAsync(3_000);
    expect(d.sync.getSnapshot().status).toBe("offline");
    expect(server.stateOf("ana").words["health-fever"]).toBeUndefined();

    online = true;
    await d.sync.syncNow(); // what the "online" event triggers
    expect(server.stateOf("ana").words["health-fever"]?.status).toBe("review");
    expect(d.sync.getSnapshot().status).toBe("idle");
  });

  it("retries network failures with a growing delay", async () => {
    const server = new FakeServer();
    const d = device(server);
    d.auth.signIn(ANA);
    await d.sync.syncNow();

    server.failNext = new RemoteError("network", "Failed to fetch");
    await d.sync.syncNow();
    expect(d.sync.getSnapshot().status).toBe("offline");

    const pulls = server.pulls;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(server.pulls).toBe(pulls + 1);
    expect(d.sync.getSnapshot().status).toBe("idle");
  });

  it("asks to sign in again when the session is rejected", async () => {
    const server = new FakeServer();
    const d = device(server);
    d.auth.signIn(ANA);
    await d.sync.syncNow();
    server.failNext = new RemoteError("auth", "JWT expired");
    await d.sync.syncNow();
    expect(d.sync.getSnapshot()).toMatchObject({
      status: "error",
      error: "Tu sesión caducó. Vuelve a iniciar sesión.",
    });
  });

  it("keeps an answer given while a sync was downloading", async () => {
    const server = new FakeServer();
    const d = device(server);
    d.auth.signIn(ANA);
    await d.sync.syncNow();

    const pending = d.sync.syncNow();
    d.store.recordAnswer("food-raw", "learned"); // during the pull
    await pending;
    await vi.advanceTimersByTimeAsync(3_000);

    expect(words(d)["food-raw"]?.status).toBe("learned");
    expect(server.stateOf("ana").words["food-raw"]?.status).toBe("learned");
  });

  it("does not loop: applying the merged state is not a local change", async () => {
    const server = new FakeServer();
    const d = device(server);
    d.auth.signIn(ANA);
    await d.sync.syncNow();
    const pushes = server.pushes;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(server.pushes).toBe(pushes);
  });

  it("uploads before signing out and then forgets the device's progress", async () => {
    const server = new FakeServer();
    const d = device(server);
    d.auth.signIn(ANA);
    d.store.recordAnswer("education-learn", "learned");

    const result = await d.sync.signOut();
    expect(result.ok).toBe(true);
    expect(server.stateOf("ana").words["education-learn"]?.status).toBe("learned");
    expect(words(d)).toEqual({});
    expect(JSON.parse(d.storage.getItem(SYNC_KEY)!).ownerId).toBeNull();
    expect(d.sync.getSnapshot().status).toBe("disabled");
  });
});
