import type { SpeechEngine, SpeechVoice } from "@lexi/core/platform";

export interface SpeechEnvironment {
  synth: SpeechSynthesis;
  Utterance: typeof SpeechSynthesisUtterance;
}

export function detectSpeechEnvironment(): SpeechEnvironment | null {
  if (typeof window === "undefined") return null;
  const synth = window.speechSynthesis;
  const Utterance = window.SpeechSynthesisUtterance;
  if (!synth || typeof Utterance !== "function") return null;
  return { synth, Utterance };
}

/** Web Speech API behind the core's `SpeechEngine` contract. */
export function createWebSpeechEngine(env: SpeechEnvironment): SpeechEngine {
  // The browser needs its own voice objects back to use them.
  const native = new Map<string, SpeechSynthesisVoice>();
  const toVoice = (v: SpeechSynthesisVoice): SpeechVoice => {
    const id = v.voiceURI || v.name;
    native.set(id, v);
    return { id, name: v.name, lang: v.lang, localService: v.localService };
  };

  return {
    getVoices: () => env.synth.getVoices().map(toVoice),
    onVoicesChanged(listener) {
      env.synth.addEventListener?.("voiceschanged", listener);
      return () => env.synth.removeEventListener?.("voiceschanged", listener);
    },
    speak(text, { voice, lang, rate, onDone }) {
      const utterance = new env.Utterance(text);
      utterance.lang = lang;
      const nativeVoice = voice ? native.get(voice.id) : undefined;
      if (nativeVoice) utterance.voice = nativeVoice;
      utterance.rate = rate;
      utterance.onend = onDone;
      utterance.onerror = onDone;
      env.synth.speak(utterance);
    },
    cancel: () => env.synth.cancel(),
    isBusy: () => env.synth.speaking || env.synth.pending,
  };
}
