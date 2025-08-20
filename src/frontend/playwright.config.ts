/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const externalBase = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/*.spec.ts'],
  testIgnore: ['**/*.test.ts'],
  fullyParallel: true,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: externalBase || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: externalBase
    ? undefined
    : {
        command: 'npm run dev -- --port=5173 --mode e2e',
        url: 'http://localhost:5173',
        reuseExistingServer: !isCI,
        timeout: 180_000,
      },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  reporter: isCI
    ? [
        ['github'],
        ['html', { outputFolder: 'e2e/playwright-report', open: 'never' }],
      ]
    : [['list'], ['html', { open: 'never' }]],
});
