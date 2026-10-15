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
