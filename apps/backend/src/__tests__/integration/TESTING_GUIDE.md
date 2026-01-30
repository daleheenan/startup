# Integration Testing Guide for NovelForge

## Quick Start

### Run All Integration Tests
```bash
cd backend
npm test -- workflows.integration.test
```

Expected output:
```
PASS src/__tests__/integration/workflows.integration.test.ts
  Workflow Integration Tests
    Complete Novel Generation Workflow
      ✓ should create project with all connected data (14 ms)
      ✓ should generate outline with plot structure (1 ms)
      ✓ should maintain referential integrity on cascade delete (2 ms)
    Chapter Generation Pipeline
      ✓ should process chapter generation job through queue (1 ms)
      ✓ should queue editing pipeline jobs after chapter generation (2 ms)
      ✓ should track token usage across chapter generation (1 ms)
    Export Workflow
      ✓ should retrieve project with chapters for export (1 ms)
      ✓ should include edited versions when available (1 ms)
    VEB Analysis Workflow
      ✓ should submit project to VEB and create report (1 ms)
      ✓ should process all three VEB modules sequentially (1 ms)
      ✓ should save module results and finalize report (2 ms)
    Database Transaction Integrity
      ✓ should rollback transaction on error (16 ms)
      ✓ should enforce foreign key constraints (1 ms)
      ✓ should handle concurrent job pickup atomically (1 ms)
    Cross-Book Continuity
      ✓ should track character states across trilogy books (1 ms)

Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        1.787 s
```

## Understanding Test Results

### ✅ Success Indicators
- All tests show green checkmarks (✓)
- No red crosses (✗) or warnings
- Execution time under 5 seconds
- "Test Suites: 1 passed"
- "Tests: 15 passed"

### ❌ Failure Indicators
- Red crosses (✗) indicate failing tests
- Error messages show what went wrong
- Stack traces show where the error occurred

Example of a failure:
```
FAIL src/__tests__/integration/workflows.integration.test.ts
  Workflow Integration Tests
    Export Workflow
      ✗ should retrieve project with chapters for export (12 ms)

  ● Workflow Integration Tests › Export Workflow › should retrieve project with chapters for export

    expect(received).toBe(expected)

    Expected: 9000
    Received: 0

      at Object.<anonymous> (src/__tests__/integration/workflows.integration.test.ts:487:29)
```

This indicates:
- Test failed at line 487
- Expected total word count to be 9000
- Actually received 0
- Possible issue: chapters don't have word_count set

## Debugging Failed Tests

### 1. Run Single Test
```bash
npm test -- workflows.integration.test -t "should retrieve project with chapters"
```

### 2. Enable Verbose Mode
```bash
npm test -- workflows.integration.test --verbose
```

### 3. Add Debug Output
In the test file, add console.log statements:
```typescript
it('should retrieve project with chapters for export', () => {
  // ... setup code ...

  const chapters = db.prepare('SELECT * FROM chapters WHERE book_id = ?').all(bookId);
  console.log('Chapters found:', JSON.stringify(chapters, null, 2));

  // ... rest of test ...
});
```

### 4. Inspect Database State
```typescript
// Add this to see what's in the database
const allProjects = db.prepare('SELECT * FROM projects').all();
const allBooks = db.prepare('SELECT * FROM books').all();
const allChapters = db.prepare('SELECT * FROM chapters').all();
console.log({ allProjects, allBooks, allChapters });
```

### 5. Check SQL Errors
```typescript
try {
  db.prepare('INSERT INTO projects ...').run(...);
} catch (error) {
  console.error('SQL Error:', error.message);
  console.error('Error code:', error.code);
  throw error;
}
```

## Common Test Failures and Solutions

### Foreign Key Constraint Failed
**Error**:
```
Error: FOREIGN KEY constraint failed
```

**Cause**: Trying to insert a child record without a parent

**Solution**: Create parent record first
```typescript
// ❌ Wrong: Book created before project
db.prepare('INSERT INTO books ...').run(bookId, projectId, ...);
db.prepare('INSERT INTO projects ...').run(projectId, ...);

// ✅ Correct: Project created first
db.prepare('INSERT INTO projects ...').run(projectId, ...);
db.prepare('INSERT INTO books ...').run(bookId, projectId, ...);
```

### Unique Constraint Failed
**Error**:
```
Error: UNIQUE constraint failed: projects.id
```

**Cause**: Trying to insert duplicate ID

