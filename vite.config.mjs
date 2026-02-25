import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 10_000,
    retry: process.env.CI ? 2 : undefined,
    typecheck: {
      enabled: true,
    },
    coverage: {
      exclude: [
        ...configDefaults.coverage.exclude,
        "./scripts/**",
      ],
    },
  },
});
