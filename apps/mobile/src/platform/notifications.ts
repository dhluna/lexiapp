import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/** What the reminder service needs from the OS. Faked in tests. */
export interface NotificationsPort {
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  schedule(id: string, at: Date, title: string, body: string): Promise<void>;
  /** Cancels every scheduled notification whose identifier starts with `prefix`. */
  cancelWithPrefix(prefix: string): Promise<void>;
}

const CHANNEL = "reminders";
let configured = false;

async function configure(): Promise<void> {
  if (configured) return;
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
}

export const deviceNotifications: NotificationsPort = {
  async hasPermission() {
    return (await Notifications.getPermissionsAsync()).granted;
  },
  async requestPermission() {
    await configure();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    return asked.granted;
  },
  async schedule(id, at, title, body) {
    await configure();
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  },
  async cancelWithPrefix(prefix) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(prefix))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  },
};
