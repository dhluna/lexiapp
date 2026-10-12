import { describe, expect, it } from "vitest";
import { formatAgo } from "./relative-time";

const now = new Date("2026-10-12T12:00:00Z");
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString();

describe("formatAgo", () => {
  it("describes recent moments in Spanish", () => {
    expect(formatAgo(ago(10), now)).toBe("ahora mismo");
    expect(formatAgo(ago(60), now)).toBe("hace 1 min");
    expect(formatAgo(ago(5 * 60), now)).toBe("hace 5 min");
    expect(formatAgo(ago(3600), now)).toBe("hace 1 hora");
    expect(formatAgo(ago(3 * 3600), now)).toBe("hace 3 horas");
    expect(formatAgo(ago(26 * 3600), now)).toBe("ayer");
    expect(formatAgo(ago(4 * 86400), now)).toBe("hace 4 días");
  });

  it("never shows a future time", () => {
    expect(formatAgo(new Date(now.getTime() + 60_000).toISOString(), now)).toBe("ahora mismo");
  });
});
