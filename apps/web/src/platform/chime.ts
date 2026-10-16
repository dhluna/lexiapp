import { CHIME, type Celebration } from "@lexi/core/domain/celebration";

type AudioContextClass = typeof AudioContext;
let context: AudioContext | null = null;

/** Volume of the whole chime: present but never startling. */
const MASTER_GAIN = 0.16;

const LAYERS = [
  { type: "triangle", multiple: 1, level: 1 },
  { type: "sine", multiple: 2, level: 0.22 },
] as const;

/**
 * Plays the celebration chime with the Web Audio API: each note is a triangle wave plus a
 * soft octave, with a quick attack, a natural decay and a light echo. Synthesized, so there
 * are no audio files. It runs right after the learner's last tap, which lets it play.
 */
export function playChime(kind: Exclude<Celebration, "none">): void {
  if (typeof window === "undefined") return;
  const Ctx: AudioContextClass | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext;
  if (!Ctx) return;
  context ??= new Ctx();
  const ctx = context;
  void ctx.resume();

  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);

  const echo = ctx.createDelay();
  echo.delayTime.value = 0.13;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.22;
  echo.connect(feedback);
  feedback.connect(echo);
  echo.connect(master);

  const start = ctx.currentTime + 0.02;
  for (const note of CHIME[kind]) {
    for (const layer of LAYERS) {
      const osc = ctx.createOscillator();
      osc.type = layer.type;
      osc.frequency.value = note.frequency * layer.multiple;
      const env = ctx.createGain();
      const t = start + note.start;
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(note.gain * layer.level, t + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, t + note.duration);
      osc.connect(env);
      env.connect(master);
      env.connect(echo);
      osc.start(t);
      osc.stop(t + note.duration + 0.05);
    }
  }
}
