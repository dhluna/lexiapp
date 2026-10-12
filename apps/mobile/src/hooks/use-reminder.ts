import type { ReminderSettings } from "@lexi/core/domain/reminder";
import { useCallback, useSyncExternalStore } from "react";
import type { ReminderService } from "@/reminders";
import { useServices } from "./services-context";

export function useReminder(): { settings: ReminderSettings; service: ReminderService } {
  const { reminders } = useServices();
  const subscribe = useCallback((cb: () => void) => reminders().subscribe(cb), [reminders]);
  const settings = useSyncExternalStore(subscribe, () => reminders().getSettings());
  return { settings, service: reminders() };
}
