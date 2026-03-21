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

  // Bug #36 fix: retry flaky tests in CI; no retries locally
  retries: process.env.CI ? 2 : 0,

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

  // Local dev server: only start if testing against localhost (not live deployment)
  webServer: process.env.PLAYWRIGHT_BASE_URL?.includes('localhost') || !process.env.PLAYWRIGHT_BASE_URL
    ? {
        command: 'npm run dev',
        port: 8080,
        reuseExistingServer: !process.env.CI,
      }
    : undefined,

  // Browsers to test against
  projects: [
    {
      name: 'chromium',
      // Bug #36 fix: enable swiftshader software WebGL for reliable headless CI rendering
      use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--use-gl=swiftshader'] } },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
