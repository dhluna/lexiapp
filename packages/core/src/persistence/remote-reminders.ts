import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushSubscriptionData } from "../platform";

/** Where each device's daily reminder is kept (the server sends the notices). */
export interface ReminderRemote {
  register(subscription: PushSubscriptionData, time: string, timeZone: string): Promise<void>;
  unregister(endpoint: string): Promise<void>;
}

/** Table `reminder_devices` and `register_reminder` (supabase/migrations/0003_reminders.sql). */
export class SupabaseReminderRemote implements ReminderRemote {
  constructor(private readonly client: SupabaseClient) {}

  async register(subscription: PushSubscriptionData, time: string, timeZone: string): Promise<void> {
    const { error } = await this.client.rpc("register_reminder", {
      sub_endpoint: subscription.endpoint,
      sub_p256dh: subscription.p256dh,
      sub_auth: subscription.auth,
      at_time: time,
      tz: timeZone,
    });
    if (error) throw new Error(error.message);
  }

  async unregister(endpoint: string): Promise<void> {
    const { error } = await this.client.from("reminder_devices").delete().eq("endpoint", endpoint);
    if (error) throw new Error(error.message);
  }
}
