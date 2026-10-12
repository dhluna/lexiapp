import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWord } from "@/data/catalog";
import { MemoryStorage } from "@/persistence/storage";
import { renderWithServices } from "@/test/render";
import { PracticeView } from "./practice-view";

let search = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => "/practicar",
}));

function lastSpoken(synth: { speak: { mock: { calls: unknown[][] } } }) {
  const call = synth.speak.mock.calls.at(-1);
  return call ? (call[0] as { text: string }).text : null;
}

function currentTerm() {
  const heading = screen.getByRole("heading", { level: 2 });
  return heading.textContent ?? "";
}

describe("PracticeView", () => {
  beforeEach(() => {
    search = "";
  });

  it("runs a full session, saving answers and showing a summary", async () => {
    const user = userEvent.setup();
    const { store, synth } = renderWithServices(<PracticeView />);
    act(() => store.updatePreferences({ sessionSize: 5 }));

    // One tap on a category starts it: no filters to set first.
    await user.click(screen.getByRole("button", { name: /Practicar Viajes/ }));

    const seen: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      expect(screen.getByRole("list", { name: `Palabra ${i + 1} de 5` })).toBeInTheDocument();
      const term = currentTerm();
      seen.push(term);

      // Meaning and examples are visible straight away, and the word is spoken automatically.
      expect(screen.getByText("Ejemplos")).toBeInTheDocument();
      expect(lastSpoken(synth)).toBe(term);
      // The button still repeats it on demand.
      await user.click(screen.getByRole("button", { name: `Escuchar la pronunciación de «${term}»` }));
      expect(lastSpoken(synth)).toBe(term);

      await user.click(screen.getByRole("button", { name: i % 2 === 0 ? /La aprendí/ : /Repasar/ }));
    }

    expect(new Set(seen).size).toBe(5);
    const spoken = synth.speak.mock.calls.map(([u]) => (u as { text: string }).text);
    expect(seen.every((term) => spoken.includes(term))).toBe(true);

    expect(screen.getByRole("heading", { name: "Sesión completada" })).toBeInTheDocument();
    const counts = screen.getAllByRole("definition").map((el) => el.textContent);
    expect(counts.slice(0, 3)).toEqual(["3", "2", "0"]);

    const { state } = store.getSnapshot();
    expect(Object.keys(state.words)).toHaveLength(5);
    expect(Object.keys(state.words).every((id) => getWord(id)?.category === "travel")).toBe(true);
    expect(state.sessions).toHaveLength(1);
    expect(state.practiceDays).toHaveLength(1);
    expect(state.preferences.sessionSize).toBe(5);
  }, 15_000); // Many simulated clicks: slow when the whole suite runs in parallel.

  it("keeps confirmed answers when the session is abandoned", async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorage();
    const first = renderWithServices(<PracticeView />, storage);

    await user.click(screen.getByRole("button", { name: "Empezar" }));
    const term = currentTerm();
    await user.click(screen.getByRole("button", { name: /La aprendí/ }));
    first.unmount();

    // A fresh store over the same storage behaves like a page reload.
    const { store } = renderWithServices(<PracticeView />, storage);
    const { state } = store.getSnapshot();
    const learned = Object.entries(state.words).filter(([, p]) => p.status === "learned");
    expect(learned).toHaveLength(1);
    expect(getWord(learned[0][0])?.term).toBe(term);
    expect(state.sessions).toHaveLength(0);
  });

  it("starts right away from the home shortcut and supports keyboard shortcuts", async () => {
    search = "empezar=1&categoria=food";
    const user = userEvent.setup();
    const rendered = renderWithServices(<PracticeView />);
    const { store } = rendered;

    const term = currentTerm();
    const { synth } = rendered;
    synth.speak.mockClear();
    await user.keyboard(" ");
    expect(lastSpoken(synth)).toBe(term);
    await user.keyboard("1");

    const entry = Object.entries(store.getSnapshot().state.words)[0];
    expect(getWord(entry[0])?.term).toBe(term);
    expect(entry[1].status).toBe("review");
    expect(entry[0].startsWith("food-")).toBe(true);
  });

  it("moves forward without answering and reports unanswered words", async () => {
    const user = userEvent.setup();
    const { store } = renderWithServices(<PracticeView />);
    act(() => store.updatePreferences({ sessionSize: 5 }));
    await user.click(screen.getByRole("button", { name: "Empezar" }));
    for (let i = 0; i < 4; i += 1) await user.click(screen.getAllByRole("button", { name: "Palabra siguiente" })[0]);
    await user.click(screen.getAllByRole("button", { name: "Terminar sesión" })[0]);

    expect(screen.getByRole("heading", { name: "Sesión terminada" })).toBeInTheDocument();
    const list = screen.getByRole("heading", { name: "Sin responder" }).nextElementSibling as HTMLElement;
    expect(within(list).getAllByRole("link")).toHaveLength(5);
    expect(store.getSnapshot().state.words).toEqual({});
    expect(store.getSnapshot().state.practiceDays).toEqual([]);
  });

  it("goes back to a previous word and changes its answer", async () => {
    const user = userEvent.setup();
    const { store } = renderWithServices(<PracticeView />);
    await user.click(screen.getByRole("button", { name: "Empezar" }));

    const first = currentTerm();
    const previous = () => screen.getAllByRole("button", { name: "Palabra anterior" })[0];
    expect(previous()).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Repasar/ }));
    expect(currentTerm()).not.toBe(first);

    await user.click(previous());
    expect(currentTerm()).toBe(first);
    expect(screen.getByText("Marcaste: por repasar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Repasar/ })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /La aprendí/ }));
    const entries = Object.entries(store.getSnapshot().state.words);
    expect(entries).toHaveLength(1);
    expect(getWord(entries[0][0])?.term).toBe(first);
    expect(entries[0][1]).toMatchObject({ status: "learned", timesSeen: 2 });

    // Keyboard: ← goes back again; confirming the same answer is not counted twice.
    await user.keyboard("{ArrowLeft}");
    expect(currentTerm()).toBe(first);
    await user.keyboard("2");
    expect(Object.values(store.getSnapshot().state.words)[0].timesSeen).toBe(2);
  });

  it("lets the learner turn automatic pronunciation off", async () => {
    const user = userEvent.setup();
    const { store, synth } = renderWithServices(<PracticeView />);
    await user.click(screen.getByRole("button", { name: "Empezar" }));
    expect(synth.speak).toHaveBeenCalled();

    const toggle = screen.getByRole("button", { name: "Pronunciación automática" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(store.getSnapshot().state.preferences.autoPronounce).toBe(false);

    synth.speak.mockClear();
    await user.click(screen.getByRole("button", { name: /Repasar/ }));
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("shows a clean start screen with today's plan and one entry per category", async () => {
    const user = userEvent.setup();
    const { store } = renderWithServices(<PracticeView />);
    act(() => {
      store.recordAnswer("travel-luggage", "review");
      store.recordAnswer("travel-fly", "learned");
    });

    expect(screen.getByText("Sesión de 10 palabras: 1 por repasar y 9 nuevas.")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cambiar palabras por sesión" })).toHaveAttribute(
      "href",
      "/ajustes",
    );
    expect(screen.getByRole("button", { name: "Practicar Viajes: 1 por repasar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Practicar Salud: 11 nuevas" })).toBeInTheDocument();

    // A category session starts with its pending word.
    await user.click(screen.getByRole("button", { name: /Practicar Viajes/ }));
    expect(currentTerm()).toBe("luggage");
  });
});
