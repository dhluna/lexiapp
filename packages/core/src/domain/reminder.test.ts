import { describe, expect, it } from "vitest";
import { planReminders, reminderMessage, sanitizeReminder, streakOnReminderDay } from "./reminder";

describe("planReminders", () => {
  it("schedules one reminder per day at the chosen local hour", () => {
    const now = new Date(2026, 9, 12, 9, 0); // 12 Oct, 09:00 local
    const plan = planReminders(now, 19, false);
    expect(plan).toHaveLength(7);
    expect(plan[0].day).toBe("2026-10-12");
    expect(plan[0].at.getHours()).toBe(19);
    expect(plan[6].day).toBe("2026-10-18");
  });

  it("skips today when the user already practiced", () => {
    const plan = planReminders(new Date(2026, 9, 12, 9, 0), 19, true);
    expect(plan[0].day).toBe("2026-10-13");
    expect(plan).toHaveLength(6);
  });

  it("skips today when the hour has already passed", () => {
    const plan = planReminders(new Date(2026, 9, 12, 20, 0), 19, false);
    expect(plan[0].day).toBe("2026-10-13");
  });

  it("crosses month boundaries", () => {
    const plan = planReminders(new Date(2026, 9, 30, 7, 0), 8, false, 3);
    expect(plan.map((r) => r.day)).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
  });
});

describe("reminderMessage", () => {
  it("mentions the real streak", () => {
    expect(reminderMessage(4).title).toBe("Llevas 4 días seguidos");
    expect(reminderMessage(1).title).toBe("Llevas 1 día de racha");
    expect(reminderMessage(0).body).toMatch(/empezar una racha/);
  });
});

describe("streakOnReminderDay", () => {
  it("only promises a streak that cannot have broken by then", () => {
    expect(streakOnReminderDay(0, false, 4)).toBe(4); // today, streak alive from yesterday
    expect(streakOnReminderDay(1, true, 5)).toBe(5); // tomorrow, already practiced today
    expect(streakOnReminderDay(1, false, 4)).toBe(0); // would break if today is skipped
    expect(streakOnReminderDay(3, true, 5)).toBe(0); // depends on days not practiced yet
  });
});

describe("sanitizeReminder", () => {
  it("accepts only the offered hours and defaults safely", () => {
    expect(sanitizeReminder({ enabled: true, hour: 21 })).toEqual({ enabled: true, hour: 21 });
    expect(sanitizeReminder({ enabled: "yes", hour: 3 })).toEqual({ enabled: false, hour: 19 });
    expect(sanitizeReminder(null)).toEqual({ enabled: false, hour: 19 });
  });
});
