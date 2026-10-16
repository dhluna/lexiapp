import { describe, expect, it, vi } from "vitest";
import { MemoryStorage } from "../persistence/storage";
import { CelebrationSettings } from "./celebration-settings";
import { Celebrator } from "./celebrator";

function setup() {
  const settings = new CelebrationSettings(new MemoryStorage());
  const effects = { confetti: vi.fn(), sound: vi.fn() };
  const stopSpeech = vi.fn();
  return { settings, effects, stopSpeech, celebrator: new Celebrator(settings, effects, stopSpeech) };
}

describe("Celebrator", () => {
  it("stops the voice, then shows confetti and plays the chime of each kind", () => {
    const { celebrator, effects, stopSpeech } = setup();
    celebrator.celebrate("perfect");
    expect(stopSpeech).toHaveBeenCalled();
    expect(effects.confetti).toHaveBeenCalledWith("perfect");
    expect(effects.sound).toHaveBeenCalledWith("perfect");
  });

  it("keeps the confetti but stays silent when the sound is off", () => {
    const { celebrator, effects, settings } = setup();
    settings.setSoundEnabled(false);
    celebrator.celebrate("normal");
    expect(effects.confetti).toHaveBeenCalledWith("normal");
    expect(effects.sound).not.toHaveBeenCalled();
  });

  it("does nothing for a session without answers", () => {
    const { celebrator, effects, stopSpeech } = setup();
    celebrator.celebrate("none");
    expect(stopSpeech).not.toHaveBeenCalled();
    expect(effects.confetti).not.toHaveBeenCalled();
  });

  it("never throws when an effect fails", () => {
    const { settings } = setup();
    const broken = new Celebrator(settings, {
      confetti: () => {
        throw new Error("no canvas");
      },
      sound: () => {
        throw new Error("no audio");
      },
    });
    expect(() => broken.celebrate("normal")).not.toThrow();
  });
});
