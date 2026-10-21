import type { Celebration } from "../domain/celebration";
import type { CelebrationSettings } from "./celebration-settings";

type Kind = Exclude<Celebration, "none">;

/** What the platform provides: confetti on screen and the chime. */
export interface CelebrationEffects {
  confetti(kind: Kind): void;
  sound(kind: Kind): void;
}

/**
 * Celebrates a finished session: stops the pronunciation still playing, launches the confetti
 * and, if the device setting allows it, the sound. Effects never break the practice flow.
 */
export class Celebrator {
  constructor(
    private readonly settings: CelebrationSettings,
    private readonly effects: CelebrationEffects,
    private readonly stopSpeech: () => void = () => {},
  ) {}

  celebrate(kind: Celebration): void {
    if (kind === "none") return;
    try {
      this.stopSpeech();
    } catch {
      // ignore
    }
    try {
      this.effects.confetti(kind);
    } catch {
      // Decorative: a failure must not affect the summary.
    }
    if (!this.settings.soundEnabled()) return;
    try {
      this.effects.sound(kind);
    } catch {
      // Same: silence is fine.
    }
  }
}
