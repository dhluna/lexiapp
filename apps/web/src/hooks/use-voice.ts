"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_VOICE, type VoiceId } from "@lexi/core/data/voices";
import { useServices } from "./services-context";

/** The device's recorded voice (EE. UU. / Reino Unido, mujer / hombre). The default while prerendering. */
export function useVoice(): [VoiceId, (voice: VoiceId) => void] {
  const { voiceSettings } = useServices();
  const subscribe = useCallback((cb: () => void) => voiceSettings().subscribe(cb), [voiceSettings]);
  const voice = useSyncExternalStore(subscribe, () => voiceSettings().get(), () => DEFAULT_VOICE);
  const setVoice = useCallback((value: VoiceId) => voiceSettings().set(value), [voiceSettings]);
  return [voice, setVoice];
}
