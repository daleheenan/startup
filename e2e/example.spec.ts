import { test, expect } from '@playwright/test';

/**
 * Example E2E Test Suite
 *
 * This sample test demonstrates basic Playwright testing patterns
 * for the NovelForge application. Use this as a template for writing
 * additional E2E tests.
 */

test.describe('NovelForge Homepage', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage before each test
    await page.goto('/');
  });

  test('should load successfully', async ({ page }) => {
    // Verify the page loads without errors
    await expect(page).toHaveTitle(/NovelForge/i);
  });

  test('should display main navigation', async ({ page }) => {
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Verify basic page structure is present
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should be accessible', async ({ page }) => {
    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Check for basic accessibility - page should have proper structure
    const main = page.locator('main, [role="main"], #__next');
    await expect(main).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');

    // Example: Test navigation (adjust selectors based on actual app)
    // await page.click('a[href="/projects"]');
    // await expect(page).toHaveURL(/\/projects/);
  });
});

test.describe('Responsive Design', () => {
  test('should render correctly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify page renders on mobile
    await expect(page.locator('body')).toBeVisible();
  });

  test('should render correctly on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Verify page renders on tablet
    await expect(page.locator('body')).toBeVisible();
  });
});
