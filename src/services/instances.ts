import {
  InMemoryProgressRepository,
  LocalStorageProgressRepository,
  STORAGE_KEY,
} from "@/persistence/progress-repository";
import { getSupabase } from "@/lib/supabase";
import { SupabaseRemoteProgress } from "@/persistence/remote-progress";
import { getBrowserStorage, MemoryStorage } from "@/persistence/storage";
import { SupabaseAuthService, type AuthService } from "./auth";
import { ProgressStore } from "./progress-store";
import { SyncService } from "./sync-service";
import { detectSpeechEnvironment, SpeechService } from "./speech";

/** Browser composition root. Only call from client code. */
let progressStore: ProgressStore | null = null;
let speechService: SpeechService | null = null;
let authService: AuthService | null | undefined;
let syncService: SyncService | null | undefined;

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
  speechService ??= new SpeechService(detectSpeechEnvironment());
  return speechService;
}

/** `null` when accounts are not configured: the app then works without them. */
export function getAuthService(): AuthService | null {
  if (authService !== undefined) return authService;
  const client = getSupabase();
  authService = client ? new SupabaseAuthService(client) : null;
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
    { target: window },
  );
  syncService.start();
  return syncService;
}
