import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './',
  /* Run tests in files in parallel - disabled in CI for blockchain tests */
  fullyParallel: !process.env.CI,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Opt out of parallel tests on CI. */
  workers: process.env.WORKERS ? parseInt(process.env.WORKERS) : 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['junit', { outputFile: 'results.xml' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    permissions: ["clipboard-read"],
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: process.env.CI ? 'retain-on-failure' : 'on',
    video: {
      mode: process.env.CI ? "retain-on-failure" : "on",
    },
    // Increase timeouts for CI environment
    actionTimeout: process.env.CI ? 60000 : 30000,
    navigationTimeout: process.env.CI ? 60000 : 30000,
    // Add browser launch options to optimize for CI
    launchOptions: {
      slowMo: process.env.CI ? 50 : 0, // Reduce slowMo to avoid excessive delays
      args: [
        '--disable-dev-shm-usage', // Overcome limited /dev/shm size in CI
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        // Removed problematic extension path
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'],
      baseURL: process.env.BASE_URL ? process.env.BASE_URL : "https://dev.inblock.io"},
    }
  ],
});
