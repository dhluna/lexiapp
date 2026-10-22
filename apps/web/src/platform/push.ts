import type { PushPlatform, PushSubscriptionData, PushSupport } from "@lexi/core/platform";

const SW_URL = "/sw.js";

/** iPhone/iPad (iPadOS reports itself as a Mac with touch). */
function isIos(nav: Navigator): boolean {
  return /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
}

function isInstalled(win: Window): boolean {
  return (
    win.matchMedia?.("(display-mode: standalone)").matches === true ||
    (win.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** The VAPID public key travels as base64url; `subscribe` wants the raw bytes. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function toData(subscription: PushSubscription): PushSubscriptionData | null {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  return json.endpoint && p256dh && auth ? { endpoint: json.endpoint, p256dh, auth } : null;
}

/** Web Push through Lexi's service worker (`public/sw.js`). */
export function createWebPush(win: Window & typeof globalThis): PushPlatform {
  const nav = win.navigator;

  const support = (): PushSupport => {
    if (isIos(nav) && !isInstalled(win)) return "needs-install";
    return "serviceWorker" in nav && "PushManager" in win && "Notification" in win ? "supported" : "unsupported";
  };

  const registration = async (): Promise<ServiceWorkerRegistration> => {
    const existing = await nav.serviceWorker.getRegistration("/");
    if (existing) return existing;
    await nav.serviceWorker.register(SW_URL, { scope: "/", updateViaCache: "none" });
    return nav.serviceWorker.ready;
  };

  return {
    support,
    permission: () => (support() === "supported" ? win.Notification.permission : "default"),
    async current() {
      if (support() !== "supported") return null;
      const existing = await nav.serviceWorker.getRegistration("/");
      const subscription = await existing?.pushManager.getSubscription();
      return subscription ? toData(subscription) : null;
    },
    async subscribe(vapidPublicKey) {
      if ((await win.Notification.requestPermission()) !== "granted") return null;
      const reg = await registration();
      const subscription =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidPublicKey) }));
      return toData(subscription);
    },
    async unsubscribe() {
      const existing = await nav.serviceWorker.getRegistration("/");
      await (await existing?.pushManager.getSubscription())?.unsubscribe();
    },
    timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
