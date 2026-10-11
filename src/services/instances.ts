import {
  InMemoryProgressRepository,
  LocalStorageProgressRepository,
  STORAGE_KEY,
} from "@/persistence/progress-repository";
import { getBrowserStorage } from "@/persistence/storage";
import { ProgressStore } from "./progress-store";
import { detectSpeechEnvironment, SpeechService } from "./speech";

/** Browser composition root. Only call from client code. */
let progressStore: ProgressStore | null = null;
let speechService: SpeechService | null = null;

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
