import type { SpeechEngine, SpeechVoice } from "@lexi/core/platform";
import * as Speech from "expo-speech";

/**
 * The system's text-to-speech (works offline) behind the core's SpeechEngine contract.
 * Voices are listed asynchronously and may arrive late on Android, so we retry briefly.
 */
export function createExpoSpeechEngine(): SpeechEngine {
  let voices: SpeechVoice[] = [];
  let playing = 0;
  const listeners = new Set<() => void>();

  const load = async (attempt = 0) => {
    try {
      const list = await Speech.getAvailableVoicesAsync();
      voices = list.map((v) => ({
        id: v.identifier,
        // "Enhanced" lets the core's quality ranking prefer the system's best voices.
        name: v.quality === Speech.VoiceQuality.Enhanced ? `${v.name} Enhanced` : v.name,
        lang: v.language,
        localService: !/network/i.test(v.identifier),
      }));
      listeners.forEach((listener) => listener());
      if (list.length === 0 && attempt < 3) setTimeout(() => void load(attempt + 1), 1000);
    } catch {
      // Without a voice list the core falls back to lang="en-US".
    }
  };
  void load();

  return {
    getVoices: () => voices,
    onVoicesChanged(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    speak(text, { voice, lang, rate, onDone }) {
      playing += 1;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        playing = Math.max(0, playing - 1);
        onDone();
      };
      Speech.speak(text, {
        language: lang,
        voice: voice?.id,
        rate,
        onDone: finish,
        onStopped: finish,
        onError: finish,
      });
    },
    cancel() {
      void Speech.stop();
    },
    isBusy: () => playing > 0,
  };
}
