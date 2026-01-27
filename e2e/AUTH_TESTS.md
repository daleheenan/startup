# Authentication E2E Tests

## Overview

The `auth.spec.ts` file contains comprehensive E2E tests for NovelForge's authentication system. These tests verify the complete authentication flow from login to logout, including security, accessibility, and edge cases.

## Test Coverage

### 1. Login Flow (3 tests)
- ✅ Successful login with valid credentials
- ✅ Loading state during login
- ✅ Proper accessibility attributes

### 2. Invalid Login (3 tests)
- ✅ Error message for invalid credentials
- ✅ Browser validation for empty password
- ✅ Graceful handling of server connection errors

### 3. Session Management (3 tests)
- ✅ Authentication persistence across page reloads
- ✅ Redirect unauthenticated users to login
- ✅ Handle expired token correctly

### 4. Logout Flow (3 tests)
- ✅ Successful logout and redirect to home
- ✅ Cannot access protected routes after logout
- ✅ Token cleared even if navigation fails

### 5. Security & Edge Cases (4 tests)
- ✅ Password not exposed in DOM or network
- ✅ Handle rapid login attempts gracefully
- ✅ Validate token format in localStorage
- ✅ Prevent XSS through login form

### 6. UI/UX Verification (3 tests)
- ✅ Proper focus management on login page
- ✅ NovelForge branding displayed correctly
- ✅ Back to home link working

**Total: 19 comprehensive tests**

## Running the Tests

### Run all authentication tests
```bash
npm run test:e2e auth.spec.ts
```

### Run with headed browser (see what's happening)
```bash
npm run test:e2e:headed auth.spec.ts
```

### Run in UI mode (interactive debugging)
```bash
npm run test:e2e:ui
# Then select auth.spec.ts from the list
```

### Run specific test by name
```bash
npx playwright test auth.spec.ts -g "should successfully login"
```

## Configuration

### Environment Variables

Set the test password to match your backend configuration:

```bash
# Linux/macOS
export TEST_PASSWORD="your_test_password"
npm run test:e2e auth.spec.ts

# Windows PowerShell
$env:TEST_PASSWORD="your_test_password"
npm run test:e2e auth.spec.ts

# Windows CMD
set TEST_PASSWORD=your_test_password
npm run test:e2e auth.spec.ts
```

### Backend Requirements

The backend must be running with:
- `OWNER_PASSWORD_HASH` set in `.env`
- `JWT_SECRET` set in `.env`
- Backend running on `http://localhost:3001` (or set `NEXT_PUBLIC_API_URL`)

Generate password hash:
```bash
cd backend
npm run hash-password
# Follow prompts to generate hash
```

## Test Architecture

### Page Object Pattern

Tests use the Page Object pattern for maintainability:

```typescript
class LoginPage {
  constructor(private page: Page) {}

  async goto() { /* ... */ }
  async fillPassword(password: string) { /* ... */ }
  async clickSubmit() { /* ... */ }
  async login(password: string) { /* ... */ }
  async getErrorMessage() { /* ... */ }
}
```

### Storage Helper

Token management abstraction:

```typescript
class StorageHelper {
  async getToken(): Promise<string | null>
  async clearToken(): Promise<void>
  async hasToken(): Promise<boolean>
}
```

## Key Test Patterns

### 1. Arrange-Act-Assert Pattern
```typescript
test('should successfully login', async ({ page }) => {
  // Arrange
  const loginPage = new LoginPage(page);

  // Act
  await loginPage.goto();
  await loginPage.login(TEST_PASSWORD);

  // Assert
  await expect(page).toHaveURL('/projects');
});
```

### 2. Error Handling
```typescript
test('should handle server connection errors', async ({ page }) => {
  // Mock network failure
  await page.route('**/api/auth/login', route => {
    route.abort('failed');
  });

  await loginPage.login(TEST_PASSWORD);

  // Verify error message
  const errorMessage = await loginPage.getErrorMessage();
  expect(errorMessage).toMatch(/unable to connect/i);
});
```

### 3. Token Verification
```typescript
test('should store token after login', async ({ page }) => {
  const storage = new StorageHelper(page);

  await loginPage.login(TEST_PASSWORD);

  const token = await storage.getToken();
  expect(token).not.toBeNull();
  expect(token!.length).toBeGreaterThan(20);
});
```

## Test Isolation

Each test is isolated:
- `beforeEach` hook clears cookies and localStorage
- No shared state between tests
- Tests can run in parallel

```typescript
test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});
```

## Debugging Failed Tests

### 1. View trace
```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

### 2. Run in debug mode
```bash
npm run test:e2e:debug auth.spec.ts
```

### 3. Add screenshots
```typescript
await page.screenshot({ path: 'debug-screenshot.png' });
```

### 4. Check console output
```typescript
page.on('console', msg => console.log(msg.text()));
```

## Common Issues

### Token not found after login
- Verify backend is running on correct port
- Check `OWNER_PASSWORD_HASH` matches test password
- Ensure `JWT_SECRET` is set in backend `.env`

### Tests timing out
- Increase timeout: `test.setTimeout(60000)`
- Add proper waits: `await page.waitForLoadState('networkidle')`
- Check backend is responding quickly

### Flaky tests
- Use `waitForURL` instead of checking URL immediately
- Add explicit waits for elements: `await element.waitFor({ state: 'visible' })`
- Increase action timeout in `playwright.config.ts`

## Extending the Tests

### Adding new test cases
```typescript
test.describe('New Feature', () => {
  test('should test new behaviour', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const storage = new StorageHelper(page);

    // Your test code here
  });
});
```

### Using authentication fixtures
```typescript
import { test, expect } from './fixtures/auth.fixture';

test('test with pre-authenticated page', async ({ authenticatedPage }) => {
  // Page is already logged in
  await page.goto('/projects');
});
```

## Best Practices

1. **Use proper locators**: Prefer `#password` over complex CSS selectors
2. **Wait for state**: Always wait for `networkidle` or specific elements
3. **Test user behaviour**: Test what users do, not implementation details
4. **Keep tests focused**: One test should verify one behaviour
5. **Use descriptive names**: Test names should explain what they verify
6. **Handle async properly**: Always await async operations
7. **Clean up state**: Use `beforeEach` to ensure clean state

## CI/CD Integration

Tests run automatically in CI:
- On push to main/master
- On pull requests
- Across all browsers (Chromium, Firefox, WebKit)

View results in GitHub Actions artifacts.

## References

- Main test file: `e2e/auth.spec.ts`
- Auth helpers: `e2e/helpers/auth.ts`
- Auth fixtures: `e2e/fixtures/auth.fixture.ts`
- Playwright config: `playwright.config.ts`
- [Playwright Documentation](https://playwright.dev)
