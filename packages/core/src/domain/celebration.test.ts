import { describe, expect, it } from "vitest";
import { celebrationFor, chimeLength, CHIME } from "./celebration";
import { summaryTitle, type SessionSummary } from "./session";

const summary = (learned: number, review: number, skipped: number): SessionSummary => ({
  total: learned + review + skipped,
  learned: Array.from({ length: learned }, (_, i) => `l${i}`),
  review: Array.from({ length: review }, (_, i) => `r${i}`),
  skipped: Array.from({ length: skipped }, (_, i) => `s${i}`),
});

describe("celebrationFor", () => {
  it("does not celebrate a session without answers", () => {
    expect(celebrationFor(summary(0, 0, 10))).toBe("none");
  });

  it("celebrates any answered session", () => {
    expect(celebrationFor(summary(7, 3, 0))).toBe("normal");
    expect(celebrationFor(summary(1, 0, 9))).toBe("normal");
    expect(celebrationFor(summary(0, 10, 0))).toBe("normal");
  });

  it("is perfect only when every word was learned, like the summary title", () => {
    expect(celebrationFor(summary(10, 0, 0))).toBe("perfect");
    expect(summaryTitle(summary(10, 0, 0))).toBe("Todas aprendidas");
    expect(celebrationFor(summary(9, 0, 1))).toBe("normal");
  });
});

describe("CHIME", () => {
  it("keeps both chimes short, rising and the perfect one longer", () => {
    expect(chimeLength(CHIME.normal)).toBeLessThanOrEqual(1.2);
    expect(chimeLength(CHIME.perfect)).toBeGreaterThan(chimeLength(CHIME.normal));
    expect(chimeLength(CHIME.perfect)).toBeLessThanOrEqual(1.8);
    const firstFour = CHIME.normal.slice(0, 4).map((n) => n.frequency);
    expect([...firstFour].sort((a, b) => a - b)).toEqual(firstFour);
    for (const note of CHIME.perfect) {
      expect(note.gain).toBeGreaterThan(0);
      expect(note.gain).toBeLessThanOrEqual(1);
    }
  });
});