**Solution**: Use `randomUUID()` for each record
```typescript
// ❌ Wrong: Reusing ID
const projectId = 'test-id';
db.prepare('INSERT INTO projects ...').run(projectId, ...);
db.prepare('INSERT INTO projects ...').run(projectId, ...); // Fails!

// ✅ Correct: Unique ID each time
const projectId1 = randomUUID();
const projectId2 = randomUUID();
```

### JSON Parse Error
**Error**:
```
SyntaxError: Unexpected token in JSON at position 0
```

**Cause**: Trying to parse non-JSON string

**Solution**: Always stringify objects when inserting
```typescript
// ❌ Wrong: Inserting object directly
const storyDNA = { genre: 'Fantasy' };
db.prepare('INSERT INTO projects ... VALUES (?, ?)').run(projectId, storyDNA);

// ✅ Correct: Stringify first
const storyDNA = { genre: 'Fantasy' };
db.prepare('INSERT INTO projects ... VALUES (?, ?)').run(projectId, JSON.stringify(storyDNA));
```

### Test Timeout
**Error**:
```
Timeout - Async callback was not invoked within the 10000 ms timeout
```

**Cause**: Async operation taking too long or not resolving

**Solution**: Ensure promises resolve and increase timeout if needed
```typescript
// Increase timeout for specific test
it('should complete long operation', async () => {
  // ... test code ...
}, 30000); // 30 second timeout

// Or in beforeEach
beforeEach(() => {
  jest.setTimeout(30000);
});
```

### Mock Not Working
**Error**: Real API calls being made

**Cause**: Mock not set up correctly

**Solution**: Verify mock setup in beforeEach
```typescript
beforeEach(() => {
  jest.clearAllMocks(); // Clear previous test mocks

  mockClaudeService.createCompletionWithUsage.mockResolvedValue({
    content: 'Generated content',
    usage: { input_tokens: 1000, output_tokens: 500 }
  });
});
```

## Test Development Workflow

### 1. Write Test First (TDD Approach)
```typescript
it('should export project as PDF', () => {
  // Setup
  const projectId = randomUUID();
  setupCompleteProject(db, projectId);

  // Act
  const pdfBuffer = exportService.generatePDF(projectId);

  // Assert
  expect(pdfBuffer).toBeDefined();
  expect(pdfBuffer.length).toBeGreaterThan(0);
});
```

This test will fail initially because `generatePDF` might not exist yet. That's expected in TDD.

### 2. Run Test (Red)
```bash
npm test -- workflows.integration.test -t "should export project as PDF"
```

You should see:
```
FAIL ... should export project as PDF
● ReferenceError: exportService is not defined
```

### 3. Implement Feature (Green)
Implement the minimum code to make the test pass.

### 4. Refactor (Refactor)
Clean up the code while keeping tests green.

### 5. Add More Tests
Once basic functionality works, add edge cases:
```typescript
it('should throw error when project not found', () => {
  expect(() => {
    exportService.generatePDF('non-existent-id');
  }).toThrow('Project not found');
});

it('should throw error when project has no chapters', () => {
  const projectId = randomUUID();
  db.prepare('INSERT INTO projects ...').run(projectId, ...);

  expect(() => {
    exportService.generatePDF(projectId);
  }).toThrow('No chapters found');
});
```

## Performance Optimization

### Current Performance
- 15 tests run in ~2 seconds
- In-memory database (fast)
- No I/O operations
- Mocked external services

### Keeping Tests Fast

#### ❌ Slow: Create real database file
```typescript
const db = new Database('./test.db');
```

#### ✅ Fast: Use in-memory database
```typescript
const db = new Database(':memory:');
```

#### ❌ Slow: Making real API calls
```typescript
const response = await claudeService.createCompletion(...);
```

#### ✅ Fast: Mock API calls
```typescript
mockClaudeService.createCompletion.mockResolvedValue('Generated content');
```

#### ❌ Slow: Complex setup in every test
```typescript
it('test 1', () => {
  db.prepare('INSERT INTO projects ...').run(...);
  db.prepare('INSERT INTO books ...').run(...);
  db.prepare('INSERT INTO chapters ...').run(...);
  // ... test ...
});

it('test 2', () => {
  db.prepare('INSERT INTO projects ...').run(...);
  db.prepare('INSERT INTO books ...').run(...);
  db.prepare('INSERT INTO chapters ...').run(...);
  // ... test ...
});
```

