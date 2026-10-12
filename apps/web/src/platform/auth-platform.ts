import type { AuthPlatform } from "@lexi/core/platform";

/** On the web the provider and email links come back to pages of this same site. */
export function webAuthPlatform(origin: string): AuthPlatform {
  return {
    redirectUrl: (target, nextPath = "/ajustes") =>
      target === "callback"
        ? `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
        : `${origin}/restablecer-contrasena`,
  };
}
