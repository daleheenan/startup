# NovelForge E2E Test Suite - Summary

## Test Coverage Summary

This document provides an overview of the E2E test suite for NovelForge's project creation flow.

## Files Created

### Test Specifications
1. **project-creation.spec.ts** (Primary test suite)
   - Quick Start flow tests
   - Full Customisation flow tests
   - Navigation and user flow tests
   - Generation progress tracking

2. **project-creation-validation.spec.ts** (Validation tests)
   - Form validation rules
   - Field requirements and limits
   - Error handling
   - Accessibility compliance

3. **project-creation-integration.spec.ts** (Integration tests)
   - Complete end-to-end journeys
   - Multi-genre workflows
   - Time period configurations
   - Trilogy and series creation

### Helper Modules
1. **helpers/auth.ts**
   - Login/logout utilities
   - Token management
   - Authentication state checking

2. **helpers/test-data.ts**
   - Test data generators
   - Project title generation
   - Validation test cases
   - Genre and type constants

3. **helpers/assertions.ts**
   - Custom assertion helpers
   - Page state verification
   - Element visibility checks
   - Project existence validation

### Fixtures
1. **fixtures/auth.fixture.ts**
   - Authenticated test fixture
   - Reusable authentication context
   - Test user configuration

### Configuration
1. **global-setup.ts**
   - Pre-test environment checks
   - Backend/frontend health verification
   - Test user setup (template)

2. **playwright.config.ts** (existing)
   - Browser configurations
   - Timeout settings
   - Reporter configuration
   - Web server setup

## Test Scenarios

### Quick Start Flow (15 tests)
- ✅ Navigate to Quick Start
- ✅ Create standalone novel
- ✅ Create trilogy
- ✅ Multi-genre selection
- ✅ "Inspire Me" feature
- ✅ Time period selection
- ✅ Project type validation
- ✅ Form state preservation
- ✅ Cancel generation
- ✅ Progress indicators

### Full Customisation Flow (5 tests)
- ✅ Navigate to Full Customisation
- ✅ Complete form with all options
- ✅ Word count configuration
- ✅ Chapter count configuration
- ✅ Advanced genre selection

### Form Validation (10 tests)
- ✅ Genre selection requirement
- ✅ Genre limit enforcement (max 2)
- ✅ Prompt character limit
- ✅ Series book count validation
- ✅ Required field validation
- ✅ Helpful error messages
- ✅ Field-level validation
- ✅ Form reset behaviour

### Error Handling (5 tests)
- ✅ Network error handling
- ✅ Retry after error
- ✅ Error message display
- ✅ Graceful degradation
- ✅ Loading state management

### Accessibility (5 tests)
- ✅ Keyboard navigation
- ✅ ARIA labels
- ✅ Focus indicators
- ✅ Screen reader support
- ✅ Loading state announcements

### Integration Tests (10 tests)
- ✅ Complete Quick Start journey
- ✅ Complete Full Customisation journey
- ✅ Concept selection workflow
- ✅ Trilogy creation
- ✅ Series creation
- ✅ Multi-genre projects
- ✅ Historical projects
- ✅ Futuristic sci-fi projects

**Total Test Cases: 50+**

## Test Patterns Used

### 1. AAA Pattern (Arrange-Act-Assert)
```typescript
test('should create project', async ({ page }) => {
  // Arrange
  await page.goto('/quick-start');

  // Act
  await page.getByRole('button', { name: /fantasy/i }).click();

  // Assert
  await expect(page.getByRole('button', { name: /fantasy/i }))
    .toHaveAttribute('aria-pressed', 'true');
});
```

### 2. Page Object Pattern (via helpers)
```typescript
import { login, assertOnProjectsPage } from './helpers';

await login(page);
await assertOnProjectsPage(page);
```

### 3. Test Data Generators
```typescript
const projectTitle = generateProjectTitle('Fantasy Novel');
```

### 4. Custom Assertions
```typescript
await assertProjectExists(page, 'My Novel');
```

### 5. Authentication Fixtures
```typescript
import { test } from './fixtures/auth.fixture';

test('authenticated test', async ({ page, authenticatedPage }) => {
  // Already logged in
});
```

