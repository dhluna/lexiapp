import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorageProgressRepository } from "@lexi/core/persistence/progress-repository";
import { MemoryStorage } from "@lexi/core/persistence/storage";
import { ProgressStore } from "@lexi/core/services/progress-store";
import type { StoredStatus } from "@lexi/core/domain/types";
import { renderWithServices } from "@/test/render";
import { PracticeView } from "./practice-view";

let search = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => "/practicar",
}));

/** Words already seen, answered one minute apart (so the quiz order is known). */
function seen(answers: [string, StoredStatus][]) {
  const storage = new MemoryStorage();
  let minute = 0;
  const store = new ProgressStore(
    new LocalStorageProgressRepository(storage),
    () => new Date(Date.UTC(2026, 9, 1, 10, minute++)),
  );
  store.updatePreferences({ autoPronounce: false });
  for (const [id, status] of answers) store.recordAnswer(id, status);
  return storage;
}

const spokenLast = (synth: { speak: { mock: { calls: unknown[][] } } }) =>
  (synth.speak.mock.calls.at(-1)?.[0] as { text: string } | undefined)?.text;

describe("Ponerme a prueba", () => {
  beforeEach(() => {
    search = "";
  });
  afterEach(() => vi.restoreAllMocks());

  it("is disabled until some words have been seen", () => {
    renderWithServices(<PracticeView />);
    expect(screen.getByRole("button", { name: "Ponerme a prueba" })).toBeDisabled();
    expect(screen.getByText(/se activa cuando hayas visto alguna palabra/)).toBeInTheDocument();
  });

  it("dictates the words already seen and grades them tolerantly", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9); // dictation for every word
    const user = userEvent.setup();
    const storage = seen([
      ["essentials-eat", "review"],
      ["essentials-time", "review"],
      ["essentials-water", "learned"],
      ["essentials-friend", "learned"],
    ]);
    const { store, synth, effects } = renderWithServices(<PracticeView />, storage);

    await user.click(screen.getByRole("button", { name: "Ponerme a prueba" }));

    // 1. Pending review first: "eat", said out loud. Exact answer.
    expect(screen.getByText("Escucha y escribe")).toBeInTheDocument();
    expect(spokenLast(synth)).toBe("eat");
    await user.type(screen.getByRole("textbox", { name: "Tu respuesta en inglés" }), "Eat{Enter}");
    expect(screen.getByText("¡Correcto!")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    // 2. "time" with one wrong letter: counts, with the right spelling.
    expect(spokenLast(synth)).toBe("time");
    await user.type(screen.getByRole("textbox", { name: "Tu respuesta en inglés" }), "tine{Enter}");
    expect(screen.getByText("¡Casi! Cuenta como acierto.")).toBeInTheDocument();
    expect(screen.getByText("Casi: se escribe «time».")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    // 3. "water", wrong: shows the answer.
    await user.type(screen.getByRole("textbox", { name: "Tu respuesta en inglés" }), "fire{Enter}");
    expect(screen.getByText("No es correcto. Queda para repasar.")).toBeInTheDocument();
    expect(screen.getByText("water", { selector: "p" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    // 4. "friend": "No lo sé".
    await user.click(screen.getByRole("button", { name: "No lo sé" }));
    await user.click(screen.getByRole("button", { name: "Ver resultados" }));

    const words = store.getSnapshot().state.words;
    expect(words["essentials-eat"].status).toBe("learned");
    expect(words["essentials-time"].status).toBe("learned");
    expect(words["essentials-water"].status).toBe("review");
    expect(words["essentials-friend"].status).toBe("review");

    expect(screen.getByRole("heading", { name: "Sesión completada" })).toBeInTheDocument();
    expect(screen.getByText("Acertadas", { selector: "dt" }).nextElementSibling).toHaveTextContent("2");
    expect(effects.confetti).toHaveBeenCalledWith("normal");
  });

  it("completes a sentence and accepts the base form with a note", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // a gap sentence whenever possible
    const user = userEvent.setup();
    const storage = seen([["essentials-child", "learned"]]);
    const { store } = renderWithServices(<PracticeView />, storage);

    await user.click(screen.getByRole("button", { name: "Ponerme a prueba" }));
    expect(screen.getByText("Completa la frase")).toBeInTheDocument();
    expect(screen.getByText(/Pista:/)).toHaveTextContent("niño, niña, hijo");

    await user.type(screen.getByRole("textbox", { name: "Tu respuesta en inglés" }), "child{Enter}");
    expect(screen.getByText("En esta frase va «children».")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver resultados" }));

    expect(screen.getByRole("heading", { name: "Todas correctas" })).toBeInTheDocument();
    expect(store.getSnapshot().state.words["essentials-child"].timesSeen).toBe(2);
  });
});
