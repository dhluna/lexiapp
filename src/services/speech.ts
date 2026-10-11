export interface SpeechEnvironment {
  synth: SpeechSynthesis;
  Utterance: typeof SpeechSynthesisUtterance;
}

export type VoiceAvailability = "unsupported" | "english" | "fallback";

export interface SpeakOptions {
  rate?: number;
  onEnd?: () => void;
}

const LANG_PRIORITY = ["en-us", "en-gb", "en-au", "en-ca", "en-ie", "en-nz"];

/** Neural / cloud voices (Edge "Natural", Chrome "Google", Apple "Premium") sound far cleaner. */
const HIGH_QUALITY = /natural|neural|online|google|premium|enhanced/i;

/**
 * Best English voice: high-quality engines first, then US, GB, any `en-*`; local voices
 * break ties because they start faster.
 */
export function pickEnglishVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("en"));
  if (english.length === 0) return null;
  const score = (voice: SpeechSynthesisVoice) => {
    const lang = voice.lang.toLowerCase().replace("_", "-");
    const langIndex = LANG_PRIORITY.indexOf(lang);
    const quality = HIGH_QUALITY.test(voice.name) ? 0 : 1;
    return quality * 100 + (langIndex === -1 ? LANG_PRIORITY.length : langIndex) * 2 + (voice.localService ? 0 : 1);
  };
  return [...english].sort((a, b) => score(a) - score(b))[0];
}

export function detectSpeechEnvironment(): SpeechEnvironment | null {
  if (typeof window === "undefined") return null;
  const synth = window.speechSynthesis;
  const Utterance = window.SpeechSynthesisUtterance;
  if (!synth || typeof Utterance !== "function") return null;
  return { synth, Utterance };
}

/** Wraps the Web Speech API. Never throws to callers. */
export class SpeechService {
  private voice: SpeechSynthesisVoice | null = null;
  private readonly listeners = new Set<() => void>();
  private current: { text: string; utterance: SpeechSynthesisUtterance } | null = null;

  constructor(private readonly env: SpeechEnvironment | null) {
    if (!env) return;
    this.refreshVoice();
    try {
      env.synth.addEventListener?.("voiceschanged", this.refreshVoice);
    } catch {
      // Some engines expose speechSynthesis without EventTarget support.
    }
  }

  /** Notifies when voices load (asynchronously) or playback starts/stops. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  get supported(): boolean {
    return this.env !== null;
  }

  /** Text being spoken right now, shared by every button and the autoplay. */
  get speakingText(): string | null {
    return this.current?.text ?? null;
  }

  get availability(): VoiceAvailability {
    if (!this.env) return "unsupported";
    return this.voice ? "english" : "fallback";
  }

  speak(text: string, { rate = 1, onEnd }: SpeakOptions = {}): boolean {
    if (!this.env || !text.trim()) return false;
    try {
      if (!this.voice) this.refreshVoice();
      const utterance = new this.env.Utterance(text);
      utterance.lang = this.voice?.lang ?? "en-US";
      if (this.voice) utterance.voice = this.voice;
      utterance.rate = rate;
      // Cancelling the previous utterance fires its end/error later: only the
      // current one may clear the playing state.
      const finish = () => {
        if (this.current?.utterance === utterance) this.setCurrent(null);
        onEnd?.();
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      // Interrupt only when something is actually playing: cancelling an idle engine right
      // before speaking can produce audible clicks on some systems.
      if (this.env.synth.speaking || this.env.synth.pending) this.env.synth.cancel();
      this.setCurrent({ text, utterance });
      this.env.synth.speak(utterance);
      return true;
    } catch {
      this.setCurrent(null);
      onEnd?.();
      return false;
    }
  }

  stop(): void {
    try {
      this.env?.synth.cancel();
    } catch {
      // ignore
    }
    this.setCurrent(null);
  }

  private setCurrent(next: { text: string; utterance: SpeechSynthesisUtterance } | null): void {
    if (this.current === next) return;
    this.current = next;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  private refreshVoice = (): void => {
    try {
      this.voice = pickEnglishVoice(this.env?.synth.getVoices() ?? []);
    } catch {
      this.voice = null;
    }
    this.emit();
  };
}
