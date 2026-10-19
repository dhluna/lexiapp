import { describe, expect, it, vi } from "vitest";
import { audioKey } from "../domain/audio";
import { MemoryStorage } from "../persistence/storage";
import type { AudioClipPlayer, ClipRequest, SpeechEngine, SpeechRequest, SpeechVoice } from "../platform";
import { pickEnglishVoice, SpeechService } from "./speech";
import { VoiceSettings } from "./voice-settings";

function fakeClips(keys: string[]) {
  const plays: { clip: string; request: ClipRequest }[] = [];
  const player: AudioClipPlayer = {
    loadIndex: () => Promise.resolve(keys),
    play: (clip, request) => void plays.push({ clip, request }),
    stop: vi.fn(),
  };
  return { player, plays };
}

function fakeEngine(voices: SpeechVoice[] = []) {
  const requests: { text: string; request: SpeechRequest }[] = [];
  const engine: SpeechEngine = {
    getVoices: () => voices,
    onVoicesChanged: () => () => {},
    speak: (text, request) => void requests.push({ text, request }),
    cancel: vi.fn(),
    isBusy: () => false,
  };
  return { engine, requests };
}

const voice = (lang: string, name = lang): SpeechVoice => ({ id: name, name, lang, localService: true });
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("SpeechService with Lexi's recordings", () => {
  it("plays the recording in the chosen voice and speed, and clears the state when it ends", async () => {
    const clips = fakeClips([audioKey("night")]);
    const voices = new VoiceSettings(new MemoryStorage());
    const { engine, requests } = fakeEngine([voice("en-US")]);
    const speech = new SpeechService(engine, { clips: clips.player, voices });
    await flush();

    expect(speech.speak("night", { rate: 0.6 })).toBe(true);
    expect(clips.plays[0].clip).toBe(`us-female/${audioKey("night")}`);
    expect(clips.plays[0].request.rate).toBe(0.6);
    expect(speech.speakingText).toBe("night");
    expect(requests).toHaveLength(0);

    clips.plays[0].request.onDone();
    expect(speech.speakingText).toBeNull();

    voices.set("uk-male");
    speech.speak("night");
    expect(clips.plays[1].clip).toBe(`uk-male/${audioKey("night")}`);
  });

  it("waits for the index when the first word comes before it", async () => {
    let resolve: (keys: string[]) => void = () => {};
    const plays: string[] = [];
    const player: AudioClipPlayer = {
      loadIndex: () => new Promise((r) => (resolve = r)),
      play: (clip) => void plays.push(clip),
      stop: () => {},
    };
    const { engine, requests } = fakeEngine([voice("en-US")]);
    const speech = new SpeechService(engine, { clips: player });
    expect(speech.speak("night")).toBe(true);
    expect(speech.speakingText).toBe("night");
    resolve([audioKey("night")]);
    await flush();
    expect(plays).toEqual([`us-female/${audioKey("night")}`]);
    expect(requests).toHaveLength(0);
  });

  it("uses the system voice for texts without a recording", async () => {
    const clips = fakeClips([audioKey("night")]);
    const { engine, requests } = fakeEngine([voice("en-US")]);
    const speech = new SpeechService(engine, { clips: clips.player });
    await flush();
    speech.speak("something new");
    expect(clips.plays).toHaveLength(0);
    expect(requests[0].text).toBe("something new");
  });

  it("falls back to the system voice when the recording cannot play (offline)", async () => {
    const clips = fakeClips([audioKey("night")]);
    const { engine, requests } = fakeEngine([voice("en-US")]);
    const onEnd = vi.fn();
    const speech = new SpeechService(engine, { clips: clips.player });
    await flush();
    speech.speak("night", { onEnd });
    clips.plays[0].request.onError();
    expect(requests[0].text).toBe("night");
    expect(speech.speakingText).toBe("night");
    requests[0].request.onDone();
    expect(speech.speakingText).toBeNull();
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it("works without any system voice once the recordings are known", async () => {
    const clips = fakeClips([audioKey("night")]);
    const speech = new SpeechService(null, { clips: clips.player });
    expect(speech.supported).toBe(true);
    await flush();
    expect(speech.availability).toBe("english");
    expect(speech.speak("night")).toBe(true);
  });

  it("retries the index on the next word if it could not load", async () => {
    let fail = true;
    const plays: string[] = [];
    const player: AudioClipPlayer = {
      loadIndex: () => (fail ? Promise.reject(new Error("offline")) : Promise.resolve([audioKey("night")])),
      play: (clip) => void plays.push(clip),
      stop: () => {},
    };
    const { engine, requests } = fakeEngine([voice("en-US")]);
    const speech = new SpeechService(engine, { clips: player });
    await flush();
    fail = false;
    speech.speak("night"); // reloads the index and waits for it
    await flush();
    expect(plays).toEqual([`us-female/${audioKey("night")}`]);
    expect(requests).toHaveLength(0);
  });

  it("prefers a system voice with the chosen accent", () => {
    const voices = [voice("en-US", "Google US English"), voice("en-GB", "Google UK English Female")];
    expect(pickEnglishVoice(voices)?.lang).toBe("en-US");
    expect(pickEnglishVoice(voices, "en-GB")?.lang).toBe("en-GB");
  });
});
