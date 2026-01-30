# Integration Tests - Index

## Overview

This directory contains comprehensive integration tests for NovelForge backend workflows. These tests verify that multiple services, database operations, and background jobs work together correctly across complex scenarios.

## Files in This Directory

### Test Files

#### `workflows.integration.test.ts`
**Main integration test suite** - 37KB, 15 tests covering 6 major workflows

**Test Categories**:
1. Complete Novel Generation Workflow (3 tests)
2. Chapter Generation Pipeline (3 tests)
3. Export Workflow (2 tests)
4. VEB Analysis Workflow (3 tests)
5. Database Transaction Integrity (3 tests)
6. Cross-Book Continuity (1 test)

**Key Features**:
- In-memory SQLite database for speed
- Mock external AI services (Claude API)
- Test factories for data generation
- Helper functions for common setup
- Transaction testing
- Concurrent operation testing

**Execution Time**: ~2 seconds for all 15 tests

---

### Documentation Files

#### `README.md`
**Quick reference guide** - 6.2KB

**Contents**:
- Test structure overview
- Running tests (basic commands)
- Writing new integration tests
- Best practices
- Test patterns
- Helper functions
- Performance metrics
- Debugging tips

**For**: Developers who need to run or write integration tests

---

#### `TEST_SUMMARY.md`
**Detailed test analysis** - 12KB

**Contents**:
- Complete test execution results
- Detailed breakdown of all 15 tests
- What each test verifies
- Why each test matters
- Coverage analysis
- Test quality metrics
- Performance analysis
- Key findings and recommendations

**For**: QA engineers, technical leads, and stakeholders who need to understand test coverage

---

#### `TESTING_GUIDE.md`
**Comprehensive testing guide** - 14KB

**Contents**:
- Quick start commands
- Understanding test results
- Debugging failed tests
- Common failures and solutions
- Test development workflow (TDD)
- Performance optimisation
- CI/CD integration
- Test maintenance checklist
- Advanced testing patterns

**For**: Developers working with tests, debugging issues, or maintaining the test suite

---

#### `INDEX.md` (this file)
**Navigation and overview** - You are here

**Contents**:
- Directory structure
- File descriptions
- Quick navigation
- Test execution summary

**For**: Anyone exploring the integration test directory

---

## Quick Navigation

### I want to...

#### Run the tests
→ See [README.md](./README.md) - "Running Tests" section

```bash
npm test -- workflows.integration.test
```

#### Understand what's being tested
→ See [TEST_SUMMARY.md](./TEST_SUMMARY.md) - "Test Scenarios Covered" section

#### Debug a failing test
→ See [TESTING_GUIDE.md](./TESTING_GUIDE.md) - "Debugging Failed Tests" section

#### Write a new integration test
→ See [README.md](./README.md) - "Writing New Integration Tests" section

#### Check test coverage
→ See [TEST_SUMMARY.md](./TEST_SUMMARY.md) - "Test Coverage Analysis" section

#### Learn about test patterns
→ See [TEST_SUMMARY.md](./TEST_SUMMARY.md) - "Test Patterns Used" section

#### Set up CI/CD pipeline
→ See [TESTING_GUIDE.md](./TESTING_GUIDE.md) - "Continuous Integration" section

#### Maintain tests over time
→ See [TESTING_GUIDE.md](./TESTING_GUIDE.md) - "Test Maintenance Checklist" section

---

## Test Execution Summary

### Status
✅ **All tests passing** (15/15)

### Performance
- Execution time: ~2 seconds
- Database: In-memory SQLite
- External services: Mocked

### Coverage
- Services: 8 major workflows
- Database operations: INSERTs, UPDATEs, DELETEs, SELECTs, JOINs
- Data integrity: Foreign keys, cascades, transactions
- Concurrent operations: Atomic job pickup

### Test Quality
- Isolated (fresh database per test)
- Fast (in-memory, no I/O)
- Comprehensive (happy paths + error cases)
- Maintainable (factories + helpers)

---

## Workflows Tested

### 1. Novel Generation
- Project creation with story concept, DNA, and bible
- Plot structure with three-act outline
- Character and world element storage
- Cascade deletion and referential integrity

### 2. Chapter Pipeline
- Job queue processing
- Chapter generation with status transitions
- Multi-stage editing (5 stages)
- Token usage tracking

