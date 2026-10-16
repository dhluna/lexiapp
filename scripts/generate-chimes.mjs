// Renders the celebration chimes (packages/core/src/domain/celebration.ts) to WAV files for
// the mobile app, with the same recipe as the web synthesizer (apps/web/src/platform/chime.ts):
// triangle wave + soft octave, quick attack, exponential decay and a light echo.
// Usage: node scripts/generate-chimes.mjs   (Node 24: imports the TypeScript source directly)
import { mkdirSync, writeFileSync } from "node:fs";
import { CHIME, chimeLength } from "../packages/core/src/domain/celebration.ts";

const RATE = 44_100;
const ECHO_DELAY = 0.13;
const ECHO_FEEDBACK = 0.22;
const TAIL = 0.45; // Room for the echo to fade.
const PEAK = 0.5; // Final loudness: present but never startling.
const OUT = "apps/mobile/assets/sounds";

const LAYERS = [
  { wave: (phase) => 1 - 4 * Math.abs(Math.round(phase - 0.25) - (phase - 0.25)), multiple: 1, level: 1 }, // triangle
  { wave: (phase) => Math.sin(2 * Math.PI * phase), multiple: 2, level: 0.22 }, // sine, an octave up
];

function render(notes) {
  const length = Math.ceil((chimeLength(notes) + TAIL) * RATE);
  const dry = new Float64Array(length);
  for (const note of notes) {
    const start = Math.round(note.start * RATE);
    const end = Math.min(length, start + Math.round(note.duration * RATE));
    for (let i = start; i < end; i += 1) {
      const t = (i - start) / RATE;
      // Same envelope as the Web Audio ramps: 12 ms attack, exponential decay to 0.0001.
      const attack = Math.min(1, t / 0.012);
      const decay = Math.pow(0.0001, t / note.duration);
      for (const layer of LAYERS) {
        const phase = (note.frequency * layer.multiple * t) % 1;
        dry[i] += layer.wave(phase) * note.gain * layer.level * attack * decay;
      }
    }
  }
  const delay = Math.round(ECHO_DELAY * RATE);
  const echo = new Float64Array(length);
  for (let i = delay; i < length; i += 1) echo[i] = dry[i - delay] + ECHO_FEEDBACK * echo[i - delay];
  const mixed = dry.map((v, i) => v + echo[i]);
  const max = Math.max(...mixed.map(Math.abs));
  return mixed.map((v) => (v / max) * PEAK);
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

mkdirSync(OUT, { recursive: true });
for (const [kind, file] of [
  ["normal", "celebrate.wav"],
  ["perfect", "celebrate-perfect.wav"],
]) {
  const bytes = wav(render(CHIME[kind]));
  writeFileSync(`${OUT}/${file}`, bytes);
  console.log(`${OUT}/${file}: ${(bytes.length / 1024).toFixed(0)} KB`);
}
