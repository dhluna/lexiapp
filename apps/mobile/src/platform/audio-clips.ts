import type { AudioClipPlayer } from "@lexi/core/platform";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";

/** Recordings are streamed from the web (they would make the app ~35 MB bigger). */
export const AUDIO_BASE = "https://lexiapp.app/audio";

/** Without a loaded clip after this long (no network…), the system voice takes over. */
const LOAD_TIMEOUT_MS = 2500;

/** Lexi's recorded pronunciations behind the core's `AudioClipPlayer` contract (expo-audio). */
export function createExpoClipPlayer(base = AUDIO_BASE, fetchIndex: typeof fetch = fetch): AudioClipPlayer {
  let index: Promise<readonly string[]> | null = null;
  let current: { player: AudioPlayer; settle: (ok: boolean) => void } | null = null;

  return {
    loadIndex() {
      index ??= fetchIndex(`${base}/index.json`)
        .then((response) => {
          if (!response.ok) throw new Error(`audio index: ${response.status}`);
          return response.json() as Promise<{ keys: string[] }>;
        })
        .then((data) => data.keys)
        .catch((error: unknown) => {
          index = null; // offline: try again on a later word
          throw error;
        });
      return index;
    },

    play(clip, { rate, onDone, onError }) {
      current?.settle(true);
      const player = createAudioPlayer({ uri: `${base}/${clip}.mp3` });
      let settled = false;
      const settle = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        subscription.remove();
        if (current?.player === player) current = null;
        player.remove();
        if (ok) onDone();
        else onError();
      };
      const timeout = setTimeout(() => {
        if (!player.isLoaded) settle(false);
      }, LOAD_TIMEOUT_MS);
      const subscription = player.addListener("playbackStatusUpdate", (status) => {
        if (status.didJustFinish) settle(true);
      });
      current = { player, settle };
      player.shouldCorrectPitch = true;
      player.setPlaybackRate(rate, "high");
      player.play();
    },

    stop() {
      if (!current) return;
      const { player, settle } = current;
      player.pause();
      settle(true);
    },
  };
}
