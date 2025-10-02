import {defineConfig, devices} from '@playwright/test';
import path from 'path';

const dotenv = require('dotenv');
dotenv.config();

const metamaskPath = path.resolve(__dirname, 'metamask-extension');
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
  testDir: './cases',
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: false,
  retries: process.env.RETRIES ? parseInt(process.env.RETRIES) : 1,
  /* Opt out of parallel tests on CI. */
  workers: process.env.WORKERS ? parseInt(process.env.WORKERS) : 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['junit', { outputFile: 'results.xml' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    headless: process.env.HEADED !== 'true',
    permissions: ["clipboard-read"],
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace:  'retain-on-failure',
    video: 'retain-on-failure',
    // Increase timeouts for CI environment
    actionTimeout: 240000, // 4 minutes
    navigationTimeout: 60000,
    // Add browser launch options to optimize for CI
    launchOptions: {
      slowMo: process.env.CI ? 5 : 0, // Reduce slowMo to avoid excessive delays
      args: [
        '--disable-dev-shm-usage', // Overcome limited /dev/shm size in CI
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        // Removed problematic extension path
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        // Add these for better extension support
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        `--disable-extensions-except=${metamaskPath}`, // Load MetaMask extension
        `--load-extension=${metamaskPath}`,
        '--enable-automation',
        '--disable-blink-features=AutomationControlled'
      ]
    }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'],
      baseURL: process.env.BASE_URL ? process.env.BASE_URL : "https://dev.inblock.io"},
      timeout: 220000,
    }
  ],
});
