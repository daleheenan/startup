# Lessons Learned: Code Reviewer Agent

<!--
This file stores accumulated lessons learned by the code-reviewer agent.
It is automatically read before each task and updated after task completion.

MAINTENANCE RULES:
- Maximum 50 lessons per file (older lessons archived automatically)
- Lessons with score >= 5 are considered "proven" and prioritized
- Review and prune quarterly or when file exceeds 50 entries
-->

## Summary Statistics

- **Total tasks completed**: 0
- **Total lessons recorded**: 5
- **Last updated**: 2026-01-25
- **Proven lessons** (score >= 5): 0
- **Top themes**: #code-review #security #testing #typescript #patterns

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

### 2026-01-25 | Task: Security Review Checklist

**Date**: 2026-01-25
**Task**: Reviewing code for security vulnerabilities
**Context**: Full-stack application with auth

**What Worked Well**:
- Using OWASP Top 10 as review checklist
- Checking for input validation on server side
- Looking for hardcoded secrets or credentials

**What Didn't Work**:
- Missed some subtle SQL injection patterns initially

**Lesson**: Every code review should check: (1) Input validation on server, not just client, (2) Parameterized queries vs string concatenation, (3) No hardcoded secrets, (4) Auth checks on all protected routes, (5) Proper error messages that don't leak internals. These cover 80% of security issues.

**Application Score**: 0

**Tags**: #security #owasp #validation #auth

---

### 2026-01-25 | Task: Test Coverage Review

**Date**: 2026-01-25
**Task**: Ensuring adequate test coverage for new code
**Context**: TypeScript codebase with Jest

**What Worked Well**:
- Checking for tests that match new code paths
- Looking for edge case coverage
- Verifying error path testing

**What Didn't Work**:
- Accepting tests that only cover happy path

**Lesson**: New code should have tests for: (1) Happy path - expected behavior, (2) Edge cases - empty inputs, max values, nulls, (3) Error cases - what happens when things fail, (4) Integration points - API calls, database operations. Reject PRs that only test happy path.

**Application Score**: 0

**Tags**: #testing #coverage #edge-cases #code-review

---

### 2026-01-25 | Task: TypeScript Strictness Review

**Date**: 2026-01-25
**Task**: Ensuring TypeScript best practices
**Context**: Strict mode TypeScript project

**What Worked Well**:
- Flagging use of `any` type
- Checking for proper null handling
- Looking for type assertions without guards

**What Didn't Work**:
- N/A

**Lesson**: In TypeScript reviews, reject: (1) `any` type - always find correct type, (2) `!` non-null assertions - handle null properly, (3) `@ts-ignore` - fix underlying issue, (4) `as unknown as Type` - fix design. These shortcuts hide bugs and defeat the purpose of TypeScript.

**Application Score**: 0

**Tags**: #typescript #types #strict-mode #best-practices

---

### 2026-01-25 | Task: Error Handling Review

**Date**: 2026-01-25
**Task**: Reviewing error handling patterns
**Context**: Async code with API calls

**What Worked Well**:
- Checking for try/catch around async operations
- Looking for proper error propagation
- Verifying error logging with context

**What Didn't Work**:
- Initially missed silent error swallowing in .catch()

**Lesson**: Every async operation needs: (1) try/catch or .catch(), (2) Error logged with context (what was being attempted), (3) User-friendly error message if user-facing, (4) Error propagation if caller needs to handle. Never swallow errors silently - at minimum log them.

**Application Score**: 0

**Tags**: #error-handling #async #logging #patterns

---

### 2026-01-25 | Task: API Contract Review

**Date**: 2026-01-25
**Task**: Reviewing API changes for breaking changes
**Context**: REST API with frontend consumers

**What Worked Well**:
- Checking for removed/renamed fields
- Verifying response type changes
- Looking for changed error codes

**What Didn't Work**:
- Missed some optional-to-required field changes

**Lesson**: API changes should be reviewed for: (1) Removed fields - breaking, (2) Renamed fields - breaking, (3) Type changes - often breaking, (4) Optional to required - breaking for clients, (5) New required parameters - breaking. Any breaking change needs versioning or migration plan.

**Application Score**: 0

**Tags**: #api #breaking-changes #contracts #versioning

---

## Archived Lessons

*No archived lessons yet.*
