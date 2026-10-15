import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getWordsByPack } from "@lexi/core/data/catalog";
import { LocalStorageProgressRepository } from "@lexi/core/persistence/progress-repository";
import { MemoryStorage } from "@lexi/core/persistence/storage";
import { renderWithServices } from "@/test/render";
import { ProgressStore } from "@lexi/core/services/progress-store";
import { HomeView } from "./home-view";
import { ProgressView } from "@/features/progress/progress-view";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/",
}));

const ESSENTIALS = getWordsByPack("essentials").length;
const ESSENTIALS_AND_FOOD = ESSENTIALS + getWordsByPack("food").length;

/**
 * Seeds real progress: answers yesterday and today, with the food pack added. A learned
 * word of a pack that is not added (travel) must not count anywhere.
 */
function seededStorage() {
  const storage = new MemoryStorage();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  let now = yesterday;
  const store = new ProgressStore(new LocalStorageProgressRepository(storage), () => now);
  store.setPackActive("food", true);
  store.recordAnswer("essentials-eat", "learned");
  now = today;
  store.recordAnswer("food-recipe", "learned");
  store.recordAnswer("food-raw", "review");
  store.recordAnswer("travel-luggage", "learned");
  return storage;
}

describe("HomeView", () => {
  it("shows a first-time invitation with real zero stats", () => {
    renderWithServices(<HomeView />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tus primeras palabras");
    expect(screen.getByText(`Has estudiado 0 de ${ESSENTIALS} palabras del paquete Esenciales.`)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Añade un paquete de palabras" })).toHaveAttribute("href", "/vocabulario");
    expect(screen.getByText("Sin racha activa")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Empezar práctica" })).toHaveAttribute("href", "/practicar?empezar=1");
  });

  it("computes figures and streak from stored progress", () => {
    renderWithServices(<HomeView />, seededStorage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hoy ya practicaste");
    expect(screen.getByText(`Has estudiado 3 de ${ESSENTIALS_AND_FOOD} palabras de tus 2 paquetes.`)).toBeInTheDocument();
    expect(screen.getByText("Racha de 2 días")).toBeInTheDocument();
    expect(screen.getByText("Sesión de 10 palabras: 1 por repasar y 9 nuevas.", { exact: false })).toBeInTheDocument();
    // Packs live in Vocabulario, not on the home screen.
    expect(screen.queryByRole("heading", { name: "En tu práctica" })).not.toBeInTheDocument();
  });
});

describe("ProgressView", () => {
  it("summarizes streak, words and active packs without settings", () => {
    renderWithServices(<ProgressView />, seededStorage());
    expect(screen.getByText("Días de racha").nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText("Aprendidas", { selector: "dt" }).nextElementSibling).toHaveTextContent(
      `2/${ESSENTIALS_AND_FOOD}`,
    );
    expect(screen.getByText("Por repasar", { selector: "dt" }).nextElementSibling).toHaveTextContent("1");
    expect(screen.getByText("Mejor racha: 2 días. Sesiones completadas: 0.")).toBeInTheDocument();
    expect(screen.getByText(/practicado \(hoy\)/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /raw/ })).toHaveAttribute("href", "/vocabulario/food-raw");
    expect(screen.getByRole("link", { name: "Comida: 1 de 30 aprendidas" })).toHaveAttribute(
      "href",
      "/vocabulario?paquete=food",
    );
    expect(screen.getByRole("link", { name: "Esenciales: 1 de 150 aprendidas" })).toBeInTheDocument();
    // Packs not added are not listed.
    expect(screen.queryByRole("link", { name: /^Viajes:/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ajustes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Últimas sesiones" })).not.toBeInTheDocument();
  });

  it("shows an invitation when there is no progress yet", () => {
    renderWithServices(<ProgressView />);
    expect(screen.getByText("Aún no hay progreso")).toBeInTheDocument();
    expect(screen.queryByLabelText("Resumen")).not.toBeInTheDocument();
  });
});
