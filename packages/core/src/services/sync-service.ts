import { mergeStates } from "../domain/merge";
import { RemoteError, type RemoteProgressSource } from "../persistence/remote-progress";
import type { KeyValueStorage } from "../persistence/storage";
import type { SyncTriggers } from "../platform";
import type { AuthService, AuthUser } from "./auth";
import type { ProgressStore } from "./progress-store";

export type SyncStatus = "disabled" | "idle" | "syncing" | "offline" | "error";

export interface SyncSnapshot {
  status: SyncStatus;
  lastSyncedAt: string | null;
  /** User-facing reason when `status` is `error`. */
  error: string | null;
}

export const SYNC_KEY = "lexi:sync";
const RETRY_DELAYS_MS = [5_000, 15_000, 60_000, 300_000];
const PERIODIC_MS = 5 * 60_000;
const LOCAL_CHANGE_DELAY_MS = 3_000;

interface Ownership {
  ownerId: string | null;
  lastSyncedAt: string | null;
}

export interface SyncOptions {
  now?: () => Date;
  /** Platform connectivity (browser `navigator.onLine`, NetInfo). Defaults to "online". */
  isOnline?: () => boolean;
  /** Connection restored / app back in the foreground. Omitted in tests. */
  triggers?: SyncTriggers;
  /** Runs while still signed in, before signing out or deleting the account (daily reminder). */
  beforeSignOut?: () => Promise<void>;
}

/**
 * Keeps local progress and the account in step: pull → merge → apply locally → push.
 * Local storage stays the source the UI reads; the network never blocks practice.
 */
export class SyncService {
  private snapshot: SyncSnapshot;
  private readonly listeners = new Set<() => void>();
  private readonly cleanups: (() => void)[] = [];
  private user: AuthUser | null = null;
  private running: Promise<void> | null = null;
  private queued = false;
  private retryIndex = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private changeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly now: () => Date;
  private readonly isOnline: () => boolean;

  constructor(
    private readonly store: ProgressStore,
    private readonly remote: RemoteProgressSource,
    private readonly auth: AuthService,
    private readonly storage: KeyValueStorage,
    private readonly options: SyncOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.isOnline = options.isOnline ?? (() => true);
    this.snapshot = { status: "disabled", lastSyncedAt: this.readOwnership().lastSyncedAt, error: null };
  }

  getSnapshot = (): SyncSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start(): void {
    this.cleanups.push(this.auth.subscribe(() => this.onAuthChange()));
    this.cleanups.push(this.store.subscribeLocalChanges(() => this.onLocalChange()));

    const { triggers } = this.options;
    if (triggers) {
      this.cleanups.push(triggers.subscribe(() => void this.syncNow()));
      const periodic = setInterval(() => void this.syncNow(), PERIODIC_MS);
      this.cleanups.push(() => clearInterval(periodic));
    }
    this.onAuthChange();
  }

  stop(): void {
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.clearTimers();
  }

  /** Runs a sync now (or right after the one in progress). */
  syncNow(): Promise<void> {
    if (!this.user) return Promise.resolve();
    if (this.running) {
      this.queued = true;
      return this.running;
    }
    this.running = this.run().finally(() => {
      this.running = null;
      if (this.queued) {
        this.queued = false;
        void this.syncNow();
      }
    });
    return this.running;
  }

  /** Uploads pending changes if possible, signs out and forgets this device's progress. */
  async signOut(): Promise<{ ok: boolean; message?: string }> {
    if (this.user && this.isOnline()) await this.syncNow();
    await this.options.beforeSignOut?.().catch(() => undefined);
    const result = await this.auth.signOut();
    if (!result.ok) return { ok: false, message: result.message };
    this.forgetDevice();
    return { ok: true };
  }

  async deleteAccount(): Promise<{ ok: boolean; message?: string }> {
    await this.options.beforeSignOut?.().catch(() => undefined);
    const result = await this.auth.deleteAccount();
    if (!result.ok) return { ok: false, message: result.message };
    this.forgetDevice();
    return { ok: true };
  }

