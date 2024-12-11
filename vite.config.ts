import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 10_000,
    retry: 3,
    typecheck: {
      enabled: true,
    },
  },
});
