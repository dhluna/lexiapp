import type { SyncTriggers } from "@lexi/core/platform";

/** Sync when the connection comes back or the tab becomes visible again. */
export function browserSyncTriggers(win: Window): SyncTriggers {
  return {
    subscribe(trigger) {
      const onVisible = () => {
        if (win.document.visibilityState === "visible") trigger();
      };
      win.addEventListener("online", trigger);
      win.document.addEventListener("visibilitychange", onVisible);
      return () => {
        win.removeEventListener("online", trigger);
        win.document.removeEventListener("visibilitychange", onVisible);
      };
    },
  };
}

export const browserIsOnline = () => typeof navigator === "undefined" || navigator.onLine !== false;
