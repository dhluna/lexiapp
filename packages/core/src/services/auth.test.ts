import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { SupabaseAuthService } from "./auth";

function setup() {
  const auth = {
    onAuthStateChange: vi.fn(),
    getSession: vi.fn(async () => ({ data: { session: null } })),
    verifyOtp: vi.fn(async () => ({ data: {}, error: null })),
    exchangeCodeForSession: vi.fn(async () => ({ data: {}, error: null })),
  };
  const platform = { redirectUrl: () => "https://lexiapp.app/auth/callback" };
  const service = new SupabaseAuthService({ auth } as unknown as SupabaseClient, platform);
  return { auth, service };
}

describe("SupabaseAuthService.completeRedirect", () => {
  it("verifies email links by token hash, so they work in any browser or device", async () => {
    const { auth, service } = setup();
    await expect(service.completeRedirect("https://lexiapp.app/auth/callback?token_hash=abc&type=email")).resolves.toEqual({ ok: true });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "abc", type: "email" });

    await service.completeRedirect("https://lexiapp.app/restablecer-contrasena?token_hash=def&type=recovery");
    expect(auth.verifyOtp).toHaveBeenLastCalledWith({ token_hash: "def", type: "recovery" });
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("still exchanges the PKCE code returned by Google", async () => {
    const { auth, service } = setup();
    await service.completeRedirect("https://lexiapp.app/auth/callback?code=xyz");
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("xyz");
  });

  it("reports an expired or reused email link", async () => {
    const { auth, service } = setup();
    auth.verifyOtp.mockResolvedValueOnce({ data: {}, error: { message: "Email link is invalid or has expired", code: "otp_expired" } } as never);
    const result = await service.completeRedirect("https://lexiapp.app/auth/callback?token_hash=old&type=email");
    expect(result.ok).toBe(false);
  });
});
