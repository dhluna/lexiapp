/**
 * Recorded pronunciation (neural voices, generated once with `scripts/generate-audio.ts`).
 * The voice is a device setting; the files live in `apps/web/public/audio/<voice>/<key>.mp3`.
 */
export type VoiceId = "us-female" | "us-male" | "uk-female" | "uk-male";

export interface VoiceOption {
  id: VoiceId;
  label: string;
  /** BCP 47, also used to pick a system voice when a recording is missing. */
  lang: "en-US" | "en-GB";
  /** Google Cloud Text-to-Speech voice used to generate the recordings. */
  googleVoice: string;
}

export const VOICES: readonly VoiceOption[] = [
  { id: "us-female", label: "EE. UU. · Mujer", lang: "en-US", googleVoice: "en-US-Neural2-F" },
  { id: "us-male", label: "EE. UU. · Hombre", lang: "en-US", googleVoice: "en-US-Neural2-J" },
  { id: "uk-female", label: "Reino Unido · Mujer", lang: "en-GB", googleVoice: "en-GB-Neural2-F" },
  { id: "uk-male", label: "Reino Unido · Hombre", lang: "en-GB", googleVoice: "en-GB-Neural2-B" },
];

export const DEFAULT_VOICE: VoiceId = "us-female";

export function isVoiceId(value: unknown): value is VoiceId {
  return VOICES.some((v) => v.id === value);
}

export function voiceOption(id: VoiceId): VoiceOption {
  return VOICES.find((v) => v.id === id) ?? VOICES[0];
}

/** Played when choosing a voice in Settings. */
export const VOICE_SAMPLE = "Hello! Let's practice some English.";
