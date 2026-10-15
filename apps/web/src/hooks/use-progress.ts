"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { activePackIds, getActiveWords } from "@lexi/core/data/catalog";
import { toDayKey } from "@lexi/core/domain/dates";
import { computeStats, type ProgressStats } from "@lexi/core/domain/progress";
import type { ProgressSnapshot, ProgressStore } from "@lexi/core/services/progress-store";
import { useServices } from "./services-context";

const getServerSnapshot = () => null;

/** `null` until the client has read local storage (server render and hydration). */
export function useProgress(): ProgressSnapshot | null {
  const { progressStore } = useServices();
  const subscribe = useCallback(
    (onChange: () => void) => progressStore().subscribe(onChange),
    [progressStore],
  );
  const getSnapshot = useCallback(() => progressStore().getSnapshot(), [progressStore]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

type Actions = Pick<
  ProgressStore,
  | "recordAnswer"
  | "setWordStatus"
  | "completeSession"
  | "updatePreferences"
  | "setPackActive"
  | "resetProgress"
>;

/** Use-case actions, resolved lazily so they are safe to create during render. */
export function useProgressActions(): Actions {
  const { progressStore } = useServices();
  return useMemo(
    () => ({
      recordAnswer: (...args) => progressStore().recordAnswer(...args),
      setWordStatus: (...args) => progressStore().setWordStatus(...args),
      completeSession: (...args) => progressStore().completeSession(...args),
      updatePreferences: (...args) => progressStore().updatePreferences(...args),
      setPackActive: (...args) => progressStore().setPackActive(...args),
      resetProgress: () => progressStore().resetProgress(),
    }),
    [progressStore],
  );
}

/** Statistics of the active packs only: the words the learner is actually studying. */
export function useStats(): ProgressStats | null {
  const snapshot = useProgress();
  return useMemo(() => {
    if (!snapshot) return null;
    const { state } = snapshot;
    return computeStats(state, getActiveWords(state), activePackIds(state), toDayKey(new Date()));
  }, [snapshot]);
}
