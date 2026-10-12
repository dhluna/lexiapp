import { vi } from "vitest";
import { mergeStates } from "../domain/merge";
import { createEmptyState } from "../domain/progress";
import type { UserProgressState } from "../domain/types";
import { RemoteError, type RemoteProgressSource } from "../persistence/remote-progress";
import { CURRENT_VERSION } from "../persistence/schema";
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
    const code = /[?&#]code=([^&#]+)/.exec(url)?.[1];
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
