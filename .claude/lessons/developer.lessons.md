# Lessons Learned: Developer Agent

<!--
This file stores accumulated lessons learned by the developer agent.
It is automatically read before each task and updated after task completion.

MAINTENANCE RULES:
- Maximum 50 lessons per file (older lessons archived automatically)
- Lessons with score >= 5 are considered "proven" and prioritized
- Review and prune quarterly or when file exceeds 50 entries
-->

## Summary Statistics

- **Total tasks completed**: 7
- **Total lessons recorded**: 7
- **Last updated**: 2026-01-25
- **Proven lessons** (score >= 5): 0
- **Top themes**: #typescript #testing #patterns #frontend #backend #database #migrations #third-party-integration #performance #caching

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

### 2026-01-25 | Task: Sprint 15 Database and API Optimization

**Date**: 2026-01-25
**Task**: Implementing database query optimization and API response caching for backend performance
**Context**: Backend using better-sqlite3, Express.js routes, need to improve query performance and reduce redundant data fetching

**What Worked Well**:
- Analyzing existing schema and migrations first to identify what indexes already existed (avoided duplicates)
- Creating a simple, focused in-memory cache service with clear interface (get, set, invalidate, clear)
- Using pattern-based cache invalidation (e.g., `cache.invalidate('genre-tropes:')`) for related entries
- Adding composite indexes for common query patterns (status + created_at for jobs table)
- Writing comprehensive tests for cache service before integrating into routes
- Adding performance logging to measure impact (`const startTime = Date.now()`)
- Different TTL values based on data volatility (1 hour for static, 5 minutes for dynamic)
- Systematic caching: import cache, check cache, use or set, invalidate on updates

**What Didn't Work**:
- Initially used vitest imports in test file when project uses jest (caught by test runner)
- Build script doesn't copy new migration files automatically (had to manually copy 013 to dist)

**Lesson**: When implementing performance optimizations, always analyze what already exists before adding new indexes. For caching, use a layered approach: (1) cache static data aggressively with long TTL, (2) cache expensive operations with shorter TTL, (3) invalidate related caches on updates. Pattern-based invalidation (prefix matching) is cleaner than tracking individual keys for related data.

**Application Score**: 0

**Tags**: #performance #caching #database #indexes #optimization #backend #migrations

---

### 2026-01-25 | Task: Sentry Integration for Error Tracking

**Date**: 2026-01-25
**Task**: Integrating Sentry SDK for error tracking in NovelForge backend
**Context**: Adding third-party error monitoring service to production Express/TypeScript application

**What Worked Well**:
- Reading existing service patterns (logger.service.ts) before creating sentry.service.ts ensured consistency
- Initializing Sentry at the very top of server.ts (before other imports) follows Sentry best practices
- Creating a service wrapper with graceful skipping (when SENTRY_DSN not set) prevents dev environment errors
- Excluding test files from tsconfig build prevents unrelated test errors from blocking deployment
- Building incrementally: service -> initialization -> middleware -> error handlers
- Testing startup without DSN configured verified graceful degradation

**What Didn't Work**:
- Initial attempt to use `Sentry.Handlers.errorHandler()` failed because Sentry v10 uses different API
- File watching/linting made editing route files difficult - had to focus on core integration first
- Didn't check Sentry version before implementing - should verify third-party API versions

**Lesson**: When integrating third-party SDKs, always check the installed version and use version-specific documentation. Create a service wrapper that gracefully handles missing configuration (fail open for development). Exclude test files from production builds to prevent test-only errors from blocking deployment.

**Application Score**: 0

**Tags**: #third-party-integration #error-tracking #sentry #typescript #graceful-degradation #service-wrapper

---

### 2026-01-25 | Task: Implementing Mystery Tracking Feature

**Date**: 2026-01-25
**Task**: Implementing mystery tracking system for plot mysteries across book series
**Context**: Full-stack feature with database migration, service layer, API routes, and integration with existing SeriesBibleGeneratorService

