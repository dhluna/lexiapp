import { useCallback, useSyncExternalStore } from "react";
import { useServices } from "./services-context";

/** The device's "Sonido de celebración" setting (sound and vibration). */
export function useCelebrationSound(): [boolean, (enabled: boolean) => void] {
  const { celebrationSettings } = useServices();
  const subscribe = useCallback((cb: () => void) => celebrationSettings().subscribe(cb), [celebrationSettings]);
  const enabled = useSyncExternalStore(subscribe, () => celebrationSettings().soundEnabled());
  const setEnabled = useCallback(
    (value: boolean) => celebrationSettings().setSoundEnabled(value),
    [celebrationSettings],
  );
  return [enabled, setEnabled];
}
