/**
 * Vitest-only stub for the `server-only` marker package.
 *
 * Next.js swaps `import "server-only"` for an empty module in server
 * components and fails the build if a Client Component tries to import it.
 * Vitest runs in plain Node, where the real package would throw, so this
 * empty module is aliased in vitest.config.mts. It is never imported by the
 * application itself.
 */
export {};
