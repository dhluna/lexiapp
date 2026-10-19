import { getWordsByPack } from "@lexi/core/data/catalog";
import { LocalStorageProgressRepository } from "@lexi/core/persistence/progress-repository";
import { MemoryStorage } from "@lexi/core/persistence/storage";
import { ProgressStore } from "@lexi/core/services/progress-store";
import { fireEvent, screen } from "@testing-library/react-native";
import { HomeScreen } from "@/screens/home";
import { PracticeScreen } from "@/screens/practice/practice-screen";
import { ProgressScreen } from "@/screens/progress";
import { renderWithServices } from "@/test/render";

/** Storage with the first `count` essentials learned. */
function learned(count: number) {
  const storage = new MemoryStorage();
  const store = new ProgressStore(new LocalStorageProgressRepository(storage));
  store.updatePreferences({ autoPronounce: false, sessionSize: 5 });
  for (const word of getWordsByPack("essentials").slice(0, count)) store.recordAnswer(word.id, "learned");
  return storage;
}

describe("levels and badges (mobile)", () => {
  it("shows the level, the points and what is left on the home screen", async () => {
    await renderWithServices(<HomeScreen />, { storage: learned(16) });
    expect(screen.getByText("Nivel 2 · Básico")).toBeTruthy();
    expect(screen.getByText("1.600 puntos")).toBeTruthy();
    expect(screen.getByText("9 palabras para Explorador")).toBeTruthy();
  });

  it("lists earned and locked badges on the progress screen", async () => {
    await renderWithServices(<ProgressScreen />, { storage: learned(16) });
    expect(screen.getByLabelText("Nivel 2, Básico: conseguido")).toBeTruthy();
    expect(screen.getByLabelText("Nivel 3, Explorador: 25 palabras")).toBeTruthy();
    expect(screen.getByLabelText("Esenciales: 16 de 150")).toBeTruthy();
  });

  it("announces a level up at the end of the session that reaches it", async () => {
    const { effects } = await renderWithServices(<PracticeScreen />, { storage: learned(9) });
    await fireEvent.press(screen.getByText("Empezar"));
    for (let i = 0; i < 5; i += 1) await fireEvent.press(screen.getByText("La sé"));
    expect(screen.getByText("¡Subiste a Básico!")).toBeTruthy();
    expect(effects.confetti).toHaveBeenCalledWith("perfect");
  });
});
