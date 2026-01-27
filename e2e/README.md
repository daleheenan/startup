# E2E Tests

End-to-end testing for NovelForge using Playwright.

## Setup

Install Playwright browsers:

```bash
npx playwright install
```

Or install specific browsers:

```bash
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit
```

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test e2e/example.spec.ts
```

### Run tests in specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run tests matching a pattern
```bash
npx playwright test -g "should load"
```

## Viewing Results

### View last test report
```bash
npx playwright show-report
```

### View test traces
After a test failure with trace enabled:
```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

## Test Suites

### Authentication Tests (`auth.spec.ts`)

Comprehensive authentication flow testing including:
- **Login Flow**: Valid credentials, loading states, accessibility
- **Invalid Login**: Wrong password, empty fields, network errors
- **Session Management**: Token persistence, protected routes, expired tokens
- **Logout Flow**: Successful logout, token clearing, route protection
- **Security**: XSS prevention, password masking, token validation
- **UI/UX**: Focus management, branding, navigation

To run only authentication tests:
```bash
npx playwright test auth.spec.ts
```

**Environment Variables:**
- `TEST_PASSWORD`: Password for test authentication (default: 'testpassword123')
- Set this to match your backend `OWNER_PASSWORD_HASH`

Example:
```bash
TEST_PASSWORD=your_test_password npx playwright test auth.spec.ts
```

### Project Creation Tests (`project-creation.spec.ts`)

Comprehensive project creation flow testing including:
- **Quick Start Flow**: Streamlined project creation with genre selection
- **Full Customisation Flow**: Advanced project setup with detailed options
- **Genre Selection**: Primary and secondary genre selection (max 2)
- **Project Types**: Standalone, trilogy, and series configurations
- **Time Period**: Past, present, and future settings
- **Prompt Input**: Optional story idea descriptions
- **"Inspire Me" Feature**: Random story idea generation

To run only project creation tests:
```bash
npx playwright test project-creation.spec.ts
```

### Project Creation Validation Tests (`project-creation-validation.spec.ts`)

Focused tests for form validation and error handling:
- **Form Validation**: Required fields, character limits, field formats
- **Genre Selection Rules**: Minimum 1, maximum 2 genres
- **Project Type Validation**: Book count limits for series
- **Error Handling**: Network errors, retry functionality, error messages
- **Accessibility**: Keyboard navigation, ARIA labels, focus management
- **Loading States**: Progress indicators, status updates

To run only validation tests:
```bash
npx playwright test project-creation-validation.spec.ts
```

### Using Authentication Fixtures

For tests that require authentication, use the provided fixtures:

```typescript
import { test, expect } from './fixtures/auth.fixture';

test('authenticated test', async ({ page, authenticatedPage }) => {
  // Page is already logged in
  await page.goto('/projects');
  // ... your test code
});
```

Or use auth helpers:

```typescript
import { test, expect } from '@playwright/test';
import { login, logout, getAuthToken } from './helpers/auth';

test('manual auth test', async ({ page }) => {
  await login(page);

  // Verify authenticated
  const token = await getAuthToken(page);
  expect(token).toBeTruthy();

  // ... your test code

  await logout(page);
});
```

## Writing Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('/some-page');

    // Act
    await page.click('[data-testid="button"]');

    // Assert
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### Best Practices

1. **Use data-testid attributes** for reliable selectors:
   ```typescript
   await page.click('[data-testid="submit-button"]');
   ```

2. **Wait for elements properly**:
   ```typescript
   await page.waitForSelector('[data-testid="content"]');
   await expect(page.locator('[data-testid="content"]')).toBeVisible();
   ```

3. **Use helper functions** from `fixtures/test-helpers.ts`:
   ```typescript
   import { waitForNetworkIdle, fillField } from './fixtures/test-helpers';

   await fillField(page, '[data-testid="email"]', 'test@example.com');
   await waitForNetworkIdle(page);
   ```

4. **Test user journeys**, not implementation details:
   ```typescript
   // Good: Tests user behaviour
   test('user can create a project', async ({ page }) => {
     await page.click('[data-testid="new-project"]');
     await page.fill('[data-testid="project-name"]', 'My Novel');
     await page.click('[data-testid="save"]');
     await expect(page.locator('text=My Novel')).toBeVisible();
   });

   // Bad: Tests implementation
   test('button calls handleClick', async ({ page }) => {
     // Don't test internal function calls
   });
   ```

5. **Mock API calls** when needed:
   ```typescript
   await page.route('**/api/projects', (route) => {
     route.fulfill({
       status: 200,
       body: JSON.stringify({ projects: [] }),
     });
   });
   ```

6. **Group related tests**:
   ```typescript
   test.describe('Authentication', () => {
     test.describe('Login', () => {
       test('valid credentials', async ({ page }) => { });
       test('invalid credentials', async ({ page }) => { });
     });

     test.describe('Logout', () => {
       test('successful logout', async ({ page }) => { });
     });
   });
   ```

7. **Use serial mode** for dependent tests:
   ```typescript
   test.describe.configure({ mode: 'serial' });
   ```

8. **Take screenshots** for debugging:
   ```typescript
   await page.screenshot({ path: 'screenshot.png' });
   ```

## Debugging

### Visual debugging
```bash
npm run test:e2e:debug
```

This opens Playwright Inspector where you can:
- Step through tests
- Inspect page state
- View screenshots and traces
- See console output

### Console output
Add console logs in tests:
```typescript
console.log('Current URL:', page.url());
```

### Pause execution
```typescript
await page.pause(); // Opens inspector
```

## CI/CD

E2E tests run automatically on:
- Push to main/master
- Pull requests

Tests run on all three browsers (Chromium, Firefox, WebKit) in parallel.

View test results in GitHub Actions artifacts.

## Configuration

Configuration is in `playwright.config.ts`. Key settings:

- **testDir**: `./e2e` - Location of test files
- **baseURL**: `http://localhost:3000` - Base URL for tests
- **timeout**: 30 seconds per test
- **retries**: 2 retries on CI, 0 locally
- **workers**: Parallel execution (1 on CI, auto locally)
- **webServer**: Automatically starts dev server

## Troubleshooting

### Tests timing out
Increase timeout in test:
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ...
});
```

### Flaky tests
- Add proper waits: `await page.waitForLoadState('networkidle')`
- Use `expect().toBeVisible()` to ensure elements are ready
- Increase action timeout in config
- Use `test.slow()` to triple timeout for slow tests

### Browser installation issues
```bash
# Clear cache and reinstall
npx playwright install --force
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
