import type { KeyValueStorage } from "@lexi/core/platform";

/**
 * Returns `window.localStorage` if it is actually usable (it throws in some private
 * modes or when site data is blocked), otherwise `null`.
 */
export function getBrowserStorage(): KeyValueStorage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const probe = "lexi:probe";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}
