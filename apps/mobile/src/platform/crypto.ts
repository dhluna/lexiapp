import { CryptoDigestAlgorithm, digest, getRandomValues } from "expo-crypto";

/**
 * React Native has no Web Crypto. Without it, Supabase builds the PKCE verifier with
 * `Math.random()` and sends it as a "plain" challenge. These two functions, backed by
 * expo-crypto, are all it needs to use secure random bytes and SHA-256.
 */
type MinimalCrypto = Pick<Crypto, "getRandomValues"> & { subtle: Pick<SubtleCrypto, "digest"> };

export function installCryptoPolyfill(target: { crypto?: unknown } = globalThis): void {
  const current = target.crypto as Partial<MinimalCrypto> | undefined;
  if (current?.getRandomValues && current.subtle?.digest) return;

  const polyfill: MinimalCrypto = {
    getRandomValues: ((array: Parameters<typeof getRandomValues>[0]) =>
      getRandomValues(array)) as Crypto["getRandomValues"],
    subtle: {
      digest: (async (algorithm: AlgorithmIdentifier, data: BufferSource) => {
        const name = typeof algorithm === "string" ? algorithm : algorithm.name;
        if (name.toUpperCase() !== "SHA-256") throw new Error(`Algoritmo no soportado: ${name}`);
        return digest(CryptoDigestAlgorithm.SHA256, data);
      }) as SubtleCrypto["digest"],
    },
  };
  Object.defineProperty(target, "crypto", { value: polyfill, configurable: true, writable: true });
}
