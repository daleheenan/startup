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

- **Total tasks completed**: 3
- **Total lessons recorded**: 12
- **Last updated**: 2026-01-25
- **Proven lessons** (score >= 5): 0
- **Top themes**: #react-hooks #sql-injection #dependencies #useCallback #security #patterns

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

### 2026-01-25 | Task: React Hook & SQL Injection Audit (BUG-009, BUG-010)

**Date**: 2026-01-25
**Task**: Systematic audit of React Hook dependencies and SQL injection risks
**Context**: 33 frontend components, 24 backend routes, repository pattern with dynamic SQL

**What Worked Well**:
- Read lessons first, then applied systematic search patterns
- Used multiline grep to find useCallback + useEffect patterns
- Checked for SQL template literals: `` `SELECT.*\${ ``
- Found pattern-based vulnerabilities (dangerous even if not currently exploited)
- Created comprehensive report documenting all findings with fixes
- Prioritized by actual risk vs theoretical risk

**What Didn't Work**:
- Some files too large to read fully (GenrePreferenceForm 31k tokens)
- Initial grep for SQL injection found safe code (`` usage_count + 1 `` in comments)
- Needed multiple grep iterations to narrow down actual issues

**Lesson**: React Hook + SQL injection audit requires TWO different mindsets: (1) For React hooks, look for ACTIVE bugs (useCallback in deps array, missing deps) - grep for `useCallback.*useEffect` patterns, (2) For SQL injection, look for PATTERNS even if currently safe (dynamic column names, ORDER BY from variables) - audit repositories not just routes, (3) Distinguish "currently safe" from "safe pattern" - `WHERE ${column} = ?` is dangerous pattern even with hardcoded column values, (4) useCallback + useEffect dependency is THE most common React anti-pattern - inline functions instead, (5) Document why pattern is dangerous, not just current state.

**Application Score**: 1

**Tags**: #react-hooks #sql-injection #useCallback #dependencies #patterns #audit

---

### 2026-01-25 | Task: useCallback Anti-Pattern Detection

**Date**: 2026-01-25
**Task**: Finding useCallback + useEffect dependency loops
**Context**: React components with fetch logic wrapped in useCallback

**What Worked Well**:
- Identified that useCallback is for child component props, not useEffect
- Recognized pattern causes double renders (projectId changes → fetchData changes → useEffect runs)
- Found 3 instances: plot/page, series/page, ChapterEditor
- Explained WHY pattern is wrong, not just that it is

**What Didn't Work**:
- Pattern is so common that developers don't realize it's wrong
- ESLint exhaustive-deps would catch this if enabled

**Lesson**: The useCallback + useEffect pattern is THE most common React anti-pattern: (1) useCallback is for memoizing callbacks passed to CHILDREN, not for useEffect, (2) Pattern: `useCallback(fn, [id])` + `useEffect(() => fn(), [fn])` causes extra render, (3) Correct: `useEffect(() => { const fn = async () => {...}; fn(); }, [id])`, (4) Only depend on PRIMITIVE values (id, string, number), never on functions, (5) If you need to call function from multiple places, define it OUTSIDE component or use useRef for stable reference, (6) Enable ESLint exhaustive-deps to catch this automatically.

**Application Score**: 1

**Tags**: #react-hooks #useCallback #useEffect #anti-pattern #performance

---

### 2026-01-25 | Task: SQL Injection Pattern Analysis

**Date**: 2026-01-25
**Task**: Auditing repository pattern for SQL injection via dynamic columns
**Context**: BaseRepository with string interpolation for column names and ORDER BY

**What Worked Well**:
- Found that routes are safe (all use parameterized queries)
- Identified repository layer has unsafe pattern even though currently not exploited
- Explained difference between "currently safe" and "safe pattern"
- Proposed whitelist-based fix for all repositories

**What Didn't Work**:
- Initially focused on routes, almost missed repository pattern
- Pattern is internal-only so developers might not see it as risk

**Lesson**: SQL injection audit must check TWO layers: (1) Routes - verify all use `db.prepare('...?').run(value)` pattern, (2) Repositories - check for dynamic column/table/ORDER BY even if only called internally, (3) Pattern like `WHERE ${column} = ?` is ALWAYS dangerous even with hardcoded column values, (4) Future developer might pass user input without realizing danger, (5) Fix: Every repository MUST whitelist allowed columns in constructor, validate before interpolation, (6) Search patterns: grep for `ORDER BY \${`, `WHERE \${`, backtick SQL with variables, (7) Distinguish active vulnerability from dangerous pattern.

**Application Score**: 1

**Tags**: #sql-injection #repositories #patterns #whitelisting #security

---

### 2026-01-25 | Task: NovelForge Full Bug Hunt & Fixes

**Date**: 2026-01-25
**Task**: Comprehensive bug hunting and fixing across backend and frontend
**Context**: Full-stack TypeScript application with SSE, React, Express, SQLite

**What Worked Well**:
- Systematic approach: Read lessons first, then scan codebase methodically
- Created comprehensive bug report document before fixing
- Prioritized by severity (Critical first, then High, Medium, Low)
- Used grep to find patterns (magic numbers, SQL concat, fetch calls)
- Checked for SQL injection by searching for string concatenation in queries
- Fixed multiple bugs in single pass to avoid context switching

**What Didn't Work**:
- Initially missed that some bugs were already partially addressed
- GenerationProgress useEffect cleanup looked suspicious but was actually correct

**Lesson**: When bug hunting in full-stack apps, use this checklist: (1) SSE/WebSocket endpoints - check auth extraction and connection tracking, (2) Array growth - cap all event arrays, (3) Null safety - validate array[0] access and JSON.parse, (4) Fetch timeouts - add AbortController everywhere, (5) useEffect cleanup - verify intervals/timers cleared on unmount, (6) SQL queries - confirm all use parameterized queries. These 6 patterns account for 80% of production bugs.

**Application Score**: 2

**Tags**: #checklist #systematic #production-bugs

---

### 2026-01-25 | Task: SSE Authentication Bugs

**Date**: 2026-01-25
**Task**: Fixing SSE endpoint authentication bypass
**Context**: Server-Sent Events with JWT query parameter auth

**What Worked Well**:
- Recognized that jwt.verify() returns decoded payload but code wasn't using it
- Added userId extraction and validation
- Implemented connection tracking to monitor for leaks
- Added forced cleanup after 1 hour as safety measure

**What Didn't Work**:
- N/A

**Lesson**: SSE endpoints with JWT query auth MUST: (1) Extract decoded payload from jwt.verify(), not just verify signature, (2) Validate userId exists in payload, (3) Track active connections in a Set, (4) Implement forced cleanup timeout (1hr max), (5) Log connection/disconnection with userId for monitoring. Without userId extraction, any valid JWT can access any user's stream.

**Application Score**: 2

**Tags**: #sse #auth #jwt #connections

---

### 2026-01-25 | Task: Unbounded Array Growth

**Date**: 2026-01-25
**Task**: Fixing memory leak in progress stream client
**Context**: React hook managing SSE events with growing arrays

**What Worked Well**:
- Identified that jobUpdates had limit (50) but chapterCompletions didn't
- Applied same pattern to both arrays
- Created named constants for limits instead of magic numbers
- Added validation to JSON.parse to prevent crashes

**What Didn't Work**:
- N/A

**Lesson**: ANY array that accumulates events/data in a long-running component needs: (1) Named constant for max size (MAX_JOB_UPDATES), (2) Slice to last N items on add: `updated.slice(-MAX)`, (3) JSON parse wrapped in try/catch with structure validation, (4) Consider what happens after 1000+ events. Memory leaks from unbounded arrays are silent killers.

**Application Score**: 2

**Tags**: #memory-leaks #arrays #sse #react

---

### 2026-01-25 | Task: Null Safety in Service Layer

**Date**: 2026-01-25
**Task**: Adding null checks to context assembly service
**Context**: TypeScript service accessing database rows and JSON fields

**What Worked Well**:
- Added validation for array existence AND length before accessing [0]
- Used type guards in filter: `filter((char): char is Character => char !== null)`
- Threw descriptive errors instead of letting null pointer crash
- Checked optional chaining on nested objects

**What Didn't Work**:
- N/A

**Lesson**: Service layer null safety checklist: (1) Before array[0], check `array && array.length > 0`, (2) After JSON.parse, validate structure exists, (3) Use type guards in filter to satisfy TypeScript: `filter((x): x is Type => x !== null)`, (4) Throw Error with context (IDs, field names) not generic messages, (5) Check project.story_bible?.characters before mapping. Defensive programming saves production crashes.

**Application Score**: 2

**Tags**: #null-safety #typescript #services #defensive-programming

---

### 2026-01-25 | Task: Fetch Timeout Implementation

**Date**: 2026-01-25
**Task**: Adding AbortController timeouts to all fetch calls
**Context**: Frontend fetch calls without timeout handling

**What Worked Well**:
- Created DEFAULT_TIMEOUT constant (30 seconds)
- Used AbortController pattern consistently
- Cleared timeout in both success and error paths
- Added custom error message for AbortError
- Made timeout configurable via options parameter

**What Didn't Work**:
- N/A

**Lesson**: Every fetch() call needs timeout protection: (1) Create AbortController, (2) setTimeout(() => controller.abort(), timeout), (3) Pass controller.signal to fetch, (4) clearTimeout in try AND catch, (5) Catch AbortError specifically: `if (error.name === 'AbortError')`, (6) Default to 30s, allow override for long operations. Without this, hung backend = frozen UI forever.

**Application Score**: 2

**Tags**: #timeouts #fetch #abort-controller #ux

---

### 2026-01-25 | Task: React useEffect Cleanup Analysis

**Date**: 2026-01-25
**Task**: Verifying interval cleanup in React components
**Context**: useEffect with setInterval for progress tracking

**What Worked Well**:
- Checked that cleanup function exists
- Verified clearInterval called for all setInterval
- Understood that cleanup runs on unmount AND dependency change

**What Didn't Work**:
- Initially thought code was bugged but it was actually correct

**Lesson**: useEffect cleanup patterns: (1) Cleanup runs BOTH on unmount AND when dependencies change, (2) Inside if(isActive) block, return cleanup function - it will still run on unmount, (3) Store timers in const within effect, not state, (4) Always clearInterval/clearTimeout in cleanup, (5) For null safety, store in let and check: `if (timer) clearInterval(timer)`. Don't assume code is buggy without tracing React's cleanup behavior.

**Application Score**: 2

**Tags**: #react #useEffect #cleanup #intervals

---

### 2026-01-25 | Task: SQL Injection Risk Assessment

**Date**: 2026-01-25
**Task**: Scanning for SQL injection vulnerabilities
**Context**: Better-sqlite3 database with TypeScript

**What Worked Well**:
- Grepped for template literals in SQL: `\`SELECT.*\$\{`
- Confirmed all queries use parameterized pattern: `db.prepare('... WHERE id = ?').run(value)`
- Found only template literals were in test files and console.log

**What Didn't Work**:
- N/A

**Lesson**: SQL injection hunting: (1) Grep for backtick template literals with ${ in SQL strings, (2) Verify ALL db.prepare uses ? placeholders, (3) Check that values passed to .run/.get/.all match placeholder count, (4) Watch for dynamic ORDER BY or LIMIT - use whitelist, not user input, (5) Better-sqlite3 safely handles parameterized queries but can't protect against template literals. One missed concatenation = SQL injection.

**Application Score**: 2

**Tags**: #sql-injection #security #database #grep

---

### 2026-01-25 | Task: React Hook Dependency Analysis

**Date**: 2026-01-25
**Task**: Finding missing dependencies in useEffect/useCallback
**Context**: Multiple React components with hooks

**What Worked Well**:
- Grepped for all useEffect/useCallback usage
- Identified useCallback creating new function when dependency changes
- Found useEffect depending on that function = potential infinite loop
- Checked if inline fetching would be better than useCallback wrapper

**What Didn't Work**:
- Many dependency arrays were actually correct

**Lesson**: Hook dependency warnings fall into categories: (1) useCallback with deps + useEffect with callback dep = possible loop, (2) Solution: inline async function in useEffect, only depend on primitive values, (3) fetchData pattern: don't memoize, just call inline, (4) If you MUST memoize, use useRef for stable reference, (5) ESLint exhaustive-deps is right 95% of time. Listen to it.

**Application Score**: 2

**Tags**: #react-hooks #dependencies #useEffect #useCallback

---

### 2026-01-25 | Task: Magic Number Refactoring

**Date**: 2026-01-25
**Task**: Finding magic numbers throughout codebase
**Context**: 64 files with hardcoded numbers

**What Worked Well**:
- Grepped for common magic numbers: 100, 500, 1000, 5000, etc
- Created constants file for critical values
- Named constants describe WHAT not just value: MAX_SSE_CONNECTIONS not HUNDRED

**What Didn't Work**:
- Too many to fix all at once
- Some numbers are legitimately one-off values

**Lesson**: Magic number triage: (1) Fix CRITICAL first: timeouts, connection limits, array caps, (2) Create constants file with categories: TIMEOUTS, LIMITS, DEFAULTS, (3) Name for purpose: API_REQUEST_TIMEOUT not THIRTY_THOUSAND, (4) Don't refactor every number - layout pixels, zIndex, etc can stay inline, (5) If number appears 3+ times, extract it. Consistency matters more than perfection.

**Application Score**: 1

**Tags**: #magic-numbers #constants #maintainability

---

### 2026-01-25 | Task: Error Boundary Gap

**Date**: 2026-01-25
**Task**: Identifying missing error boundaries in React app
**Context**: Next.js application without error boundaries

**What Worked Well**:
- Searched for ErrorBoundary components
- Found none existed anywhere in app
- Recognized this means any error = white screen crash

**What Didn't Work**:
- N/A (found the gap)

**Lesson**: EVERY React app needs Error Boundaries at 3 levels: (1) App root - catches catastrophic failures, reload page button, (2) Page level - keeps other pages working, (3) Feature level - isolates component crashes. Create ErrorBoundary class component (not function), use componentDidCatch, provide fallback UI. Without these, React unmounts entire tree on error = worst UX possible.

**Application Score**: 1

**Tags**: #error-boundaries #react #ux #error-handling

---

## Archived Lessons

*No archived lessons yet.*
