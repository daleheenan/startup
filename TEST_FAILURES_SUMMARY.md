# NovelForge Backend Test Failures Summary

## Overview
Multiple backend test failures identified. All failures are related to incorrect database mocking patterns in Jest tests.

## Root Cause
Tests are mocking `db.prepare()` but not properly chaining the mock return values for subsequent calls. Services make multiple `db.prepare()` calls internally, and tests only mock the first one or two calls.

## Failing Test Files

### 1. chapter-orchestrator.service.test.ts
**Failures:** 3 tests
**Issue:** `queueChapterWorkflow()` internally calls `db.prepare()` twice (for chapter lookup and project lookup), but tests don't mock both calls.

Example error:
```
TypeError: Cannot read properties of undefined (reading 'get')
at ChapterOrchestratorService.queueChapterWorkflow (src/services/chapter-orchestrator.service.ts:227:33)
```

**Fix Required:**
- Mock both `db.prepare()` calls in sequence
- First call returns statement with `.all()` for chapters query
- Second call returns statement with `.get()` for chapter lookup
- Third call returns statement with `.get()` for project lookup

### 2. chapter-brief-generator.test.ts
**Failures:** 3 tests
**Issue:** Statement mocks returning wrong types (missing `.run()` method)

Example error:
```
TypeError: stmt.run is not a function
at ChapterBriefGeneratorService.storeBrief (src/services/chapter-brief-generator.ts:783:10)
```

### 3. context-assembly.service.test.ts
**Failures:** 3 tests
**Issue:** EditorialLessonsService calls are not mocked, causing undefined statement errors

Example error:
```
TypeError: stmt.all is not a function
at EditorialLessonsService.getLessonsForProject (src/services/editorial-lessons.service.ts:290:23)
```

### 4. thriller-commercial.service.test.ts
**Failures:** 17 tests
**Issue:** Database mocks not set up for thriller pacing queries

### 5. outline-generator.test.ts
**Failures:** 1 test
**Issue:** Test expects prompt to contain "30" but actual chapter count is "19" due to calculation change

Example error:
```
expect(received).toContain(expected)
Expected substring: "30"
Received string: "...Target: 19 chapters total..."
```

### 6. book-transition.service.test.ts
**Failures:** 1 test
**Issue:** Database mocks incomplete

### 7. pen-names portfolio.test.ts
**Failures:** 2 tests
**Issue:** Database mocks for pen names statistics

### 8. analytics.test.ts
**Failures:** 7 tests
**Issue:** Database mocks for analytics workflow

### 9. pen-names.test.ts
**Failures:** 4 tests
**Issue:** Database mocks for CRUD operations

## Solution Pattern

For each failing test, follow this pattern:

1. Identify all `db.prepare()` calls made by the service method
2. Create mock statements for each call with appropriate methods:
   - `.all()` - returns array of rows
   - `.get()` - returns single row or undefined
   - `.run()` - executes statement, returns { changes, lastInsertRowid }
3. Chain mocks using `mockReturnValueOnce()` in order of execution
4. Ensure mock return values match expected types

Example fix pattern:
```typescript
const mockPrepare = jest.fn();
mockDb.prepare = mockPrepare;

// First prepare call - chapters query
const chaptersStmt = { all: jest.fn().mockReturnValue([...]) };
mockPrepare.mockReturnValueOnce(chaptersStmt);

// Second prepare call - chapter lookup
const chapterStmt = { get: jest.fn().mockReturnValue({ book_id: '...' }) };
mockPrepare.mockReturnValueOnce(chapterStmt);

// Third prepare call - project lookup
const projectStmt = { get: jest.fn().mockReturnValue({ generation_mode: '...' }) };
mockPrepare.mockReturnValueOnce(projectStmt);
```

## Priority
**HIGH** - All backend tests must pass before frontend testing can proceed.

## Action Required
Fix all failing tests by properly mocking database calls. Do NOT skip or delete tests. Fix the test mocking infrastructure.
