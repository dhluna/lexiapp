"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { AuthService, AuthSnapshot } from "@/services/auth";
import type { SyncService, SyncSnapshot } from "@/services/sync-service";
import { useServices } from "./services-context";

const noop = () => () => {};
const getNull = () => null;

export interface UseAuth {
  /** `false` when accounts are not configured, `null` while unknown (server render). */
  available: boolean | null;
  snapshot: AuthSnapshot | null;
  service: AuthService | null;
}

export function useAuth(): UseAuth {
  const { auth } = useServices();
  const subscribe = useCallback((cb: () => void) => auth()?.subscribe(cb) ?? noop(), [auth]);
  const snapshot = useSyncExternalStore(subscribe, () => auth()?.getSnapshot() ?? null, getNull);
  const available = useSyncExternalStore(noop, () => auth() !== null, getNull);
  return { available, snapshot, service: available ? auth() : null };
}

export function useSync(): { snapshot: SyncSnapshot | null; service: SyncService | null } {
  const { sync } = useServices();
  const subscribe = useCallback((cb: () => void) => sync()?.subscribe(cb) ?? noop(), [sync]);
  const snapshot = useSyncExternalStore(subscribe, () => sync()?.getSnapshot() ?? null, getNull);
  return { snapshot, service: snapshot ? sync() : null };
}

/** Mounted once in the layout: starts syncing in the browser when accounts are configured. */
export function SyncBootstrap() {
  const { sync } = useServices();
  useEffect(() => {
    sync();
  }, [sync]);
  return null;
}
