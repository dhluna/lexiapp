import { useCallback, useSyncExternalStore } from "react";
import type { VoiceAvailability } from "@lexi/core/services/speech";
import { useProgress } from "./use-progress";
import { useServices } from "./services-context";

export interface UseSpeech {
  availability: VoiceAvailability;
  speakingText: string | null;
  speak: (text: string) => void;
  stop: () => void;
}

export function useSpeech(): UseSpeech {
  const { speech } = useServices();
  const rate = useProgress().state.preferences.speechRate;
  const subscribe = useCallback((onChange: () => void) => speech().subscribe(onChange), [speech]);
  const availability = useSyncExternalStore(subscribe, () => speech().availability);
  const speakingText = useSyncExternalStore(subscribe, () => speech().speakingText);
  const speak = useCallback((text: string) => void speech().speak(text, { rate }), [speech, rate]);
  const stop = useCallback(() => speech().stop(), [speech]);
  return { availability, speakingText, speak, stop };
}
