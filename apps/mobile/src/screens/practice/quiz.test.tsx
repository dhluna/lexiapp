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
  it("is disabled until some words are learned (words pending review do not count)", async () => {
    await renderWithServices(<PracticeScreen />, { storage: seen([["essentials-time", "review"]]) });
    expect(screen.getByRole("button", { name: "Ponerme a prueba" }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText(/se activa cuando tengas palabras aprendidas/)).toBeTruthy();
  });

  it("tests only learned words without touching progress, then optionally sends failures to review", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.9); // dictation for every word
    const storage = seen([
      ["essentials-time", "review"],
      ["essentials-water", "learned"],
      ["essentials-friend", "learned"],
      ["essentials-money", "learned"],
    ]);
    const { store, spoken } = await renderWithServices(<PracticeScreen />, { storage });
    const before = store.getSnapshot().state;

    await fireEvent.press(screen.getByRole("button", { name: "Ponerme a prueba" }));
    const asked: string[] = [];

    asked.push(spoken.at(-1)!);
    await fireEvent.changeText(answerField(), asked[0].toUpperCase());
    await fireEvent.press(screen.getByText("Comprobar"));
    expect(screen.getByText("¡Correcto!")).toBeTruthy();
    await fireEvent.press(screen.getByText("Siguiente"));

    asked.push(spoken.at(-1)!);
    await fireEvent.changeText(answerField(), `${asked[1].slice(0, -1)}q`);
    await fireEvent(answerField(), "submitEditing");
    expect(screen.getByText(`Casi: se escribe «${asked[1]}».`)).toBeTruthy();
    await fireEvent.press(screen.getByText("Siguiente"));

    asked.push(spoken.at(-1)!);
    await fireEvent.press(screen.getByText("No lo sé"));
    expect(screen.getByText("No es correcto.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Ver resultados"));

    expect(asked.sort()).toEqual(["friend", "money", "water"]);
    const after = store.getSnapshot().state;
    expect(after.words).toEqual(before.words);
    expect(after.practiceDays).toEqual(before.practiceDays);
    expect(after.sessions).toEqual(before.sessions);
    expect(screen.getByLabelText("Acertadas: 2")).toBeTruthy();
    expect(screen.getByLabelText("Falladas: 1")).toBeTruthy();

    await fireEvent.press(screen.getByText("Mandar la fallada a repasar"));
    expect(screen.getByText("Listo: 1 palabra para repasar.")).toBeTruthy();
    const reviewed = ["essentials-water", "essentials-friend", "essentials-money"].filter(
      (id) => store.getSnapshot().state.words[id].status === "review",
    );
    expect(reviewed).toHaveLength(1);
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
