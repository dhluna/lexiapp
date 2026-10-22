import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/recordatorios/route";
import { readReminderConfig, sendDueReminders, type DeviceRow, type ReminderStore } from "./reminders";

// 18:10 UTC = 20:10 in Madrid.
const NOW = new Date("2026-10-22T18:10:00Z");

const device = (endpoint: string, userId: string, overrides: Partial<DeviceRow> = {}): DeviceRow => ({
  endpoint,
  user_id: userId,
  p256dh: "key",
  auth: "secret",
  remind_at: "20:00:00",
  time_zone: "Europe/Madrid",
  last_sent_on: null,
  ...overrides,
});

function fakeStore(devices: DeviceRow[], days: Record<string, string[]>) {
  const sent = new Map<string, string>();
  const removed: string[] = [];
  const store: ReminderStore = {
    devices: async () => devices,
    practiceDays: vi.fn(async (ids: string[]) => new Map(ids.map((id) => [id, days[id] ?? []]))),
    markSent: async (endpoint, day) => void sent.set(endpoint, day),
    remove: async (endpoint) => void removed.push(endpoint),
  };
  return { store, sent, removed };
}

describe("sendDueReminders", () => {
  it("sends only to devices whose time has come, with the streak, and marks them", async () => {
    const { store, sent } = fakeStore(
      [
        device("https://push/ana", "ana"),
        device("https://push/luis", "luis", { remind_at: "21:00:00" }),
        device("https://push/eva", "eva", { last_sent_on: "2026-10-22" }),
      ],
      { ana: ["2026-10-20", "2026-10-21"] },
    );
    const send = vi.fn(async () => {});
    const summary = await sendDueReminders(store, send, NOW);

    expect(summary).toEqual({ due: 1, sent: 1, skipped: 0, removed: 0, failed: 0 });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ endpoint: "https://push/ana" }), {
      title: "🔥 Llevas 2 días de racha",
      body: "Practica hoy para no perderla. Son 5 minutos.",
      url: "/practicar",
    });
    expect(sent.get("https://push/ana")).toBe("2026-10-22");
    expect(store.practiceDays).toHaveBeenCalledWith(["ana"]);
  });

  it("does not bother someone who already practiced today", async () => {
    const { store, sent } = fakeStore([device("https://push/ana", "ana")], { ana: ["2026-10-22"] });
    const send = vi.fn(async () => {});
    expect((await sendDueReminders(store, send, NOW)).skipped).toBe(1);
    expect(send).not.toHaveBeenCalled();
    expect(sent.get("https://push/ana")).toBe("2026-10-22");
  });

  it("removes subscriptions the push service no longer knows and keeps the rest for a retry", async () => {
    const { store, sent, removed } = fakeStore([device("https://push/old", "ana"), device("https://push/down", "luis")], {});
    const send = vi.fn(async (d: DeviceRow) => {
      throw Object.assign(new Error("push"), { statusCode: d.endpoint.endsWith("old") ? 410 : 500 });
    });
    expect(await sendDueReminders(store, send, NOW)).toMatchObject({ removed: 1, failed: 1, sent: 0 });
    expect(removed).toEqual(["https://push/old"]);
    expect(sent.size).toBe(0);
  });
});

describe("POST /api/recordatorios", () => {
  afterEach(() => vi.unstubAllEnvs());

  const configure = () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public");
    vi.stubEnv("VAPID_PRIVATE_KEY", "private");
    vi.stubEnv("REMINDERS_SECRET", "s3cret");
  };

  it("is off (503) until everything is configured", async () => {
    vi.stubEnv("REMINDERS_SECRET", "");
    expect(readReminderConfig()).toBeNull();
    const response = await POST(new Request("https://lexiapp.app/api/recordatorios", { method: "POST" }));
    expect(response.status).toBe(503);
  });

  it("rejects calls without the secret", async () => {
    configure();
    for (const authorization of [undefined, "Bearer wrong", "Bearer s3cret-but-longer"]) {
      const response = await POST(
        new Request("https://lexiapp.app/api/recordatorios", {
          method: "POST",
          headers: authorization ? { authorization } : {},
        }),
      );
      expect(response.status).toBe(401);
    }
  });
});