### 3. Export
- Project and chapter retrieval with JOINs
- Edited content precedence
- Word count aggregation
- Author metadata

### 4. VEB Analysis
- Report creation for completed projects
- Three module workflow (Beta Swarm, Ruthless Editor, Market Analyst)
- Result storage and aggregation
- Overall scoring and recommendations

### 5. Transaction Integrity
- Rollback on errors
- Foreign key enforcement
- Atomic operations
- Race condition prevention

### 6. Continuity Tracking
- Trilogy/series support
- Character state evolution
- World state changes
- Relationship tracking

---

## Test Architecture

### Database Strategy
```
In-Memory SQLite
├── Fresh database per test (isolation)
├── Foreign keys enabled
├── All tables created in setupTestDatabase()
└── Automatic cleanup after each test
```

### Mock Strategy
```
External Services
├── Claude API (AI generation)
│   ├── createCompletion
│   └── createCompletionWithUsage
└── Return predefined responses (no real API calls)
```

### Test Data Strategy
```
Test Factories
├── createTestProject()
├── createTestBook()
├── createTestChapter()
├── createTestCharacter()
├── createTestStoryConcept()
└── createTestStoryBible()
```

### Helper Functions
```
Test Helpers
├── setupTestDatabase(db) - Creates all tables
└── setupProjectBookChapter(db, ids...) - Common scenario setup
```

---

## Dependencies

### Production Dependencies (Tested)
- `better-sqlite3` - Database (tested with in-memory mode)
- `claudeService` - AI generation (mocked)
- `exportService` - PDF/DOCX export (data retrieval tested)
- `vebService` - Editorial analysis (workflow tested)

### Test Dependencies
- `@jest/globals` - Testing framework
- `better-sqlite3` - In-memory database
- Test factories from `../factories/`

---

## Maintenance Schedule

### Before Each Commit
```bash
npm test -- workflows.integration.test
```

### Before Each Deployment
```bash
npm test                     # All tests
npm test:coverage           # With coverage
```

### Monthly Review
- Check test execution time (target: < 5 seconds)
- Review test coverage (target: 70%+)
- Update documentation
- Remove obsolete tests
- Add tests for new features

### After Schema Changes
- Update `setupTestDatabase()` function
- Run full test suite
- Update test data factories
- Add migration tests if needed

---

## Metrics

| Metric | Value | Target |
|--------|-------|--------|
| Tests | 15 | - |
| Execution Time | ~2s | < 5s |
| Pass Rate | 100% | 100% |
| Coverage | Workflows | 70%+ |
| Database | In-memory | In-memory |
| Isolation | 100% | 100% |

---

## Version History

### v1.0 (Current)
- 15 integration tests
- 6 major workflows covered
- Comprehensive documentation
- All tests passing

### Planned Enhancements
- Add stress tests (100+ chapters)
- Add concurrent worker tests
- Add export format validation
- Add VEB module unit tests
- Add series bible tests (5+ books)

---

## Related Documentation

### Test Documentation
- [Test Factories](../factories/README.md) - Reusable test data
- [Service Unit Tests](../../services/__tests__/) - Service-level tests
- [API Tests](../../routes/__tests__/) - Endpoint tests

### Application Documentation
- [Database Migrations](../../db/migrations/) - Schema evolution
- [Service Documentation](../../services/) - Service implementations
- [Queue Worker](../../queue/worker.ts) - Background job processing

---

## Contact & Support

### Questions About Tests?
- Check [TESTING_GUIDE.md](./TESTING_GUIDE.md) first
- Review test comments in `workflows.integration.test.ts`
- Check existing test patterns

### Found a Bug?
1. Write a failing test that demonstrates the bug
2. Fix the bug
3. Verify test passes
4. Submit PR with both test and fix

### Need Help?
- Review the comprehensive guides in this directory
- Check test output for error messages
- Use verbose mode for debugging
- Add debug console.log statements to tests

---

## Success Criteria

✅ All 15 tests passing
✅ Execution time under 2 seconds
✅ 100% test isolation
✅ Comprehensive workflow coverage
✅ Zero external dependencies (all mocked)
✅ Clear, maintainable test code
✅ Detailed documentation

**Status**: Integration test suite is production-ready and provides comprehensive coverage of NovelForge workflows.
