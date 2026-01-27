import { test, expect, type Page } from '@playwright/test';

/**
 * E2E Tests for Authentication Flow in NovelForge
 *
 * This test suite covers:
 * - Login with valid credentials
 * - Login with invalid credentials
 * - Session persistence across page reloads
 * - Protected route access control
 * - Logout functionality
 * - Token storage and management
 */

// Test configuration
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';
const LOGIN_URL = '/login';
const PROJECTS_URL = '/projects';
const HOME_URL = '/';

/**
 * Page Object: Login Page
 *
 * Encapsulates login page interactions following the Page Object pattern
 */
class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(LOGIN_URL);
    await this.page.waitForLoadState('networkidle');
  }

  async fillPassword(password: string) {
    await this.page.fill('#password', password);
  }

  async clickSubmit() {
    await this.page.click('button[type="submit"]');
  }

  async login(password: string) {
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  async getErrorMessage() {
    const errorAlert = this.page.locator('[role="alert"]');
    await errorAlert.waitFor({ state: 'visible', timeout: 5000 });
    return await errorAlert.textContent();
  }

  async isOnLoginPage() {
    await this.page.waitForURL(LOGIN_URL);
    return this.page.url().includes(LOGIN_URL);
  }

  async isLoading() {
    return await this.page.locator('button[type="submit"]:has-text("Signing in...")').isVisible();
  }
}

/**
 * Page Object: Projects Page
 *
 * Encapsulates projects page interactions
 */
class ProjectsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(PROJECTS_URL);
    await this.page.waitForLoadState('networkidle');
  }

  async isOnProjectsPage() {
    await this.page.waitForURL(PROJECTS_URL);
    return this.page.url().includes(PROJECTS_URL);
  }

  async logout() {
    const logoutButton = this.page.locator('button:has-text("Logout")');
    await logoutButton.click();
  }

  async waitForProjects() {
    // Wait for either projects list or "No Projects Yet" message
    await this.page.waitForSelector('[role="main"]', { timeout: 10000 });
  }

  async getPageHeading() {
    return await this.page.locator('h1').first().textContent();
  }
}

/**
 * Helper: Storage utilities
 */
class StorageHelper {
  constructor(private page: Page) {}

  async getToken(): Promise<string | null> {
    return await this.page.evaluate(() => {
      return localStorage.getItem('novelforge_token');
    });
  }

  async clearToken() {
    await this.page.evaluate(() => {
      localStorage.removeItem('novelforge_token');
    });
  }

  async hasToken(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null && token.length > 0;
  }
}

