import * as mockNodeCrypto from "node:crypto";
import { installCryptoPolyfill } from "./crypto";

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  getRandomValues: (array: Uint8Array) => mockNodeCrypto.randomFillSync(array),
  digest: async (_algorithm: string, data: Uint8Array) => {
    const hash = mockNodeCrypto.createHash("sha256").update(data).digest();
    return hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength);
  },
}));

describe("installCryptoPolyfill", () => {
  it("gives Supabase secure random bytes and SHA-256 where Web Crypto is missing", async () => {
    const target: { crypto?: Crypto } = {};
    installCryptoPolyfill(target);

    const bytes = target.crypto!.getRandomValues(new Uint32Array(8));
    expect(bytes.some((n) => n !== 0)).toBe(true);

    const hash = await target.crypto!.subtle.digest("SHA-256", new TextEncoder().encode("abc"));
    expect(Buffer.from(hash).toString("hex")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("keeps a complete Web Crypto that already exists", () => {
    const existing = { getRandomValues: jest.fn(), subtle: { digest: jest.fn() } };
    const target: { crypto?: unknown } = { crypto: existing };
    installCryptoPolyfill(target);
    expect(target.crypto).toBe(existing);
  });
});
