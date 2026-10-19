import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithServices } from "@/test/render";
import { SettingsView } from "./settings-view";

describe("SettingsView", () => {
  it("updates practice and pronunciation preferences", async () => {
    const user = userEvent.setup();
    const { store } = renderWithServices(<SettingsView />);

    await user.click(screen.getByRole("radio", { name: "15" }));
    await user.click(screen.getByRole("radio", { name: "Lenta" }));
    await user.click(screen.getByRole("switch", { name: /Pronunciación automática/ }));

    expect(store.getSnapshot().state.preferences).toEqual({
      sessionSize: 15,
      speechRate: 0.8,
      autoPronounce: false,
      activePacks: [],
    });
  });

  it("chooses the recorded voice on this device and plays a sample", async () => {
    const user = userEvent.setup();
    const { voiceSettings, storage, synth, store } = renderWithServices(<SettingsView />);
    expect(screen.getByRole("radio", { name: "EE. UU. · Mujer" })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "Reino Unido · Hombre" }));

    expect(voiceSettings.get()).toBe("uk-male");
    expect(storage.getItem("lexi:voice")).toBe("uk-male");
    expect(synth.speak).toHaveBeenCalled(); // the sample (system voice: no recordings in tests)
    // Not part of the synced progress.
    expect(JSON.stringify(store.getSnapshot().state)).not.toContain("uk-male");
  });

  it("turns the celebration sound off on this device only", async () => {
    const user = userEvent.setup();
    const { storage, store } = renderWithServices(<SettingsView />);
    const sound = screen.getByRole("switch", { name: /Sonido de celebración/ });
    expect(sound).toBeChecked();

    await user.click(sound);
    expect(sound).not.toBeChecked();
    expect(storage.getItem("lexi:celebration-sound")).toBe("off");
    // A device setting: it is not part of the synced preferences.
    expect(store.getSnapshot().state.preferencesUpdatedAt).toBe("1970-01-01T00:00:00.000Z");
  });

  it("asks for confirmation before deleting progress", async () => {
    const user = userEvent.setup();
    const { store } = renderWithServices(<SettingsView />);
    expect(screen.getByRole("button", { name: "Borrar progreso" })).toBeDisabled();

    store.recordAnswer("travel-luggage", "learned");
    await user.click(await screen.findByRole("button", { name: "Borrar progreso" }));
    expect(Object.keys(store.getSnapshot().state.words)).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Sí, borrar todo" }));
    expect(store.getSnapshot().state.words).toEqual({});
    expect(screen.getByText("Progreso borrado.")).toBeInTheDocument();
  });
});
