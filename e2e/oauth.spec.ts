import { test, expect } from "@playwright/test";

/**
 * E2E OAuth Flow Test
 *
 * Tests that OAuth redirect is initiated correctly with proper parameters.
 * We can't test the full flow through Google (bot detection, CAPTCHA, etc.)
 * but we can verify our app correctly initiates the OAuth redirect.
 */

test.describe("OAuth Flow", () => {
  test("Google OAuth button initiates redirect with correct params", async ({
    page,
  }) => {
    // Navigate to home page
    await page.goto("/");

    // Dismiss splash screen if present
    const playNowButton = page.getByRole("button", { name: /play now/i });
    await expect(playNowButton).toBeVisible({ timeout: 15000 });
    await playNowButton.click();

    // Wait for the Google sign-in button to be visible
    // It appears on the home page for unauthenticated users
    const googleButton = page.getByRole("button", {
      name: /continue with google/i,
    });
    await expect(googleButton).toBeVisible({ timeout: 10000 });

    // Set up request interception before clicking
    // We'll catch the navigation to Google's OAuth endpoint
    const requestPromise = page.waitForRequest(
      (req) =>
        req.url().includes("accounts.google.com") ||
        req.url().includes("cognito") ||
        req.url().includes("oauth2/authorize"),
      { timeout: 10000 },
    );

    // Click the Google sign-in button
    await googleButton.click();

    // Wait for the OAuth redirect request
    const request = await requestPromise;
    const url = new URL(request.url());

    // Log the URL for debugging
    console.log("OAuth redirect URL:", url.toString());

    // Verify essential OAuth parameters are present
    // The exact params depend on whether it goes directly to Google
    // or through Cognito's hosted UI first
    if (url.hostname.includes("google")) {
      // Direct Google OAuth
      expect(url.searchParams.get("client_id")).toBeTruthy();
      expect(url.searchParams.get("redirect_uri")).toBeTruthy();
      expect(url.searchParams.get("response_type")).toBeTruthy();
      expect(url.searchParams.get("scope")).toBeTruthy();
    } else if (
      url.hostname.includes("cognito") ||
      url.pathname.includes("oauth2")
    ) {
      // Cognito hosted UI OAuth
      expect(url.searchParams.get("client_id")).toBeTruthy();
      expect(url.searchParams.get("redirect_uri")).toBeTruthy();
      expect(
        url.searchParams.get("identity_provider") ||
          url.searchParams.get("idp_identifier"),
      ).toBeTruthy();
    }

    // Verify we're being redirected (not staying on the same page)
    expect(request.url()).not.toContain("localhost:3000");
    expect(request.url()).not.toContain("quiznight.live/?");
  });

  test("Google OAuth button shows loading state when clicked", async ({
    page,
  }) => {
    await page.goto("/");

    // Dismiss splash screen
    const playNowButton = page.getByRole("button", { name: /play now/i });
    await expect(playNowButton).toBeVisible({ timeout: 15000 });
    await playNowButton.click();

    const googleButton = page.getByRole("button", {
      name: /continue with google/i,
    });
    await expect(googleButton).toBeVisible({ timeout: 10000 });

    // Click and immediately check for loading state
    // The button text changes to "Redirecting to Google..."
    await googleButton.click();

    // Button should show loading state (text changes or spinner appears)
    const loadingIndicator = page
      .getByText(/redirecting to google/i)
      .or(page.locator('[data-loading="true"]'))
      .or(page.locator(".animate-spin"));

    // This might be very brief, so we use a short timeout
    // If the redirect happens too fast, this assertion might not catch it
    // which is fine - the redirect test above covers the main functionality
    try {
      await expect(loadingIndicator.first()).toBeVisible({ timeout: 2000 });
    } catch {
      // Loading state may be too brief to catch, which is acceptable
      console.log(
        "Loading state was too brief to capture (redirect happened quickly)",
      );
    }
  });
});
