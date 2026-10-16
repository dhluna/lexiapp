import type { KeyValueStorage } from "../platform";

export const CELEBRATION_SOUND_KEY = "lexi:celebration-sound";

/**
 * Device setting (not synced, like the reminder): whether finishing a session plays the
 * celebration sound. On by default; the confetti does not depend on it.
 */
export class CelebrationSettings {
  private enabled: boolean;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly storage: KeyValueStorage) {
    let stored: string | null = null;
    try {
      stored = storage.getItem(CELEBRATION_SOUND_KEY);
    } catch {
      stored = null;
    }
    this.enabled = stored !== "off";
  }

  soundEnabled = (): boolean => this.enabled;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  setSoundEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    try {
      this.storage.setItem(CELEBRATION_SOUND_KEY, enabled ? "on" : "off");
    } catch {
      // The setting lives in memory for this run.
    }
    for (const listener of this.listeners) listener();
  }
}
