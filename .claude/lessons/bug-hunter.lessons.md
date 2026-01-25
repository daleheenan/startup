# Lessons Learned: Bug Hunter Agent

<!--
This file stores accumulated lessons learned by the bug-hunter agent.
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
- **Top themes**: #react #async #race-conditions #error-handling #null-safety

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

### 2026-01-25 | Task: NovelForge UI Bug Hunt

**Date**: 2026-01-25
**Task**: Comprehensive bug hunting in NovelForge frontend
**Context**: Next.js 14 application with TypeScript

**What Worked Well**:
- Systematic file-by-file analysis
- Categorizing bugs by severity (Critical/High/Medium/Low)
- Providing exact file:line references

**What Didn't Work**:
- Initially focused only on obvious errors, missed race conditions

**Lesson**: Start bug hunting with these high-yield patterns: (1) Race conditions in auth/redirect flows, (2) Missing Error Boundaries, (3) useEffect without cleanup, (4) Null/undefined access on API responses, (5) Form validation client-side only. These account for ~60% of critical bugs.

**Application Score**: 1

**Tags**: #methodology #patterns #priority

---

### 2026-01-25 | Task: Race Condition Detection

**Date**: 2026-01-25
**Task**: Finding race conditions in async code
**Context**: React components with multiple async operations

**What Worked Well**:
- Looking for parallel API calls without coordination
- Checking for multiple state updates that could overlap
- Identifying redirect chains with missing guards

**What Didn't Work**:
- Missed stale closure bugs initially

**Lesson**: Race conditions occur when: (1) Multiple 401 responses trigger multiple logouts, (2) sessionStorage writes happen before redirect, (3) User can trigger async operation while previous is running, (4) Callbacks capture stale state values. Always look for flag guards or mutex patterns.

**Application Score**: 1

**Tags**: #race-conditions #async #auth #state-management

---

### 2026-01-25 | Task: Error Boundary Analysis

**Date**: 2026-01-25
**Task**: Identifying missing error handling
**Context**: React component tree without error boundaries

**What Worked Well**:
- Checking for ErrorBoundary components at app/page/feature levels
- Looking for try/catch in async useEffect callbacks
- Identifying unhandled promise rejections

**What Didn't Work**:
- N/A

**Lesson**: Every React application needs Error Boundaries at minimum three levels: (1) App level - catches catastrophic failures, (2) Page level - allows other pages to work, (3) Feature level - isolates component failures. Without these, any runtime error causes a white screen.

**Application Score**: 0

**Tags**: #react #error-boundaries #error-handling #ux

---

### 2026-01-25 | Task: Null Safety Analysis

**Date**: 2026-01-25
**Task**: Finding unsafe property access patterns
**Context**: TypeScript with API response handling

**What Worked Well**:
- Searching for chained property access without optional chaining
- Looking for array indexing without bounds checks
- Checking API response handling for missing null checks

**What Didn't Work**:
- TypeScript's type checking missed some runtime null cases

**Lesson**: API responses are NEVER guaranteed to match expected types at runtime. Always use optional chaining (?.) for nested access. Validate response structure before using. Array access should check length first. Type guards are essential for runtime safety.

**Application Score**: 0

**Tags**: #null-safety #typescript #api #defensive-programming

---

### 2026-01-25 | Task: useEffect Cleanup Analysis

**Date**: 2026-01-25
**Task**: Finding memory leaks in React components
**Context**: Components with async operations and intervals

**What Worked Well**:
- Checking for AbortController in fetch operations
- Looking for clearInterval/clearTimeout in cleanup
- Identifying subscriptions without unsubscribe

**What Didn't Work**:
- Initially missed that async functions need separate cleanup patterns

**Lesson**: Every useEffect that: (1) fetches data needs AbortController, (2) sets interval needs clearInterval, (3) adds event listener needs removeEventListener, (4) subscribes needs unsubscribe. The cleanup function MUST handle all of these to prevent memory leaks and state updates on unmounted components.

**Application Score**: 0

**Tags**: #react #useEffect #memory-leaks #cleanup

---

## Archived Lessons

*No archived lessons yet.*
