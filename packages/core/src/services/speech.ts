import { voiceOption } from "../data/voices";
import { audioKey } from "../domain/audio";
import type { AudioClipPlayer, SpeechEngine, SpeechVoice } from "../platform";
import type { VoiceSettings } from "./voice-settings";

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
 * Best English voice: high-quality engines first, then the preferred accent (US unless the
 * chosen recorded voice is British), GB, any `en-*`; local voices break ties because they
 * start faster.
 */
export function pickEnglishVoice<V extends VoiceLike>(voices: readonly V[], preferredLang = "en-US"): V | null {
  const english = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("en"));
  if (english.length === 0) return null;
  const preferred = preferredLang.toLowerCase();
  const priority = [preferred, ...LANG_PRIORITY.filter((l) => l !== preferred)];
  const score = (voice: V) => {
    const lang = voice.lang.toLowerCase().replace("_", "-");
    const langIndex = priority.indexOf(lang);
    const quality = HIGH_QUALITY.test(voice.name) ? 0 : 1;
    return quality * 100 + (langIndex === -1 ? LANG_PRIORITY.length : langIndex) * 2 + (voice.localService ? 0 : 1);
  };
  return [...english].sort((a, b) => score(a) - score(b))[0];
}

/** How long the first `speak` waits for the recordings' index before using the system voice. */
const INDEX_WAIT_MS = 1500;

export interface SpeechServiceOptions {
  /** Lexi's recorded pronunciations; without them, the system voice says everything. */
  clips?: AudioClipPlayer | null;
  /** Which recorded voice to play (and which accent to prefer in the system voice). */
  voices?: VoiceSettings | null;
}

/**
 * English pronunciation: Lexi's recording of the text in the chosen voice when there is one,
 * otherwise the platform's speech engine. Never throws to callers. `engine` is null when the
 * platform has no speech synthesis.
 */
export class SpeechService {
  private voice: SpeechVoice | null = null;
  private readonly listeners = new Set<() => void>();
  /** Identity of the utterance playing now (a new object per `speak`). */
  private current: { text: string } | null = null;
  private readonly clips: AudioClipPlayer | null;
  private readonly voices: VoiceSettings | null;
  /** Keys of the available recordings; null until loaded (or after a failed load). */
  private index: ReadonlySet<string> | null = null;
  /** Settles when the index load in progress ends (well or badly); null when idle. */
  private loadingIndex: Promise<void> | null = null;

  constructor(
    private readonly engine: SpeechEngine | null,
    { clips = null, voices = null }: SpeechServiceOptions = {},
  ) {
    this.clips = clips;
    this.voices = voices;
    this.loadIndex();
    voices?.subscribe(this.refreshVoice);
    if (!engine) return;
    this.refreshVoice();
    try {
      engine.onVoicesChanged(this.refreshVoice);
    } catch {
      // Some engines cannot report voice changes; the next `speak` refreshes them.
    }
  }

  /** Recordings are available for this text (in every voice). */
  hasRecording(text: string): boolean {
    return this.index?.has(audioKey(text)) ?? false;
  }

  /** Notifies when voices load (asynchronously) or playback starts/stops. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  get supported(): boolean {
    return this.engine !== null || this.clips !== null;
  }

  /** Text being spoken right now, shared by every button and the autoplay. */
  get speakingText(): string | null {
    return this.current?.text ?? null;
  }

  get availability(): VoiceAvailability {
    // With the recordings loaded, the system voice no longer matters.
    if (this.index && this.index.size > 0) return "english";
    if (!this.engine) return "unsupported";
    return this.voice ? "english" : "fallback";
  }

  speak(text: string, { rate = 1, onEnd }: SpeakOptions = {}): boolean {
    if (!text.trim()) return false;
    if (!this.index) this.loadIndex();
    if (!this.index && this.loadingIndex) {
      // The first word of a session usually comes before the index: wait for it briefly
      // instead of saying that word with the system voice.
      const token = { text };
      this.interrupt();
      this.setCurrent(token);
      const waited = Promise.race([this.loadingIndex, new Promise((r) => setTimeout(r, INDEX_WAIT_MS))]);
      void waited.then(() => {
        if (this.current === token) this.speakNow(text, rate, onEnd, token);
      });
      return true;
    }
    return this.speakNow(text, rate, onEnd);
  }

  private speakNow(text: string, rate: number, onEnd: (() => void) | undefined, previous?: { text: string }): boolean {
    const key = audioKey(text);
    if (this.clips && this.index?.has(key)) {
      const token = previous ?? { text };
      this.interrupt();
      this.setCurrent(token);
      const voice = this.voices?.get() ?? "us-female";
      try {
        this.clips.play(`${voice}/${key}`, {
          rate,
          onDone: () => {
            if (this.current === token) this.setCurrent(null);
            onEnd?.();
          },
          // No network or no file: say it with the system voice instead.
          onError: () => {
            if (this.current === token) this.speakWithEngine(text, rate, onEnd, token);
          },
        });
        return true;
      } catch {
        return this.speakWithEngine(text, rate, onEnd, token);
      }
    }
    return this.speakWithEngine(text, rate, onEnd, previous);
  }

  private speakWithEngine(text: string, rate: number, onEnd: (() => void) | undefined, previous?: { text: string }): boolean {
    if (!this.engine) {
      // Only a failed recording has started anything that must now be closed.
      if (previous) {
        if (this.current === previous) this.setCurrent(null);
        onEnd?.();
      }
      return false;
    }
    const token = previous ?? { text };
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
    this.interrupt();
    this.setCurrent(null);
  }

  /** Stops whatever is playing (recording or system voice) without touching the state. */
  private interrupt(): void {
    try {
      this.clips?.stop();
    } catch {
      // ignore
    }
    try {
      if (this.engine?.isBusy()) this.engine.cancel();
    } catch {
      // ignore
    }
  }

  private loadIndex(): void {
    if (!this.clips || this.loadingIndex) return;
    try {
      this.loadingIndex = this.clips.loadIndex().then(
        (keys) => {
          this.index = new Set(keys);
          this.loadingIndex = null;
          this.emit();
        },
        () => {
          // Offline: try again on the next `speak`.
          this.loadingIndex = null;
        },
      );
    } catch {
      this.loadingIndex = null;
    }
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
      const lang = this.voices ? voiceOption(this.voices.get()).lang : "en-US";
      this.voice = pickEnglishVoice(this.engine?.getVoices() ?? [], lang);
    } catch {
      this.voice = null;
    }
    this.emit();
  };
}
