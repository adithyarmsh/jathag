import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'packages/**/*.test.ts', 'apps/web/lib/**/*.test.ts'],
    testTimeout: 120_000,
  },
});
