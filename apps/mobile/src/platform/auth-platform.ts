import type { AuthPlatform } from "@lexi/core/platform";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

/**
 * Google and email links come back into the app through the `lexi://` scheme
 * (`exp://…` while developing in Expo Go).
 */
export const deviceAuthPlatform: AuthPlatform = {
  redirectUrl: (target, nextPath) =>
    target === "callback"
      ? Linking.createURL("auth/callback", { queryParams: nextPath ? { next: nextPath } : undefined })
      : Linking.createURL("restablecer"),
  async openOAuth(authUrl, returnUrl) {
    const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);
    return result.type === "success" ? result.url : null;
  },
};
