import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
      // The `server-only` marker package throws when resolved by Node outside a
      // Next.js server-component build. Tests import modules guarded with
      // `import "server-only"` (authoritative question configuration and
      // scoring weights), so alias it to an empty module here — exactly what
      // Next.js provides for server components.
      "server-only": path.join(rootDir, "tests/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
});
