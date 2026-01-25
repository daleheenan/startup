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

- **Total tasks completed**: 12
- **Total lessons recorded**: 12
- **Last updated**: 2026-01-25
- **Proven lessons** (score >= 5): 0
- **Top themes**: #typescript #testing #patterns #frontend #backend #database #migrations #third-party-integration #performance #caching #mocking #jest #logging #structured-logging #pino #fullstack #prompts #claude-api #deployment #railway #ci-cd

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

### 2026-01-25 | Task: Fixing Railway Deployment Failures - Untracked Files and Zod Version

**Date**: 2026-01-25
**Task**: Debugging and fixing Railway deployment failures caused by missing modules and dependency version issues
**Context**: Railway deployment of Express/TypeScript backend failing with multiple "Cannot find module" and TypeScript compilation errors

**What Worked Well**:
- Systematically checking `git status` to find untracked files that were being imported
- Using grep to trace import dependencies: `grep -r "migration-registry\|query-monitor" --include="*.ts"`
- Running `npx tsc --noEmit` locally to reproduce Railway's TypeScript errors before pushing fixes
- Checking npm package versions with `npm list zod` to identify version mismatches
- Recognizing that Zod v4 (4.3.6) has breaking changes vs Zod v3 (type inference differences)
- Adding synchronous versions of async methods when code needed to run at module initialization time
- Committing fixes incrementally with descriptive messages to track what each fix addressed

**What Didn't Work**:
- Initial commits missed several untracked files - should have done comprehensive check first
- Didn't immediately recognize Zod v4 breaking changes - assumed syntax error in our code
- Async migration function was called synchronously at server startup - needed to trace full call stack to find issue

**Lesson**: When Railway deployments fail, follow this systematic approach:
1. **Reproduce locally first** - Run `npx tsc --noEmit` in backend to see same errors
2. **Check for untracked files** - `git status --short | grep "^??"` then trace imports
3. **Verify dependency versions** - Major version bumps (v3→v4) often have breaking changes
4. **Check sync/async consistency** - Module initialization code (server.ts, db connections, migrations) must be synchronous if called at import time
5. **Downgrade problematic dependencies** - Use stable versions (`npm install zod@3.24.4`) rather than latest
6. **Test build before push** - Both `npm run build` and `npx tsc --noEmit` should pass

Specific patterns that broke Railway:
- `Cannot find module '../utils/schemas.js'` → File was untracked/uncommitted
- `TS2339: Property 'preferences' does not exist on type 'never'` → Zod v4 type inference breaking change
- `TS1308: 'await' only allowed in async functions` → Migration function changed to async but called synchronously

**Application Score**: 0

**Tags**: #deployment #railway #ci-cd #typescript #zod #untracked-files #async-sync #debugging #dependencies

---

### 2026-01-25 | Task: Adding Timeframe/Era Setting to Genre Setup Flow

**Date**: 2026-01-25
**Task**: Adding story universe timeframe/year setting to genre setup flow with preset buttons and custom input
**Context**: Full-stack feature spanning database migration, shared types, backend prompts, and frontend UI components

**What Worked Well**:
- Reading lessons files first to understand existing patterns and best practices
- Systematically inventorying existing code before implementation (checked migrations, types, services, components)
- Following existing migration patterns (checked latest migration number, used consistent naming 016_timeframe_support.sql)
- Creating a reference table for timeframe presets with categories (historical, modern, future, fantasy) for UI population
- Updating shared types in both frontend (`shared/types/index.ts`) and backend (`backend/src/shared/types/index.ts` and `.d.ts`)
- Adding timeframe as optional field in StoryDNA interface (allows backward compatibility)
- Updating concept-generator prompts to include timeframe in both `buildConceptPrompt` and `refineConcepts` functions
- Updating world-generator prompts to include timeframe for historical/cultural context
- Updating context-assembly service to include timeframe in chapter generation prompts with specific guidance about historical accuracy
- Creating intuitive UI with both preset buttons (with emojis) and custom text input
- The migration system uses a hardcoded list in migrate.ts - remembered to add new migration to that array
- Running `npm run build` in backend before migrations ensures migration files are copied to dist folder
- Both frontends build (`npm run build`) and backend compilation (`npx tsc --noEmit`) verified successfully

**What Didn't Work**:
- Initial migration didn't run until I added it to the hardcoded list in migrate.ts
- Needed to update types in THREE places: shared/types/index.ts, backend/src/shared/types/index.ts, backend/src/shared/types/index.d.ts

**Lesson**: When adding a new story metadata field that affects AI generation, update it systematically across all layers: (1) Add database migration if needed (reference tables for presets), (2) Update shared TypeScript types in BOTH frontend and backend directories (including .d.ts files), (3) Update relevant service interfaces (StoryPreferences, WorldGenerationContext), (4) Update ALL Claude prompt building functions (concept generation, world building, chapter generation), (5) Add UI fields with good UX (presets + custom input), (6) Remember to add new migrations to the hardcoded list in migrate.ts. For optional fields, use `field?: string` syntax for backward compatibility.

**Application Score**: 0

**Tags**: #fullstack #database #migrations #types #prompts #claude-api #ui #ux #story-metadata #world-building

---

### 2026-01-25 | Task: Migrating Console Logging to Structured Pino Logger

**Date**: 2026-01-25
**Task**: Migrating remaining console.log/error statements to structured Pino logger across 8 backend files
**Context**: Backend using Pino for structured logging, need to replace legacy console statements with proper logger calls

