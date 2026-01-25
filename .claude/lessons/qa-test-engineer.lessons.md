# Lessons Learned: QA Test Engineer Agent

<!--
This file stores accumulated lessons learned by the qa-test-engineer agent.
It is automatically read before each task and updated after task completion.

MAINTENANCE RULES:
- Maximum 50 lessons per file (older lessons archived automatically)
- Lessons with score >= 5 are considered "proven" and prioritized
- Review and prune quarterly or when file exceeds 50 entries
-->

## Summary Statistics

- **Total tasks completed**: 1
- **Total lessons recorded**: 5
- **Last updated**: 2026-01-25
- **Proven lessons** (score >= 5): 0
- **Top themes**: #testing #coverage #routes #edge-cases #integration

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

### 2026-01-25 | Task: NovelForge Test Coverage Analysis

**Date**: 2026-01-25
**Task**: Analyzing test coverage gaps in NovelForge
**Context**: TypeScript backend with Jest, ~29% coverage

**What Worked Well**:
- Systematic file counting to calculate coverage
- Prioritizing by risk level
- Identifying patterns in what was/wasn't tested

**What Didn't Work**:
- Initially didn't distinguish between route vs service testing priority

**Lesson**: Prioritize test coverage by risk: (1) Routes/Controllers - public interface, most likely attack vector, (2) Auth/Security - critical for protection, (3) Core services - business logic, (4) Data access - integrity. Routes at 5% coverage is a critical risk even if services are at 35%.

**Application Score**: 1

**Tags**: #testing #coverage #priority #risk

---

### 2026-01-25 | Task: Route Testing Strategy

**Date**: 2026-01-25
**Task**: Planning route test coverage
**Context**: Express routes with middleware

**What Worked Well**:
- Using supertest for HTTP-level testing
- Testing middleware chain behavior
- Checking auth enforcement on protected routes

**What Didn't Work**:
- Initially only tested happy paths

**Lesson**: Every route test should cover: (1) Success case with valid input, (2) Validation errors with invalid input, (3) Auth errors for protected routes, (4) Not found for missing resources, (5) Server errors with mocked failures. This ensures the public API behaves correctly under all conditions.

**Application Score**: 0

**Tags**: #routes #testing #supertest #api

---

### 2026-01-25 | Task: Edge Case Identification

**Date**: 2026-01-25
**Task**: Identifying edge cases for test coverage
**Context**: Service functions with various inputs

**What Worked Well**:
- Testing with empty arrays, null, undefined
- Boundary value testing (0, 1, max-1, max)
- Unicode and special character handling

**What Didn't Work**:
- Missed some concurrent access scenarios

**Lesson**: Standard edge cases to test: (1) Empty values - null, undefined, empty string, empty array, (2) Boundaries - 0, 1, max-1, max, max+1, (3) Special characters - unicode, SQL chars, HTML chars, (4) Concurrent access - if applicable, (5) Large inputs - near limits. These catch ~70% of edge case bugs.

**Application Score**: 0

**Tags**: #edge-cases #testing #boundaries #validation

---

### 2026-01-25 | Task: Test Isolation

**Date**: 2026-01-25
**Task**: Ensuring tests don't affect each other
**Context**: Jest tests with database interactions

**What Worked Well**:
- Using beforeEach to reset state
- Mocking external dependencies
- Cleaning up after async operations

**What Didn't Work**:
- Tests passed individually but failed together (shared state)

**Lesson**: Every test must be isolated: (1) Reset database/state in beforeEach, (2) Mock external APIs and services, (3) Don't rely on test execution order, (4) Clean up created resources in afterEach, (5) Use unique identifiers for test data. Tests that pass alone but fail together indicate shared state pollution.

**Application Score**: 0

**Tags**: #testing #isolation #jest #mocking

---

### 2026-01-25 | Task: Integration Test Design

**Date**: 2026-01-25
**Task**: Designing end-to-end workflow tests
**Context**: Multi-step user workflows

**What Worked Well**:
- Testing complete user journeys
- Using real database (not mocks) for integration tests
- Checking state at each step

**What Didn't Work**:
- Tests were slow and flaky initially

**Lesson**: Integration tests should: (1) Cover complete user workflows (login -> action -> verify), (2) Use real database with test data, (3) Mock only external services (APIs, email), (4) Be separate from unit tests (different test suite), (5) Run in CI but not on every commit due to speed. They catch issues that unit tests miss.

**Application Score**: 0

**Tags**: #integration #testing #workflows #e2e

---

## Archived Lessons

*No archived lessons yet.*
