# NovelForge Testing Guide

Comprehensive guide to running and writing tests for NovelForge.

## Quick Reference

### Frontend Tests (Vitest)
```bash
# Watch mode (development)
npm test

# Single run (CI)
npm run test:run

# Coverage report
npm run test:coverage

# Interactive UI
npm run test:ui
```

### Backend Tests (Jest)
```bash
# Run all tests
cd backend
npm test

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

### End-to-End Tests (Playwright)
```bash
# Run E2E tests
npm run test:e2e

# Headed mode (see browser)
npm run test:e2e:headed

# Interactive UI
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# View last report
npm run test:e2e:report
```

---

## Test Organisation

### Frontend Tests (Vitest)
```
app/
├── lib/__tests__/
│   ├── fetch-utils.test.ts         # Fetch wrapper utilities
│   ├── api.test.ts                 # API client functions
│   ├── api-hooks.test.tsx          # React Query hooks
│   ├── workflow-utils.test.ts      # Workflow progression logic
│   ├── constants.test.ts           # Design system constants
│   ├── plot-recommendations.test.ts # Plot structure recommendations
│   └── styles.test.ts              # Reusable style objects
├── components/__tests__/
│   ├── GenerationProgress.test.tsx  # Progress modal
│   ├── ProgressDashboard.test.tsx   # Dashboard component
│   ├── ConceptCard.test.tsx         # Concept cards
│   └── ErrorBoundary.test.tsx       # Error boundaries
└── test/
    └── setup.ts                     # Global test configuration
```

### Backend Tests (Jest)
```
backend/src/
├── __tests__/
│   ├── services/
│   │   ├── cross-book-continuity.service.test.ts
│   │   ├── series-bible-generator.service.test.ts
│   │   ├── book-transition.service.test.ts
│   │   ├── chapter-orchestrator.service.test.ts
│   │   ├── editing.service.test.ts
│   │   ├── context-assembly.service.test.ts
│   │   └── metrics.service.test.ts
│   └── integration/
│       └── (integration tests)
```

### E2E Tests (Playwright)
```
e2e/
├── auth.spec.ts                     # Authentication flows
├── project-creation.spec.ts         # Project creation workflow
└── (other E2E test files)
```

---

## Running Specific Tests

### Frontend

Run specific test file:
```bash
npm test -- app/lib/__tests__/progress-stream.test.ts
```

Run tests matching pattern:
```bash
npm test -- --grep "Progress Stream"
```

Run tests in directory:
```bash
npm test -- app/components/__tests__/
```

Run with verbose output:
```bash
npm test -- --reporter=verbose
```

### Backend

Run specific test suite:
```bash
cd backend
npm test -- --testPathPattern="cross-book-continuity"
```

Run failed tests only:
```bash
npm test -- --onlyFailures
```

### E2E

Run specific test file:
```bash
npm run test:e2e -- auth.spec.ts
```

Run tests with tag:
```bash
npm run test:e2e -- --grep @smoke
```

---

## Test Coverage

### Frontend Test Coverage

**Total: 265 utility tests + 66 API tests + component tests**

#### API Layer (66 tests)
- fetch-utils.ts: Authentication, error handling, timeout handling
- api.ts: Health check, queue stats, job creation
- api-hooks.ts: React Query hooks with cache management

#### Utilities (265 tests)
- workflow-utils.ts: Workflow progression logic (65 tests)
- constants.test.ts: Design system constants (37 tests)
- plot-recommendations.test.ts: Plot structure recommendations (58 tests)
- styles.test.ts: Reusable style objects (105 tests)

#### Components
- GenerationProgress: Progress modal tests
- ProgressDashboard: Dashboard component tests
- ConceptCard: Concept card tests (24 tests)
- ErrorBoundary: Error boundary tests (15 tests)

### Backend Test Coverage

**Target: 70%+ coverage for priority services**

#### Priority Services (P0)
- CrossBookContinuityService: ~85% coverage
- SeriesBibleGeneratorService: ~75% coverage
- BookTransitionService: ~80% coverage
- ChapterOrchestratorService: ~90% coverage
- EditingService: ~85% coverage
- ContextAssemblyService: ~80% coverage

**Overall P0 Services Coverage: ~82%**

---

## Test Patterns and Best Practices

### 1. Frontend Mock Management (Vitest)

Mock external dependencies:
```typescript
vi.mock('../auth', () => ({
  getToken: vi.fn(),
  logout: vi.fn(),
}));
```

Clear mocks before each test:
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});
```

