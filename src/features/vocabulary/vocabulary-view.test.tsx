import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WORDS } from "@/data/catalog";
import { MemoryStorage } from "@/persistence/storage";
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

  it("opens on the category grid with real progress", () => {
    const storage = new MemoryStorage();
    const seed = renderWithServices(<div />, storage);
    seed.store.recordAnswer("food-recipe", "learned");
    seed.unmount();

    renderWithServices(<VocabularyView />, storage);
    expect(screen.getByRole("heading", { name: "Categorías" })).toBeInTheDocument();
    const food = screen.getByRole("link", { name: /Alimentación\s*1 de 11 aprendidas/ });
    expect(food).toHaveAttribute("href", "/vocabulario?categoria=food");
    expect(screen.getByRole("link", { name: /Viajes\s*0 de 11 aprendidas/ })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Palabras" })).not.toBeInTheDocument();
  });

  it("searches the whole catalog from the grid, ignoring accents", async () => {
    const user = userEvent.setup();
    renderWithServices(<VocabularyView />);
    await user.type(screen.getByRole("searchbox", { name: "Buscar palabra o traducción" }), "contrasena");
    expect(screen.queryByRole("heading", { name: "Categorías" })).not.toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Palabras" });
    expect(within(list).getByRole("link", { name: /password/ })).toHaveAttribute(
      "href",
      "/vocabulario/technology-password",
    );
  });

  it("shows one category with status filters and an empty state", async () => {
    search = "categoria=food";
    const user = userEvent.setup();
    const { store } = renderWithServices(<VocabularyView />);
    store.recordAnswer("food-recipe", "learned");

    expect(screen.getByRole("heading", { level: 1, name: "Alimentación" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Todas las categorías/ })).toHaveAttribute("href", "/vocabulario");
    expect(screen.getByRole("status")).toHaveTextContent("11 palabras");

    await user.click(screen.getByRole("button", { name: /Aprendida/ }));
    expect(screen.getByRole("status")).toHaveTextContent("1 palabra");
    expect(within(screen.getByRole("list", { name: "Palabras" })).getByText("recipe")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "Buscar en Alimentación" }), "zzz");
    expect(screen.getByText("No hay palabras con estos filtros")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitar filtros" }));
    expect(screen.getByRole("status")).toHaveTextContent("11 palabras");
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
