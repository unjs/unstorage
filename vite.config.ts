import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 10_000,
    retry: process.env.CI ? 3 : undefined,
    typecheck: {
      enabled: true,
    },
  },
});
