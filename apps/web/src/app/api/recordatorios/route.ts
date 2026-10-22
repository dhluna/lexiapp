import { timingSafeEqual } from "node:crypto";
import { readReminderConfig, sendDueReminders, supabaseReminderStore, webPushSender } from "@/server/reminders";

/** Called every 15 minutes by Supabase (pg_cron + pg_net): sends the daily reminders due now. */
export async function POST(request: Request) {
  const config = readReminderConfig();
  if (!config) return Response.json({ error: "Recordatorios no configurados" }, { status: 503 });
  if (!authorized(request.headers.get("authorization"), config.secret)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const now = new Date();
  const summary = await sendDueReminders(supabaseReminderStore(config, now), webPushSender(config), now);
  return Response.json(summary);
}

function authorized(header: string | null, secret: string): boolean {
  const given = Buffer.from(header ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
