import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Quiz Night Live E2E tests.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Run tests sequentially to ensure registration runs before login
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to maintain test order
  reporter: "html",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Protected routes test - no auth needed, can run first
    {
      name: "protected-routes",
      testMatch: /protected-routes\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Registration must run first to create the test user
    {
      name: "registration",
      testMatch: /registration\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Login tests run after registration, using the created user
    {
      name: "login",
      testMatch: /login\.spec\.ts/,
      dependencies: ["registration"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "yarn dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