### 2. Frontend Fetch Mocking

Mock fetch responses:
```typescript
const mockResponse = new Response(JSON.stringify(data), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
});
vi.mocked(global.fetch).mockResolvedValue(mockResponse);
```

### 3. React Query Testing

Test with QueryClient wrapper:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

const { result } = renderHook(() => useProjects(), { wrapper });
```

### 4. Backend Mock Pattern (Jest)

Mock database:
```typescript
const mockStatement = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
};

const mockDb = {
  prepare: jest.fn(() => mockStatement),
  exec: jest.fn(),
  transaction: jest.fn((fn: Function) => fn),
};

jest.mock('../../db/connection.js', () => ({
  __esModule: true,
  default: mockDb,
}));
```

Mock Claude API:
```typescript
const mockClaudeService = {
  createCompletion: jest.fn(),
  createCompletionWithUsage: jest.fn(),
};

jest.mock('../claude.service.js', () => ({
  __esModule: true,
  claudeService: mockClaudeService,
}));
```

### 5. Async Testing

Use waitFor for async operations:
```typescript
await waitFor(() => expect(result.current.isSuccess).toBe(true));
```

### 6. Error Testing

Test both network and HTTP errors:
```typescript
// Network error
vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

// HTTP error
const mockResponse = new Response('{}', { status: 500 });
vi.mocked(global.fetch).mockResolvedValue(mockResponse);
```

---

## Writing New Tests

### Frontend Test Template (Vitest)

Component test:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

Hook test:
```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMyHook } from '../myHook';

describe('useMyHook', () => {
  it('should return initial value', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(0);
  });
});
```

### Backend Test Template (Jest)

Service test:
```typescript
import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';

const mockDb = {
  prepare: jest.fn(),
};

jest.mock('../../db/connection.js', () => ({
  __esModule: true,
  default: mockDb,
}));

describe('MyService', () => {
  let service: any;

  beforeAll(async () => {
    const module = await import('../my.service.js');
    service = new module.MyService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should perform operation', async () => {
    // Test implementation
  });
});
```

### E2E Test Template (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('user can complete workflow', async ({ page }) => {
  await page.goto('/');

  // Interact with page
  await page.click('text=Get Started');

  // Assert result
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

---

## Test Naming Conventions

### Frontend Tests
- Place in `__tests__/` directory next to component
- Name as `ComponentName.test.tsx` or `hookName.test.ts`
- Use descriptive test names: `it('should render correctly', ...)`

### Backend Tests
- Place in `src/__tests__/services/` or `src/__tests__/integration/`
- Name as `service-name.service.test.ts`
- Group related tests with `describe` blocks

### E2E Tests
- Place in `e2e/` directory at project root
- Name as `feature-name.spec.ts`
- Use clear test descriptions: `test('user can log in', ...)`

---

## Best Practices

### 1. Use data-testid for Stable Selectors
```tsx
<button data-testid="submit-button">Submit</button>
```
```typescript
screen.getByTestId('submit-button')
```

### 2. Mock External Dependencies
```typescript
vi.mock('../api', () => ({
  fetchData: vi.fn(() => Promise.resolve(mockData))
}));
```

### 3. Clean Up After Tests
```typescript
afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});
```

### 4. Test User Behaviour, Not Implementation
```typescript
// Good - tests user interaction
await user.click(screen.getByRole('button', { name: /submit/i }));

