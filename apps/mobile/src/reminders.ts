import { toDayKey } from "@lexi/core/domain/dates";
import { calculateStreak } from "@lexi/core/domain/streak";
import {
  planReminders,
  reminderMessage,
  sanitizeReminder,
  streakOnReminderDay,
  type ReminderHour,
  type ReminderSettings,
} from "@lexi/core/domain/reminder";
import type { KeyValueStorage } from "@lexi/core/platform";
import type { ProgressStore } from "@lexi/core/services/progress-store";
import type { NotificationsPort } from "@/platform/notifications";

export const REMINDER_KEY = "lexi:reminder";
const ID_PREFIX = "lexi-reminder-";

export type EnableResult = "enabled" | "denied";

/**
 * Daily reminder (device setting, not synced). Schedules the next 7 days locally and
 * reschedules after each practice so it never nags on a day already practiced.
 */
export class ReminderService {
  private settings: ReminderSettings;
  private readonly listeners = new Set<() => void>();
  private pending: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly store: ProgressStore,
    private readonly storage: KeyValueStorage,
    private readonly notifications: NotificationsPort,
    private readonly now: () => Date = () => new Date(),
  ) {
    let raw: unknown = null;
    try {
      raw = JSON.parse(storage.getItem(REMINDER_KEY) ?? "null");
    } catch {
      raw = null;
    }
    this.settings = sanitizeReminder(raw);
  }

  getSettings = (): ReminderSettings => this.settings;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Reschedule on start and shortly after each practice answer. */
  start(): () => void {
    void this.reschedule();
    return this.store.subscribeLocalChanges(() => {
      if (this.pending) clearTimeout(this.pending);
      this.pending = setTimeout(() => void this.reschedule(), 1000);
    });
  }

  async enable(hour: ReminderHour = this.settings.hour): Promise<EnableResult> {
    const granted = await this.notifications.requestPermission();
    if (!granted) {
      this.save({ enabled: false, hour });
      return "denied";
    }
    this.save({ enabled: true, hour });
    await this.reschedule();
    return "enabled";
  }

  async disable(): Promise<void> {
    this.save({ ...this.settings, enabled: false });
    await this.notifications.cancelWithPrefix(ID_PREFIX);
  }

  async setHour(hour: ReminderHour): Promise<void> {
    this.save({ ...this.settings, hour });
    await this.reschedule();
  }

  async reschedule(): Promise<void> {
    await this.notifications.cancelWithPrefix(ID_PREFIX);
    if (!this.settings.enabled) return;
    // Permission can be revoked from system settings at any time.
    if (!(await this.notifications.hasPermission())) {
      this.save({ ...this.settings, enabled: false });
      return;
    }
    const now = this.now();
    const { practiceDays } = this.store.getSnapshot().state;
    const streak = calculateStreak(practiceDays, toDayKey(now));
    for (const reminder of planReminders(now, this.settings.hour, streak.practicedToday)) {
      const { title, body } = reminderMessage(streakOnReminderDay(reminder.offset, streak.practicedToday, streak.current));
      await this.notifications.schedule(`${ID_PREFIX}${reminder.day}`, reminder.at, title, body);
    }
  }

  private save(next: ReminderSettings): void {
    this.settings = next;
    try {
      this.storage.setItem(REMINDER_KEY, JSON.stringify(next));
    } catch {
      // The setting lives in memory for this run.
    }
    for (const listener of this.listeners) listener();
  }
}
