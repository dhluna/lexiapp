import { describe, expect, it, vi } from "vitest";
import { MemoryStorage } from "../persistence/storage";
import { CELEBRATION_SOUND_KEY, CelebrationSettings } from "./celebration-settings";

describe("CelebrationSettings", () => {
  it("plays the sound by default and remembers turning it off on this device", () => {
    const storage = new MemoryStorage();
    const settings = new CelebrationSettings(storage);
    expect(settings.soundEnabled()).toBe(true);

    const listener = vi.fn();
    settings.subscribe(listener);
    settings.setSoundEnabled(false);
    settings.setSoundEnabled(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(storage.getItem(CELEBRATION_SOUND_KEY)).toBe("off");

    expect(new CelebrationSettings(storage).soundEnabled()).toBe(false);
  });

  it("falls back to the default when storage fails", () => {
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => {} };
    const settings = new CelebrationSettings(broken);
    expect(settings.soundEnabled()).toBe(true);
    settings.setSoundEnabled(false);
    expect(settings.soundEnabled()).toBe(false);
  });
});
