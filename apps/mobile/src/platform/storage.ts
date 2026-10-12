import type { KeyValueStorage } from "@lexi/core/platform";
import Storage from "expo-sqlite/kv-store";

/**
 * On-device key-value storage (SQLite). Synchronous, so the core's ProgressStore works
 * exactly as with the browser's localStorage.
 */
export const deviceStorage: KeyValueStorage = {
  getItem: (key) => Storage.getItemSync(key),
  setItem: (key, value) => Storage.setItemSync(key, value),
  removeItem: (key) => {
    Storage.removeItemSync(key);
  },
};

/** Async face of the same storage, as supabase-js expects for its session. */
export const sessionStorage = Storage;
