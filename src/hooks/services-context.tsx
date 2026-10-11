"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getProgressStore, getSpeechService } from "@/services/instances";
import type { ProgressStore } from "@/services/progress-store";
import type { SpeechService } from "@/services/speech";

interface Services {
  progressStore?: ProgressStore;
  speech?: SpeechService;
}

export interface ServiceResolvers {
  progressStore: () => ProgressStore;
  speech: () => SpeechService;
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
    }),
    [services],
  );
}
