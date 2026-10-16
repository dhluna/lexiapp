import { LocalStorageProgressRepository } from "@lexi/core/persistence/progress-repository";
import { MemoryStorage } from "@lexi/core/persistence/storage";
import { ProgressStore } from "@lexi/core/services/progress-store";
import type { StoredStatus } from "@lexi/core/domain/types";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithServices } from "@/test/render";
import { PracticeScreen } from "./practice-screen";

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

const answerField = () => screen.getByLabelText("Tu respuesta en inglés");

afterEach(() => jest.restoreAllMocks());

describe("Ponerme a prueba (mobile)", () => {
  it("is disabled until some words have been seen", async () => {
    await renderWithServices(<PracticeScreen />);
    expect(screen.getByRole("button", { name: "Ponerme a prueba" }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText(/Practica primero con las tarjetas/)).toBeTruthy();
  });

  it("dictates, grades tolerantly and saves each result", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.9); // dictation for every word
    const storage = seen([
      ["essentials-eat", "review"],
      ["essentials-time", "review"],
      ["essentials-water", "learned"],
    ]);
    const { store, spoken } = await renderWithServices(<PracticeScreen />, { storage });

    await fireEvent.press(screen.getByRole("button", { name: "Ponerme a prueba" }));
    expect(screen.getByText("Escucha y escribe")).toBeTruthy();
    expect(spoken.at(-1)).toBe("eat");

    await fireEvent.changeText(answerField(), "Eat");
    await fireEvent.press(screen.getByText("Comprobar"));
    expect(screen.getByText("¡Correcto!")).toBeTruthy();
    await fireEvent.press(screen.getByText("Siguiente"));

    await fireEvent.changeText(answerField(), "tine");
    await fireEvent(answerField(), "submitEditing");
    expect(screen.getByText("Casi: se escribe «time».")).toBeTruthy();
    await fireEvent.press(screen.getByText("Siguiente"));

    await fireEvent.press(screen.getByText("No lo sé"));
    expect(screen.getByText("No es correcto. Queda para repasar.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Ver resultados"));

    const words = store.getSnapshot().state.words;
    expect(words["essentials-eat"].status).toBe("learned");
    expect(words["essentials-time"].status).toBe("learned");
    expect(words["essentials-water"].status).toBe("review");
    expect(screen.getByLabelText("Acertadas: 2")).toBeTruthy();
  });

  it("completes a sentence and accepts the base form with a note", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // a gap sentence whenever possible
    const storage = seen([["essentials-child", "learned"]]);
    await renderWithServices(<PracticeScreen />, { storage });

    await fireEvent.press(screen.getByRole("button", { name: "Ponerme a prueba" }));
    expect(screen.getByText("Completa la frase")).toBeTruthy();
    await fireEvent.changeText(answerField(), "child");
    await fireEvent.press(screen.getByText("Comprobar"));
    expect(screen.getByText("En esta frase va «children».")).toBeTruthy();
    await fireEvent.press(screen.getByText("Ver resultados"));
    expect(screen.getByText("Todas correctas")).toBeTruthy();
  });
});
