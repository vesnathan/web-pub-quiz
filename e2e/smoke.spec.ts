import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    // Check that the page has loaded with main branding
    await expect(page).toHaveTitle(/Quiz Night/i);
  });

  test('homepage displays logo and main content', async ({ page }) => {
    await page.goto('/');

    // Check for main visual elements
    // The logo or branding should be visible
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('navigation links are accessible', async ({ page }) => {
    await page.goto('/');

    // Check that navigation elements exist
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('about page is accessible', async ({ page }) => {
    await page.goto('/about');

    // Check that the about page loads
    await expect(page.locator('body')).toBeVisible();
  });

  test('contact page is accessible', async ({ page }) => {
    await page.goto('/contact');

    // Check that the contact page loads
    await expect(page.locator('body')).toBeVisible();
  });

  test('privacy page is accessible', async ({ page }) => {
    await page.goto('/privacy');

    // Check that the privacy page loads
    await expect(page.locator('body')).toBeVisible();
  });

  test('terms page is accessible', async ({ page }) => {
    await page.goto('/terms');

    // Check that the terms page loads
    await expect(page.locator('body')).toBeVisible();
  });
});
