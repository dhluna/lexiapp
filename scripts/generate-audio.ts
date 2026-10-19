// Generates Lexi's recorded pronunciations with Google Cloud Text-to-Speech:
// apps/web/public/audio/<voice>/<key>.mp3 for everything the apps can say, plus index.json.
// Idempotent: only new texts are synthesized and recordings no longer used are deleted.
//
// Usage:  npx tsx scripts/generate-audio.ts            (needs .env.audio.local)
//         npx tsx scripts/generate-audio.ts --dry-run  (counts only, no API calls)
//
// .env.audio.local (never committed, see .gitignore):  GOOGLE_TTS_API_KEY=...
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { WORDS } from "../packages/core/src/data/catalog";
import { VOICE_SAMPLE, VOICES, type VoiceOption } from "../packages/core/src/data/voices";
import { audioKey, spokenTexts } from "../packages/core/src/domain/audio";

const OUT = "apps/web/public/audio";
const CONCURRENCY = 8;
const dryRun = process.argv.includes("--dry-run");

function apiKey(): string {
  if (process.env.GOOGLE_TTS_API_KEY) return process.env.GOOGLE_TTS_API_KEY;
  if (!existsSync(".env.audio.local")) throw new Error("Falta .env.audio.local con GOOGLE_TTS_API_KEY=…");
  const line = readFileSync(".env.audio.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("GOOGLE_TTS_API_KEY="));
  const key = line?.slice("GOOGLE_TTS_API_KEY=".length).trim();
  if (!key) throw new Error("GOOGLE_TTS_API_KEY está vacía en .env.audio.local");
  return key;
}

async function synthesize(key: string, text: string, voice: VoiceOption): Promise<Buffer> {
  for (let attempt = 0; ; attempt++) {
    // The key goes in a header, never in the URL (so it cannot leak into logs or errors).
    const response = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: voice.lang, name: voice.googleVoice },
        audioConfig: { audioEncoding: "MP3", sampleRateHertz: 24000 },
      }),
    });
    if (response.ok) {
      const { audioContent } = (await response.json()) as { audioContent: string };
      return Buffer.from(audioContent, "base64");
    }
    const retry = response.status === 429 || response.status >= 500;
    if (!retry || attempt >= 4) {
      const detail = await response.text();
      throw new Error(`Google TTS ${response.status} (${voice.id}, «${text}»): ${detail.slice(0, 300)}`);
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
}

/** Runs `tasks` with at most `limit` in flight. */
async function pool(tasks: (() => Promise<void>)[], limit: number) {
  let next = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (next < tasks.length) await tasks[next++]();
  });
  await Promise.all(workers);
}

async function main() {
  const texts = spokenTexts(WORDS, [VOICE_SAMPLE]);
  const keys = new Map(texts.map((t) => [audioKey(t), t]));
  const key = dryRun ? "" : apiKey();

  let created = 0;
  let removed = 0;
  let pending = 0;
  const tasks: (() => Promise<void>)[] = [];
  for (const voice of VOICES) {
    const dir = join(OUT, voice.id);
    mkdirSync(dir, { recursive: true });
    const existing = new Set(readdirSync(dir).filter((f) => f.endsWith(".mp3")).map((f) => f.slice(0, -4)));
    for (const old of existing) {
      if (!keys.has(old)) {
        if (!dryRun) unlinkSync(join(dir, `${old}.mp3`));
        removed++;
      }
    }
    for (const [k, text] of keys) {
      if (existing.has(k)) continue;
      pending++;
      tasks.push(async () => {
        writeFileSync(join(dir, `${k}.mp3`), await synthesize(key, text, voice));
        created++;
        if (created % 100 === 0) console.log(`  ${created}/${pending}…`);
      });
    }
  }

  const chars = texts.reduce((n, t) => n + t.length, 0);
  console.log(`${texts.length} textos (${chars} caracteres) × ${VOICES.length} voces; por generar: ${pending}; sobrantes: ${removed}`);
  if (dryRun) return;

  await pool(tasks, CONCURRENCY);
  // Same keys for every voice: the apps only check the key.
  for (const voice of VOICES) {
    const files = readdirSync(join(OUT, voice.id)).filter((f) => f.endsWith(".mp3"));
    if (files.length !== keys.size) throw new Error(`${voice.id}: ${files.length} archivos, se esperaban ${keys.size}`);
  }
  writeFileSync(
    join(OUT, "index.json"),
    `${JSON.stringify({ voices: VOICES.map((v) => ({ id: v.id, googleVoice: v.googleVoice })), keys: [...keys.keys()].sort() })}\n`,
  );
  console.log(`Listo: ${created} nuevos, ${removed} borrados, ${keys.size} por voz.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
