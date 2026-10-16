import type { Celebration } from "@lexi/core/domain/celebration";
import { createAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";

// Bundled audio assets.
const SOURCES = {
  normal: require("../../assets/sounds/celebrate.wav"),
  perfect: require("../../assets/sounds/celebrate-perfect.wav"),
};

/**
 * The celebration chime (rendered from the same notes as the web by
 * scripts/generate-chimes.mjs) plus a "success" vibration. On iOS it follows the silent
 * switch, the default audio mode.
 */
export function playChime(kind: Exclude<Celebration, "none">): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  const player = createAudioPlayer(SOURCES[kind]);
  player.volume = 0.8;
  player.play();
  // Free the native player once the chime (≤ 2 s) has finished.
  setTimeout(() => player.remove(), 3000);
}
