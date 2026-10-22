import "server-only";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { reminderDueDay, reminderMessage, type ReminderMessage } from "@lexi/core/domain/reminders";

/**
 * Sends the daily reminders that are due (docs/15-recordatorios.md). Runs on the server,
 * called by `app/api/recordatorios` every 15 minutes. The only code with Supabase's secret
 * key: it reads every account's devices and practice days, so it never reaches the browser.
 */

export interface DeviceRow {
  endpoint: string;
  user_id: string;
  p256dh: string;
  auth: string;
  remind_at: string;
  time_zone: string;
  last_sent_on: string | null;
}

export interface ReminderStore {
  devices(): Promise<DeviceRow[]>;
  practiceDays(userIds: string[]): Promise<Map<string, string[]>>;
  markSent(endpoint: string, day: string): Promise<void>;
  remove(endpoint: string): Promise<void>;
}

/** Delivers one notice. Rejects with `statusCode` 404/410 when the subscription no longer exists. */
export type PushSender = (device: DeviceRow, message: ReminderMessage & { url: string }) => Promise<void>;

export interface SendSummary {
  due: number;
  sent: number;
  /** Due, but the person already practiced today. */
  skipped: number;
  /** Subscriptions the push service no longer knows. */
  removed: number;
  failed: number;
}

export async function sendDueReminders(store: ReminderStore, send: PushSender, now: Date): Promise<SendSummary> {
  const due = (await store.devices())
    .map((device) => ({
      device,
      day: reminderDueDay(
        { remindAt: device.remind_at, timeZone: device.time_zone, lastSentOn: device.last_sent_on },
        now,
      ),
    }))
    .filter((entry): entry is { device: DeviceRow; day: string } => entry.day !== null);

  const summary: SendSummary = { due: due.length, sent: 0, skipped: 0, removed: 0, failed: 0 };
  if (due.length === 0) return summary;

  const days = await store.practiceDays([...new Set(due.map((entry) => entry.device.user_id))]);
  for (const { device, day } of due) {
    const message = reminderMessage(days.get(device.user_id) ?? [], day);
    if (!message) {
      // Practiced today: nothing to remind, and nothing more today.
      await store.markSent(device.endpoint, day);
      summary.skipped += 1;
      continue;
    }
    try {
      await send(device, { ...message, url: "/practicar" });
      await store.markSent(device.endpoint, day);
      summary.sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await store.remove(device.endpoint);
        summary.removed += 1;
      } else {
        summary.failed += 1;
      }
    }
  }
  return summary;
}

export interface ReminderConfig {
  supabaseUrl: string;
  supabaseSecretKey: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  secret: string;
}

/** `null` when something is missing: reminders are then simply off. */
export function readReminderConfig(env: NodeJS.ProcessEnv = process.env): ReminderConfig | null {
  const config = {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseSecretKey: env.SUPABASE_SECRET_KEY,
    vapidPublicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    vapidPrivateKey: env.VAPID_PRIVATE_KEY,
    secret: env.REMINDERS_SECRET,
  };
  return Object.values(config).every(Boolean) ? (config as ReminderConfig) : null;
}

/** Practice days of the last year are plenty to know the current streak. */
const DAYS_LOOKBACK = 400;

export function supabaseReminderStore(config: ReminderConfig, now: Date): ReminderStore {
  const db = createClient(config.supabaseUrl, config.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const since = new Date(now.getTime() - DAYS_LOOKBACK * 86_400_000).toISOString().slice(0, 10);
  return {
    async devices() {
      const { data, error } = await db
        .from("reminder_devices")
        .select("endpoint, user_id, p256dh, auth, remind_at, time_zone, last_sent_on");
      if (error) throw new Error(error.message);
      return data as DeviceRow[];
    },
    async practiceDays(userIds) {
      const { data, error } = await db
        .from("practice_days")
        .select("user_id, day")
        .in("user_id", userIds)
        .gte("day", since);
      if (error) throw new Error(error.message);
      const byUser = new Map<string, string[]>();
      for (const row of data as { user_id: string; day: string }[]) {
        byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row.day]);
      }
      return byUser;
    },
    async markSent(endpoint, day) {
      const { error } = await db.from("reminder_devices").update({ last_sent_on: day }).eq("endpoint", endpoint);
      if (error) throw new Error(error.message);
    },
    async remove(endpoint) {
      const { error } = await db.from("reminder_devices").delete().eq("endpoint", endpoint);
      if (error) throw new Error(error.message);
    },
  };
}

export function webPushSender(config: ReminderConfig): PushSender {
  const options = {
    vapidDetails: {
      subject: "https://lexiapp.app",
      publicKey: config.vapidPublicKey,
      privateKey: config.vapidPrivateKey,
    },
    // A reminder is useless the next day: the push service may drop it after 12 h.
    TTL: 12 * 60 * 60,
    urgency: "normal" as const,
  };
  return async (device, message) => {
    await webpush.sendNotification(
      { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
      JSON.stringify(message),
      options,
    );
  };
}
