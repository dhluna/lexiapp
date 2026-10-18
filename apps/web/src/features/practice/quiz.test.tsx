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

  it("is disabled until some words are learned (words pending review do not count)", () => {
    renderWithServices(<PracticeView />, seen([["essentials-time", "review"]]));
    expect(screen.getByRole("button", { name: "Ponerme a prueba" })).toBeDisabled();
    expect(screen.getByText(/se activa cuando tengas palabras aprendidas/)).toBeInTheDocument();
  });

  it("tests only learned words, grades them tolerantly and leaves progress untouched", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9); // dictation for every word
    const user = userEvent.setup();
    const learned = ["essentials-water", "essentials-friend", "essentials-money", "essentials-house"];
    const storage = seen([["essentials-time", "review"], ...learned.map((id): [string, StoredStatus] => [id, "learned"])]);
    const { store, synth, effects } = renderWithServices(<PracticeView />, storage);
    const before = store.getSnapshot().state;

    await user.click(screen.getByRole("button", { name: "Ponerme a prueba" }));
    const field = () => screen.getByRole("textbox", { name: "Tu respuesta en inglés" });
    const asked: string[] = [];

    // 1. Exact answer.
    asked.push(spokenLast(synth)!);
    await user.type(field(), `${asked[0]}{Enter}`);
    expect(screen.getByText("¡Correcto!")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    // 2. One wrong letter: counts, with the right spelling.
    asked.push(spokenLast(synth)!);
    await user.type(field(), `${asked[1].slice(0, -1)}q{Enter}`);
    expect(screen.getByText("¡Casi! Cuenta como acierto.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    // 3. Wrong, then 4. "No lo sé".
    asked.push(spokenLast(synth)!);
    await user.type(field(), "zzzz{Enter}");
    expect(screen.getByText("No es correcto.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    asked.push(spokenLast(synth)!);
    await user.click(screen.getByRole("button", { name: "No lo sé" }));
    await user.click(screen.getByRole("button", { name: "Ver resultados" }));

    // Only learned words were asked, never the one pending review.
    expect(asked.sort()).toEqual(["friend", "house", "money", "water"]);
    // The quiz changed nothing: progress, practice days and sessions stay as they were.
    const after = store.getSnapshot().state;
    expect(after.words).toEqual(before.words);
    expect(after.practiceDays).toEqual(before.practiceDays);
    expect(after.sessions).toEqual(before.sessions);

    expect(screen.getByText("Acertadas", { selector: "dt" }).nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText("Falladas", { selector: "dt" }).nextElementSibling).toHaveTextContent("2");
    expect(effects.confetti).toHaveBeenCalledWith("normal");

    // Optional: send the failed ones to review.
    await user.click(screen.getByRole("button", { name: "Mandar las 2 falladas a repasar" }));
    expect(screen.getByText("Listo: 2 palabras para repasar.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /falladas a repasar/ })).not.toBeInTheDocument();
    const statuses = Object.fromEntries(learned.map((id) => [id, store.getSnapshot().state.words[id].status]));
    expect(Object.values(statuses).filter((s) => s === "review")).toHaveLength(2);
    expect(store.getSnapshot().state.practiceDays).toEqual(before.practiceDays);
  }, 20_000); // Many simulated keystrokes: slow when the whole suite runs in parallel.

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
    // Nothing to send to review, and progress untouched.
    expect(screen.queryByRole("button", { name: /a repasar/ })).not.toBeInTheDocument();
    expect(store.getSnapshot().state.words["essentials-child"].timesSeen).toBe(1);
  });
});
