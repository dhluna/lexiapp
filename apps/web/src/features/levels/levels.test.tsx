import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { getWordsByPack } from "@lexi/core/data/catalog";
import { LocalStorageProgressRepository } from "@lexi/core/persistence/progress-repository";
import { MemoryStorage } from "@lexi/core/persistence/storage";
import { ProgressStore } from "@lexi/core/services/progress-store";
import { LevelLink } from "@/components/layout/app-nav";
import { HomeView } from "@/features/home/home-view";
import { PracticeView } from "@/features/practice/practice-view";
import { ProgressView } from "@/features/progress/progress-view";
import { renderWithServices } from "@/test/render";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/",
}));

/** Storage with the first `count` essentials learned. */
function learned(count: number) {
  const storage = new MemoryStorage();
  const store = new ProgressStore(new LocalStorageProgressRepository(storage));
  store.updatePreferences({ autoPronounce: false, sessionSize: 5 });
  for (const word of getWordsByPack("essentials").slice(0, count)) store.recordAnswer(word.id, "learned");
  return storage;
}

describe("levels and badges", () => {
  it("shows the level, the points and what is left for the next one on the home screen", () => {
    renderWithServices(<HomeView />, learned(16));
    expect(screen.getByText("Nivel 2 · Básico")).toBeInTheDocument();
    expect(screen.getByText("1.600 puntos")).toBeInTheDocument();
    expect(screen.getByText("9 palabras para Explorador")).toBeInTheDocument();
  });

  it("keeps the current level in the header, linking to the badges", () => {
    renderWithServices(<LevelLink />, learned(16));
    expect(screen.getByRole("link", { name: "Nivel 2, Básico: ver insignias" })).toHaveAttribute(
      "href",
      "/progreso#insignias",
    );
  });

  it("starts at the first level with no progress", () => {
    renderWithServices(<HomeView />);
    expect(screen.getByText("Nivel 1 · Recién llegado")).toBeInTheDocument();
    expect(screen.getByText("10 palabras para Básico")).toBeInTheDocument();
  });

  it("lists earned and locked badges on the progress page", () => {
    renderWithServices(<ProgressView />, learned(16));
    expect(screen.getByRole("heading", { name: "Insignias" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nivel 2, Básico: conseguido")).toBeInTheDocument();
    expect(screen.getByLabelText("Nivel 3, Explorador: 25 palabras")).toBeInTheDocument();
    expect(screen.getByLabelText("Esenciales: 16 de 150")).toBeInTheDocument();
  });

  it("announces a level up at the end of the session that reaches it", async () => {
    const user = userEvent.setup();
    const { effects } = renderWithServices(<PracticeView />, learned(9));
    await user.click(screen.getByRole("button", { name: "Empezar" }));
    for (let i = 0; i < 5; i += 1) await user.click(screen.getByRole("button", { name: /La sé/ }));

    expect(screen.getByText("¡Subiste a Básico!")).toBeInTheDocument();
    expect(effects.confetti).toHaveBeenCalledWith("perfect");
  });

  it("does not announce anything when the level stays the same", async () => {
    const user = userEvent.setup();
    renderWithServices(<PracticeView />, learned(12));
    await user.click(screen.getByRole("button", { name: "Empezar" }));
    for (let i = 0; i < 5; i += 1) await user.click(screen.getByRole("button", { name: /Repasar/ }));
    expect(screen.queryByText(/¡Subiste a/)).not.toBeInTheDocument();
  });
});
