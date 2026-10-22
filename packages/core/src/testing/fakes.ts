import { vi } from "vitest";
import { mergeStates } from "../domain/merge";
import { createEmptyState } from "../domain/progress";
import type { UserProgressState } from "../domain/types";
import { RemoteError, type RemoteProgressSource } from "../persistence/remote-progress";
import type { ReminderRemote } from "../persistence/remote-reminders";
import { CURRENT_VERSION } from "../persistence/schema";
import type { PushPlatform, PushSubscriptionData, PushSupport } from "../platform";
import type { AuthResult, AuthService, AuthSnapshot, AuthUser, SignUpResult } from "../services/auth";

/** In-memory "account": keeps one state per user, merging what devices push. */
export class FakeServer {
  private readonly states = new Map<string, UserProgressState>();
  failNext: RemoteError | null = null;
  pulls = 0;
  pushes = 0;

  stateOf(userId: string): UserProgressState {
    return this.states.get(userId) ?? createEmptyState(new Date("2026-01-01T00:00:00Z"), CURRENT_VERSION);
  }

  sourceFor(getUserId: () => string | null): RemoteProgressSource {
    return {
      pull: async () => {
        this.pulls += 1;
        this.throwIfFailing();
        return structuredClone(this.stateOf(this.requireUser(getUserId())));
      },
      push: async (state) => {
        this.pushes += 1;
        this.throwIfFailing();
        const userId = this.requireUser(getUserId());
        this.states.set(userId, mergeStates(this.stateOf(userId), structuredClone(state)));
      },
    };
  }

  private requireUser(userId: string | null): string {
    if (!userId) throw new RemoteError("auth", "not authenticated");
    return userId;
  }

  private throwIfFailing(): void {
    if (this.failNext) {
      const error = this.failNext;
      this.failNext = null;
      throw error;
    }
  }
}

/** Controllable AuthService for tests: sign in/out programmatically, spy on calls. */
export class FakeAuth implements AuthService {
  private snapshot: AuthSnapshot = { status: "signed-out", user: null };
  private readonly listeners = new Set<() => void>();
  next: AuthResult = { ok: true };
  signUpResult: SignUpResult = { ok: true, needsConfirmation: true };

  signInWithGoogle = vi.fn(async () => this.next);
  signInWithPassword = vi.fn(async (email: string) => {
    if (this.next.ok) this.signIn({ id: `user-${email}`, email, provider: "email" });
    return this.next;
  });
  signUp = vi.fn(async () => this.signUpResult);
  resendConfirmation = vi.fn(async () => this.next);
  sendPasswordReset = vi.fn(async () => this.next);
  updatePassword = vi.fn(async () => this.next);
  signOut = vi.fn(async () => {
    if (this.next.ok) this.set({ status: "signed-out", user: null });
    return this.next;
  });
  completeRedirect = vi.fn(async (url: string) => {
    const code = /[?&#](?:code|token_hash)=([^&#]+)/.exec(url)?.[1];
    if (!code) return { ok: false as const, message: "No se pudo iniciar sesión.", code: "flow_state_not_found" };
    this.signIn({ id: `user-${code}`, email: null, provider: "google" });
    return { ok: true as const };
  });
  deleteAccount = vi.fn(async () => {
    if (this.next.ok) this.set({ status: "signed-out", user: null });
    return this.next;
  });

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  ready = async () => this.snapshot;

  get userId(): string | null {
    return this.snapshot.user?.id ?? null;
  }

  signIn(user: AuthUser): void {
    this.set({ status: "signed-in", user });
  }

  expire(): void {
    this.set({ status: "signed-out", user: null });
  }

  private set(next: AuthSnapshot): void {
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
}

/** Browser push for tests: choose support and the answer to the permission prompt. */
export class FakePush implements PushPlatform {
  supportValue: PushSupport = "supported";
  permissionValue: "default" | "granted" | "denied" = "default";
  /** What the person answers when asked for permission. */
  allow = true;
  zone = "Europe/Madrid";
  subscription: PushSubscriptionData | null = null;

  support = () => this.supportValue;
  permission = () => this.permissionValue;
  current = vi.fn(async () => this.subscription);
  subscribe = vi.fn(async () => {
    if (this.permissionValue === "default") this.permissionValue = this.allow ? "granted" : "denied";
    if (this.permissionValue !== "granted") return null;
    this.subscription ??= { endpoint: "https://push.example/device", p256dh: "key", auth: "secret" };
    return this.subscription;
  });
  unsubscribe = vi.fn(async () => {
    this.subscription = null;
  });
  timeZone = () => this.zone;
}

/** Server side of the reminders for tests: devices by endpoint. */
export class FakeReminderRemote implements ReminderRemote {
  readonly devices = new Map<string, { time: string; timeZone: string }>();
  fail = false;

  register = vi.fn(async (subscription: PushSubscriptionData, time: string, timeZone: string) => {
    if (this.fail) throw new Error("network");
    this.devices.set(subscription.endpoint, { time, timeZone });
  });
  unregister = vi.fn(async (endpoint: string) => {
    if (this.fail) throw new Error("network");
    this.devices.delete(endpoint);
  });
}