// Bad - tests implementation details
expect(component.state.isSubmitting).toBe(true);
```

### 5. Use waitFor for Async Operations
```typescript
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

### 6. Test Edge Cases
- Null and undefined values
- Empty arrays and objects
- Boundary values
- Invalid inputs
- Missing optional parameters

### 7. Keep Tests Focused and Isolated
Each test should test one thing and not depend on other tests.

---

## Common Issues and Solutions

### Frontend Issues

**EventSource Tests Timing Out**
- Increase timeout: `it('test', async () => {...}, 10000)`

**Act() Warnings**
- React state updates should be wrapped in act()
- Non-critical warnings, tests still pass
- Use `waitFor()` for async state updates

**Module Not Found**
- Clear node_modules and reinstall:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

### Backend Issues

**TypeScript Compilation Errors in Tests**
- Ensure proper mock setup with `jest.mock()` at top of file
- Use type assertions for mock functions: `(mockFn as any)`
- Import service in `beforeAll` instead of `beforeEach`

**Mock State Bleeding Between Tests**
- Ensure `jest.clearAllMocks()` in `beforeEach`
- Create new instances in `beforeEach` if needed

### E2E Issues

**Flaky Tests**
- Use proper waits: `await page.waitForSelector()`
- Avoid hard-coded timeouts
- Use `expect(locator).toBeVisible()` instead of `toBeTruthy()`

**Slow Tests**
- Use `page.goto()` with `waitUntil: 'domcontentloaded'`
- Run tests in parallel: `playwright test --workers=4`

---

## Debugging Tests

### Frontend Debugging

Run with verbose output:
```bash
npm test -- --reporter=verbose
```

Run failed tests only:
```bash
npm test -- --changed
```

Run with Node debugger:
```bash
node --inspect-brk node_modules/.bin/vitest run
```

### Backend Debugging

Run with verbose output:
```bash
cd backend
npm test -- --verbose
```

Run specific test:
```bash
npm test -- --testNamePattern="should generate ending state"
```

### E2E Debugging

Run in headed mode:
```bash
npm run test:e2e:headed
```

Run in debug mode:
```bash
npm run test:e2e:debug
```

Take screenshots on failure (add to test):
```typescript
await page.screenshot({ path: 'failure.png' });
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run test:run
      - run: npm run test:coverage

  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd backend && npm install
      - run: cd backend && npm test
      - run: cd backend && npm run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Test Coverage Goals

- **Frontend Utilities**: 90%+ coverage (currently achieved)
- **Frontend Components**: 80%+ coverage
- **Backend Services**: 70%+ coverage (currently 82% for P0 services)
- **API Routes**: 60%+ coverage
- **E2E Critical Paths**: 100% coverage

---

## Dependencies

### Frontend
- **vitest**: Test framework
- **@testing-library/react**: React component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **@tanstack/react-query**: Data fetching and caching library
- **happy-dom** or **jsdom**: DOM implementation for testing

### Backend
- **jest**: Test framework
- **ts-jest**: TypeScript support for Jest
- **supertest**: HTTP assertion library
- **@types/jest**: TypeScript types for Jest

### E2E
- **@playwright/test**: End-to-end testing framework

---

## Future Improvements

1. **Add Coverage Reports**: Install and configure coverage tools
2. **Integration Tests**: Add tests with real backend or MSW (Mock Service Worker)
3. **Performance Tests**: Add tests for response times and concurrent requests
4. **Visual Regression Tests**: Add screenshot comparison tests
5. **Accessibility Tests**: Add a11y tests with @testing-library/jest-dom
6. **Mutation Testing**: Verify test quality with mutation testing tools

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [User Event API](https://testing-library.com/docs/user-event/intro)

---

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use descriptive test names (should...)
3. Group related tests with `describe` blocks
4. Keep tests focused and isolated
5. Mock external dependencies
6. Test both success and failure paths
7. Update this guide with your changes
