// Creates the VAPID key pair for the daily reminder's push notifications
// (docs/15-recordatorios.md) and writes it to .env.push.local, which git ignores.
// The keys are never printed: copy them from that file to Vercel.
// Usage: npm run vapid
import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import webpush from "web-push";

const FILE = ".env.push.local";
if (existsSync(FILE)) {
  console.error(`${FILE} ya existe: no se sobrescribe (las suscripciones dependen de esas claves).`);
  process.exit(1);
}
const { publicKey, privateKey } = webpush.generateVAPIDKeys();
writeFileSync(
  FILE,
  [
    "# Recordatorio diario: copia estas variables a Vercel (Settings › Environment Variables, Production).",
    "# La clave pública también va en .env.local para probar en local.",
    `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`,
    `VAPID_PRIVATE_KEY=${privateKey}`,
    "# El mismo valor se guarda en Supabase Vault como reminders_secret.",
    `REMINDERS_SECRET=${randomBytes(32).toString("base64url")}`,
    "",
  ].join("\n"),
  { mode: 0o600 },
);
console.log(`Claves creadas en ${FILE}.`);
