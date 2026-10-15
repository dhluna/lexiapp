import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WORDS } from "@lexi/core/data/catalog";
import { MemoryStorage } from "@lexi/core/persistence/storage";
import { renderWithServices } from "@/test/render";
import { VocabularyView } from "./vocabulary-view";
import { WordSheet } from "./word-sheet";

let search = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => "/vocabulario",
}));

describe("VocabularyView", () => {
  beforeEach(() => {
    search = "";
  });

  it("opens on the packs: the ones in practice with progress, and the rest to add", () => {
    const storage = new MemoryStorage();
    const seed = renderWithServices(<div />, storage);
    seed.store.setPackActive("food", true);
    seed.store.recordAnswer("food-recipe", "learned");
    seed.unmount();

    renderWithServices(<VocabularyView />, storage);
    const mine = screen.getByRole("region", { name: "En tu práctica" });
    expect(within(mine).getByRole("link", { name: /Esenciales\s*0 de 150 aprendidas/ })).toHaveAttribute(
      "href",
      "/vocabulario?paquete=essentials",
    );
    expect(within(mine).getByRole("link", { name: /Comida\s*1 de 30 aprendidas/ })).toBeInTheDocument();

    const more = screen.getByRole("region", { name: "Más paquetes" });
    expect(within(more).getByRole("link", { name: /Viajes\s*30 palabras/ })).toHaveAttribute("href", "/vocabulario?paquete=travel");
    expect(within(more).queryByRole("link", { name: /Comida/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Palabras" })).not.toBeInTheDocument();
  });

  it("adds a pack from its card and confirms it", async () => {
    const user = userEvent.setup();
    const { store } = renderWithServices(<VocabularyView />);
    await user.click(screen.getByRole("button", { name: "Añadir Viajes a mi práctica" }));
    expect(store.getSnapshot().state.preferences.activePacks).toEqual(["travel"]);
    expect(screen.getByText("Viajes se añadió a tu práctica.")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "En tu práctica" })).getByRole("link", { name: /Viajes/ }),
    ).toBeInTheDocument();
  });

  it("searches the whole catalog from the grid, ignoring accents", async () => {
    const user = userEvent.setup();
    renderWithServices(<VocabularyView />);
    await user.type(screen.getByRole("searchbox", { name: "Buscar palabra o traducción" }), "contrasena");
    expect(screen.queryByRole("heading", { name: "En tu práctica" })).not.toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Palabras" });
    expect(within(list).getByRole("link", { name: /password/ })).toHaveAttribute(
      "href",
      "/vocabulario/technology-password",
    );
  });

  it("shows one pack with status filters and an empty state", async () => {
    search = "paquete=food";
    const user = userEvent.setup();
    const { store } = renderWithServices(<VocabularyView />);
    store.recordAnswer("food-recipe", "learned");

    expect(screen.getByRole("heading", { level: 1, name: "Comida" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Todos los paquetes/ })).toHaveAttribute("href", "/vocabulario");
    expect(screen.getByRole("status")).toHaveTextContent("30 palabras");

    await user.click(screen.getByRole("button", { name: /Aprendida/ }));
    expect(screen.getByRole("status")).toHaveTextContent("1 palabra");
    expect(within(screen.getByRole("list", { name: "Palabras" })).getByText("recipe")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "Buscar en Comida" }), "zzz");
    expect(screen.getByText("No hay palabras con estos filtros")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitar filtros" }));
    expect(screen.getByRole("status")).toHaveTextContent("30 palabras");
  });

  it("adds and removes a pack from its page without losing its progress", async () => {
    search = "paquete=travel";
    const user = userEvent.setup();
    const { store } = renderWithServices(<VocabularyView />);
    expect(screen.getByText(/Puedes ver y escuchar sus palabras/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Añadir a mi práctica" }));
    expect(store.getSnapshot().state.preferences.activePacks).toEqual(["travel"]);
    act(() => store.recordAnswer("travel-fly", "learned"));

    await user.click(screen.getByRole("button", { name: "Quitar de mi práctica" }));
    expect(screen.getByText("Viajes ya no está en tu práctica. Su progreso se conserva.")).toBeInTheDocument();
    expect(store.getSnapshot().state.preferences.activePacks).toEqual([]);
    expect(store.getSnapshot().state.words["travel-fly"]?.status).toBe("learned");
  });

  it("keeps the essentials always in practice", () => {
    search = "paquete=essentials";
    renderWithServices(<VocabularyView />);
    expect(screen.getByText("Siempre en tu práctica")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mi práctica/ })).not.toBeInTheDocument();
  });
});

describe("WordSheet", () => {
  it("shows the full entry and updates the learning status", async () => {
    const user = userEvent.setup();
    const word = WORDS.find((w) => w.id === "travel-fly")!;
    const { store, synth } = renderWithServices(<WordSheet word={word} />);

    expect(screen.getByRole("heading", { level: 1, name: "fly" })).toBeInTheDocument();
    expect(screen.getByText("volar / ir en avión")).toBeInTheDocument();
    expect(screen.getByText("flew")).toBeInTheDocument();
    expect(screen.getByText("flown")).toBeInTheDocument();
    expect(screen.getByText("Formas del verbo (irregular)")).toBeInTheDocument();
    expect(screen.getByText(word.examples[0].en)).toBeInTheDocument();
    expect(screen.getByText(word.examples[0].es)).toBeInTheDocument();
    expect(screen.getByText("Sin practicar")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: `Escuchar el ejemplo: ${word.examples[1].en}` }));
    expect(synth.speak).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Marcar como aprendida/ }));
    expect(store.getSnapshot().state.words["travel-fly"].status).toBe("learned");
    expect(screen.getByRole("button", { name: /Ya la aprendiste/ })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Marcar para repasar/ }));
    expect(store.getSnapshot().state.words["travel-fly"].status).toBe("review");

    await user.click(screen.getByRole("button", { name: /Reiniciar/ }));
    expect(store.getSnapshot().state.words["travel-fly"]).toBeUndefined();
  });
});
