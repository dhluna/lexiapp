import type { AuthResult, AuthService, AuthSnapshot } from "@lexi/core/services/auth";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { fakeNotifications, renderWithServices } from "@/test/render";
import { SignInScreen } from "./account";
import { SettingsScreen } from "./settings";

const router = jest.requireMock("expo-router").useRouter();

/** Minimal AuthService for Jest: signed out, each method a spy returning `next`. */
function fakeAuth(next: AuthResult = { ok: true }) {
  let snapshot: AuthSnapshot = { status: "signed-out", user: null };
  const listeners = new Set<() => void>();
  const result = () => Promise.resolve(next);
  const auth: AuthService = {
    getSnapshot: () => snapshot,
    subscribe: (l) => (listeners.add(l), () => listeners.delete(l)),
    ready: async () => snapshot,
    signInWithGoogle: jest.fn(result),
    signInWithPassword: jest.fn(async (email: string) => {
      if (next.ok) {
        snapshot = { status: "signed-in", user: { id: "u1", email, provider: "email" } };
        listeners.forEach((l) => l());
      }
      return next;
    }),
    signUp: jest.fn(async () => ({ ok: true as const, needsConfirmation: true })),
    resendConfirmation: jest.fn(result),
    sendPasswordReset: jest.fn(result),
    updatePassword: jest.fn(result),
    signOut: jest.fn(result),
    deleteAccount: jest.fn(result),
    completeRedirect: jest.fn(result),
  };
  return auth;
}

beforeEach(() => Object.values(router).forEach((fn) => (fn as jest.Mock).mockClear()));

describe("SettingsScreen (mobile)", () => {
  it("hides the account group without Supabase and updates preferences", async () => {
    const { store } = await renderWithServices(<SettingsScreen />);
    expect(screen.queryByText("Cuenta")).toBeNull();
    await fireEvent.press(screen.getByText("15"));
    await fireEvent.press(screen.getByText("Lenta"));
    await fireEvent(screen.getByLabelText("Pronunciación automática"), "valueChange", false);
    expect(store.getSnapshot().state.preferences).toEqual({ sessionSize: 15, speechRate: 0.8, autoPronounce: false });
  });

  it("turns the daily reminder on and lets the learner pick the hour", async () => {
    const notifications = fakeNotifications(true);
    await renderWithServices(<SettingsScreen />, { notifications: notifications.port });
    await act(async () => {
      await fireEvent(screen.getByLabelText("Recordatorio diario"), "valueChange", true);
    });
    expect(notifications.scheduled.size).toBeGreaterThanOrEqual(6);
    await act(async () => {
      await fireEvent.press(screen.getByText("21:00"));
    });
    expect([...notifications.scheduled.values()].every((n) => n.at.getHours() === 21)).toBe(true);
  });

  it("explains how to allow notifications when they are denied", async () => {
    const notifications = fakeNotifications(false);
    await renderWithServices(<SettingsScreen />, { notifications: notifications.port });
    await act(async () => {
      await fireEvent(screen.getByLabelText("Recordatorio diario"), "valueChange", true);
    });
    expect(screen.getByText("Las notificaciones están desactivadas para Lexi")).toBeTruthy();
    expect(screen.getByLabelText("Recordatorio diario").props.value).toBe(false);
    expect(notifications.scheduled.size).toBe(0);
  });

  it("explains that the reminder needs the installed app where notifications are unavailable", async () => {
    const notifications = fakeNotifications(true, false);
    await renderWithServices(<SettingsScreen />, { notifications: notifications.port });
    expect(screen.getByText("El recordatorio no está disponible en Expo Go")).toBeTruthy();
    expect(screen.queryByLabelText("Recordatorio diario")).toBeNull();
  });

  it("asks for confirmation before deleting progress", async () => {
    const { store } = await renderWithServices(<SettingsScreen />);
    await act(async () => store.recordAnswer("travel-fly", "learned"));
    await fireEvent.press(screen.getByRole("button", { name: "Borrar progreso" }));
    expect(Object.keys(store.getSnapshot().state.words)).toHaveLength(1);
    await fireEvent.press(screen.getByText("Sí, borrar todo"));
    expect(store.getSnapshot().state.words).toEqual({});
    expect(screen.getByText("Progreso borrado.")).toBeTruthy();
  });
});

describe("SignInScreen (mobile)", () => {
  it("explains that accounts are off when not configured", async () => {
    await renderWithServices(<SignInScreen />);
    expect(screen.getByText("Las cuentas no están activadas")).toBeTruthy();
  });

  it("signs in with email and returns to Ajustes", async () => {
    const auth = fakeAuth();
    await renderWithServices(<SignInScreen />, { auth });
    await fireEvent.changeText(screen.getByLabelText("Email"), "ana@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "secreto-123");
    await act(async () => {
      await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    });
    expect(auth.signInWithPassword).toHaveBeenCalledWith("ana@example.com", "secreto-123");
    expect(router.replace).toHaveBeenCalledWith("/ajustes");
  });

  it("shows the error and does not leave the screen", async () => {
    const auth = fakeAuth({ ok: false, message: "El email o la contraseña no son correctos.", code: "invalid_credentials" });
    await renderWithServices(<SignInScreen />, { auth });
    await fireEvent.changeText(screen.getByLabelText("Email"), "ana@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "mal");
    await act(async () => {
      await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    });
    expect(screen.getByText("El email o la contraseña no son correctos.")).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("creates an account and asks to confirm the email on this phone", async () => {
    const auth = fakeAuth();
    await renderWithServices(<SignInScreen />, { auth });
    await fireEvent.press(screen.getByRole("tab", { name: "Crear cuenta" }));
    await fireEvent.changeText(screen.getByLabelText("Email"), "nuevo@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "contraseña-larga");
    await act(async () => {
      await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
    });
    expect(auth.signUp).toHaveBeenCalledWith("nuevo@example.com", "contraseña-larga", "/ajustes");
    expect(screen.getByText("Revisa tu correo")).toBeTruthy();
  });
});
