import { describe, expect, it, vi } from "vitest";
import { pickEnglishVoice, SpeechService } from "@lexi/core/services/speech";
import { createWebSpeechEngine, type SpeechEnvironment } from "./speech";

const voice = (lang: string, name = lang, localService = true) =>
  ({ lang, name, localService, default: false, voiceURI: name }) as SpeechSynthesisVoice;

class FakeUtterance {
  lang = "";
  rate = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

function fakeEnv(voices: SpeechSynthesisVoice[] = []) {
  const listeners: Record<string, () => void> = {};
  const synth = {
    getVoices: vi.fn(() => voices),
    speak: vi.fn(),
    cancel: vi.fn(),
    addEventListener: vi.fn((event: string, cb: () => void) => {
      listeners[event] = cb;
    }),
  };
  const env = { synth, Utterance: FakeUtterance } as unknown as SpeechEnvironment;
  return { env, synth, fire: (event: string) => listeners[event]?.() };
}

describe("pickEnglishVoice", () => {
  it("prefers en-US, then en-GB, then any English voice", () => {
    expect(pickEnglishVoice([voice("es-ES"), voice("en-GB"), voice("en-US")])?.lang).toBe("en-US");
    expect(pickEnglishVoice([voice("es-ES"), voice("en-IN"), voice("en-GB")])?.lang).toBe("en-GB");
    expect(pickEnglishVoice([voice("es-ES"), voice("en_IN")])?.lang).toBe("en_IN");
    expect(pickEnglishVoice([voice("es-ES")])).toBeNull();
  });

  it("prefers high-quality voices over basic ones", () => {
    const basic = voice("en-US", "Microsoft David - English (United States)");
    const natural = voice("en-GB", "Microsoft Sonia Online (Natural) - English (United Kingdom)", false);
    const google = voice("en-US", "Google US English", false);
    expect(pickEnglishVoice([basic, natural])?.name).toBe(natural.name);
    expect(pickEnglishVoice([basic, natural, google])?.name).toBe(google.name);
  });

  it("prefers local voices for the same language", () => {
    const remote = voice("en-US", "remote", false);
    const local = voice("en-US", "local", true);
    expect(pickEnglishVoice([remote, local])?.name).toBe("local");
  });
});

describe("SpeechService", () => {
  it("degrades gracefully without speech support", () => {
    const service = new SpeechService(null);
    expect(service.availability).toBe("unsupported");
    expect(service.speak("hello")).toBe(false);
    expect(() => service.stop()).not.toThrow();
  });

  it("speaks with the best English voice", () => {
    const { env, synth } = fakeEnv([voice("es-ES"), voice("en-US")]);
    const service = new SpeechService(createWebSpeechEngine(env));
    expect(service.availability).toBe("english");
    expect(service.speak("luggage", { rate: 0.8 })).toBe(true);
    // Nothing was playing, so the engine is not interrupted (avoids clicks).
    expect(synth.cancel).not.toHaveBeenCalled();
    const utterance = synth.speak.mock.calls[0][0] as unknown as FakeUtterance;
    expect(utterance).toMatchObject({ text: "luggage", lang: "en-US", rate: 0.8 });
  });

  it("still speaks with lang en-US when no English voice exists", () => {
    const { env, synth } = fakeEnv([voice("es-ES")]);
    const service = new SpeechService(createWebSpeechEngine(env));
    expect(service.availability).toBe("fallback");
    service.speak("hello");
    const utterance = synth.speak.mock.calls[0][0] as unknown as FakeUtterance;
    expect(utterance.lang).toBe("en-US");
    expect(utterance.voice).toBeNull();
  });

  it("picks up voices that load later and notifies subscribers", () => {
    const voices: SpeechSynthesisVoice[] = [];
    const { env, fire } = fakeEnv(voices);
    const service = new SpeechService(createWebSpeechEngine(env));
    const listener = vi.fn();
    service.subscribe(listener);
    expect(service.availability).toBe("fallback");
    voices.push(voice("en-GB"));
    fire("voiceschanged");
    expect(service.availability).toBe("english");
    expect(listener).toHaveBeenCalled();
  });

  it("calls onEnd and returns false if the engine throws", () => {
    const { env, synth } = fakeEnv([voice("en-US")]);
    synth.speak.mockImplementation(() => {
      throw new Error("boom");
    });
    const onEnd = vi.fn();
    expect(new SpeechService(createWebSpeechEngine(env)).speak("hi", { onEnd })).toBe(false);
    expect(onEnd).toHaveBeenCalled();
  });

  it("ignores empty text", () => {
    const { env, synth } = fakeEnv([voice("en-US")]);
    expect(new SpeechService(createWebSpeechEngine(env)).speak("   ")).toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("shares the playing state and ignores the end of a cancelled utterance", () => {
    const { env, synth } = fakeEnv([voice("en-US")]);
    const service = new SpeechService(createWebSpeechEngine(env));
    const listener = vi.fn();
    service.subscribe(listener);

    service.speak("luggage");
    const first = synth.speak.mock.calls[0][0] as unknown as FakeUtterance;
    expect(service.speakingText).toBe("luggage");

    service.speak("customs");
    const second = synth.speak.mock.calls[1][0] as unknown as FakeUtterance;
    first.onerror?.(); // fired late by the engine after cancel()
    expect(service.speakingText).toBe("customs");

    second.onend?.();
    expect(service.speakingText).toBeNull();
    expect(listener).toHaveBeenCalled();

    service.speak("abroad");
    service.stop();
    expect(service.speakingText).toBeNull();
  });

  it("interrupts only when something is playing, at native speed by default", () => {
    const { env, synth } = fakeEnv([voice("en-US")]);
    const service = new SpeechService(createWebSpeechEngine(env));
    service.speak("luggage");
    expect(synth.cancel).not.toHaveBeenCalled();
    expect((synth.speak.mock.calls[0][0] as unknown as FakeUtterance).rate).toBe(1);

    (synth as unknown as { speaking: boolean }).speaking = true;
    service.speak("customs");
    expect(synth.cancel).toHaveBeenCalledTimes(1);
  });
});
