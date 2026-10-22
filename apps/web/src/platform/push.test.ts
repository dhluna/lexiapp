import { describe, expect, it, vi } from "vitest";
import { createWebPush } from "./push";

function fakeWindow({ ua = "Mozilla/5.0 (Linux; Android 14) Chrome/130", standalone = false, push = true } = {}) {
  const subscription = {
    toJSON: () => ({ endpoint: "https://push.example/1", keys: { p256dh: "pk", auth: "au" } }),
    unsubscribe: vi.fn(async () => true),
  };
  const pushManager = { getSubscription: vi.fn(async () => null), subscribe: vi.fn<(options: PushSubscriptionOptionsInit) => Promise<typeof subscription>>(async () => subscription) };
  const registration = { pushManager };
  const win = {
    navigator: {
      userAgent: ua,
      platform: "Linux",
      maxTouchPoints: 5,
      ...(push
        ? {
            serviceWorker: {
              getRegistration: vi.fn(async () => undefined),
              register: vi.fn(async () => registration),
              ready: Promise.resolve(registration),
            },
          }
        : {}),
    },
    matchMedia: () => ({ matches: standalone }),
    ...(push ? { PushManager: class {}, Notification: { permission: "default", requestPermission: vi.fn(async () => "granted") } } : {}),
  };
  return { win: win as unknown as Window & typeof globalThis, pushManager };
}

describe("web push adapter", () => {
  it("asks iPhone users to install Lexi first", () => {
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)";
    expect(createWebPush(fakeWindow({ ua: iphone, push: false }).win).support()).toBe("needs-install");
    expect(createWebPush(fakeWindow({ ua: iphone, standalone: true }).win).support()).toBe("supported");
  });

  it("detects browsers without push", () => {
    expect(createWebPush(fakeWindow({ push: false }).win).support()).toBe("unsupported");
  });

  it("subscribes with the VAPID key as bytes and returns the endpoint and keys", async () => {
    const { win, pushManager } = fakeWindow();
    const data = await createWebPush(win).subscribe("AQID_-8");
    expect(data).toEqual({ endpoint: "https://push.example/1", p256dh: "pk", auth: "au" });
    const key = pushManager.subscribe.mock.calls[0]?.[0].applicationServerKey as Uint8Array;
    expect([...key]).toEqual([1, 2, 3, 255, 239]);
  });
});
