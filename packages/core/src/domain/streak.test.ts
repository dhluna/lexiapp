import { describe, expect, it } from "vitest";
import { addDays, isDayKey, toDayKey } from "./dates";
import { addPracticeDay, calculateStreak } from "./streak";

describe("dates", () => {
  it("formats local day keys", () => {
    expect(toDayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("adds days across month, year and DST boundaries", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2026-03-29", -1)).toBe("2026-03-28"); // EU DST change
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02"); // US DST change
  });

  it("validates day keys", () => {
    expect(isDayKey("2026-10-10")).toBe(true);
    expect(isDayKey("2026-02-30")).toBe(false);
    expect(isDayKey("10/10/2026")).toBe(false);
    expect(isDayKey(20261010)).toBe(false);
  });
});

describe("calculateStreak", () => {
  const today = "2026-10-10";

  it("is zero without practice", () => {
    expect(calculateStreak([], today)).toEqual({ current: 0, best: 0, practicedToday: false });
  });

  it("counts consecutive days ending today", () => {
    const s = calculateStreak(["2026-10-08", "2026-10-09", "2026-10-10"], today);
    expect(s).toEqual({ current: 3, best: 3, practicedToday: true });
  });

  it("keeps yesterday's streak alive until today ends", () => {
    const s = calculateStreak(["2026-10-08", "2026-10-09"], today);
    expect(s.current).toBe(2);
    expect(s.practicedToday).toBe(false);
  });

  it("breaks after a missed day", () => {
    expect(calculateStreak(["2026-10-07", "2026-10-08"], today).current).toBe(0);
  });

  it("counts several sessions on the same day once", () => {
    const s = calculateStreak(["2026-10-10", "2026-10-10", "2026-10-09", "2026-10-09"], today);
    expect(s.current).toBe(2);
  });

  it("tracks the best streak separately from the current one", () => {
    const days = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-10-10"];
    expect(calculateStreak(days, today)).toEqual({ current: 1, best: 4, practicedToday: true });
  });

  it("ignores invalid and future days", () => {
    expect(calculateStreak(["nope", "2026-10-11", "2026-10-10"], today).current).toBe(1);
  });
});

describe("addPracticeDay", () => {
  it("keeps days unique and sorted", () => {
    expect(addPracticeDay(["2026-10-09"], "2026-10-08")).toEqual(["2026-10-08", "2026-10-09"]);
    expect(addPracticeDay(["2026-10-09"], "2026-10-09")).toEqual(["2026-10-09"]);
  });
});
