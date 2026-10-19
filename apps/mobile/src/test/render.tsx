import { LocalStorageProgressRepository } from "@lexi/core/persistence/progress-repository";
import { MemoryStorage } from "@lexi/core/persistence/storage";
import type { SpeechEngine } from "@lexi/core/platform";
import type { AuthService } from "@lexi/core/services/auth";
import { CelebrationSettings } from "@lexi/core/services/celebration-settings";
import { VoiceSettings } from "@lexi/core/services/voice-settings";
import { Celebrator } from "@lexi/core/services/celebrator";
import { ProgressStore } from "@lexi/core/services/progress-store";
import { SpeechService } from "@lexi/core/services/speech";
import type { SyncService } from "@lexi/core/services/sync-service";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ServicesProvider } from "@/hooks/services-context";
import type { NotificationsPort } from "@/platform/notifications";
import { ReminderService } from "@/reminders";

/** Records what would be spoken; one English voice available. */
export function fakeSpeechEngine() {
  const spoken: string[] = [];
  const engine: SpeechEngine = {
    getVoices: () => [{ id: "en", name: "English", lang: "en-US", localService: true }],
    onVoicesChanged: () => () => {},
    speak: (text, { onDone }) => {
      spoken.push(text);
      onDone();
    },
    cancel: () => {},
    isBusy: () => false,
  };
  return { engine, spoken };
}

/** In-memory notifications: permission can be denied, scheduled ones are listed. */
export function fakeNotifications(granted = true, available = true) {
  const scheduled = new Map<string, { at: Date; title: string; body: string }>();
  const port: NotificationsPort & { granted: boolean } = {
    granted,
    available,
    hasPermission: async () => port.granted,
    requestPermission: async () => port.granted,
    schedule: async (id, at, title, body) => void scheduled.set(id, { at, title, body }),
    cancelWithPrefix: async (prefix) => {
      for (const id of [...scheduled.keys()]) if (id.startsWith(prefix)) scheduled.delete(id);
    },
  };
  return { port, scheduled };
}

/**
 * Real core services over memory storage, with fake device modules (same idea as the web).
 * Async: React Native Testing Library 14 renders asynchronously.
 */
export async function renderWithServices(
  ui: ReactElement,
  options: { storage?: MemoryStorage; auth?: AuthService | null; sync?: SyncService | null; notifications?: NotificationsPort } = {},
) {
  const storage = options.storage ?? new MemoryStorage();
  const store = new ProgressStore(new LocalStorageProgressRepository(storage));
  const speech = fakeSpeechEngine();
  const reminders = new ReminderService(store, storage, options.notifications ?? fakeNotifications().port);
  // Real celebration logic with spy effects (no confetti layer or audio in Jest).
  const celebrationSettings = new CelebrationSettings(storage);
  const voiceSettings = new VoiceSettings(storage);
  const effects = { confetti: jest.fn(), sound: jest.fn() };
  const celebrator = new Celebrator(celebrationSettings, effects);
  const result = await render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <ServicesProvider
        value={{
          progressStore: store,
          speech: new SpeechService(speech.engine, { voices: voiceSettings }),
          auth: options.auth ?? null,
          sync: options.sync ?? null,
          reminders,
          celebrator,
          celebrationSettings,
          voiceSettings,
        }}
      >
        {ui}
      </ServicesProvider>
    </SafeAreaProvider>,
  );
  return { ...result, store, storage, spoken: speech.spoken, reminders, effects, voiceSettings };
}
