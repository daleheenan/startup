# Trilogy API Integration Tests

This directory contains integration tests for the NovelForge trilogy and mystery tracking API endpoints.

## Test Files

### `trilogy.integration.test.ts`
Comprehensive integration tests for trilogy management endpoints:

- **Book Ending State Management** - Tests for generating and retrieving book ending states for continuity
- **Series Bible Management** - Tests for generating and accessing series-level documentation
- **Book Transitions** - Tests for creating and managing transitions between books
- **Convert to Trilogy** - Tests for converting standalone projects to multi-book series

**Coverage**: 18 tests covering success cases, error handling, and validation

### `mysteries.integration.test.ts`
Comprehensive integration tests for mystery tracking endpoints:

- **Get Series Mysteries** - Tests for retrieving all mysteries in a series
- **Get Open Mysteries** - Tests for filtering only unresolved mysteries
- **Mystery Timeline** - Tests for chronological mystery tracking across books
- **Extract Mysteries** - Tests for AI-powered mystery extraction from chapters
- **Find Resolutions** - Tests for detecting when mysteries are resolved
- **Update Mystery Status** - Tests for marking mysteries as resolved or red herrings
- **Delete Mystery** - Tests for removing mysteries

**Coverage**: 27 tests, all passing with 100% success rate

## Running the Tests

### Run all integration tests
```bash
npm test -- routes/__tests__
```

### Run specific test suite
```bash
# Trilogy tests
npm test -- trilogy.integration.test.ts

# Mystery tests
npm test -- mysteries.integration.test.ts
```

### Run with coverage
```bash
npm run test:coverage
```

### Watch mode for development
```bash
npm run test:watch
```

## Test Structure

All integration tests follow this pattern:

1. **Mock Setup** - Services, database, and auth middleware are mocked at the module level
2. **Test Isolation** - Each test has isolated mocks reset in `beforeEach`
3. **Request/Response Testing** - Uses Supertest to make actual HTTP requests to the Express app
4. **Assertion Coverage** - Tests both success and failure paths

### Example Test Structure

```typescript
describe('Feature Group', () => {
  describe('POST /api/endpoint', () => {
    it('should succeed with valid data', async () => {
      // Setup mocks
      service.method.mockResolvedValue(mockData);

      // Make request
      const response = await request(app)
        .post('/api/endpoint')
        .send(validData)
        .expect(200);

      // Assert response
      expect(response.body).toEqual(expected);
      expect(service.method).toHaveBeenCalledWith(validData);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/endpoint')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 500 on service error', async () => {
      service.method.mockRejectedValue(new Error('Service failed'));

      const response = await request(app)
        .post('/api/endpoint')
        .send(validData)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
```

## Test Data Fixtures

Tests use realistic mock data that represents actual API responses:

### Trilogy Fixtures
- **Book Ending State** - Character states, world state, timeline positions
- **Series Bible** - Series overview, characters, themes, timeline
- **Book Transitions** - Time gaps, character/world changes between books

### Mystery Fixtures
- **Mystery Objects** - Questions, raised/answered locations, status, importance
- **Timeline Events** - Chronological mystery raise/resolve points
- **Resolutions** - Mystery answers with confidence levels

## Mocking Strategy

### Database Mocking
```typescript
const mockDb = {
  prepare: jest.fn().mockReturnValue({
    run: jest.fn().mockReturnValue({ changes: 1 }),
    get: jest.fn().mockReturnValue(null),
    all: jest.fn().mockReturnValue([]),
  }),
};

jest.mock('../../db/connection.js', () => ({
  default: mockDb,
}));
```

### Service Mocking
```typescript
jest.mock('../../services/mystery-tracking.service.js', () => ({
  mysteryTrackingService: {
    getSeriesMysteries: jest.fn(),
    extractMysteriesFromChapter: jest.fn(),
    updateMysteryStatus: jest.fn(),
  },
}));
```

### Authentication Mocking
```typescript
jest.mock('../../middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => next(),
}));
```

## Test Coverage Goals

- **Success Paths**: Every endpoint has at least one happy path test
- **Validation**: All required field validations are tested
- **Error Handling**: Service errors, database errors, and edge cases are covered
- **Status Codes**: Correct HTTP status codes (200, 201, 400, 404, 500)
- **Response Format**: Verify response structure matches API contract

## Adding New Tests

When adding new trilogy or mystery endpoints:

1. Add the endpoint to the corresponding route file (`trilogy.ts` or `mysteries.ts`)
2. Mock the service method in the test file
3. Add test cases for:
   - Success case with valid data
   - Validation failures (400 errors)
   - Not found cases (404 errors)
   - Service failures (500 errors)
4. Run tests to ensure they pass
5. Update this README if adding new test categories

## Common Issues

### Issue: TypeError: Cannot read properties of undefined
**Solution**: Ensure mocks are defined at module level before imports

### Issue: Tests fail with "database not found"
**Solution**: Check that database mock is properly set up in `beforeEach`

### Issue: Service method not mocked
**Solution**: Verify service is imported from mocked module, not directly

## CI/CD Integration

These tests run automatically in the CI pipeline:

- On every pull request
- Before merging to main
- As part of the release process

Minimum requirement: 70% code coverage (configured in `jest.config.cjs`)

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [NovelForge API Documentation](../../docs/API.md)
