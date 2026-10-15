import { act, fireEvent, screen } from "@testing-library/react-native";
import { renderWithServices } from "@/test/render";
import { PackScreen } from "./pack";
import { VocabularyScreen } from "./vocabulary";

describe("VocabularyScreen (mobile)", () => {
  it("shows the essentials in practice and adds another pack from its card", async () => {
    const { store } = await renderWithServices(<VocabularyScreen />);
    expect(screen.getByLabelText("Esenciales: 0 de 150 aprendidas")).toBeTruthy();
    expect(screen.getByLabelText("Viajes: 30 palabras")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Añadir Viajes a mi práctica"));
    expect(store.getSnapshot().state.preferences.activePacks).toEqual(["travel"]);
    expect(screen.getByText("Viajes se añadió a tu práctica.")).toBeTruthy();
    expect(screen.getByLabelText("Viajes: 0 de 30 aprendidas")).toBeTruthy();
  });
});

describe("PackScreen (mobile)", () => {
  it("adds and removes a pack without losing its progress", async () => {
    const { store } = await renderWithServices(<PackScreen id="food" />);
    expect(screen.getByText("30 palabras")).toBeTruthy();

    await fireEvent.press(screen.getByText("Añadir a mi práctica"));
    expect(store.getSnapshot().state.preferences.activePacks).toEqual(["food"]);
    await act(async () => store.recordAnswer("food-recipe", "learned"));

    await fireEvent.press(screen.getByText("Quitar de mi práctica"));
    expect(screen.getByText("Comida ya no está en tu práctica. Su progreso se conserva.")).toBeTruthy();
    expect(store.getSnapshot().state.preferences.activePacks).toEqual([]);
    expect(store.getSnapshot().state.words["food-recipe"]?.status).toBe("learned");
  });

  it("keeps the essentials always in practice", async () => {
    await renderWithServices(<PackScreen id="essentials" />);
    expect(screen.getByText("Siempre en tu práctica")).toBeTruthy();
    expect(screen.queryByText("Quitar de mi práctica")).toBeNull();
  });
});
