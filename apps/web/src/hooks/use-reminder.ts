"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { ReminderService, ReminderSnapshot } from "@lexi/core/services/reminder-service";
import { useServices } from "./services-context";

const noop = () => () => {};
const getNull = () => null;

/** The device's daily reminder. `null` while prerendering or when reminders are not configured. */
export function useReminder(): { snapshot: ReminderSnapshot | null; service: ReminderService | null } {
  const { reminders } = useServices();
  const subscribe = useCallback((cb: () => void) => reminders()?.subscribe(cb) ?? noop(), [reminders]);
  const snapshot = useSyncExternalStore(subscribe, () => reminders()?.getSnapshot() ?? null, getNull);
  useEffect(() => {
    void reminders()?.refresh();
  }, [reminders]);
  return { snapshot, service: snapshot ? reminders() : null };
}
