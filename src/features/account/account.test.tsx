import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsView } from "@/features/settings/settings-view";
import { MemoryStorage } from "@/persistence/storage";
import { SyncService } from "@/services/sync-service";
import { FakeAuth, FakeServer } from "@/test/fakes";
import { renderWithServices } from "@/test/render";
import { SignInView } from "./sign-in-view";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/ajustes",
}));

const ANA = { id: "ana", email: "ana@example.com", provider: "email" as const };

function withAccounts(auth = new FakeAuth(), server = new FakeServer()) {
  const storage = new MemoryStorage();
  let sync: SyncService | null = null;
  const view = renderWithServices(<SettingsView />, storage, {
    auth,
    sync: (store) => {
      sync = new SyncService(store, server.sourceFor(() => auth.userId), auth, storage);
      sync.start();
      return sync;
    },
  });
  return { ...view, auth, server, sync: () => sync! };
}

beforeEach(() => {
  search = "";
  replace.mockClear();
});

describe("Ajustes › Cuenta", () => {
  it("is hidden when accounts are not configured", () => {
    renderWithServices(<SettingsView />);
    expect(screen.queryByRole("heading", { name: "Cuenta" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Práctica" })).toBeInTheDocument();
  });

  it("invites to sign in when signed out", () => {
    withAccounts();
    expect(screen.getByRole("heading", { name: "Cuenta" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/entrar?next=/ajustes");
  });

  it("shows the account and its sync state, and signs out keeping progress in the account", async () => {
    const user = userEvent.setup();
    const { auth, server, store, sync } = withAccounts();
    act(() => store.recordAnswer("travel-fly", "learned"));
    await act(async () => {
      auth.signIn(ANA);
      await sync().syncNow();
    });

    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("Sincronizado ahora mismo.")).toBeInTheDocument();
    expect(server.stateOf("ana").words["travel-fly"]?.status).toBe("learned");

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(await screen.findByText("Sesión cerrada. Tu progreso sigue guardado en tu cuenta.")).toBeInTheDocument();
    expect(store.getSnapshot().state.words).toEqual({});
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("asks for explicit confirmation before deleting the account", async () => {
    const user = userEvent.setup();
    const { auth, sync } = withAccounts();
    await act(async () => {
      auth.signIn(ANA);
      await sync().syncNow();
    });

    await user.click(screen.getByRole("button", { name: "Eliminar cuenta" }));
    expect(auth.deleteAccount).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Eliminar mi cuenta y todo mi progreso" }));
    expect(auth.deleteAccount).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Cuenta eliminada.")).toBeInTheDocument();
  });
});

describe("/entrar", () => {
  it("explains that accounts are off when not configured", () => {
    renderWithServices(<SignInView />);
    expect(screen.getByText("Las cuentas no están activadas")).toBeInTheDocument();
  });

  it("signs in with email and returns to the requested page", async () => {
    search = "next=/practicar";
    const user = userEvent.setup();
    const auth = new FakeAuth();
    renderWithServices(<SignInView />, undefined, { auth });

    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "secreto-123");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(auth.signInWithPassword).toHaveBeenCalledWith("ana@example.com", "secreto-123");
    expect(replace).toHaveBeenCalledWith("/practicar");
  });

  it("never redirects to another site after signing in", async () => {
    search = "next=https://evil.example";
    const user = userEvent.setup();
    renderWithServices(<SignInView />, undefined, { auth: new FakeAuth() });
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "secreto-123");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(replace).toHaveBeenCalledWith("/ajustes");
  });

  it("shows clear errors and offers to resend an unconfirmed email", async () => {
    const user = userEvent.setup();
    const auth = new FakeAuth();
    auth.next = { ok: false, message: "Confirma tu email con el enlace que te enviamos.", code: "email_not_confirmed" };
    renderWithServices(<SignInView />, undefined, { auth });

    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "secreto-123");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Confirma tu email");
    expect(replace).not.toHaveBeenCalled();
    auth.next = { ok: true };
    await user.click(screen.getByRole("button", { name: "Reenviar el correo de confirmación" }));
    expect(auth.resendConfirmation).toHaveBeenCalledWith("ana@example.com");
    expect(screen.getByRole("heading", { name: "Revisa tu correo" })).toBeInTheDocument();
  });

  it("creates an account and asks to confirm the email", async () => {
    const user = userEvent.setup();
    const auth = new FakeAuth();
    renderWithServices(<SignInView />, undefined, { auth });

    await user.click(screen.getByRole("tab", { name: "Crear cuenta" }));
    await user.type(screen.getByLabelText("Email"), "nuevo@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "contraseña-larga");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("autocomplete", "new-password");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(auth.signUp).toHaveBeenCalledWith("nuevo@example.com", "contraseña-larga", "/ajustes");
    expect(screen.getByText(/Te enviamos un enlace a nuevo@example.com/)).toBeInTheDocument();
  });

  it("starts Google sign-in and sends password reset links", async () => {
    const user = userEvent.setup();
    const auth = new FakeAuth();
    renderWithServices(<SignInView />, undefined, { auth });

    await user.click(screen.getByRole("button", { name: "Continuar con Google" }));
    expect(auth.signInWithGoogle).toHaveBeenCalledWith("/ajustes");

    await user.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
    expect(screen.queryByLabelText("Contraseña")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }));
    expect(auth.sendPasswordReset).toHaveBeenCalledWith("ana@example.com");
    expect(screen.getByText(/recibirás un enlace para elegir una contraseña nueva/)).toBeInTheDocument();
  });
});
