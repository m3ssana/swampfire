import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.js',

  // Global test timeout: 30 seconds per test
  timeout: 30 * 1000,

  // Expect timeout: 5 seconds for assertions
  expect: {
    timeout: 5 * 1000,
  },

  // Parallel execution: 2 workers for local, 1 for CI
  fullyParallel: true,
  workers: process.env.CI ? 1 : 2,

  // Reporter
  reporter: [['html'], ['list']],

  // Shared settings
  use: {
    // Target the local dev server by default
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080',

    // Run headless (set to false for debugging)
    headless: !process.env.DEBUG,

    // Screenshot & video only on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  // Local dev server: spin up vite dev server for tests
  webServer: {
    command: 'npm run dev',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },

  // Browsers to test against
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
