# Lessons Learned: Code Quality Inspector Agent

<!--
This file stores accumulated lessons learned by the code-quality-inspector agent.
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
- **Top themes**: #code-quality #maintainability #patterns #consistency #performance

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

### 2026-01-25 | Task: Code Quality Assessment

**Date**: 2026-01-25
**Task**: Comprehensive quality review of NovelForge
**Context**: Full-stack TypeScript application

**What Worked Well**:
- Checking for consistent patterns across files
- Looking for code duplication
- Verifying error handling completeness

**What Didn't Work**:
- Initially focused too much on style, not substance

**Lesson**: Code quality assessment priority: (1) Correctness - does it work correctly?, (2) Error handling - does it fail gracefully?, (3) Security - is it safe?, (4) Maintainability - can it be understood?, (5) Performance - is it efficient? Style comes last. Focus on substance over aesthetics.

**Application Score**: 1

**Tags**: #code-quality #priority #methodology

---

### 2026-01-25 | Task: Pattern Consistency Check

**Date**: 2026-01-25
**Task**: Ensuring consistent patterns across codebase
**Context**: Large codebase with multiple contributors

**What Worked Well**:
- Checking naming conventions
- Verifying import patterns
- Looking for consistent error handling

**What Didn't Work**:
- Missed some inconsistencies in nested components

**Lesson**: Pattern consistency to check: (1) Naming - camelCase, PascalCase used correctly, (2) Imports - relative vs absolute, order, (3) Error handling - consistent try/catch patterns, (4) API responses - same format everywhere, (5) Component structure - props, state, handlers in same order. Inconsistency = confusion.

**Application Score**: 0

**Tags**: #patterns #consistency #naming #conventions

---

### 2026-01-25 | Task: Maintainability Review

**Date**: 2026-01-25
**Task**: Assessing long-term maintainability
**Context**: Production application with ongoing development

**What Worked Well**:
- Checking function/file sizes
- Looking for proper abstraction levels
- Verifying documentation exists for complex logic

**What Didn't Work**:
- N/A

**Lesson**: Maintainability red flags: (1) Functions > 50 lines - should be split, (2) Files > 300 lines - likely doing too much, (3) Deeply nested conditionals - needs refactoring, (4) Magic numbers/strings - need constants, (5) Copy-paste code - needs abstraction. Fix these before they compound.

**Application Score**: 0

**Tags**: #maintainability #refactoring #complexity #documentation

---

### 2026-01-25 | Task: Dependency Analysis

**Date**: 2026-01-25
**Task**: Reviewing project dependencies
**Context**: Node.js project with npm dependencies

**What Worked Well**:
- Checking for outdated dependencies
- Looking for security vulnerabilities
- Identifying unused dependencies

**What Didn't Work**:
- Missed some transitive dependency issues

**Lesson**: Dependency health check: (1) Run npm audit for vulnerabilities, (2) Check for outdated major versions, (3) Remove unused dependencies (depcheck), (4) Verify license compatibility, (5) Check bundle size impact for frontend. Dependencies are attack surface and maintenance burden.

**Application Score**: 0

**Tags**: #dependencies #npm #security #maintenance

---

### 2026-01-25 | Task: Performance Pattern Review

**Date**: 2026-01-25
**Task**: Identifying performance anti-patterns
**Context**: React frontend with API calls

**What Worked Well**:
- Checking for unnecessary re-renders
- Looking for N+1 query patterns
- Identifying missing caching opportunities

**What Didn't Work**:
- Initially focused on micro-optimizations

**Lesson**: Performance patterns to check: (1) React - useMemo/useCallback for expensive operations, (2) API - batch requests instead of N+1, (3) Database - indexes on queried columns, (4) Frontend - lazy loading for routes/components, (5) Caching - static data cached appropriately. Focus on patterns, not micro-optimizations.

**Application Score**: 0

**Tags**: #performance #react #database #caching

---

## Archived Lessons

*No archived lessons yet.*
