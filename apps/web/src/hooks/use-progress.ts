"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { CATEGORY_IDS } from "@lexi/core/data/categories";
import { WORDS } from "@lexi/core/data/catalog";
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
  "recordAnswer" | "setWordStatus" | "completeSession" | "updatePreferences" | "resetProgress"
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
      resetProgress: () => progressStore().resetProgress(),
    }),
    [progressStore],
  );
}

export function useStats(): ProgressStats | null {
  const snapshot = useProgress();
  return useMemo(
    () =>
      snapshot ? computeStats(snapshot.state, WORDS, CATEGORY_IDS, toDayKey(new Date())) : null,
    [snapshot],
  );
}
