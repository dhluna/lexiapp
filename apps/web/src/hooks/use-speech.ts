"use client";

import { useCallback, useSyncExternalStore } from "react";
import { playbackRate } from "@lexi/core/domain/progress";
import type { VoiceAvailability } from "@lexi/core/services/speech";
import { useProgress } from "./use-progress";
import { useServices } from "./services-context";

export interface UseSpeech {
  /** `null` while unknown (server render). */
  availability: VoiceAvailability | null;
  speakingText: string | null;
  /** `rate` overrides the learner's speed (e.g. "Más lento" in dictation). */
  speak: (text: string, rate?: number) => void;
  stop: () => void;
}

const getNull = () => null;

export function useSpeech(): UseSpeech {
  const { speech } = useServices();
  const snapshot = useProgress();
  const preference = snapshot?.state.preferences.speechRate;
  const rate = preference === undefined ? undefined : playbackRate(preference);

  const subscribe = useCallback((onChange: () => void) => speech().subscribe(onChange), [speech]);
  const availability = useSyncExternalStore(subscribe, () => speech().availability, getNull);
  const speakingText = useSyncExternalStore(subscribe, () => speech().speakingText, getNull);

  const speak = useCallback(
    (text: string, override?: number) => void speech().speak(text, { rate: override ?? rate }),
    [speech, rate],
  );
  const stop = useCallback(() => speech().stop(), [speech]);

  return { availability, speakingText, speak, stop };
}
