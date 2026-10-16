import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AuthService } from "@lexi/core/services/auth";
import type { CelebrationSettings } from "@lexi/core/services/celebration-settings";
import type { Celebrator } from "@lexi/core/services/celebrator";
import type { ProgressStore } from "@lexi/core/services/progress-store";
import type { SpeechService } from "@lexi/core/services/speech";
import type { SyncService } from "@lexi/core/services/sync-service";
import type { ReminderService } from "@/reminders";
import {
  getAuthService,
  getCelebrationSettings,
  getCelebrator,
  getProgressStore,
  getReminderService,
  getSpeechService,
  getSyncService,
} from "@/services";

interface Services {
  progressStore?: ProgressStore;
  speech?: SpeechService;
  /** `null` = accounts disabled. Omitted = use the app singleton. */
  auth?: AuthService | null;
  sync?: SyncService | null;
  reminders?: ReminderService;
  celebrator?: Celebrator;
  celebrationSettings?: CelebrationSettings;
}

export interface ServiceResolvers {
  progressStore: () => ProgressStore;
  speech: () => SpeechService;
  auth: () => AuthService | null;
  sync: () => SyncService | null;
  reminders: () => ReminderService;
  celebrator: () => Celebrator;
  celebrationSettings: () => CelebrationSettings;
}

const ServicesContext = createContext<Services>({});

/** Lets tests inject their own implementations (same pattern as the web). */
export function ServicesProvider({ value, children }: { value: Services; children: ReactNode }) {
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices(): ServiceResolvers {
  const services = useContext(ServicesContext);
  return useMemo(
    () => ({
      progressStore: () => services.progressStore ?? getProgressStore(),
      speech: () => services.speech ?? getSpeechService(),
      auth: () => (services.auth !== undefined ? services.auth : getAuthService()),
      sync: () => (services.sync !== undefined ? services.sync : getSyncService()),
      reminders: () => services.reminders ?? getReminderService(),
      celebrator: () => services.celebrator ?? getCelebrator(),
      celebrationSettings: () => services.celebrationSettings ?? getCelebrationSettings(),
    }),
    [services],
  );
}
