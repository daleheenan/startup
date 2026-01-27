import { Page, expect } from '@playwright/test';

/**
 * Test Helper Utilities
 *
 * Reusable functions for common E2E test operations.
 * These helpers promote DRY principles and make tests more maintainable.
 */

/**
 * Wait for network to be idle (no pending requests)
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for and verify element is visible
 */
export async function waitForElement(page: Page, selector: string, timeout = 10000): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout });
  await expect(page.locator(selector)).toBeVisible();
}

/**
 * Fill form field with retry logic
 */
export async function fillField(page: Page, selector: string, value: string): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible' });
  await page.fill(selector, value);
  await expect(page.locator(selector)).toHaveValue(value);
}

/**
 * Click element with wait and verification
 */
export async function clickElement(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible' });
  await page.click(selector);
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
}

/**
 * Check for console errors during test execution
 */
export function setupConsoleErrorTracking(page: Page): string[] {
  const consoleErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  return consoleErrors;
}

/**
 * Verify no console errors occurred
 */
export function assertNoConsoleErrors(errors: string[]): void {
  if (errors.length > 0) {
    throw new Error(`Console errors detected:\n${errors.join('\n')}`);
  }
}

/**
 * Mock API response
 */
export async function mockApiResponse(
  page: Page,
  url: string | RegExp,
  response: object,
  status = 200
): Promise<void> {
  await page.route(url, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Wait for API call and verify
 */
export async function waitForApiCall(page: Page, urlPattern: string | RegExp): Promise<void> {
  await page.waitForResponse((response) => {
    const url = response.url();
    if (typeof urlPattern === 'string') {
      return url.includes(urlPattern);
    }
    return urlPattern.test(url);
  });
}

/**
 * Login helper (adjust based on actual auth implementation)
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await fillField(page, '[data-testid="email"]', email);
  await fillField(page, '[data-testid="password"]', password);
  await clickElement(page, '[data-testid="login-button"]');
  await waitForNetworkIdle(page);
}

/**
 * Logout helper (adjust based on actual auth implementation)
 */
export async function logout(page: Page): Promise<void> {
  await clickElement(page, '[data-testid="user-menu"]');
  await clickElement(page, '[data-testid="logout-button"]');
  await waitForNetworkIdle(page);
}

/**
 * Check accessibility violations using axe-core
 * Note: Requires @axe-core/playwright to be installed
 */
export async function checkA11y(page: Page): Promise<void> {
  // This requires installing @axe-core/playwright
  // npm install --save-dev @axe-core/playwright
  /*
  const { injectAxe, checkA11y: axeCheck } = require('@axe-core/playwright');
  await injectAxe(page);
  await axeCheck(page);
  */
}
