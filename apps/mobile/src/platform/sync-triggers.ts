import type { SyncTriggers } from "@lexi/core/platform";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";

let online = true;

/** Latest connectivity known to NetInfo (optimistic until the first report). */
export const deviceIsOnline = () => online;

/** Sync when the connection comes back or the app returns to the foreground. */
export const deviceSyncTriggers: SyncTriggers = {
  subscribe(trigger) {
    const stopNet = NetInfo.addEventListener((state) => {
      const now = state.isConnected !== false && state.isInternetReachable !== false;
      if (now && !online) trigger();
      online = now;
    });
    const appState = AppState.addEventListener("change", (status) => {
      if (status === "active") trigger();
    });
    return () => {
      stopNet();
      appState.remove();
    };
  },
};