**What Worked Well**:
- Reading existing patterns first (checked SeriesBibleGeneratorService, ClaudeService, migration structure)
- Following established migration numbering and structure (012_mystery_tracking.sql)
- Using proper TypeScript interfaces that match database schema
- Creating comprehensive service with Claude integration for automated mystery extraction
- Building API routes following existing REST patterns
- Writing integration tests to verify functionality end-to-end
- Updating both shared types directories (shared/types and backend/src/shared/types)

**What Didn't Work**:
- Initial implementation forgot to include answered_book and answered_chapter in manual status updates
- Had to manually copy migration file to dist/ after build due to build script failing on test errors

**Lesson**: When implementing database-backed features, always ensure update methods handle all related fields atomically. For mystery resolutions, status, answer, answered_book, and answered_chapter should all be updated together to maintain data consistency.

**Application Score**: 0

**Tags**: #database #migrations #service-layer #api #claude-integration #full-stack

---

### 2026-01-24 | Task: Implementing Sprints 16 & 17 - Interactive Editing & Regeneration

**Date**: 2026-01-24
**Task**: Implementing interactive chapter editing workspace with regeneration tools
**Context**: Full-stack feature spanning migrations, services, routes, and UI components

**What Worked Well**:
- Reading existing code first revealed that most backend infrastructure was already implemented
- Leveraging existing components (ChapterEditor, VariationPicker, RegenerationToolbar) saved significant time
- Creating a dedicated route for the chapter editor (/projects/[id]/chapters/[chapterId]) provided clean separation
- Adding an "Edit" button to ChaptersList made the feature discoverable
- Running builds after implementation verified everything compiled correctly

**What Didn't Work**:
- Initially didn't check if backend services existed before planning implementation
- Could have saved time by checking component inventory first

**Lesson**: For large features spanning frontend and backend, always inventory what already exists before writing new code. Check migrations, services, routes, and components systematically. Often, infrastructure is partially or fully implemented and just needs UI wiring.

**Application Score**: 0

**Tags**: #frontend #backend #fullstack #inventory #existing-code

---

### 2026-01-20 | Task: Initial developer agent setup

**Date**: 2026-01-20
**Task**: Setting up the self-reinforcement learning system for agents
**Context**: Creating infrastructure for agent learning

**What Worked Well**:
- Reading existing patterns before implementing changes
- Breaking the work into clear phases

**What Didn't Work**:
- N/A - this was an infrastructure task

**Lesson**: When modifying multiple similar files (like agents), establish a clear pattern first with one file, then apply systematically to all others.

**Application Score**: 0

**Tags**: #patterns #infrastructure #batch-updates

---

### 2026-01-20 | Task: Example lesson - TypeScript strict mode

**Date**: 2026-01-20
**Task**: Implementing feature with strict TypeScript
**Context**: Working in a strict TypeScript codebase

**What Worked Well**:
- Using proper type guards instead of type assertions
- Letting the compiler guide implementation

**What Didn't Work**:
- Initially tried to use `as unknown as Type` shortcuts - caused runtime issues later

**Lesson**: In strict TypeScript, never use `as unknown as Type` casting. If the types don't match, the code design is wrong. Fix the design, not the types.

**Application Score**: 0

**Tags**: #typescript #types #strict-mode

---

### 2026-01-20 | Task: Example lesson - Test-first development

**Date**: 2026-01-20
**Task**: Implementing a new service function
**Context**: Building business logic for transaction processing

**What Worked Well**:
- Writing tests first clarified the expected behavior
- Edge cases were discovered during test writing, not production

**What Didn't Work**:
- Initially skipped tests for "simple" function - bugs found in review

**Lesson**: There is no function too simple to test. The act of writing the test often reveals edge cases the implementation would miss.

**Application Score**: 0

**Tags**: #testing #tdd #edge-cases

---

## Archived Lessons

*No archived lessons yet.*
