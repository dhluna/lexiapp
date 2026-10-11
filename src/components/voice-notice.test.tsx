import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServicesProvider } from "@/hooks/services-context";
import { SpeechService, type SpeechEnvironment } from "@/services/speech";
import { VoiceNotice } from "./voice-notice";

function speechWith(voices: { lang: string; name: string }[]) {
  const synth = { getVoices: () => voices, speak: vi.fn(), cancel: vi.fn(), addEventListener: vi.fn() };
  return new SpeechService({ synth, Utterance: class {} } as unknown as SpeechEnvironment);
}

describe("VoiceNotice", () => {
  it("warns when the system has no English voice", () => {
    render(
      <ServicesProvider value={{ speech: speechWith([{ lang: "es-ES", name: "Microsoft Helena" }]) }}>
        <VoiceNotice />
      </ServicesProvider>,
    );
    expect(screen.getByText("Tu sistema no tiene una voz en inglés")).toBeInTheDocument();
  });

  it("stays hidden when an English voice exists", () => {
    render(
      <ServicesProvider value={{ speech: speechWith([{ lang: "en-US", name: "Google US English" }]) }}>
        <VoiceNotice />
      </ServicesProvider>,
    );
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});
