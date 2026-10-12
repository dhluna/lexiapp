import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Pure TypeScript: no browser environment, which also catches accidental DOM use.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
