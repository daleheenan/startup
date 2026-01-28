# NovelForge Testing Quick Reference

## Running Tests

### Watch Mode (Development)
```bash
npm test
```
Runs tests in watch mode - tests automatically re-run when files change.

### Single Run (CI/Production)
```bash
npm run test:run
```
Runs all tests once and exits. Perfect for CI/CD pipelines.

### Coverage Report
```bash
npm run test:coverage
```
Generates code coverage report in `coverage/` directory.

### UI Mode
```bash
npm run test:ui
```
Opens Vitest UI in browser for interactive test running and debugging.

## Running Specific Tests

### Run Only Frontend Tests
```bash
npm test -- app/
```

### Run Specific Test File
```bash
npm test -- app/lib/__tests__/progress-stream.test.ts
```

### Run Tests Matching Pattern
```bash
npm test -- --grep "Progress Stream"
```

### Run Tests in Specific Directory
```bash
npm test -- app/components/__tests__/
```

## Test Organization

### Frontend Tests
```
app/
├── lib/__tests__/
│   └── progress-stream.test.ts          # SSE/EventSource hook tests
├── components/__tests__/
│   ├── GenerationProgress.test.tsx       # Progress modal tests
│   └── ProgressDashboard.test.tsx        # Dashboard component tests
└── projects/[id]/series/__tests__/
    └── page.test.tsx                     # Series management page tests
```

### Test Setup Files
```
app/test/
└── setup.ts                              # Global test configuration
vitest.config.ts                          # Vitest configuration
```

## Debugging Tests

### Run with Verbose Output
```bash
npm test -- --reporter=verbose
```

### Run Failed Tests Only
```bash
npm test -- --changed
```

### Debug Specific Test
```bash
npm test -- app/lib/__tests__/progress-stream.test.ts --reporter=verbose
```

### Run with Node Debugger
```bash
node --inspect-brk node_modules/.bin/vitest run
```

## Test Coverage Thresholds

Current coverage is not enforced. To add thresholds, update `vitest.config.ts`:

```typescript
coverage: {
  statements: 80,
  branches: 75,
  functions: 80,
  lines: 80,
}
```

## Common Issues

### EventSource Tests Timing Out
- Known issue with async SSE tests
- Increase timeout: `it('test', async () => {...}, 10000)`

### Act() Warnings
- React state updates should be wrapped in act()
- Non-critical warnings, tests still pass
- Use `waitFor()` for async state updates

### Module Not Found
- Clear node_modules and reinstall:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

## Writing New Tests

### Test File Naming
- Place in `__tests__/` directory next to component
- Name as `ComponentName.test.tsx` or `hookName.test.ts`

### Basic Test Template
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

### Hook Test Template
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

## Continuous Integration

### GitHub Actions Example
```yaml
- name: Run Tests
  run: npm run test:run

- name: Generate Coverage
  run: npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Best Practices

1. **Use data-testid for stable selectors**
   ```tsx
   <button data-testid="submit-button">Submit</button>
   ```
   ```typescript
   screen.getByTestId('submit-button')
   ```

2. **Mock external dependencies**
   ```typescript
   vi.mock('../api', () => ({
     fetchData: vi.fn(() => Promise.resolve(mockData))
   }));
   ```

3. **Clean up after tests**
   ```typescript
   afterEach(() => {
     vi.clearAllMocks();
     cleanup();
   });
   ```

4. **Test user behavior, not implementation**
   ```typescript
   // Good - tests user interaction
   await user.click(screen.getByRole('button', { name: /submit/i }));

   // Bad - tests implementation details
   expect(component.state.isSubmitting).toBe(true);
   ```

5. **Use waitFor for async operations**
   ```typescript
   await waitFor(() => {
     expect(screen.getByText('Success')).toBeInTheDocument();
   });
   ```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [User Event API](https://testing-library.com/docs/user-event/intro)
