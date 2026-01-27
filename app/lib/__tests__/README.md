# NovelForge API Layer Test Suite

Comprehensive unit tests for the NovelForge frontend API layer using Vitest.

## Overview

This test suite provides complete coverage for the API communication layer, including:

- **fetch-utils.ts** - Low-level fetch wrapper utilities with authentication and error handling
- **api.ts** - High-level API client functions for specific endpoints
- **api-hooks.ts** - React Query hooks for data fetching and mutations

## Test Statistics

- **Total Tests**: 66
- **Test Files**: 3
- **Pass Rate**: 100%
- **Test Framework**: Vitest
- **Testing Library**: @testing-library/react

## Test Files

### 1. fetch-utils.test.ts (19 tests)

Tests the foundational fetch utilities with authentication and error handling.

**Coverage Areas:**

#### fetchWithAuth
- Authentication token injection
- Skip authentication option
- Absolute URL handling
- Custom header merging
- 401 response handling with automatic logout
- AbortError handling for timeouts
- Timeout cleanup on success and error

#### fetchJson
- JSON response parsing
- Error response handling
- Fallback error messages for non-JSON responses
- Error message extraction from response

#### HTTP Method Helpers (post, put, del)
- POST requests with JSON body
- PUT requests with JSON body
- DELETE requests
- Options passthrough to fetchJson

**Key Features Tested:**
- Automatic authentication header injection using bearer tokens
- 401 handling with singleton logout flag to prevent multiple logout operations
- Custom header merging with defaults
- Timeout handling with AbortController
- Error response parsing with fallbacks

---

### 2. api.test.ts (20 tests)

Tests the high-level API client functions for specific backend endpoints.

**Coverage Areas:**

#### checkHealth
- Successful health check
- Error handling for non-responsive server
- Network error handling
- HTTP error responses (404, 503)

#### getQueueStats
- Queue statistics fetching with authentication
- Authentication header inclusion
- Missing token handling
- Error response handling (400, 401)
- Network error handling
- Complex response parsing (queue states, session info)

#### createTestJob
- Test job creation with type and target ID
- Authentication token inclusion
- Request body formatting
- Error handling (400, 401, 500)
- Network error handling
- Operation without authentication token

**Key Features Tested:**
- Proper request formatting with authentication
- Response parsing for complex data structures
- Comprehensive error handling for various HTTP status codes
- Network failure resilience

---

### 3. api-hooks.test.tsx (27 tests)

Tests React Query hooks for data fetching, caching, and mutations.

**Coverage Areas:**

#### Query Keys
- Projects query keys
- Single project query keys
- Books with chapters query keys (with options)
- Chapters query keys
- Books query keys

#### Query Hooks (useProjects, useProject, useBooksWithChapters, useChapters, useBooks)
- Successful data fetching
- Error handling
- Query key correctness
- Conditional fetching (enabled flag)
- Query parameter handling
- Cache key generation with options

#### Mutation Hooks (useCreateProject, useUpdateProject, useDeleteProject)
- Successful mutations
- Request body formatting
- Cache invalidation on success
- Error handling
- Optimistic update support (through callbacks)

**Key Features Tested:**
- React Query integration with proper configuration
- Query key management for cache invalidation
- Conditional query execution based on parameters
- Query parameter serialisation (URLSearchParams)
- Mutation success callbacks
- Cache invalidation patterns
- Error propagation through React Query

---

## Running Tests

### Run All API Tests
```bash
npm test -- app/lib/__tests__/
```

### Run Specific Test File
```bash
npm test -- app/lib/__tests__/fetch-utils.test.ts
npm test -- app/lib/__tests__/api.test.ts
npm test -- app/lib/__tests__/api-hooks.test.tsx
```

### Run with Verbose Output
```bash
npm test -- app/lib/__tests__/ --reporter=verbose
```

### Run in Watch Mode
```bash
npm test -- app/lib/__tests__/ --watch
```

---

## Test Patterns and Best Practices

### 1. Mock Management

All tests use Vitest's mocking system:

```typescript
vi.mock('../auth', () => ({
  getToken: vi.fn(),
  logout: vi.fn(),
}));
```

Mocks are cleared before each test:
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});
```

### 2. Fetch Mocking

Fetch responses are mocked using the Response API:

```typescript
const mockResponse = new Response(JSON.stringify(data), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
});
vi.mocked(global.fetch).mockResolvedValue(mockResponse);
```

### 3. React Query Testing

React Query hooks are tested with a wrapper:

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

### 4. Async Testing

Tests use `waitFor` for async operations:

```typescript
await waitFor(() => expect(result.current.isSuccess).toBe(true));
```

### 5. Error Testing

Both network errors and HTTP errors are tested:

```typescript
// Network error
vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

