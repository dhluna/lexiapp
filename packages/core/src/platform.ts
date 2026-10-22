/**
 * What the platform (today, the web app) provides to the core. The core never touches
 * browser APIs directly: it only talks to these contracts, which also lets tests use fakes.
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
}

// ─── Push notifications (daily reminder) ─────────────────────────────────────

/** A device's push subscription: where the server sends the notice and its encryption keys. */
export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * - `supported`: notifications can be turned on here.
 * - `needs-install`: iPhone/iPad browser: only works once Lexi is on the home screen.
 * - `unsupported`: this browser cannot receive push notifications.
 */
export type PushSupport = "supported" | "needs-install" | "unsupported";

export interface PushPlatform {
  support(): PushSupport;
  permission(): "default" | "granted" | "denied";
  /** This device's current subscription, if any. */
  current(): Promise<PushSubscriptionData | null>;
  /** Asks for permission if needed; `null` when the person does not allow notifications. */
  subscribe(vapidPublicKey: string): Promise<PushSubscriptionData | null>;
  unsubscribe(): Promise<void>;
  /** IANA time zone of the device, e.g. "Europe/Madrid". */
  timeZone(): string;
}
