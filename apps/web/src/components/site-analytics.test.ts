import { describe, expect, it } from "vitest";
import { withoutQuery } from "./site-analytics";

describe("site analytics", () => {
  it("never sends the query string or the hash (email links carry single-use tokens)", () => {
    expect(withoutQuery({ type: "pageview", url: "https://lexiapp.app/auth/callback?token_hash=abc&type=email" })).toEqual({
      type: "pageview",
      url: "https://lexiapp.app/auth/callback",
    });
    expect(withoutQuery({ type: "pageview", url: "https://lexiapp.app/restablecer-contrasena?token_hash=x#y" }).url).toBe(
      "https://lexiapp.app/restablecer-contrasena",
    );
    expect(withoutQuery({ type: "pageview", url: "https://lexiapp.app/vocabulario?paquete=travel" }).url).toBe(
      "https://lexiapp.app/vocabulario",
    );
  });
});