## Running the Tests

### Quick Commands
```bash
# Run all tests
npm run test:e2e

# Run in UI mode (recommended for development)
npm run test:e2e:ui

# Run with browser visible
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Generate report
npm run test:e2e:report
```

### Specific Test Suites
```bash
# Project creation tests only
npx playwright test project-creation.spec.ts

# Validation tests only
npx playwright test project-creation-validation.spec.ts

# Integration tests only
npx playwright test project-creation-integration.spec.ts
```

### By Browser
```bash
# Chrome only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# Safari only
npx playwright test --project=webkit
```

## Prerequisites

1. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

2. **Start development servers:**
   - Frontend: `npm run dev` (port 3000)
   - Backend: `cd backend && npm run dev` (port 3001)

3. **Configure test password:**
   Set `TEST_PASSWORD` in `.env.test` to match backend `OWNER_PASSWORD_HASH`

## Test Execution Time

- **Quick Start tests**: ~2-3 minutes per test (includes AI generation)
- **Full Customisation tests**: ~2-3 minutes per test
- **Validation tests**: ~10-30 seconds per test
- **Integration tests**: ~3-5 minutes per test

**Total suite runtime**: ~30-45 minutes (sequential)
**Parallel execution**: ~10-15 minutes (3 workers)

## Key Features

### 1. Resilient Selectors
Tests use semantic selectors that are resilient to UI changes:
- `getByRole('button', { name: /submit/i })`
- `getByLabel(/email/i)`
- `getByText(/success/i)`

### 2. Explicit Waits
Tests wait for specific conditions:
- `waitForURL('/concepts', { timeout: 120000 })`
- `expect(element).toBeVisible()`
- `waitForLoadState('networkidle')`

### 3. Error Recovery
Tests handle common failure scenarios:
- Network errors
- Timeout errors
- Element not found
- API failures

### 4. Accessibility Testing
All tests verify accessibility:
- ARIA attributes
- Keyboard navigation
- Focus management
- Screen reader support

### 5. Cross-Browser Testing
Tests run on:
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)

## Maintenance

### Adding New Tests
1. Create test file in `e2e/`
2. Import helpers from `helpers/`
3. Use authentication fixture or helper
4. Follow existing test patterns
5. Update this summary

### Updating Helpers
Helper modules are in `e2e/helpers/`:
- `auth.ts` - Authentication utilities
- `test-data.ts` - Test data generators
- `assertions.ts` - Custom assertions

### Updating Fixtures
Fixtures are in `e2e/fixtures/`:
- `auth.fixture.ts` - Authentication fixture

## CI/CD Integration

Tests are configured for CI with:
- Retry on failure (2 retries)
- Single worker (sequential execution)
- JUnit XML reports
- Screenshot capture on failure
- Video recording on failure

### GitHub Actions Example
```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E Tests
  run: npm run test:e2e
  env:
    TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

## Known Limitations

1. **AI Generation Time**: Tests involving AI generation can take 2-5 minutes
2. **Network Dependency**: Tests require backend API to be running
3. **Test Data**: Tests create real projects in the database
4. **Rate Limits**: Claude API rate limits may affect test execution

## Future Enhancements

- [ ] Add visual regression testing
- [ ] Implement API mocking for faster tests
- [ ] Add performance testing
- [ ] Expand character creation tests
- [ ] Add plot development tests
- [ ] Add world building tests
- [ ] Add chapter generation tests

## Debugging Tips

### Test Failures
1. Run with `--headed` to see browser
2. Use `--debug` for step-by-step execution
3. Check `test-results/` for screenshots
4. Review trace files with `npx playwright show-trace`

### Timeout Issues
1. Increase timeout: `test.setTimeout(180000)`
2. Check network connectivity
3. Verify backend is responding
4. Check Claude API availability

### Flaky Tests
1. Add explicit waits
2. Use `waitForLoadState('networkidle')`
3. Verify element visibility before interaction
4. Check for race conditions

## Contact

For questions or issues with E2E tests, refer to:
- [Playwright Documentation](https://playwright.dev)
- [NovelForge README](../README.md)
- [E2E Test README](./README.md)
