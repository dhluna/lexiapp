import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { ServicesProvider } from "@/hooks/services-context";
import { LocalStorageProgressRepository } from "@/persistence/progress-repository";
import { MemoryStorage } from "@/persistence/storage";
import { ProgressStore } from "@/services/progress-store";
import type { AuthService } from "@/services/auth";
import { SpeechService, type SpeechEnvironment } from "@/services/speech";
import type { SyncService } from "@/services/sync-service";

export function createFakeSpeech() {
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
  return { service: new SpeechService(env), synth };
}

/** Renders with real domain + store over in-memory storage and a fake speech engine. */
export function renderWithServices(
  ui: ReactElement,
  storage = new MemoryStorage(),
  extra: { auth?: AuthService | null; sync?: (store: ProgressStore) => SyncService | null } = {},
) {
  const store = new ProgressStore(new LocalStorageProgressRepository(storage));
  const speech = createFakeSpeech();
  // Accounts are off unless a test provides them (as in an install without Supabase).
  const auth = extra.auth ?? null;
  const sync = extra.sync ? extra.sync(store) : null;
  const result = render(
    <ServicesProvider value={{ progressStore: store, speech: speech.service, auth, sync }}>{ui}</ServicesProvider>,
  );
  return { ...result, store, storage, synth: speech.synth };
}
