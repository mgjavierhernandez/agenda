import { defineConfig, devices } from '@playwright/test';

const E2E_BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const CI = !!process.env.CI;

export default defineConfig({
  testDir: './apps/web/e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 1 : undefined,
  reporter: CI ? [['html', { open: 'never' }], ['list']] : [['list']],
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: E2E_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: CI
    ? undefined
    : {
        command: 'npm run dev:web',
        url: E2E_BASE_URL,
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
