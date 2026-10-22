import { defineConfig } from 'vitest/config';

// Unit tests for pure logic. Security Rules tests live in vitest.rules.config.ts.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
});
