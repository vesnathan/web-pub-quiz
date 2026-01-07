import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    // Check that the page has loaded with main branding
    await expect(page).toHaveTitle(/Quiz Night/i);
  });

  test('homepage displays main content', async ({ page }) => {
    await page.goto('/');

    // Check page body is visible and has content
    await expect(page.locator('body')).toBeVisible();

    // Check for sign in button (part of the registration flow)
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await expect(signInButton).toBeVisible();
  });

  test('about page is accessible', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('body')).toBeVisible();
  });

  test('contact page is accessible', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('body')).toBeVisible();
  });

  test('privacy page is accessible', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('body')).toBeVisible();
  });

  test('terms page is accessible', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.locator('body')).toBeVisible();
  });
});