  private forgetDevice(): void {
    this.user = null;
    this.clearTimers();
    this.store.clearLocal();
    this.writeOwnership({ ownerId: null, lastSyncedAt: null });
    this.set({ status: "disabled", lastSyncedAt: null, error: null });
  }

  private onAuthChange(): void {
    const { status, user } = this.auth.getSnapshot();
    if (status === "loading") return;
    if (status === "signed-out" || !user) {
      // Session ended elsewhere (expiry, another tab): keep the data, stop syncing.
      this.user = null;
      this.clearTimers();
      this.set({ ...this.snapshot, status: "disabled", error: null });
      return;
    }
    if (this.user?.id === user.id) return;

    this.user = user;
    const owner = this.readOwnership();
    if (owner.ownerId && owner.ownerId !== user.id) {
      // Progress of another account on this device: never mix accounts.
      this.store.clearLocal();
    }
    // Progress without owner (used without an account) is merged into this account.
    this.writeOwnership({ ownerId: user.id, lastSyncedAt: owner.ownerId === user.id ? owner.lastSyncedAt : null });
    this.set({ status: "idle", lastSyncedAt: owner.ownerId === user.id ? owner.lastSyncedAt : null, error: null });
    void this.syncNow();
  }

  private onLocalChange(): void {
    if (!this.user) return;
    if (this.changeTimer) clearTimeout(this.changeTimer);
    this.changeTimer = setTimeout(() => {
      this.changeTimer = null;
      void this.syncNow();
    }, LOCAL_CHANGE_DELAY_MS);
  }

  private async run(): Promise<void> {
    const userId = this.user?.id;
    if (!userId) return;
    if (!this.isOnline()) {
      this.set({ ...this.snapshot, status: "offline", error: null });
      return;
    }
    this.set({ ...this.snapshot, status: "syncing", error: null });
    try {
      const remoteState = await this.remote.pull();
      if (this.user?.id !== userId) return; // signed out meanwhile
      // Merge with the local state as it is *now*: answers given during the download count.
      const merged = mergeStates(this.store.getSnapshot().state, remoteState);
      this.store.replaceState(merged);
      await this.remote.push(merged);
      if (this.user?.id !== userId) return;

      const lastSyncedAt = this.now().toISOString();
      this.retryIndex = 0;
      this.writeOwnership({ ownerId: userId, lastSyncedAt });
      this.set({ status: "idle", lastSyncedAt, error: null });
    } catch (error) {
      const kind = error instanceof RemoteError ? error.kind : "unknown";
      if (kind === "auth") {
        this.set({ ...this.snapshot, status: "error", error: "Tu sesión caducó. Vuelve a iniciar sesión." });
        return;
      }
      this.set({
        ...this.snapshot,
        status: kind === "network" ? "offline" : "error",
        error: kind === "network" ? null : "No se pudo sincronizar. Lo volveremos a intentar.",
      });
      this.scheduleRetry();
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const delay = RETRY_DELAYS_MS[Math.min(this.retryIndex, RETRY_DELAYS_MS.length - 1)];
    this.retryIndex += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.syncNow();
    }, delay);
  }

  private clearTimers(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.changeTimer) clearTimeout(this.changeTimer);
    this.retryTimer = null;
    this.changeTimer = null;
    this.retryIndex = 0;
  }

  private readOwnership(): Ownership {
    try {
      const raw = this.storage.getItem(SYNC_KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<Ownership>) : {};
      return {
        ownerId: typeof parsed.ownerId === "string" ? parsed.ownerId : null,
        lastSyncedAt: typeof parsed.lastSyncedAt === "string" ? parsed.lastSyncedAt : null,
      };
    } catch {
      return { ownerId: null, lastSyncedAt: null };
    }
  }

  private writeOwnership(value: Ownership): void {
    try {
      this.storage.setItem(SYNC_KEY, JSON.stringify(value));
    } catch {
      // Without storage, ownership lives only in memory for this visit.
    }
  }

  private set(next: SyncSnapshot): void {
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
}
