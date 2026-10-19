/**
 * What each platform (web, React Native) provides to the core. The core never touches
 * browser or native APIs directly: it only talks to these contracts.
 */

export type { KeyValueStorage } from "./persistence/storage";

// ─── Speech ───────────────────────────────────────────────────────────────────

export interface SpeechVoice {
  id: string;
  name: string;
  /** BCP 47, e.g. "en-US" (some engines use "en_US"). */
  lang: string;
  /** Installed on the device (starts faster, works offline). */
  localService: boolean;
}

export interface SpeechRequest {
  voice: SpeechVoice | null;
  lang: string;
  rate: number;
  /** Must be called once when this utterance ends, fails or is cancelled. */
  onDone: () => void;
}

export interface SpeechEngine {
  getVoices(): readonly SpeechVoice[];
  /** Voices may load after start-up (browsers, Android): notify when the list changes. */
  onVoicesChanged(listener: () => void): () => void;
  /** May throw; the caller handles it. */
  speak(text: string, request: SpeechRequest): void;
  cancel(): void;
  /** Something is playing or queued. */
  isBusy(): boolean;
}

// ─── Recorded audio ───────────────────────────────────────────────────────────

export interface ClipRequest {
  /** 1 = normal; slower speeds keep the pitch. */
  rate: number;
  /** Called once when the clip ends or is stopped. */
  onDone: () => void;
  /** Called instead of `onDone` when the clip cannot play (no network, missing file…). */
  onError: () => void;
}

/**
 * Plays Lexi's recorded pronunciations (`<voice>/<key>.mp3`, see `domain/audio.ts`).
 * Optional: without it, every word is spoken with the system voice.
 */
export interface AudioClipPlayer {
  /** Keys of the recordings that exist (the same for every voice). May reject when offline. */
  loadIndex(): Promise<readonly string[]>;
  /** `clip` is "<voice>/<key>". May throw; the caller handles it. */
  play(clip: string, request: ClipRequest): void;
  stop(): void;
}

// ─── Sync triggers ──────────────────────────────────────────────────────────

/**
 * Moments when syncing is worthwhile besides local changes: connection restored, app or
 * tab back in the foreground.
 */
export interface SyncTriggers {
  subscribe(trigger: () => void): () => void;
}

// ─── Authentication redirects ────────────────────────────────────────────────

export type AuthRedirect = "callback" | "reset-password";

export interface AuthPlatform {
  /** Where the provider or the email link must send the user back. */
  redirectUrl(target: AuthRedirect, nextPath?: string): string;
  /**
   * Opens the provider's page and resolves with the URL it returned to (or null if the
   * user cancelled). Omitted on the web, where the page itself navigates away and back.
   */
  openOAuth?(authUrl: string, returnUrl: string): Promise<string | null>;
}