// HTTP error
const mockResponse = new Response('{}', { status: 500 });
vi.mocked(global.fetch).mockResolvedValue(mockResponse);
```

---

## Test Coverage

### fetch-utils.ts
- ✓ Authentication injection
- ✓ Header management
- ✓ Error handling
- ✓ Timeout handling
- ✓ HTTP method helpers
- ✓ 401 logout behaviour

### api.ts
- ✓ Health check endpoint
- ✓ Queue stats endpoint
- ✓ Test job creation endpoint
- ✓ Authentication header inclusion
- ✓ Error response parsing

### api-hooks.ts
- ✓ All query hooks (5 hooks)
- ✓ All mutation hooks (3 hooks)
- ✓ Query key generation
- ✓ Cache invalidation
- ✓ Conditional fetching
- ✓ Error propagation

---

## Common Test Scenarios

### Testing Authenticated Requests
```typescript
it('should include auth token', async () => {
  vi.mocked(auth.getToken).mockReturnValue('mock-token');
  const mockResponse = new Response('{}', { status: 200 });
  vi.mocked(global.fetch).mockResolvedValue(mockResponse);

  await fetchWithAuth('/api/endpoint');

  expect(global.fetch).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer mock-token',
      }),
    })
  );
});
```

### Testing Error Handling
```typescript
it('should handle errors', async () => {
  const mockResponse = new Response(
    JSON.stringify({ error: { message: 'Error message' } }),
    { status: 400 }
  );
  vi.mocked(global.fetch).mockResolvedValue(mockResponse);

  await expect(fetchJson('/api/endpoint')).rejects.toThrow('Error message');
});
```

### Testing React Query Mutations
```typescript
it('should create resource', async () => {
  const mockResponse = new Response(
    JSON.stringify({ id: '123' }),
    { status: 201 }
  );
  vi.mocked(global.fetch).mockResolvedValue(mockResponse);

  const { result } = renderHook(() => useCreateProject(), { wrapper });

  result.current.mutate({ title: 'New Project' });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

---

## Known Limitations

1. **No Integration Tests**: These are unit tests only. Integration tests with a real backend should be added separately.

2. **No Coverage Metrics**: The `@vitest/coverage-v8` package is not installed. Install it to generate coverage reports:
   ```bash
   npm install -D @vitest/coverage-v8
   npm test -- --coverage
   ```

3. **Limited Edge Cases**: Some edge cases like network interruptions mid-request or complex race conditions are not fully covered.

4. **No Performance Tests**: Response time and load testing are not included.

---

## Maintenance

### Adding New Tests

When adding new API functions:

1. Add tests to the appropriate test file
2. Follow existing patterns for mock setup
3. Test both success and error cases
4. Test authentication header inclusion
5. Test error response parsing
6. Update this README with new coverage areas

### Test Failures

Common causes of test failures:

1. **Timing Issues**: Use `waitFor` for async operations
2. **Mock State**: Ensure `vi.clearAllMocks()` in `beforeEach`
3. **Query Client State**: Create a new QueryClient for each test
4. **Response Format**: Ensure mock responses match actual API responses

---

## Dependencies

- **vitest**: Test framework
- **@testing-library/react**: React component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **@tanstack/react-query**: Data fetching and caching library
- **jsdom** or **happy-dom**: DOM implementation for testing

---

## Future Improvements

1. **Add Coverage Reports**: Install and configure `@vitest/coverage-v8`
2. **Integration Tests**: Add tests with a real backend or MSW (Mock Service Worker)
3. **Performance Tests**: Add tests for response times and concurrent requests
4. **E2E Tests**: Add Playwright tests for complete user flows
5. **Visual Regression Tests**: Add screenshot comparison tests
6. **Accessibility Tests**: Add a11y tests with @testing-library/jest-dom
7. **Error Boundary Tests**: Test error boundary integration with React Query

---

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use descriptive test names (should...)
3. Group related tests with `describe` blocks
4. Keep tests focused and isolated
5. Mock external dependencies
6. Test both success and failure paths
7. Update this README with your changes

---

## Test Results Summary

```
Test Files:  3 passed (3)
Tests:       66 passed (66)
Duration:    ~3s
```

All tests passing ✓
