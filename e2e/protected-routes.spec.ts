import { test, expect } from "@playwright/test";

/**
 * E2E Protected Routes Test
 *
 * Tests that protected routes redirect unauthenticated users to the home page.
 *
 * Protected routes:
 * - /rooms - Requires authentication
 * - /admin - Requires admin (specific email)
 * - /admin/settings - Requires admin
 */

test.describe("Protected Route Redirects", () => {
  test("/rooms redirects unauthenticated users to home", async ({ page }) => {
    // Navigate directly to protected route
    await page.goto("/rooms");

    // Should be redirected to home page
    await expect(page).toHaveURL("/", { timeout: 10000 });

    // Verify we're on the home page by checking for splash screen or lobby elements
    const playNowButton = page.getByRole("button", { name: /play now/i });
    const quizRooms = page.getByRole("heading", { name: /quiz rooms/i });

    // Either splash screen or main page should be visible
    await expect(playNowButton.or(quizRooms).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("/admin redirects unauthenticated users to home", async ({ page }) => {
    // Navigate directly to admin page
    await page.goto("/admin");

    // Should be redirected to home page
    await expect(page).toHaveURL("/", { timeout: 10000 });

    // Verify we're on the home page
    const playNowButton = page.getByRole("button", { name: /play now/i });
    const quizRooms = page.getByRole("heading", { name: /quiz rooms/i });

    await expect(playNowButton.or(quizRooms).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("/admin/settings redirects unauthenticated users to home", async ({
    page,
  }) => {
    // Navigate directly to admin settings page
    await page.goto("/admin/settings");

    // Should be redirected to home page
    await expect(page).toHaveURL("/", { timeout: 10000 });

    // Verify we're on the home page
    const playNowButton = page.getByRole("button", { name: /play now/i });
    const quizRooms = page.getByRole("heading", { name: /quiz rooms/i });

    await expect(playNowButton.or(quizRooms).first()).toBeVisible({
      timeout: 15000,
    });
  });
});
