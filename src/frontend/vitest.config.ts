import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    exclude: [
      'node_modules/**',
      'dist/**',
      '.git/**',
      'tests/e2e/**',
    ],
  },
});
