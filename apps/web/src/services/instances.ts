import {
  InMemoryProgressRepository,
  LocalStorageProgressRepository,
  STORAGE_KEY,
} from "@lexi/core/persistence/progress-repository";
import { SupabaseRemoteProgress } from "@lexi/core/persistence/remote-progress";
import { SupabaseReminderRemote } from "@lexi/core/persistence/remote-reminders";
import { MemoryStorage } from "@lexi/core/persistence/storage";
import { SupabaseAuthService, type AuthService } from "@lexi/core/services/auth";
import { CelebrationSettings } from "@lexi/core/services/celebration-settings";
import { Celebrator } from "@lexi/core/services/celebrator";
import { ProgressStore } from "@lexi/core/services/progress-store";
import { ReminderService } from "@lexi/core/services/reminder-service";
import { SpeechService } from "@lexi/core/services/speech";
import { SyncService } from "@lexi/core/services/sync-service";
import { VoiceSettings } from "@lexi/core/services/voice-settings";
import { getSupabase } from "@/lib/supabase";
import { webAuthPlatform } from "@/platform/auth-platform";
import { createWebClipPlayer } from "@/platform/audio-clips";
import { playChime } from "@/platform/chime";
import { launchConfetti } from "@/platform/confetti";
import { createWebPush } from "@/platform/push";
import { createWebSpeechEngine, detectSpeechEnvironment } from "@/platform/speech";
import { getBrowserStorage } from "@/platform/storage";
import { browserIsOnline, browserSyncTriggers } from "@/platform/sync-triggers";

/** Browser composition root: the shared core plus the web adapters. Only call from client code. */
let progressStore: ProgressStore | null = null;
let speechService: SpeechService | null = null;
let authService: AuthService | null | undefined;
let syncService: SyncService | null | undefined;
let celebrationSettings: CelebrationSettings | null = null;
let celebrator: Celebrator | null = null;
let voiceSettings: VoiceSettings | null = null;
let reminderService: ReminderService | null | undefined;

export function getProgressStore(): ProgressStore {
  if (progressStore) return progressStore;
  const storage = getBrowserStorage();
  const repository = storage
    ? new LocalStorageProgressRepository(storage)
    : new InMemoryProgressRepository(undefined, "unavailable");
  const store = new ProgressStore(repository);
  if (storage && typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY) store.reload();
    });
  }
  progressStore = store;
  return store;
}

export function getSpeechService(): SpeechService {
  if (speechService) return speechService;
  const env = detectSpeechEnvironment();
  speechService = new SpeechService(env ? createWebSpeechEngine(env) : null, {
    // Recorded neural voices from /audio, with the system voice as a fallback.
    clips: typeof window !== "undefined" && typeof Audio !== "undefined" ? createWebClipPlayer() : null,
    voices: getVoiceSettings(),
  });
  return speechService;
}

/** Device setting: which recorded voice plays (not synced). */
export function getVoiceSettings(): VoiceSettings {
  voiceSettings ??= new VoiceSettings(getBrowserStorage() ?? new MemoryStorage());
  return voiceSettings;
}

/** `null` when accounts are not configured: the app then works without them. */
export function getAuthService(): AuthService | null {
  if (authService !== undefined) return authService;
  const client = getSupabase();
  authService = client && typeof window !== "undefined"
    ? new SupabaseAuthService(client, webAuthPlatform(window.location.origin))
    : null;
  return authService;
}

/** Created and started once, on the client, only when accounts are configured. */
export function getSyncService(): SyncService | null {
  if (syncService !== undefined) return syncService;
  const client = getSupabase();
  const auth = getAuthService();
  if (!client || !auth || typeof window === "undefined") {
    syncService = null;
    return syncService;
  }
  syncService = new SyncService(
    getProgressStore(),
    new SupabaseRemoteProgress(client),
    auth,
    getBrowserStorage() ?? new MemoryStorage(),
    {
      triggers: browserSyncTriggers(window),
      isOnline: browserIsOnline,
      beforeSignOut: () => getReminderService()?.forgetDevice() ?? Promise.resolve(),
    },
  );
  syncService.start();
  return syncService;
}

/**
 * Daily reminder of this device. `null` without accounts or without the VAPID public key
 * (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`): Ajustes then hides it.
 */
export function getReminderService(): ReminderService | null {
  if (reminderService !== undefined) return reminderService;
  const client = getSupabase();
  const auth = getAuthService();
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  reminderService =
    client && auth && vapidKey && typeof window !== "undefined"
      ? new ReminderService(
          createWebPush(window),
          new SupabaseReminderRemote(client),
          auth,
          getBrowserStorage() ?? new MemoryStorage(),
          vapidKey,
        )
      : null;
  return reminderService;
}

/** Device setting: whether finishing a session plays the chime (not synced). */
export function getCelebrationSettings(): CelebrationSettings {
  celebrationSettings ??= new CelebrationSettings(getBrowserStorage() ?? new MemoryStorage());
  return celebrationSettings;
}

export function getCelebrator(): Celebrator {
  celebrator ??= new Celebrator(
    getCelebrationSettings(),
    { confetti: (kind) => void launchConfetti(kind), sound: playChime },
    () => getSpeechService().stop(),
  );
  return celebrator;
}
