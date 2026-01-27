import { test as base, expect } from '@playwright/test';
import { login, logout, getAuthToken } from '../helpers/auth';

/**
 * Authentication Fixture
 *
 * Extends Playwright's base test with authenticated page fixture.
 * Use this for tests that require authentication.
 *
 * Example usage:
 * ```typescript
 * import { test, expect } from './fixtures/auth.fixture';
 *
 * test('my authenticated test', async ({ authenticatedPage }) => {
 *   await authenticatedPage.goto('/projects');
 *   // ... test code
 * });
 * ```
 */

type AuthFixtures = {
  authenticatedPage: typeof base extends { _brand: infer Page } ? Page : any;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Login before test
    await login(page);

    // Verify authentication
    const token = await getAuthToken(page);
    expect(token).toBeTruthy();

    // Use the authenticated page in test
    await use(page);

    // Logout after test (cleanup)
    try {
      await logout(page);
    } catch (error) {
      // Ignore logout errors in cleanup
      console.warn('Logout failed during cleanup:', error);
    }
  },
});

export { expect };
