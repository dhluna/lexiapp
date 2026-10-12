import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { sessionStorage } from "./storage";

// Must be read literally: Expo inlines EXPO_PUBLIC_* variables at build time.
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null | undefined;

/** Supabase client for the app, or `null` when accounts are not configured. */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!URL || !KEY) {
    client = null;
    return client;
  }
  client = createClient(URL, KEY, {
    auth: {
      storage: sessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      // No URL bar: the app finishes sign-ins itself from the deep link (completeRedirect).
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
  // Refresh the session only while the app is in the foreground.
  const created = client;
  AppState.addEventListener("change", (state) => {
    if (state === "active") void created.auth.startAutoRefresh();
    else void created.auth.stopAutoRefresh();
  });
  return client;
}
