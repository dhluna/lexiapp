import { describe, expect, it } from "vitest";
import {
  REMINDER_TIMES,
  isReminderTime,
  localClock,
  reminderDueDay,
  reminderMessage,
  type ReminderDevice,
} from "./reminders";

const device = (overrides: Partial<ReminderDevice> = {}): ReminderDevice => ({
  remindAt: "20:00:00",
  timeZone: "Europe/Madrid",
  lastSentOn: null,
  ...overrides,
});

describe("reminder times", () => {
  it("offers every half hour from 07:00 to 23:00", () => {
    expect(REMINDER_TIMES[0]).toBe("07:00");
    expect(REMINDER_TIMES.at(-1)).toBe("23:00");
    expect(REMINDER_TIMES).toContain("20:30");
    expect(isReminderTime("20:00")).toBe(true);
    expect(isReminderTime("03:00")).toBe(false);
  });
});

describe("localClock", () => {
  it("reads the day and time in the device's time zone", () => {
    const now = new Date("2026-10-22T22:30:00Z");
    expect(localClock(now, "Europe/Madrid")).toEqual({ day: "2026-10-23", minutes: 30 });
    expect(localClock(now, "America/Bogota")).toEqual({ day: "2026-10-22", minutes: 17 * 60 + 30 });
  });
});

describe("reminderDueDay", () => {
  // 18:10 UTC = 20:10 in Madrid (summer time until 25 October 2026).
  const now = new Date("2026-10-22T18:10:00Z");

  it("is due once the local time has passed, on that local day", () => {
    expect(reminderDueDay(device(), now)).toBe("2026-10-22");
  });

  it("waits until the chosen time", () => {
    expect(reminderDueDay(device({ remindAt: "20:30" }), now)).toBeNull();
  });

  it("sends at most one notice per local day", () => {
    expect(reminderDueDay(device({ lastSentOn: "2026-10-22" }), now)).toBeNull();
    expect(reminderDueDay(device({ lastSentOn: "2026-10-21" }), now)).toBe("2026-10-22");
  });

  it("drops a notice missed by two hours or more", () => {
    expect(reminderDueDay(device({ remindAt: "18:20" }), now)).toBe("2026-10-22");
    expect(reminderDueDay(device({ remindAt: "18:10" }), now)).toBeNull();
  });

  it("uses each device's own time zone", () => {
    // 13:10 in Bogotá.
    expect(reminderDueDay(device({ timeZone: "America/Bogota" }), now)).toBeNull();
    expect(reminderDueDay(device({ timeZone: "America/Bogota", remindAt: "13:00" }), now)).toBe("2026-10-22");
  });

  it("ignores an unknown time zone", () => {
    expect(reminderDueDay(device({ timeZone: "Marte/Olympus" }), now)).toBeNull();
  });
});

describe("reminderMessage", () => {
  it("says nothing when today is already practiced", () => {
    expect(reminderMessage(["2026-10-21", "2026-10-22"], "2026-10-22")).toBeNull();
  });

  it("mentions the streak that would be lost", () => {
    expect(reminderMessage(["2026-10-20", "2026-10-21"], "2026-10-22")?.title).toBe("🔥 Llevas 2 días de racha");
    expect(reminderMessage(["2026-10-21"], "2026-10-22")?.title).toBe("🔥 Llevas 1 día de racha");
  });

  it("invites to practice without a streak", () => {
    expect(reminderMessage([], "2026-10-22")).toEqual({
      title: "¿5 minutos de inglés?",
      body: "Tus palabras te esperan en Lexi.",
    });
    expect(reminderMessage(["2026-10-01"], "2026-10-22")?.title).toBe("¿5 minutos de inglés?");
  });
});
