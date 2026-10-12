import type { SpeechEngine, SpeechVoice } from "../platform";

export type VoiceAvailability = "unsupported" | "english" | "fallback";

export interface SpeakOptions {
  rate?: number;
  onEnd?: () => void;
}

const LANG_PRIORITY = ["en-us", "en-gb", "en-au", "en-ca", "en-ie", "en-nz"];

/** Neural / cloud voices (Edge "Natural", Chrome "Google", Apple "Premium") sound far cleaner. */
const HIGH_QUALITY = /natural|neural|online|google|premium|enhanced/i;

type VoiceLike = Pick<SpeechVoice, "name" | "lang" | "localService">;

/**
 * Best English voice: high-quality engines first, then US, GB, any `en-*`; local voices
 * break ties because they start faster.
 */
export function pickEnglishVoice<V extends VoiceLike>(voices: readonly V[]): V | null {
  const english = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("en"));
  if (english.length === 0) return null;
  const score = (voice: V) => {
    const lang = voice.lang.toLowerCase().replace("_", "-");
    const langIndex = LANG_PRIORITY.indexOf(lang);
    const quality = HIGH_QUALITY.test(voice.name) ? 0 : 1;
    return quality * 100 + (langIndex === -1 ? LANG_PRIORITY.length : langIndex) * 2 + (voice.localService ? 0 : 1);
  };
  return [...english].sort((a, b) => score(a) - score(b))[0];
}

/**
 * English pronunciation on top of any platform engine. Never throws to callers.
 * `engine` is null when the platform has no speech synthesis.
 */
export class SpeechService {
  private voice: SpeechVoice | null = null;
  private readonly listeners = new Set<() => void>();
  /** Identity of the utterance playing now (a new object per `speak`). */
  private current: { text: string } | null = null;

  constructor(private readonly engine: SpeechEngine | null) {
    if (!engine) return;
    this.refreshVoice();
    try {
      engine.onVoicesChanged(this.refreshVoice);
    } catch {
      // Some engines cannot report voice changes; the next `speak` refreshes them.
    }
  }

  /** Notifies when voices load (asynchronously) or playback starts/stops. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  get supported(): boolean {
    return this.engine !== null;
  }

  /** Text being spoken right now, shared by every button and the autoplay. */
  get speakingText(): string | null {
    return this.current?.text ?? null;
  }

  get availability(): VoiceAvailability {
    if (!this.engine) return "unsupported";
    return this.voice ? "english" : "fallback";
  }

  speak(text: string, { rate = 1, onEnd }: SpeakOptions = {}): boolean {
    if (!this.engine || !text.trim()) return false;
    const token = { text };
    try {
      if (!this.voice) this.refreshVoice();
      // Interrupt only when something is actually playing: cancelling an idle engine right
      // before speaking can produce audible clicks on some systems.
      if (this.engine.isBusy()) this.engine.cancel();
      this.setCurrent(token);
      this.engine.speak(text, {
        voice: this.voice,
        lang: this.voice?.lang ?? "en-US",
        rate,
        // A cancelled utterance reports its end later: only the current one clears the state.
        onDone: () => {
          if (this.current === token) this.setCurrent(null);
          onEnd?.();
        },
      });
      return true;
    } catch {
      if (this.current === token) this.setCurrent(null);
      onEnd?.();
      return false;
    }
  }

  stop(): void {
    try {
      this.engine?.cancel();
    } catch {
      // ignore
    }
    this.setCurrent(null);
  }

  private setCurrent(next: { text: string } | null): void {
    if (this.current === next) return;
    this.current = next;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  private refreshVoice = (): void => {
    try {
      this.voice = pickEnglishVoice(this.engine?.getVoices() ?? []);
    } catch {
      this.voice = null;
    }
    this.emit();
  };
}
