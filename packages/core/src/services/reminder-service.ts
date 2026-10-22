import { DEFAULT_REMINDER_TIME, isReminderTime } from "../domain/reminders";
import type { ReminderRemote } from "../persistence/remote-reminders";
import type { KeyValueStorage, PushPlatform } from "../platform";
import type { AuthService } from "./auth";

/**
 * - `on` / `off`: the daily reminder on this device.
 * - `blocked`: notifications are denied in the browser settings.
 * - `needs-install` / `unsupported`: see `PushSupport`.
 */
export type ReminderStatus = "off" | "on" | "blocked" | "needs-install" | "unsupported";

export interface ReminderSnapshot {
  status: ReminderStatus;
  /** "HH:MM", one of `REMINDER_TIMES`. */
  time: string;
}

export type ReminderResult = { ok: true } | { ok: false; message: string };

export const REMINDER_KEY = "lexi:reminder";

const SAVE_ERROR = "No se pudo guardar el recordatorio. Comprueba tu conexión e inténtalo de nuevo.";

/** What this device remembers: whose reminder is on, and at what time. */
interface Stored {
  userId: string;
  time: string;
}

/**
 * The daily reminder of this device (docs/15-recordatorios.md). Only with an account: the
 * server needs the practice days to send it, and only if that day is still to practice.
 */
export class ReminderService {
  private snapshot: ReminderSnapshot;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly push: PushPlatform,
    private readonly remote: ReminderRemote,
    private readonly auth: AuthService,
    private readonly storage: KeyValueStorage,
    private readonly vapidPublicKey: string,
  ) {
    this.snapshot = this.compute(false);
  }

  getSnapshot = (): ReminderSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Checks the device's real subscription (it may have been removed in the browser). */
  async refresh(): Promise<void> {
    let subscribed = false;
    if (this.push.support() === "supported") {
      try {
        subscribed = (await this.push.current()) !== null;
      } catch {
        subscribed = false;
      }
    }
    this.set(this.compute(subscribed));
  }

  async enable(time: string): Promise<ReminderResult> {
    const userId = this.auth.getSnapshot().user?.id;
    if (!userId || !isReminderTime(time)) return { ok: false, message: SAVE_ERROR };
    if (this.push.support() !== "supported") {
      this.set(this.compute(false));
      return { ok: false, message: "Este navegador no puede mostrar notificaciones." };
    }
    let subscription;
    try {
      subscription = await this.push.subscribe(this.vapidPublicKey);
    } catch {
      return { ok: false, message: "No se pudieron activar las notificaciones en este navegador." };
    }
    if (!subscription) {
      this.set(this.compute(false));
      return { ok: false, message: "Para recibir el recordatorio, permite las notificaciones de Lexi." };
    }
    try {
      await this.remote.register(subscription, time, this.push.timeZone());
    } catch {
      return { ok: false, message: SAVE_ERROR };
    }
    this.write({ userId, time });
    this.set({ status: "on", time });
    return { ok: true };
  }

  /** Changes the time; while off, it is only remembered for when it is turned on. */
  async setTime(time: string): Promise<ReminderResult> {
    if (!isReminderTime(time)) return { ok: false, message: SAVE_ERROR };
    if (this.snapshot.status !== "on") {
      this.set({ ...this.snapshot, time });
      return { ok: true };
    }
    return this.enable(time);
  }

  async disable(): Promise<ReminderResult> {
    try {
      const subscription = await this.push.current();
      if (subscription) await this.remote.unregister(subscription.endpoint);
    } catch {
      return { ok: false, message: SAVE_ERROR };
    }
    await this.push.unsubscribe().catch(() => undefined);
    this.write(null);
    this.set(this.compute(false));
    return { ok: true };
  }

  /** Before signing out or deleting the account: no notices for an account that is gone. */
  async forgetDevice(): Promise<void> {
    if (this.read() === null) return;
    try {
      const subscription = await this.push.current();
      if (subscription) await this.remote.unregister(subscription.endpoint);
    } catch {
      // The server removes the subscription when the push service rejects it.
    }
    await this.push.unsubscribe().catch(() => undefined);
    this.write(null);
    this.set(this.compute(false));
  }

  private compute(subscribed: boolean): ReminderSnapshot {
    const stored = this.read();
    const userId = this.auth.getSnapshot().user?.id;
    const mine = stored !== null && stored.userId === userId;
    const time = mine ? stored.time : (this.snapshot?.time ?? DEFAULT_REMINDER_TIME);
    const support = this.push.support();
    if (support !== "supported") return { status: support, time };
    if (this.push.permission() === "denied") return { status: "blocked", time };
    return { status: mine && subscribed ? "on" : "off", time };
  }

  private read(): Stored | null {
    try {
      const raw = this.storage.getItem(REMINDER_KEY);
      const value = raw ? (JSON.parse(raw) as Partial<Stored>) : null;
      return value && typeof value.userId === "string" && isReminderTime(value.time)
        ? { userId: value.userId, time: value.time }
        : null;
    } catch {
      return null;
    }
  }

  private write(value: Stored | null): void {
    try {
      if (value) this.storage.setItem(REMINDER_KEY, JSON.stringify(value));
      else this.storage.removeItem(REMINDER_KEY);
    } catch {
      // Without storage the reminder still works; Ajustes shows it off after a reload.
    }
  }

  private set(next: ReminderSnapshot): void {
    if (next.status === this.snapshot?.status && next.time === this.snapshot.time) return;
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
}
