# Integration Tests for NovelForge Backend

## Overview

This directory contains integration tests that verify cross-service workflows function correctly. These tests ensure that multiple services, database operations, and background jobs work together seamlessly.

## Test Structure

### `workflows.integration.test.ts`

Comprehensive integration tests covering:

1. **Complete Novel Generation Workflow**
   - Creates projects with story concepts, DNA, and bible
   - Verifies all data connections (characters, world elements, etc.)
   - Tests outline generation with plot structure
   - Validates referential integrity and cascade deletions

2. **Chapter Generation Pipeline**
   - Tests job queue processing for chapter generation
   - Verifies editing pipeline (dev edit, line edit, continuity, etc.)
   - Validates token usage tracking
   - Ensures proper status transitions

3. **Export Workflow**
   - Tests retrieval of complete projects with chapters
   - Verifies edited content takes precedence over original
   - Validates word count calculations
   - Tests data formatting for PDF/DOCX export

4. **VEB (Virtual Editorial Board) Analysis**
   - Tests submission of completed projects to VEB
   - Verifies all three modules process correctly:
     - Beta Swarm (reader engagement analysis)
     - Ruthless Editor (structural analysis)
     - Market Analyst (commercial viability)
   - Validates report finalisation and scoring

5. **Database Transaction Integrity**
   - Tests transaction rollback on errors
   - Validates foreign key constraints
   - Tests atomic job pickup for concurrent workers

6. **Cross-Book Continuity**
   - Tests trilogy/series character state tracking
   - Validates book ending states
   - Ensures continuity across multiple books

## Test Approach

### Isolation Strategy
- **In-memory SQLite database** - Each test suite creates a fresh database
- **No shared state** - Tests are completely independent
- **Mock external services** - Claude API calls are mocked

### Data Integrity
- Tests verify foreign key constraints
- Validates cascade deletions work correctly
- Ensures transactions rollback on errors
- Tests atomic operations for concurrent access

### Test Database Schema
The tests create minimal database tables required for testing:
- `projects` - Novel projects
- `books` - Books within projects
- `chapters` - Chapters within books
- `chapter_edits` - Edited chapter versions
- `jobs` - Background job queue
- `chapter_metrics` - Token usage tracking
- `editorial_reports` - VEB analysis reports
- `book_ending_states` - Trilogy continuity tracking

## Running Tests

### Run All Integration Tests
```bash
npm test -- integration
```

### Run Workflow Tests Specifically
```bash
npm test -- workflows.integration.test
```

### Run with Coverage
```bash
npm test:coverage -- workflows.integration.test
```

### Watch Mode
```bash
npm test:watch -- workflows.integration.test
```

## Writing New Integration Tests

### Test Template

```typescript
describe('New Workflow Integration', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    setupTestDatabase(db);
  });

  afterEach(() => {
    if (db) db.close();
  });

  it('should complete workflow successfully', () => {
    // Arrange: Setup test data
    const projectId = randomUUID();
    // ... create test data

    // Act: Execute workflow
    // ... perform operations

    // Assert: Verify results
    const result = db.prepare('SELECT * FROM ...').get(projectId);
    expect(result).toBeDefined();
  });
});
```

### Best Practices

1. **Use Factory Functions** - Leverage `createTestProject`, `createTestBook`, etc. from test factories
2. **Clean Data** - Always use `randomUUID()` for IDs to avoid conflicts
3. **Test Isolation** - Don't rely on data from other tests
4. **Descriptive Names** - Test names should explain what they verify
5. **Arrange-Act-Assert** - Follow AAA pattern for clarity
6. **Mock External Services** - Never make real API calls in tests

### Helper Functions

- `setupTestDatabase(db)` - Creates all required tables
- `setupProjectBookChapter(db, projectId, bookId, chapterId)` - Quick setup for common scenario

## Performance

- Tests run in **< 2 seconds** total
- In-memory database ensures speed
- No I/O operations (except test file loading)
- Mock services eliminate network latency

## Coverage Goals

Target coverage for integration tests:
- **Lines**: 70%+
- **Branches**: 70%+
- **Functions**: 70%+
- **Statements**: 70%+

These tests complement unit tests by focusing on service interactions rather than individual function logic.

## Debugging Tests

### Enable Verbose Output
```bash
npm test -- --verbose workflows.integration.test
```

### Run Single Test
```javascript
it.only('should complete specific workflow', () => {
  // ... test code
});
```

### Inspect Database State
```typescript
// Add after an operation to see database content
const rows = db.prepare('SELECT * FROM projects').all();
console.log(JSON.stringify(rows, null, 2));
```

### Check SQL Errors
```typescript
try {
  db.prepare('...').run(...);
} catch (error) {
  console.error('SQL Error:', error.message);
  throw error;
}
```

## Common Issues

### Foreign Key Violations
**Problem**: `FOREIGN KEY constraint failed`
**Solution**: Ensure parent records exist before creating child records

### Unique Constraint Violations
**Problem**: `UNIQUE constraint failed`
**Solution**: Use `randomUUID()` for all ID fields

### Transaction Rollback Not Working
**Problem**: Changes persist when they shouldn't
**Solution**: Verify `db.pragma('foreign_keys = ON')` is called

### Mock Not Working
**Problem**: Tests make real API calls
**Solution**: Ensure mocks are set up in `beforeEach()` before test execution

## Related Documentation

- [Test Factories](../factories/README.md) - Reusable test data generators
- [Unit Tests](../../services/__tests__/) - Service-level unit tests
- [API Tests](../../routes/__tests__/) - Endpoint integration tests

## Maintenance

These tests should be updated when:
- Database schema changes (migrations)
- New workflows are added
- Service interfaces change
- Background jobs are added/modified

Run the full test suite before committing changes:
```bash
npm test
```
