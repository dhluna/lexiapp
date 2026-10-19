import { DEFAULT_VOICE, isVoiceId, type VoiceId } from "../data/voices";
import type { KeyValueStorage } from "../platform";

export const VOICE_KEY = "lexi:voice";

/** Device setting (not synced, like the celebration sound): which recorded voice to play. */
export class VoiceSettings {
  private voice: VoiceId;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly storage: KeyValueStorage) {
    let stored: string | null = null;
    try {
      stored = storage.getItem(VOICE_KEY);
    } catch {
      stored = null;
    }
    this.voice = isVoiceId(stored) ? stored : DEFAULT_VOICE;
  }

  get = (): VoiceId => this.voice;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  set(voice: VoiceId): void {
    if (voice === this.voice || !isVoiceId(voice)) return;
    this.voice = voice;
    try {
      this.storage.setItem(VOICE_KEY, voice);
    } catch {
      // The setting lives in memory for this run.
    }
    for (const listener of this.listeners) listener();
  }
}
