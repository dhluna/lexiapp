import { addDays, toDayKey } from "./dates";

export const REMINDER_HOURS = [8, 13, 19, 21] as const;
export type ReminderHour = (typeof REMINDER_HOURS)[number];

export interface ReminderSettings {
  enabled: boolean;
  hour: ReminderHour;
}

export const DEFAULT_REMINDER: ReminderSettings = { enabled: false, hour: 19 };

export interface ScheduledReminder {
  /** Local day key: also the notification's stable identifier suffix. */
  day: string;
  at: Date;
  /** Days from today (0 = today). */
  offset: number;
}

/**
 * When to remind over the next `days` days. Today is skipped if the user already
 * practiced or the hour has passed; every other day gets one reminder at `hour`.
 */
export function planReminders(
  now: Date,
  hour: number,
  practicedToday: boolean,
  days = 7,
): ScheduledReminder[] {
  const today = toDayKey(now);
  const result: ScheduledReminder[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const day = addDays(today, offset);
    const [y, m, d] = day.split("-").map(Number);
    const at = new Date(y, m - 1, d, hour, 0, 0, 0); // local time
    if (offset === 0 && (practicedToday || at.getTime() <= now.getTime())) continue;
    result.push({ day, at, offset });
  }
  return result;
}

/**
 * Streak that is guaranteed to still hold on a reminder `dayOffset` days from today.
 * Reminders are scheduled ahead of time, so we only promise what cannot have changed:
 * today (the streak from yesterday is alive) or tomorrow if the user already practiced
 * today. Later days get the generic text; practicing or opening the app reschedules all.
 */
export function streakOnReminderDay(dayOffset: number, practicedToday: boolean, currentStreak: number): number {
  if (dayOffset === 0 && !practicedToday) return currentStreak;
  if (dayOffset === 1 && practicedToday) return currentStreak;
  return 0;
}

/** Notification text from the real streak (never a decorative number). */
export function reminderMessage(currentStreak: number): { title: string; body: string } {
  if (currentStreak > 0) {
    return {
      title: currentStreak === 1 ? "Llevas 1 día de racha" : `Llevas ${currentStreak} días seguidos`,
      body: "Unos minutos hoy para no perderla.",
    };
  }
  return { title: "Hora de practicar", body: "Unos minutos de vocabulario para empezar una racha." };
}

export function sanitizeReminder(raw: unknown): ReminderSettings {
  if (typeof raw !== "object" || raw === null) return DEFAULT_REMINDER;
  const value = raw as Partial<ReminderSettings>;
  return {
    enabled: value.enabled === true,
    hour: REMINDER_HOURS.includes(value.hour as ReminderHour) ? (value.hour as ReminderHour) : DEFAULT_REMINDER.hour,
  };
}
