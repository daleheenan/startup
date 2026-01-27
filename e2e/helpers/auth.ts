import { Page, expect } from '@playwright/test';

/**
 * Authentication Helper Functions
 *
 * Reusable authentication utilities for E2E tests
 */

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';
const LOGIN_URL = '/login';
const PROJECTS_URL = '/projects';

/**
 * Log in to the application
 */
export async function login(page: Page, password: string = TEST_PASSWORD): Promise<void> {
  await page.goto(LOGIN_URL);
  await page.waitForLoadState('networkidle');

  // Fill password field
  await page.fill('#password', password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to projects page
  await expect(page).toHaveURL(PROJECTS_URL, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Log out of the application
 */
export async function logout(page: Page): Promise<void> {
  const logoutButton = page.locator('button:has-text("Logout")');
  await logoutButton.click();

  // Wait for redirect to home
  await page.waitForURL('/', { timeout: 5000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Get authentication token from localStorage
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    return localStorage.getItem('novelforge_token');
  });
}

/**
 * Set authentication token in localStorage
 */
export async function setAuthToken(page: Page, token: string): Promise<void> {
  await page.evaluate((tokenValue) => {
    localStorage.setItem('novelforge_token', tokenValue);
  }, token);
}

/**
 * Clear authentication token from localStorage
 */
export async function clearAuthToken(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('novelforge_token');
  });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const token = await getAuthToken(page);
  return token !== null && token.length > 0;
}

/**
 * Verify user is on login page
 */
export async function expectLoginPage(page: Page): Promise<void> {
  await expect(page).toHaveURL(LOGIN_URL);
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
}

/**
 * Verify user is on projects page (authenticated)
 */
export async function expectProjectsPage(page: Page): Promise<void> {
  await expect(page).toHaveURL(PROJECTS_URL);
  await expect(page.locator('h1')).toContainText('Story Architect');
}
