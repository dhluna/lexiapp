import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  // Server modules (src/server) import "server-only", which throws outside Next's server build.
  resolve: { alias: { "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)) } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // UI tests type and click through whole flows; 5 s (the default) is too tight when the
    // monorepo suites run in parallel on a busy machine.
    testTimeout: 15_000,
  },
});
