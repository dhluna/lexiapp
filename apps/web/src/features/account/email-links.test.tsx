import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeAuth } from "@lexi/core/testing/fakes";
import { renderWithServices } from "@/test/render";
import { AuthCallbackView } from "./auth-callback-view";
import { ResetPasswordView } from "./reset-password-view";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/",
}));

/** Email links must work in any browser or device: they carry a token hash, not a PKCE code. */
describe("email links (token hash)", () => {
  beforeEach(() => replace.mockClear());
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("confirms the account from the email and goes on", async () => {
    search = "token_hash=abc&type=email&next=/practicar";
    window.history.replaceState(null, "", `/auth/callback?${search}`);
    const auth = new FakeAuth();
    renderWithServices(<AuthCallbackView />, undefined, { auth });

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/practicar"));
    expect(auth.completeRedirect).toHaveBeenCalledWith(expect.stringContaining("token_hash=abc"));
  });

  it("explains an expired confirmation link", async () => {
    search = "token_hash=old&type=email";
    window.history.replaceState(null, "", `/auth/callback?${search}`);
    const auth = new FakeAuth();
    auth.completeRedirect.mockResolvedValueOnce({ ok: false, message: "Caducado", code: "otp_expired" });
    renderWithServices(<AuthCallbackView />, undefined, { auth });

    expect(await screen.findByText("No se pudo iniciar sesión")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("opens the new-password form from the reset email and hides the single-use token", async () => {
    window.history.replaceState(null, "", "/restablecer-contrasena?token_hash=def&type=recovery");
    const auth = new FakeAuth();
    renderWithServices(<ResetPasswordView />, undefined, { auth });

    expect(await screen.findByLabelText("Contraseña nueva")).toBeInTheDocument();
    expect(auth.completeRedirect).toHaveBeenCalledWith(expect.stringContaining("type=recovery"));
    expect(window.location.search).toBe("");
  });
});
