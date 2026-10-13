import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";

type NotificationsModule = typeof import("expo-notifications");

/** What the reminder service needs from the OS. Faked in tests. */
export interface NotificationsPort {
  /** False where the OS module can't be used (Expo Go on Android since SDK 53). */
  readonly available: boolean;
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  schedule(id: string, at: Date, title: string, body: string): Promise<void>;
  /** Cancels every scheduled notification whose identifier starts with `prefix`. */
  cancelWithPrefix(prefix: string): Promise<void>;
}

const CHANNEL = "reminders";
let configured = false;

/**
 * Loaded lazily: in Expo Go on Android, importing expo-notifications throws at module
 * load, which would break every screen that reaches the services.
 */
const available = !(Platform.OS === "android" && isRunningInExpoGo());
let module: NotificationsModule | null = null;
function load(): NotificationsModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  module ??= require("expo-notifications") as NotificationsModule;
  return module;
}

async function configure(): Promise<NotificationsModule> {
  const Notifications = load();
  if (configured) return Notifications;
  configured = true;
  // Show the reminder even if it arrives while Lexi is open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Recordatorio diario",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return Notifications;
}

export const deviceNotifications: NotificationsPort = {
  available,
  async hasPermission() {
    if (!available) return false;
    return (await load().getPermissionsAsync()).granted;
  },
  async requestPermission() {
    if (!available) return false;
    const Notifications = await configure();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    return asked.granted;
  },
  async schedule(id, at, title, body) {
    if (!available) return;
    const Notifications = await configure();
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  },
  async cancelWithPrefix(prefix) {
    if (!available) return;
    const Notifications = load();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(prefix))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  },
};
