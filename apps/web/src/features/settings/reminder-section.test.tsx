import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsView } from "@/features/settings/settings-view";
import { MemoryStorage } from "@lexi/core/persistence/storage";
import { ReminderService } from "@lexi/core/services/reminder-service";
import { FakeAuth, FakePush, FakeReminderRemote } from "@lexi/core/testing/fakes";
import { renderWithServices } from "@/test/render";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/ajustes",
}));

const ANA = { id: "ana", email: "ana@example.com", provider: "email" as const };

function setup({ signedIn = true } = {}) {
  const auth = new FakeAuth();
  const push = new FakePush();
  const remote = new FakeReminderRemote();
  const storage = new MemoryStorage();
  if (signedIn) auth.signIn(ANA);
  const reminders = new ReminderService(push, remote, auth, storage, "vapid-public");
  return { auth, push, remote, render: () => renderWithServices(<SettingsView />, storage, { auth, reminders }) };
}

describe("Ajustes › Recordatorio", () => {
  it("is only offered with an account", () => {
    setup({ signedIn: false }).render();
    expect(screen.queryByRole("heading", { name: "Recordatorio" })).not.toBeInTheDocument();
    renderWithServices(<SettingsView />);
    expect(screen.queryAllByRole("heading", { name: "Recordatorio" })).toHaveLength(0);
  });

  it("turns on at the chosen time and confirms it", async () => {
    const user = userEvent.setup();
    const { remote, render } = setup();
    render();
    await user.selectOptions(screen.getByRole("combobox", { name: "Hora" }), "21:30");
    await user.click(screen.getByRole("switch", { name: /Recordatorio diario/ }));

    expect(await screen.findByText("Listo: te avisaremos a las 21:30.")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("switch", { name: /Recordatorio diario/ })).toBeChecked();
    expect(remote.devices.get("https://push.example/device")).toEqual({ time: "21:30", timeZone: "Europe/Madrid" });

    await user.click(screen.getByRole("switch", { name: /Recordatorio diario/ }));
    expect(await screen.findByText("Recordatorio desactivado en este dispositivo.")).toBeInTheDocument();
    expect(remote.devices.size).toBe(0);
  });

  it("explains when notifications are refused", async () => {
    const user = userEvent.setup();
    const { push, render } = setup();
    push.allow = false;
    render();
    await user.click(screen.getByRole("switch", { name: /Recordatorio diario/ }));
    expect(await screen.findByText("Para recibir el recordatorio, permite las notificaciones de Lexi.")).toBeInTheDocument();
    expect(screen.getByText(/están bloqueadas en este navegador/)).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /Recordatorio diario/ })).toBeDisabled();
  });

  it("asks iPhone users to add Lexi to the home screen first", async () => {
    const { push, render } = setup();
    push.supportValue = "needs-install";
    render();
    await act(async () => {});
    expect(screen.getByText("Primero, añade Lexi a la pantalla de inicio")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /Recordatorio diario/ })).toBeDisabled();
    expect(screen.queryByRole("combobox", { name: "Hora" })).not.toBeInTheDocument();
  });
});