#### ✅ Fast: Use helper functions
```typescript
it('test 1', () => {
  const { projectId, bookId, chapterId } = setupProjectBookChapter(db);
  // ... test ...
});

it('test 2', () => {
  const { projectId, bookId, chapterId } = setupProjectBookChapter(db);
  // ... test ...
});
```

## Continuous Integration

### Pre-commit Checks
```bash
# Run tests before committing
npm test

# Run with coverage
npm test:coverage

# Ensure coverage meets threshold (70%)
```

### CI Pipeline (GitHub Actions)
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Run integration tests
        run: npm test -- workflows.integration.test
      - name: Check coverage
        run: npm test:coverage
```

## Test Maintenance Checklist

### When Adding New Features
- [ ] Write integration test for the workflow
- [ ] Verify test fails (red)
- [ ] Implement feature
- [ ] Verify test passes (green)
- [ ] Check test execution time (should be < 100ms per test)
- [ ] Update test documentation

### When Modifying Database Schema
- [ ] Update `setupTestDatabase()` function
- [ ] Run all tests to verify migrations work
- [ ] Add migration test if schema change is complex
- [ ] Update test data factories if needed

### When Changing Service APIs
- [ ] Update mock service definitions
- [ ] Update service usage in tests
- [ ] Verify all tests still pass
- [ ] Check for type errors (TypeScript)

### Monthly Maintenance
- [ ] Review test execution time (should be < 5 seconds total)
- [ ] Check for flaky tests (run suite 10 times)
- [ ] Update test dependencies
- [ ] Review coverage reports
- [ ] Remove obsolete tests

## Advanced Testing Patterns

### Testing Transactions
```typescript
it('should rollback on error', () => {
  const projectId = randomUUID();

  const transaction = db.transaction(() => {
    db.prepare('INSERT INTO projects ...').run(projectId, ...);
    throw new Error('Simulated error');
  });

  expect(() => transaction()).toThrow();
  expect(db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId)).toBeUndefined();
});
```

### Testing Concurrent Operations
```typescript
it('should handle concurrent job pickup', () => {
  const jobId = randomUUID();
  db.prepare('INSERT INTO jobs ...').run(jobId, 'pending', ...);

  // Simulate two workers picking up the same job
  const worker1 = db.transaction(() => {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND status = ?').get(jobId, 'pending');
    if (!job) return null;
    db.prepare('UPDATE jobs SET status = ? WHERE id = ? AND status = ?').run('running', jobId, 'pending');
    return job;
  });

  const worker2 = db.transaction(() => {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND status = ?').get(jobId, 'pending');
    if (!job) return null;
    db.prepare('UPDATE jobs SET status = ? WHERE id = ? AND status = ?').run('running', jobId, 'pending');
    return job;
  });

  expect(worker1()).toBeDefined(); // First worker succeeds
  expect(worker2()).toBeNull(); // Second worker gets null (job already running)
});
```

### Testing Data Migrations
```typescript
it('should migrate old data format to new format', () => {
  // Insert old format
  db.prepare('INSERT INTO projects (id, old_field) VALUES (?, ?)').run(projectId, 'old value');

  // Run migration
  db.prepare('UPDATE projects SET new_field = old_field WHERE old_field IS NOT NULL').run();

  // Verify new format
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  expect(project.new_field).toBe('old value');
});
```

## Resources

### Related Documentation
- [Test Factories](../factories/README.md)
- [Service Unit Tests](../../services/__tests__/)
- [API Integration Tests](../../routes/__tests__/)
- [Test Summary](./TEST_SUMMARY.md)

### External Resources
- [Jest Documentation](https://jestjs.io/)
- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)
- [Test-Driven Development Guide](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

## Getting Help

### Test Failing After Schema Change?
1. Check migrations in `src/db/migrations/`
2. Update `setupTestDatabase()` to match new schema
3. Verify foreign key relationships
4. Check for missing columns

### Tests Passing Locally But Failing in CI?
1. Check environment variables
2. Verify Node.js version matches
3. Check for filesystem-dependent code
4. Look for timing issues (race conditions)

### Need to Add New Test Scenario?
1. Copy existing test as template
2. Modify setup/act/assert sections
3. Run test (should fail)
4. Implement feature
5. Re-run test (should pass)

### Performance Issues?
1. Profile test execution: `npm test -- --verbose`
2. Check for slow database queries
3. Verify using in-memory database
4. Look for unnecessary setup code
5. Consider splitting into smaller test suites
