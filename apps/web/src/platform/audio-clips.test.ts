import { afterEach, describe, expect, it, vi } from "vitest";
import { createWebClipPlayer } from "./audio-clips";

/** Minimal HTMLAudioElement: records the src and lets the test end or fail playback. */
class FakeAudio {
  static instances: FakeAudio[] = [];
  preservesPitch = false;
  playbackRate = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  paused = false;
  constructor(public src: string) {
    FakeAudio.instances.push(this);
  }
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn(() => {
    this.paused = true;
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeAudio.instances = [];
});

describe("web clip player", () => {
  it("plays /audio/<voice>/<key>.mp3 at the requested speed, keeping the pitch", () => {
    vi.stubGlobal("Audio", FakeAudio);
    const onDone = vi.fn();
    createWebClipPlayer().play("uk-male/night-abc", { rate: 0.6, onDone, onError: vi.fn() });
    const audio = FakeAudio.instances[0];
    expect(audio.src).toBe("/audio/uk-male/night-abc.mp3");
    expect(audio.playbackRate).toBe(0.6);
    expect(audio.preservesPitch).toBe(true);
    audio.onended?.();
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("reports a failure (so the system voice takes over) and ends a clip only once when stopped", () => {
    vi.stubGlobal("Audio", FakeAudio);
    const player = createWebClipPlayer();
    const first = { onDone: vi.fn(), onError: vi.fn() };
    player.play("us-female/a", { rate: 1, ...first });
    player.stop();
    FakeAudio.instances[0].onended?.();
    expect(FakeAudio.instances[0].paused).toBe(true);
    expect(first.onDone).toHaveBeenCalledOnce();

    const second = { onDone: vi.fn(), onError: vi.fn() };
    player.play("us-female/b", { rate: 1, ...second });
    FakeAudio.instances[1].onerror?.();
    expect(second.onError).toHaveBeenCalledOnce();
    expect(second.onDone).not.toHaveBeenCalled();
  });

  it("loads the index once and retries after a failure", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ keys: ["night-abc"] }) });
    vi.stubGlobal("fetch", fetchMock);
    const player = createWebClipPlayer();
    await expect(player.loadIndex()).rejects.toThrow("offline");
    await expect(player.loadIndex()).resolves.toEqual(["night-abc"]);
    await player.loadIndex();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith("/audio/index.json");
  });
});
