import { createAudioPlayer } from "expo-audio";
import { createExpoClipPlayer } from "./audio-clips";

type Listener = (status: { didJustFinish: boolean }) => void;

jest.mock("expo-audio", () => ({ createAudioPlayer: jest.fn() }));

function fakePlayer(isLoaded = true) {
  let listener: Listener = () => {};
  const player = {
    isLoaded,
    shouldCorrectPitch: false,
    setPlaybackRate: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn((_event: string, l: Listener) => {
      listener = l;
      return { remove: jest.fn() };
    }),
    finish: () => listener({ didJustFinish: true }),
  };
  (createAudioPlayer as jest.Mock).mockReturnValueOnce(player);
  return player;
}

afterEach(() => jest.useRealTimers());

describe("mobile clip player", () => {
  it("streams the recording from lexiapp.app at the requested speed, keeping the pitch", () => {
    const player = fakePlayer();
    const onDone = jest.fn();
    createExpoClipPlayer().play("us-male/night-abc", { rate: 0.6, onDone, onError: jest.fn() });
    expect(createAudioPlayer).toHaveBeenLastCalledWith({ uri: "https://lexiapp.app/audio/us-male/night-abc.mp3" });
    expect(player.shouldCorrectPitch).toBe(true);
    expect(player.setPlaybackRate).toHaveBeenCalledWith(0.6, "high");
    player.finish();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(player.remove).toHaveBeenCalled();
  });

  it("gives up when the clip does not load (offline), so the system voice takes over", () => {
    jest.useFakeTimers();
    fakePlayer(false);
    const onError = jest.fn();
    createExpoClipPlayer().play("us-female/a", { rate: 1, onDone: jest.fn(), onError });
    jest.advanceTimersByTime(3000);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("loads the index from the web", async () => {
    const fetchIndex = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ keys: ["night-abc"] }) });
    await expect(createExpoClipPlayer(undefined, fetchIndex).loadIndex()).resolves.toEqual(["night-abc"]);
    expect(fetchIndex).toHaveBeenCalledWith("https://lexiapp.app/audio/index.json");
  });
});
