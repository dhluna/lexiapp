"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AuthService } from "@lexi/core/services/auth";
import { getAuthService, getProgressStore, getSpeechService, getSyncService } from "@/services/instances";
import type { ProgressStore } from "@lexi/core/services/progress-store";
import type { SpeechService } from "@lexi/core/services/speech";
import type { SyncService } from "@lexi/core/services/sync-service";

interface Services {
  progressStore?: ProgressStore;
  speech?: SpeechService;
  /** `null` = accounts disabled. Omitted = use the browser singleton. */
  auth?: AuthService | null;
  sync?: SyncService | null;
}

export interface ServiceResolvers {
  progressStore: () => ProgressStore;
  speech: () => SpeechService;
  auth: () => AuthService | null;
  sync: () => SyncService | null;
}

const ServicesContext = createContext<Services>({});

/** Lets tests (or a future native shell) inject their own implementations. */
export function ServicesProvider({ value, children }: { value: Services; children: ReactNode }) {
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

/**
 * Stable lazy resolvers: browser singletons are created on first use in the client,
 * never while prerendering on the server.
 */
export function useServices(): ServiceResolvers {
  const services = useContext(ServicesContext);
  return useMemo(
    () => ({
      progressStore: () => services.progressStore ?? getProgressStore(),
      speech: () => services.speech ?? getSpeechService(),
      auth: () => (services.auth !== undefined ? services.auth : getAuthService()),
      sync: () => (services.sync !== undefined ? services.sync : getSyncService()),
    }),
    [services],
  );
}
