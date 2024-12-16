import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 10_000,
    retry: 1,
    typecheck: {
      enabled: true,
    },
  },
});
