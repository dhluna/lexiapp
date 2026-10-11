import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { ServicesProvider } from "@/hooks/services-context";
import { LocalStorageProgressRepository } from "@/persistence/progress-repository";
import { MemoryStorage } from "@/persistence/storage";
import { ProgressStore } from "@/services/progress-store";
import { SpeechService, type SpeechEnvironment } from "@/services/speech";

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
export function renderWithServices(ui: ReactElement, storage = new MemoryStorage()) {
  const store = new ProgressStore(new LocalStorageProgressRepository(storage));
  const speech = createFakeSpeech();
  const result = render(
    <ServicesProvider value={{ progressStore: store, speech: speech.service }}>{ui}</ServicesProvider>,
  );
  return { ...result, store, storage, synth: speech.synth };
}
