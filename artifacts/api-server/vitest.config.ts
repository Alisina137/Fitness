import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // Pure-logic units under test import `@workspace/db`, whose module
    // initialization requires DATABASE_URL to be present. A dummy value is
    // enough — the pg Pool is created lazily and never actually connects
    // during these unit tests.
    env: {
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
    },
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      reporter: ["text", "text-summary"],
    },
  },
});
