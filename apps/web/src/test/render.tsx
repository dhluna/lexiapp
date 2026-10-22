import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { ServicesProvider } from "@/hooks/services-context";
import { LocalStorageProgressRepository } from "@lexi/core/persistence/progress-repository";
import { MemoryStorage } from "@lexi/core/persistence/storage";
import { ProgressStore } from "@lexi/core/services/progress-store";
import type { AuthService } from "@lexi/core/services/auth";
import { CelebrationSettings } from "@lexi/core/services/celebration-settings";
import { Celebrator } from "@lexi/core/services/celebrator";
import { SpeechService } from "@lexi/core/services/speech";
import { createWebSpeechEngine, type SpeechEnvironment } from "@/platform/speech";
import type { ReminderService } from "@lexi/core/services/reminder-service";
import type { SyncService } from "@lexi/core/services/sync-service";
import { VoiceSettings } from "@lexi/core/services/voice-settings";

export function createFakeSpeech(voices?: VoiceSettings) {
  const synth = {
    getVoices: () => [{ lang: "en-US", name: "Test", localService: true }],
    speak: vi.fn(),
    cancel: vi.fn(),
    addEventListener: vi.fn(),
  };
  class Utterance {
    lang = "";
    rate = 1;
    voice = null;
    onend = null;
    onerror = null;
    constructor(public text: string) {}
  }
  const env = { synth, Utterance } as unknown as SpeechEnvironment;
  return { service: new SpeechService(createWebSpeechEngine(env), { voices }), synth };
}

/** Renders with real domain + store over in-memory storage and a fake speech engine. */
export function renderWithServices(
  ui: ReactElement,
  storage = new MemoryStorage(),
  extra: {
    auth?: AuthService | null;
    sync?: (store: ProgressStore) => SyncService | null;
    reminders?: ReminderService | null;
  } = {},
) {
  const store = new ProgressStore(new LocalStorageProgressRepository(storage));
  const voiceSettings = new VoiceSettings(storage);
  const speech = createFakeSpeech(voiceSettings);
  // Accounts are off unless a test provides them (as in an install without Supabase).
  const auth = extra.auth ?? null;
  const sync = extra.sync ? extra.sync(store) : null;
  // Real celebration logic with spy effects: jsdom has no canvas or audio.
  const celebrationSettings = new CelebrationSettings(storage);
  const effects = { confetti: vi.fn(), sound: vi.fn() };
  const celebrator = new Celebrator(celebrationSettings, effects, () => speech.service.stop());
  const result = render(
    <ServicesProvider
      value={{
        progressStore: store,
        speech: speech.service,
        auth,
        sync,
        celebrator,
        celebrationSettings,
        voiceSettings,
        reminders: extra.reminders ?? null,
      }}
    >
      {ui}
    </ServicesProvider>,
  );
  return { ...result, store, storage, synth: speech.synth, effects, voiceSettings };
}
