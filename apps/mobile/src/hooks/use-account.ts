import { useCallback, useSyncExternalStore } from "react";
import type { AuthService, AuthSnapshot } from "@lexi/core/services/auth";
import type { SyncService, SyncSnapshot } from "@lexi/core/services/sync-service";
import { useServices } from "./services-context";

const noop = () => () => {};

export interface UseAuth {
  /** `false` when accounts are not configured. */
  available: boolean;
  snapshot: AuthSnapshot | null;
  service: AuthService | null;
}

export function useAuth(): UseAuth {
  const { auth } = useServices();
  const subscribe = useCallback((cb: () => void) => auth()?.subscribe(cb) ?? noop(), [auth]);
  const snapshot = useSyncExternalStore(subscribe, () => auth()?.getSnapshot() ?? null);
  const service = auth();
  return { available: service !== null, snapshot, service };
}

export function useSync(): { snapshot: SyncSnapshot | null; service: SyncService | null } {
  const { sync } = useServices();
  const subscribe = useCallback((cb: () => void) => sync()?.subscribe(cb) ?? noop(), [sync]);
  const snapshot = useSyncExternalStore(subscribe, () => sync()?.getSnapshot() ?? null);
  return { snapshot, service: sync() };
}
