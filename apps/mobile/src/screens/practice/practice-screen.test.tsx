import { getWord } from "@lexi/core/data/catalog";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { State } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";
import { renderWithServices } from "@/test/render";
import { PracticeScreen } from "./practice-screen";

const setSearchParams = (globalThis as unknown as { setSearchParams: (p: Record<string, string>) => void }).setSearchParams;

const currentTerm = () => screen.getByRole("header").props.children as string;

async function swipe(translationX: number) {
  await act(async () => {});
  fireGestureHandler(getByGestureTestId("practice-card-swipe"), [
    { state: State.BEGAN, translationX: 0, velocityX: 0 },
    { state: State.ACTIVE, translationX: translationX / 2, velocityX: 0 },
    { state: State.END, translationX, velocityX: 0 },
  ]);
  await act(async () => {});
}

beforeEach(() => setSearchParams({}));

describe("PracticeScreen (mobile)", () => {
  it("starts a category with one tap, speaks the word and saves answers", async () => {
    const { store, spoken } = await renderWithServices(<PracticeScreen />);
    await act(async () => store.updatePreferences({ sessionSize: 5 }));

    expect(screen.getByText("Practicar")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Practicar Viajes: 11 nuevas"));

    const first = currentTerm();
    expect(spoken).toContain(first); // automatic pronunciation

    await fireEvent.press(screen.getByText("La aprendí"));
    const learned = Object.entries(store.getSnapshot().state.words);
    expect(learned).toHaveLength(1);
    expect(getWord(learned[0][0])?.term).toBe(first);
    expect(getWord(learned[0][0])?.category).toBe("travel");
    expect(currentTerm()).not.toBe(first);
  });

  it("swipes left to the next word and right back, without answering", async () => {
    const { store } = await renderWithServices(<PracticeScreen />);
    await fireEvent.press(screen.getByText("Empezar"));

    const first = currentTerm();
    await swipe(-120);
    const second = currentTerm();
    expect(second).not.toBe(first);
    expect(screen.getByLabelText("Palabra 2 de 10")).toBeTruthy();

    await swipe(120);
    expect(currentTerm()).toBe(first);
    // A short drag is not enough to move.
    await swipe(-30);
    expect(currentTerm()).toBe(first);
    expect(store.getSnapshot().state.words).toEqual({});
  });

  it("goes back to change an answer and finishes on the last word", async () => {
    const { store } = await renderWithServices(<PracticeScreen />);
    await act(async () => store.updatePreferences({ sessionSize: 5 }));
    await fireEvent.press(screen.getByText("Empezar"));

    const first = currentTerm();
    await fireEvent.press(screen.getByText("Repasar"));
    await fireEvent.press(screen.getByLabelText("Palabra anterior"));
    expect(currentTerm()).toBe(first);
    expect(screen.getByText("Marcaste: por repasar")).toBeTruthy();
    await fireEvent.press(screen.getByText("La aprendí"));
    expect(Object.values(store.getSnapshot().state.words)[0]).toMatchObject({ status: "learned", timesSeen: 2 });

    for (let i = 0; i < 3; i += 1) await fireEvent.press(screen.getByLabelText("Palabra siguiente"));
    await fireEvent.press(screen.getByLabelText("Terminar sesión"));
    expect(screen.getByText("Sesión completada")).toBeTruthy();
    expect(screen.getByLabelText("Sin responder: 4")).toBeTruthy();
    expect(store.getSnapshot().state.sessions).toHaveLength(1);
  });

  it("starts directly from a link and lets the learner mute the automatic voice", async () => {
    setSearchParams({ empezar: "1", t: "1" });
    const { store, spoken } = await renderWithServices(<PracticeScreen />);
    expect(screen.getByLabelText("Palabra 1 de 10")).toBeTruthy();
    expect(spoken).toHaveLength(1);

    await fireEvent.press(screen.getByLabelText("Pronunciación automática"));
    expect(store.getSnapshot().state.preferences.autoPronounce).toBe(false);
    await fireEvent.press(screen.getByLabelText("Palabra siguiente"));
    expect(spoken).toHaveLength(1);
  });
});