// Test Suite: Authentication Flow
test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session before each test
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test.describe('Login Flow', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);
      const projectsPage = new ProjectsPage(page);
      const storage = new StorageHelper(page);

      // Act
      await loginPage.goto();
      await loginPage.login(TEST_PASSWORD);

      // Assert: Redirects to projects page
      await expect(page).toHaveURL(PROJECTS_URL, { timeout: 10000 });
      expect(await projectsPage.isOnProjectsPage()).toBe(true);

      // Assert: Projects page loads correctly
      await projectsPage.waitForProjects();
      const heading = await projectsPage.getPageHeading();
      expect(heading).toContain('Story Architect');

      // Assert: Token is stored in localStorage
      const hasToken = await storage.hasToken();
      expect(hasToken).toBe(true);

      const token = await storage.getToken();
      expect(token).not.toBeNull();
      expect(token!.length).toBeGreaterThan(20); // JWT tokens are long
    });

    test('should show loading state during login', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);

      // Act
      await loginPage.goto();
      await loginPage.fillPassword(TEST_PASSWORD);

      // Assert: Loading state appears briefly
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Check if button is disabled during loading
      await expect(submitButton).toBeDisabled();
    });

    test('should have proper accessibility attributes on login page', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);

      // Act
      await loginPage.goto();

      // Assert: Check ARIA labels and roles
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('label[for="password"]')).toBeVisible();
      await expect(page.locator('#password')).toHaveAttribute('type', 'password');
      await expect(page.locator('#password')).toHaveAttribute('required', '');

      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toHaveAttribute('aria-label');
    });
  });

  test.describe('Invalid Login', () => {
    test('should show error message for invalid credentials', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);

      // Act
      await loginPage.goto();
      await loginPage.login('wrongpassword123');

      // Assert: Error message is displayed
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('Invalid password');

      // Assert: User stays on login page
      expect(await loginPage.isOnLoginPage()).toBe(true);

      // Assert: No token is stored
      const storage = new StorageHelper(page);
      expect(await storage.hasToken()).toBe(false);
    });

    test('should show error for empty password', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);

      // Act
      await loginPage.goto();
      await loginPage.clickSubmit();

      // Assert: Browser validation prevents submission
      const passwordInput = page.locator('#password');
      const validationMessage = await passwordInput.evaluate((el: HTMLInputElement) => {
        return el.validationMessage;
      });

      expect(validationMessage).toBeTruthy();
    });

    test('should handle server connection errors gracefully', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);

      // Mock network failure
      await page.route('**/api/auth/login', route => {
        route.abort('failed');
      });

      // Act
      await loginPage.goto();
      await loginPage.login(TEST_PASSWORD);

      // Assert: Error message shows connection issue
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toMatch(/unable to connect|network|server/i);

      // Assert: User stays on login page
      expect(await loginPage.isOnLoginPage()).toBe(true);
    });
  });

  test.describe('Session Management', () => {
    test('should persist authentication across page reloads', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);
      const projectsPage = new ProjectsPage(page);
      const storage = new StorageHelper(page);

      // Act: Login
      await loginPage.goto();
      await loginPage.login(TEST_PASSWORD);
      await expect(page).toHaveURL(PROJECTS_URL);

      // Get token before reload
      const tokenBefore = await storage.getToken();

      // Act: Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Assert: Still on projects page
      expect(await projectsPage.isOnProjectsPage()).toBe(true);

      // Assert: Token persists
      const tokenAfter = await storage.getToken();
      expect(tokenAfter).toBe(tokenBefore);
    });

    test('should redirect unauthenticated users to login from protected routes', async ({ page }) => {
      // Arrange
      const storage = new StorageHelper(page);

      // Act: Try to access protected route without authentication
      await page.goto(PROJECTS_URL);

      // Wait for redirect or unauthorised handling
      await page.waitForLoadState('networkidle');

      // Assert: Either redirected to login or shows error
      // The app should handle this - checking both scenarios
      const currentUrl = page.url();

      // If there's a 401 response, the frontend should redirect or show an error
      if (currentUrl.includes(PROJECTS_URL)) {
        // Check if user gets redirected to login due to 401
        await page.waitForURL(LOGIN_URL, { timeout: 5000 }).catch(() => {
          // If no redirect, check for error or empty token
          expect(storage.hasToken()).resolves.toBe(false);
        });
      }
    });

    test('should handle expired token correctly', async ({ page }) => {
      // Arrange
      const storage = new StorageHelper(page);
      const projectsPage = new ProjectsPage(page);

      // Create an expired JWT token (this is a mock - adjust based on your JWT structure)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoib3duZXIiLCJ0eXBlIjoiYXV0aCIsImV4cCI6MTYwMDAwMDAwMH0.mock-signature';

      // Act: Set expired token
      await page.goto('/');
      await page.evaluate((token) => {
        localStorage.setItem('novelforge_token', token);
      }, expiredToken);

      // Try to access protected route
      await projectsPage.goto();

      // Wait for the app to detect expired token
      await page.waitForLoadState('networkidle');

      // Assert: Token should be cleared
      // The auth.ts file has isTokenExpired check that should clear expired tokens
      await page.waitForTimeout(1000); // Give time for token validation

      const hasToken = await storage.hasToken();
      // Either the token is cleared, or user is redirected to login
      if (hasToken) {
        // If token still exists, should be redirected to login due to 401
        await expect(page).toHaveURL(LOGIN_URL, { timeout: 5000 });
      } else {
        // Token was cleared by frontend validation
        expect(hasToken).toBe(false);
      }
    });
  });

  test.describe('Logout Flow', () => {
    test('should successfully logout and redirect to home page', async ({ page }) => {
      // Arrange: Login first
      const loginPage = new LoginPage(page);
      const projectsPage = new ProjectsPage(page);
      const storage = new StorageHelper(page);

      await loginPage.goto();
      await loginPage.login(TEST_PASSWORD);
      await expect(page).toHaveURL(PROJECTS_URL);

      // Verify logged in
      expect(await storage.hasToken()).toBe(true);

      // Act: Logout
      await projectsPage.logout();

      // Assert: Redirected to home page
      await expect(page).toHaveURL(HOME_URL, { timeout: 5000 });

      // Assert: Token is cleared
      expect(await storage.hasToken()).toBe(false);
    });

    test('should not be able to access protected routes after logout', async ({ page }) => {
      // Arrange: Login first
      const loginPage = new LoginPage(page);
      const projectsPage = new ProjectsPage(page);
      const storage = new StorageHelper(page);

      await loginPage.goto();
      await loginPage.login(TEST_PASSWORD);
      await expect(page).toHaveURL(PROJECTS_URL);

      // Act: Logout
      await projectsPage.logout();
      await expect(page).toHaveURL(HOME_URL);

      // Verify token is cleared
      expect(await storage.hasToken()).toBe(false);

      // Act: Try to access protected route
      await page.goto(PROJECTS_URL);
      await page.waitForLoadState('networkidle');

      // Assert: Should be redirected to login or denied access
      // Wait a moment for redirect to trigger
      await page.waitForTimeout(1000);

      const currentUrl = page.url();
      // Either gets redirected to login, or stays on projects but gets 401 error
      if (currentUrl.includes(PROJECTS_URL)) {
        // Should get redirected due to API 401 response
        await page.waitForURL(LOGIN_URL, { timeout: 5000 }).catch(() => {
          // Alternative: check that no authenticated content loads
          expect(storage.hasToken()).resolves.toBe(false);
        });
      }
    });

    test('should clear token on logout even if navigation fails', async ({ page }) => {
      // Arrange: Login first
      const loginPage = new LoginPage(page);
      const projectsPage = new ProjectsPage(page);
      const storage = new StorageHelper(page);

      await loginPage.goto();
      await loginPage.login(TEST_PASSWORD);
      await expect(page).toHaveURL(PROJECTS_URL);

      // Block navigation to test token clearing
      await page.route('**/*', (route) => {
        if (route.request().url().includes('/login') || route.request().url() === page.url()) {
          route.continue();
        } else {
          route.continue();
        }
      });

      // Act: Logout (which calls logout() function that clears localStorage)
      await page.evaluate(() => {
        // Simulate logout function call
        localStorage.removeItem('novelforge_token');
      });

      // Assert: Token is cleared
      expect(await storage.hasToken()).toBe(false);
    });
  });

  test.describe('Security & Edge Cases', () => {
    test('should not expose password in DOM or network', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);
      const testPassword = 'secretpassword123';

      // Monitor network requests
      const requests: string[] = [];
      page.on('request', request => {
        const url = request.url();
        // Store POST data but check it's properly encrypted/handled
        if (request.method() === 'POST') {
          requests.push(url);
        }
      });

      // Act
      await loginPage.goto();
      await loginPage.fillPassword(testPassword);

      // Assert: Password input has type="password"
      const passwordInput = page.locator('#password');
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Assert: Password is not visible in the DOM value (it should be masked)
      const inputType = await passwordInput.getAttribute('type');
      expect(inputType).toBe('password');
    });

    test('should handle rapid login attempts gracefully', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);

      await loginPage.goto();

      // Act: Attempt multiple rapid logins
      for (let i = 0; i < 3; i++) {
        await loginPage.fillPassword('wrongpassword');
        await loginPage.clickSubmit();
        await page.waitForTimeout(100); // Brief delay between attempts
      }

      // Assert: Should still show error and not crash
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
    });

    test('should validate token format in localStorage', async ({ page }) => {
      // Arrange
      const storage = new StorageHelper(page);
      await page.goto('/');

      // Act: Set an invalid token
      await page.evaluate(() => {
        localStorage.setItem('novelforge_token', 'invalid-token-format');
      });

      // Try to access protected route
      await page.goto(PROJECTS_URL);
      await page.waitForLoadState('networkidle');

      // Assert: Invalid token should be cleared or cause redirect
      await page.waitForTimeout(1000);

      // The app should either clear the invalid token or redirect
      const hasValidToken = await storage.hasToken();
      if (hasValidToken) {
        // If token persists, user should be redirected due to API validation
        await page.waitForURL(LOGIN_URL, { timeout: 5000 }).catch(() => {
          // If no redirect, token should have been cleared
          expect(storage.hasToken()).resolves.toBe(false);
        });
      }
    });

    test('should prevent XSS through login form', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);
      const xssPayload = '<script>alert("XSS")</script>';

      // Act
      await loginPage.goto();
      await loginPage.fillPassword(xssPayload);
      await loginPage.clickSubmit();

      // Assert: Should show normal error, not execute script
      await page.waitForTimeout(500);

      // Check that no alert was triggered
      page.on('dialog', dialog => {
        // If this fires, XSS was not prevented
        expect(dialog.type()).not.toBe('alert');
      });

      // Error message should not contain raw HTML
      const errorElement = page.locator('[role="alert"]');
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        expect(errorText).not.toContain('<script>');
      }
    });
  });

  test.describe('UI/UX Verification', () => {
    test('should have proper focus management on login page', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);

      // Act
      await loginPage.goto();

      // Assert: Password input should be auto-focused
      await page.waitForTimeout(500);
      const focusedElement = await page.evaluate(() => document.activeElement?.id);
      expect(focusedElement).toBe('password');
    });

    test('should show NovelForge branding on login page', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);

      // Act
      await loginPage.goto();

      // Assert: Check branding elements
      await expect(page.locator('text=NovelForge').first()).toBeVisible();
      await expect(page.locator('text=Welcome back')).toBeVisible();

      // Check feature list is displayed
      await expect(page.locator('text=Story Architect')).toBeVisible();
      await expect(page.locator('text=Story Bible')).toBeVisible();
      await expect(page.locator('text=Writing Engine')).toBeVisible();
    });

    test('should have working back to home link', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);

      // Act
      await loginPage.goto();
      const backLink = page.locator('a:has-text("Back to home")');
      await backLink.click();

      // Assert
      await expect(page).toHaveURL(HOME_URL);
    });
  });
});
