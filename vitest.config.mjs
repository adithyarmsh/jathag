import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // "@/…" = apps/web/… (the web app's own path alias), so tests can render its components (0.3.7.3).
  resolve: { alias: { '@': fileURLToPath(new URL('./apps/web', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts', 'packages/**/*.test.ts', 'apps/web/lib/**/*.test.ts'],
    testTimeout: 120_000,
  },
});
