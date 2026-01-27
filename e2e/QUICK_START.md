# Quick Start Guide - E2E Tests

Get up and running with NovelForge E2E tests in 5 minutes.

## 1. Install Playwright

```bash
npm install
npx playwright install
```

This installs Playwright and browser binaries (Chrome, Firefox, Safari).

## 2. Configure Test Password

Create `.env.test` in the root directory:

```env
TEST_PASSWORD=your_test_password
```

**Important:** This password must match the `OWNER_PASSWORD_HASH` in your backend `.env` file.

## 3. Start Development Servers

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```

Wait for both servers to start:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## 4. Run Tests

### Option A: UI Mode (Recommended)
```bash
npm run test:e2e:ui
```

This opens an interactive UI where you can:
- See all tests
- Run individual tests
- Watch tests execute
- Debug failures

### Option B: Headed Mode
```bash
npm run test:e2e:headed
```

Runs tests with visible browser windows.

### Option C: Headless Mode (CI)
```bash
npm run test:e2e
```

Runs all tests in background (no visible browser).

## 5. View Results

After tests complete:

```bash
npm run test:e2e:report
```

This opens an HTML report showing:
- Test results
- Screenshots
- Traces
- Timing information

## Common Commands

### Run specific test file
```bash
npx playwright test project-creation.spec.ts
```

### Run tests matching pattern
```bash
npx playwright test -g "Quick Start"
```

### Run in specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Debug failing test
```bash
npx playwright test --debug
```

## Test Files

| File | Description | Test Count | Runtime |
|------|-------------|------------|---------|
| `project-creation.spec.ts` | Main project creation tests | 15 | 20-30 min |
| `project-creation-validation.spec.ts` | Form validation tests | 15 | 5-10 min |
| `project-creation-integration.spec.ts` | Complete user journeys | 10 | 30-40 min |

## Troubleshooting

### Tests timeout
Increase timeout in test file:
```typescript
test.setTimeout(180000); // 3 minutes
```

### Login fails
1. Check `TEST_PASSWORD` in `.env.test`
2. Verify backend is running
3. Check backend `.env` has correct `OWNER_PASSWORD_HASH`

### Backend not responding
1. Verify backend is running on port 3001
2. Check `http://localhost:3001/health`
3. Review backend console for errors

### Frontend not loading
1. Verify frontend is running on port 3000
2. Check `http://localhost:3000`
3. Review frontend console for errors

### Flaky tests
1. Add `await page.waitForLoadState('networkidle')`
2. Increase action timeout in config
3. Use explicit waits: `await expect(element).toBeVisible()`

## Next Steps

- Read full [README.md](./README.md) for detailed documentation
- Review [TEST_SUMMARY.md](./TEST_SUMMARY.md) for test coverage
- Check [Playwright docs](https://playwright.dev) for advanced features

## Tips

1. **Use UI mode for development** - It's the fastest way to iterate on tests
2. **Run headed mode to debug** - See exactly what's happening
3. **Use test.only() temporarily** - Focus on one test while developing
4. **Check screenshots on failure** - Found in `test-results/` directory
5. **Use trace viewer** - `npx playwright show-trace trace.zip`

## Example: Writing Your First Test

Create `e2e/my-test.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test('my first test', async ({ page }) => {
  // Login
  await login(page);

  // Navigate
  await page.goto('/projects');

  // Assert
  await expect(page.getByRole('heading', { name: /story architect/i }))
    .toBeVisible();
});
```

Run it:
```bash
npx playwright test my-test.spec.ts --headed
```

That's it! You're ready to test NovelForge. 🚀