**What Worked Well**:
- Reading logger.service.ts first to understand the createLogger pattern and usage
- Using grep to find all console.log/error/warn statements before starting migration
- Systematic approach: import logger at top, then replace console statements with structured logging
- Using structured logging with context objects: `logger.info({ jobId, type }, 'message')` instead of string concatenation
- For database connection verbose mode, used `(message?: unknown)` to match better-sqlite3's type signature
- Running `npx tsc --noEmit` after migration to verify no TypeScript errors
- Following consistent context naming pattern: 'module:submodule' (e.g., 'queue:worker', 'db:migrate')
- Using appropriate log levels: info for normal operations, warn for rate limits/retries, error for failures
- Structuring log data as objects in first parameter, human-readable message in second parameter

**What Didn't Work**:
- Initial attempt used `(message?: string)` for database verbose function, needed `unknown` type to match library signature
- First error handling in worker.ts used old pattern `logger.error('message:', error)` instead of structured `logger.error({ error }, 'message')`

**Lesson**: When migrating to structured logging with Pino, always use the pattern `logger.level({ contextData }, 'message')` where contextData is an object containing relevant fields (IDs, counts, etc.) and message is a concise human-readable string. This enables better log searching and filtering in production. For third-party library callbacks, match the exact type signature (use `unknown` if needed). Use replace_all: true for common patterns like `console.log('[Module]` to speed up bulk replacements.

**Application Score**: 0

**Tags**: #logging #structured-logging #pino #migration #console #typescript #backend #best-practices

---

### 2026-01-25 | Task: Fixing TypeScript Compilation Errors in Jest Test Files

**Date**: 2026-01-25
**Task**: Fixing all remaining TypeScript compilation errors in backend test files (10 failing test suites)
**Context**: Backend test suite using Jest with ESM, multiple test files with jest.Mock type inference issues, mock function parameter typing errors

**What Worked Well**:
- Systematically reading all failing test files first to identify common patterns
- Using `grep` to find specific error lines and understand context
- Applying type assertions to mock calls: `(mockCreate as any).mockResolvedValue(...)` for jest.Mock type issues
- Using `: any` type annotation for mock variables: `const mockPrepare: any = jest.fn()`
- Changing mock implementation parameters from `(sql: string)` to `(sql: any)` to avoid union type issues
- Changing mock filter callbacks from `(call: string[])` to `(call: any[])` to handle unknown parameter types
- Running tests after each batch of fixes to verify progress
- Fixed Project type missing fields (universe_id, is_universe_root) by adding them
- Fixed incorrect enum value ('three-act' should be 'three_act')
- Removed non-existent Jest matcher `toHaveBeenCalledBefore` and replaced with two separate assertions

**What Didn't Work**:
- Initially tried wrapping jest.fn() assignment in `(as any)` on the left side - needed to put it on the right side after the chain
- First attempt used `replace_all: false` when multiple identical strings existed - had to switch to `replace_all: true`

**Lesson**: When fixing Jest mock TypeScript errors in ESM projects, the key patterns are: (1) Cast entire jest.Mock chains with `as any` on the right side after method calls, (2) Use `: any` type annotation for mock function variables, (3) Change callback parameter types to `any` when dealing with jest.Mock.calls filters, (4) Mock implementation parameters should use `any` type to avoid union type conflicts. Always verify the actual TypeScript errors with grep before fixing - runtime test failures are different from compilation errors.

**Application Score**: 0

**Tags**: #typescript #jest #mocking #testing #esm #type-inference #test-fixes

---

### 2026-01-25 | Task: Fixing Test Mocks After Logger Migration

**Date**: 2026-01-25
**Task**: Fixing failing tests after services migrated from console.error to Pino structured logger
**Context**: Backend test suite using Jest with ESM, services migrated from console logging to Pino logger, tests checking for console.error calls were failing

**What Worked Well**:
- Used grep to systematically find all console.error spy assertions across test files
- Identified that only 4 tests actually had console.error assertions (metrics.service.test.ts x3, claude.service.test.ts x1)
- Removed assertions where services now use structured logging - verified error handling still works by checking return values
- Verified that checkpoint.ts and worker.ts still use console.error (not yet migrated), so their tests remain unchanged
- Cast mock functions to `any` type to bypass TypeScript inference issues: `(mockService.method as any).mockResolvedValue(...)`
- Added missing `import { jest } from '@jest/globals'` to ESM mock files
- Added database mocks with `jest.mock('../../db/connection.js')` before imports to prevent loading real modules

**What Didn't Work**:
- Initially tried changing jest.config.cjs module setting to support import.meta - caused "Cannot use import statement" errors
- Tried wrapping import.meta in try-catch - TypeScript still analyzes syntax before runtime
- Tried conditional import.meta with @ts-ignore - broke module loading
- TypeScript type inference on jest.fn() in mock factories caused "type never" errors until explicit casting

**Lesson**: When refactoring from console logging to structured loggers, tests that verify console.error calls should be updated to test behavior (return values, error handling) rather than implementation details (logging). For ESM projects with Jest, mock setup order matters - use jest.mock() before imports to prevent TypeScript from compiling mocked modules. Use explicit type assertions (`as any`) on mock methods when TypeScript can't infer jest.Mock types correctly.

**Application Score**: 0

**Tags**: #testing #mocking #jest #typescript #esm #logger #migration #console #pino

---

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
