/* Native modules that only exist on a device are replaced with in-memory fakes. */
import mockNetInfo from "@react-native-community/netinfo/jest/netinfo-mock.js";
import "react-native-gesture-handler/jestSetup";

// Reanimated 4 and its Worklets engine ship their own Jest mocks (animations finish at once).
jest.mock("react-native-worklets", () => require("react-native-worklets/lib/module/mock"));
jest.mock("react-native-reanimated", () => ({
  ...require("react-native-reanimated/mock"),
  // Missing from the official mock ("ADD ME IF NEEDED").
  useReducedMotion: () => false,
}));

jest.mock("@react-native-community/netinfo", () => mockNetInfo);

jest.mock("expo-sqlite/kv-store", () => {
  const data = new Map<string, string>();
  const Storage = {
    getItemSync: (k: string) => data.get(k) ?? null,
    setItemSync: (k: string, v: string) => void data.set(k, v),
    removeItemSync: (k: string) => data.delete(k),
    getItem: async (k: string) => data.get(k) ?? null,
    setItem: async (k: string, v: string) => void data.set(k, v),
    removeItem: async (k: string) => void data.delete(k),
  };
  return { __esModule: true, default: Storage };
});

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => {}),
  getAvailableVoicesAsync: jest.fn(async () => []),
  VoiceQuality: { Default: "Default", Enhanced: "Enhanced" },
}));

jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(() => ({ volume: 1, play: jest.fn(), remove: jest.fn() })),
}));

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Success: "success" },
}));

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async () => "id"),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: "date" },
}));

/* Expo Router: navigation is recorded instead of performed. */
const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};
(globalThis as { setSearchParams?: (p: Record<string, string>) => void }).setSearchParams = (p) => {
  mockParams = p;
};
jest.mock("expo-router", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    useRouter: () => mockRouter,
    useLocalSearchParams: () => mockParams,
    Link: ({ children }: { children: unknown }) => <Text>{children as string}</Text>,
    Stack: { Screen: () => null },
  };
});
