import { LocalStorageProgressRepository } from "@lexi/core/persistence/progress-repository";
import { SupabaseRemoteProgress } from "@lexi/core/persistence/remote-progress";
import { SupabaseAuthService, type AuthService } from "@lexi/core/services/auth";
import { CelebrationSettings } from "@lexi/core/services/celebration-settings";
import { Celebrator } from "@lexi/core/services/celebrator";
import { ProgressStore } from "@lexi/core/services/progress-store";
import { SpeechService } from "@lexi/core/services/speech";
import { SyncService } from "@lexi/core/services/sync-service";
import { deviceAuthPlatform } from "@/platform/auth-platform";
import { playChime } from "@/platform/chime";
import { confettiBus } from "@/platform/confetti-bus";
import { deviceNotifications } from "@/platform/notifications";
import { createExpoSpeechEngine } from "@/platform/speech";
import { deviceStorage } from "@/platform/storage";
import { getSupabase } from "@/platform/supabase";
import { deviceIsOnline, deviceSyncTriggers } from "@/platform/sync-triggers";
import { ReminderService } from "@/reminders";

/** Mobile composition root: the shared core plus the native adapters. */
let progressStore: ProgressStore | null = null;
let speechService: SpeechService | null = null;
let authService: AuthService | null | undefined;
let syncService: SyncService | null | undefined;
let reminderService: ReminderService | null = null;
let celebrationSettings: CelebrationSettings | null = null;
let celebrator: Celebrator | null = null;

export function getProgressStore(): ProgressStore {
  progressStore ??= new ProgressStore(new LocalStorageProgressRepository(deviceStorage));
  return progressStore;
}

export function getSpeechService(): SpeechService {
  speechService ??= new SpeechService(createExpoSpeechEngine());
  return speechService;
}

/** `null` when accounts are not configured: the app then works without them. */
export function getAuthService(): AuthService | null {
  if (authService !== undefined) return authService;
  const client = getSupabase();
  authService = client ? new SupabaseAuthService(client, deviceAuthPlatform) : null;
  return authService;
}

export function getSyncService(): SyncService | null {
  if (syncService !== undefined) return syncService;
  const client = getSupabase();
  const auth = getAuthService();
  if (!client || !auth) {
    syncService = null;
    return syncService;
  }
  syncService = new SyncService(getProgressStore(), new SupabaseRemoteProgress(client), auth, deviceStorage, {
    triggers: deviceSyncTriggers,
    isOnline: deviceIsOnline,
  });
  syncService.start();
  return syncService;
}

export function getReminderService(): ReminderService {
  if (reminderService) return reminderService;
  reminderService = new ReminderService(getProgressStore(), deviceStorage, deviceNotifications);
  reminderService.start();
  return reminderService;
}

/** Device setting: whether finishing a session plays the chime and vibrates (not synced). */
export function getCelebrationSettings(): CelebrationSettings {
  celebrationSettings ??= new CelebrationSettings(deviceStorage);
  return celebrationSettings;
}

export function getCelebrator(): Celebrator {
  celebrator ??= new Celebrator(
    getCelebrationSettings(),
    { confetti: (kind) => confettiBus.emit(kind), sound: playChime },
    () => getSpeechService().stop(),
  );
  return celebrator;
}
