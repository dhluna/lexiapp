import { calculateStreak } from "./streak";

/**
 * Daily reminder (docs/15-recordatorios.md): when a device's notice is due and what it says.
 * Pure: the clock and the device's time zone come in as parameters.
 */

export const DEFAULT_REMINDER_TIME = "20:00";

/** Times offered in Ajustes: every half hour from 07:00 to 23:00. */
export const REMINDER_TIMES: readonly string[] = Array.from({ length: 33 }, (_, i) => {
  const minutes = 7 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

/** After this long past the chosen time a missed notice is dropped: never in the middle of the night. */
export const REMINDER_WINDOW_MINUTES = 120;

export interface ReminderDevice {
  /** "HH:MM" or "HH:MM:SS" (Postgres `time`). */
  remindAt: string;
  /** IANA name, e.g. "Europe/Madrid". */
  timeZone: string;
  /** Local day (`YYYY-MM-DD`) of the last notice sent, if any. */
  lastSentOn: string | null;
}

export interface ReminderMessage {
  title: string;
  body: string;
}

export function isReminderTime(value: unknown): value is string {
  return typeof value === "string" && REMINDER_TIMES.includes(value);
}

/** Local day and minutes since midnight in `timeZone`. Throws on an unknown time zone. */
export function localClock(now: Date, timeZone: string): { day: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return {
    day: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * The device's local day when its notice is due now (its time has passed today, by less
 * than the window, and nothing was sent today); `null` otherwise or with a bad time zone.
 */
export function reminderDueDay(device: ReminderDevice, now: Date): string | null {
  let clock: { day: string; minutes: number };
  try {
    clock = localClock(now, device.timeZone);
  } catch {
    return null;
  }
  const late = clock.minutes - toMinutes(device.remindAt);
  if (late < 0 || late >= REMINDER_WINDOW_MINUTES) return null;
  if (device.lastSentOn !== null && device.lastSentOn >= clock.day) return null;
  return clock.day;
}

/** What the notice says, from the real practice days. `null` when today is already done. */
export function reminderMessage(practiceDays: readonly string[], today: string): ReminderMessage | null {
  const streak = calculateStreak(practiceDays, today);
  if (streak.practicedToday) return null;
  if (streak.current > 0) {
    const days = streak.current === 1 ? "1 día" : `${streak.current} días`;
    return { title: `🔥 Llevas ${days} de racha`, body: "Practica hoy para no perderla. Son 5 minutos." };
  }
  return { title: "¿5 minutos de inglés?", body: "Tus palabras te esperan en Lexi." };
}
