import { test, expect } from "@playwright/test";
import {
  loadTestCredentials,
  deleteTestUser,
  cleanupCredentialsFile,
  TestCredentials,
} from "./test-utils";

/**
 * E2E Login Test
 *
 * Tests the login flow using credentials from a previously registered user.
 * Runs after registration.spec.ts which creates and saves test credentials.
 *
 * Flow:
 * 1. Load credentials saved by registration test
 * 2. Navigate to homepage
 * 3. Open auth modal
 * 4. Enter credentials
 * 5. Submit and verify user lands in lobby
 * 6. Clean up: delete test user from Cognito
 */

let testCredentials: TestCredentials | null = null;

test.beforeAll(() => {
  testCredentials = loadTestCredentials();
  if (!testCredentials) {
    console.log("No test credentials found - registration test must run first");
  } else {
    console.log(`Loaded test credentials for: ${testCredentials.email}`);
  }
});

test.afterAll(async () => {
  // Clean up: delete the test user and credentials file
  if (testCredentials) {
    await deleteTestUser(testCredentials.email);
    cleanupCredentialsFile();
  }
});

test.describe("Login Flow", () => {
  test("login with registered account and reach lobby", async ({ page }) => {
    test.skip(
      !testCredentials,
      "No test credentials available - registration test must run first",
    );

    const { email, password, screenName } = testCredentials!;
    console.log(`Testing login with email: ${email}`);

    // Step 1: Navigate to homepage
    await page.goto("/");
    await expect(page).toHaveTitle(/QuizNight/i);

    // Step 2: Wait for splash screen and click Play Now
    const playNowButton = page.getByRole("button", { name: /play now/i });
    await expect(playNowButton).toBeVisible({ timeout: 15000 });
    await playNowButton.click();

    // Step 3: Click Sign In button to open auth modal
    const signInButton = page.getByRole("button", { name: /sign in/i });
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await signInButton.click();

    // Step 4: Wait for auth modal (should be on Sign In tab by default)
    const authModal = page.locator('[role="dialog"]');
    await expect(authModal).toBeVisible();

    // Step 5: Fill in login form
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await page.getByLabel(/email/i).fill(email);

    const passwordField = page.locator('input[type="password"]');
    await passwordField.fill(password);

    // Step 6: Click Sign In button in the form
    const submitButton = page.getByRole("button", { name: /^sign in$/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Step 7: Wait for auth to complete - Welcome modal or lobby
    const welcomeIndicator = page
      .getByRole("button", { name: /start playing/i })
      .or(page.getByRole("button", { name: /rooms/i }))
      .or(page.locator("text=/lobby/i"));

    await expect(welcomeIndicator.first()).toBeVisible({ timeout: 20000 });

    // If there's a Start Playing button (Welcome modal), click it
    const startPlayingButton = page.getByRole("button", {
      name: /start playing/i,
    });
    if (await startPlayingButton.isVisible()) {
      await startPlayingButton.click();
    }

    // Step 8: Verify we're in the lobby
    await page.waitForTimeout(1000);

    // Look for lobby indicators or the user's screen name
    const lobbyIndicator = page
      .locator(`text=${screenName}`)
      .or(page.getByRole("button", { name: /rooms/i }))
      .or(page.locator('[data-testid="lobby"]'))
      .or(page.locator("text=/create.*room/i"));

    await expect(lobbyIndicator.first()).toBeVisible({ timeout: 10000 });

    console.log("Login flow completed successfully!");
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/");

    // Dismiss splash screen
    const playNowButton = page.getByRole("button", { name: /play now/i });
    await expect(playNowButton).toBeVisible({ timeout: 15000 });
    await playNowButton.click();

    // Open auth modal
    const signInButton = page.getByRole("button", { name: /sign in/i });
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await signInButton.click();

    // Fill with invalid credentials
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await page.getByLabel(/email/i).fill("invalid@example.com");
    await page.locator('input[type="password"]').fill("WrongPassword123!");

    // Try to sign in
    const submitButton = page.getByRole("button", { name: /^sign in$/i });
    await submitButton.click();

    // Should see an error message
    const errorMessage = page
      .getByText(/incorrect.*password/i)
      .or(page.getByText(/user.*not.*found/i))
      .or(page.getByText(/invalid/i))
      .or(page.locator('[role="alert"]'));

    await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
  });
});
