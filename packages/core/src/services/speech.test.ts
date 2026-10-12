import { describe, expect, it, vi } from "vitest";
import type { SpeechEngine, SpeechRequest, SpeechVoice } from "../platform";
import { SpeechService } from "./speech";

/** Platform-free engine: records requests and lets the test finish them. */
function fakeEngine(initial: SpeechVoice[] = []) {
  let voices = initial;
  let busy = false;
  const voiceListeners = new Set<() => void>();
  const requests: { text: string; request: SpeechRequest }[] = [];
  const engine: SpeechEngine = {
    getVoices: () => voices,
    onVoicesChanged: (l) => {
      voiceListeners.add(l);
      return () => voiceListeners.delete(l);
    },
    speak: (text, request) => {
      busy = true;
      requests.push({ text, request });
    },
    cancel: vi.fn(() => {
      busy = false;
    }),
    isBusy: () => busy,
  };
  return {
    engine,
    requests,
    setVoices(next: SpeechVoice[]) {
      voices = next;
      voiceListeners.forEach((l) => l());
    },
    finish(index: number) {
      busy = false;
      requests[index].request.onDone();
    },
  };
}

const voice = (lang: string, name = lang): SpeechVoice => ({ id: name, name, lang, localService: true });

describe("SpeechService over any engine", () => {
  it("speaks with the best English voice at native speed", () => {
    const fake = fakeEngine([voice("es-ES"), voice("en-GB"), voice("en-US")]);
    const service = new SpeechService(fake.engine);
    expect(service.availability).toBe("english");
    service.speak("luggage");
    expect(fake.requests[0].text).toBe("luggage");
    expect(fake.requests[0].request).toMatchObject({ lang: "en-US", rate: 1, voice: { lang: "en-US" } });
  });

  it("falls back to en-US without an English voice and picks voices that load later", () => {
    const fake = fakeEngine([voice("es-ES")]);
    const service = new SpeechService(fake.engine);
    expect(service.availability).toBe("fallback");
    service.speak("hello");
    expect(fake.requests[0].request).toMatchObject({ lang: "en-US", voice: null });

    fake.setVoices([voice("en-AU")]);
    expect(service.availability).toBe("english");
  });

  it("keeps the playing state of the latest utterance only, and interrupts only when busy", () => {
    const fake = fakeEngine([voice("en-US")]);
    const service = new SpeechService(fake.engine);

    service.speak("one");
    expect(fake.engine.cancel).not.toHaveBeenCalled();
    service.speak("two");
    expect(fake.engine.cancel).toHaveBeenCalledTimes(1);

    fake.requests[0].request.onDone(); // late end of the cancelled utterance
    expect(service.speakingText).toBe("two");
    fake.finish(1);
    expect(service.speakingText).toBeNull();
  });

  it("reports unsupported without an engine and never throws", () => {
    const service = new SpeechService(null);
    expect(service.availability).toBe("unsupported");
    expect(service.speak("hi")).toBe(false);
    expect(() => service.stop()).not.toThrow();
  });
});
