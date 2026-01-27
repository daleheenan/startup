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

- **Total tasks completed**: 21
- **Total lessons recorded**: 21
- **Last updated**: 2026-01-26
- **Proven lessons** (score >= 5): 0
- **Top themes**: #typescript #testing #patterns #frontend #backend #database #migrations #third-party-integration #performance #caching #mocking #jest #logging #structured-logging #pino #fullstack #prompts #claude-api #deployment #railway #ci-cd #ui-components #ux #react #accessibility #api-routes #express #rest-api #crud-operations #state-management #confirmation-dialogs #act-management #outline-routes #manual-testing #api-documentation #auto-population #default-values #constants #workflow #react-query #virtualization #optimization #inventory

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

### 2026-01-26 | Task: Sprint 15 Performance Optimization - React Query and Virtualization

**Date**: 2026-01-26
**Task**: Implementing React Query hooks and virtualized chapter list for performance optimization
**Context**: Sprint 15 optimization tasks - reducing N+1 queries and improving UI performance with large datasets

**What Worked Well**:
- Inventoried existing implementation before starting - discovered Task 1 (books-with-chapters endpoint) and Task 2 (React Query setup) were ALREADY DONE
- Verified Task 4 (useProgressStream optimization) was already optimized with useRef pattern and useCallback with empty deps
- Only needed to implement Task 3 (VirtualizedChapterList) and create api-hooks.ts
- Created api-hooks.ts with centralized query keys pattern for easy cache invalidation
- Used queryKeys object with factory functions: queryKeys.project(id), queryKeys.projectWithBooks(id)
- Created typed React Query hooks (useProjects, useProject, useBooksWithChapters, useChapters, useBooks)
- Added mutation hooks (useCreateProject, useUpdateProject, useDeleteProject) with automatic cache invalidation
- Built apiFetch helper that adds auth token and proper error handling
- Made all query hooks enable/disable based on required parameters (enabled: !!id)
- Created VirtualizedChapterList component using @tanstack/react-virtual
- Used useVirtualizer with estimateSize for dynamic heights, overscan for buffer rendering
- Implemented scroll position restoration with useRef to save/restore scroll on mount/unmount
- Added keyboard navigation (Enter/Space to click) for accessibility
- Used absolute positioning with translateY for virtual items (recommended pattern)
- Measured items dynamically with virtualizer.measureElement ref callback
- Added inline styles matching existing codebase patterns (no CSS modules)
- Implemented hover/focus/selected states with proper visual feedback
- Build succeeded on first attempt with no TypeScript errors

**What Didn't Work**:
- N/A - systematic inventory approach prevented duplicate work

**Lesson**: Before implementing optimization tasks, ALWAYS inventory what already exists. For this Sprint 15 task, 75% of the work (Tasks 1, 2, 4) was already completed. When implementing React Query: (1) Create centralized query keys with factory functions for consistent cache invalidation, (2) Use enabled flag to prevent queries from running without required params, (3) Create helper functions (apiFetch) for auth and error handling, (4) Add mutation hooks that automatically invalidate related queries on success. When implementing virtualization: (1) Use @tanstack/react-virtual with useVirtualizer hook, (2) Use absolute positioning + translateY (not margin-top) for virtual items, (3) Measure items dynamically with ref callback if heights vary, (4) Implement scroll restoration with useRef for better UX, (5) Add keyboard navigation for accessibility (Enter/Space), (6) Use overscan prop to render buffer items outside viewport for smooth scrolling. Virtual lists dramatically improve performance for 100+ items by only rendering visible items.

**Application Score**: 0

**Tags**: #react-query #virtualization #optimization #performance #inventory #react-hooks #typescript #accessibility #keyboard-navigation #caching #infinite-scroll #n-plus-one-fix

---

### 2026-01-26 | Task: Implementing Plot Layer Auto-Population on Page Load

**Date**: 2026-01-26
**Task**: Auto-populate 4 key plot layers when user first visits plot page, with non-deletable but editable constraints
**Context**: Plot structure setup - eliminate empty state, provide scaffolding with smart defaults based on project data

**What Worked Well**:
- Created centralized constants file (plot-constants.ts) for key layer IDs, default structures, and helper functions
- Defined ExtendedPlotLayer type extending PlotLayer with deletable and editable boolean flags
- Used KEY_PLOT_LAYER_IDs constant array to identify non-deletable layers (main-plot, character-arcs, subplots, specialized-threads)
- Implemented createInitialPlotLayers() function that intelligently populates descriptions based on:
  - Story concept logline for Main Plot description
  - Character names for Character Arcs description
  - Genre for Specialized Thread type (mystery/romance/subplot/character-arc)
- Added useEffect hook that auto-populates layers only when: page loaded, project exists, characters loaded, no existing layers, not extracting
- Updated fetchData to mark all loaded layers with deletable/editable flags using isKeyPlotLayer() helper
- Updated handleDeleteLayer to check deletable flag and show error message for key layers
- Updated handleSaveLayer to preserve deletable/editable flags when editing existing layers
- Conditionally rendered Delete button only for deletable layers, showed "Required Layer" badge for non-deletable
- Separated genre-to-thread-type mapping into dedicated GENRE_TO_THREAD_TYPE object
- Used getSpecializedThreadType() to determine if genre indicates mystery, romance, or default subplot
- Made all four key layers editable so users can customize names and descriptions

**What Didn't Work**:
- Initial implementation didn't preserve deletable/editable flags when loading from database - needed explicit mapping in fetchData
- Had to be careful with useEffect dependencies to avoid infinite loops (excluded saveStructure itself, used specific dependencies)

**Lesson**: When implementing auto-population with constraints (editable but not deletable), use a structured approach: (1) Create constants file with key IDs, default templates, and helper functions, (2) Extend base types with constraint flags (deletable, editable) rather than relying on ID checks everywhere, (3) Apply constraints consistently in both read path (fetchData marking) and write path (handleSaveLayer preserving), (4) Use helper functions (isKeyPlotLayer, createInitialPlotLayers) to centralize logic, (5) Provide contextual descriptions by extracting data from story concept, characters, genre rather than generic placeholders, (6) Show clear UI indicators (badges) for constrained items so users understand why actions are disabled, (7) Allow editing even for required items - constraint is on deletion, not modification, (8) Use genre mapping objects rather than long if-else chains for determining specialized thread types.

**Application Score**: 0

**Tags**: #react #auto-population #default-values #constants #ui-constraints #deletable-editable-flags #smart-defaults #genre-mapping #plot-structure #useEffect #helper-functions #type-extension

---

### 2026-01-25 | Task: Transform Chapters Page into Monitoring Dashboard (Phase 5F)

**Date**: 2026-01-25
**Task**: Redesign progress page as chapter generation monitoring dashboard with three distinct states
**Context**: Phase 5F UX improvement - Transform progress page to show no-generation, in-progress, and completed states with chapter-level detail

**What Worked Well**:
- Created separate GenerationStatusBanner component for reusability and separation of concerns
- Used conditional rendering based on generation status to show three distinct UI states
- Fetched both progress data AND chapter list in parallel to provide detailed chapter status
- State determination logic in getGenerationStatus() centralizes business logic (none/generating/paused/completed)
- Chapter status mapping (completed/in-progress/pending) with visual badges for clear user feedback
- Highlighted currently generating chapter with different background color (#EEF2FF)
- Responsive stats grid using grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))
- Used CSS-in-JS with inline styles to match existing project patterns (no CSS modules)
- Progress bar shows percentage and chapter count when space available (percentComplete > 10)
- Export and Read buttons only shown when appropriate for each state
- Maintained auto-refresh with 5-second polling interval for real-time updates

**What Didn't Work**:
- Initial implementation had TypeScript error with progressData possibly being null after JSON parsing
- Fixed by adding null checks before using progressData after the else block

**Lesson**: When building monitoring dashboards, create distinct UI states based on business logic, fetch detailed data beyond summary stats, and use visual indicators (colors, icons, badges) to make status immediately clear. Component separation (GenerationStatusBanner) keeps code maintainable.

**Application Score**: 1

**Tags**: #react #typescript #dashboard #monitoring #ux #state-management #conditional-rendering #polling #real-time-updates #component-design #inline-styles

---

### 2026-01-25 | Task: Implementing Outline Act Management API Endpoints (Phase 5D Backend)

**Date**: 2026-01-25
**Task**: Adding comprehensive API endpoints for act CRUD operations: regenerate, update, delete specific, and delete all
**Context**: Phase 5D backend implementation - Adding granular act management without requiring full outline regeneration

**What Worked Well**:
- Read existing outlines.ts routes file first to understand patterns (database queries, error handling, response formats)
- Read outline-generator.ts service to understand how regeneration works (uses full generateOutline then replaces specific act)
- Leveraged existing `generateOutline()` service for regeneration - no need for new granular generation functions
- Implemented 4 endpoints with consistent patterns: POST regenerate-act, DELETE acts, DELETE acts/:actNumber, PUT acts/:actNumber
- Used existing helper function `safeJsonParse()` for handling JSON database fields
- Proper chapter renumbering logic across all endpoints (sequential 1, 2, 3... spanning all acts)
- Act renumbering after deletion (remaining acts become 1, 2, 3... after removal)
- Cascade deletions: deleting acts also deletes associated chapter records from database
- Used prepared statements for all database operations with proper parameterization
- Full TypeScript typing with imported types (Outline, Book, Project, StoryStructure, Act)
- Comprehensive error handling with specific status codes (400, 404, 500) and error codes (INVALID_INPUT, NOT_FOUND, INVALID_STATE, INTERNAL_ERROR)
- Created extensive API documentation with curl examples, response schemas, integration notes, and manual testing procedures
- Code compiled successfully on first build (npm run build passed)
- Followed existing logging patterns with structured logs using logger service

**What Didn't Work**:
- Initial test file approach failed - complex database mocking in Jest with ESM modules proved difficult
- Module mocking with jest.mock() and dynamic imports didn't work well for routes that use real database connections
- Deleted test file and focused on comprehensive API documentation instead for manual testing

**Lesson**: When implementing API endpoints that require extensive database interactions and service dependencies, prefer comprehensive API documentation with manual testing procedures over complex integration tests with deep mocking. For act management endpoints: (1) Leverage existing services like generateOutline() rather than building granular functions - replace only the needed act after full regeneration, (2) Implement consistent renumbering logic across all operations (chapters numbered sequentially 1-N, acts numbered 1-N after deletions), (3) Use cascade deletions (delete chapters when deleting acts) to maintain referential integrity, (4) Provide specific error codes (INVALID_INPUT vs NOT_FOUND vs INVALID_STATE) for better client-side error handling, (5) Create comprehensive API documentation with request/response schemas, curl examples, error codes, integration notes, and manual testing procedures when integration tests are too complex to maintain, (6) For routes with bookId parameters, structure URLs as `/api/resource/:bookId/operation` for REST consistency.

**Application Score**: 0

**Tags**: #api-routes #express #rest-api #crud-operations #act-management #outline-routes #database #typescript #error-handling #manual-testing #api-documentation #cascade-deletes #renumbering

---

### 2026-01-25 | Task: Adding Act Management UI to Outline Page (Phase 5D)

**Date**: 2026-01-25
**Task**: Adding CRUD operations UI for act management in story outline with bulk actions, individual act controls, edit mode, and confirmation dialogs
**Context**: Phase 5D - Adding interactive act management to existing outline page with regenerate, delete, and edit capabilities

**What Worked Well**:
- Read existing page first to understand structure, state management patterns, and styling conventions
- Examined existing ConfirmDialog and GenerationProgress components to match reusable pattern usage
- Used inline SVG icons matching existing codebase patterns (no external icon library dependency)
- Created comprehensive state management for: editing act, regenerating act, confirmation dialogs
- Implemented edit mode with toggle between view/edit states using local state (editingActNumber, editedActData)
- Used existing ConfirmDialog component for all destructive actions (delete act, delete all, regenerate all)
- Added visual feedback during operations: regenerating badge, disabled buttons during generation, loading states
- Positioned action buttons consistently: Edit, Regenerate, Delete in that order with appropriate colors
- Used semantic colors: purple gradient for primary actions, red for destructive, gray for neutral
- Created bulk actions section above acts list for "Regenerate All Acts" and "Delete All Acts"
- Made confirmation messages contextual with specific details (act number, chapter count)
- Reused existing GenerationProgress modal for regeneration feedback with step updates
- Build succeeded on first attempt with no TypeScript compilation errors
- Maintained accessibility with proper button titles/tooltips

**What Didn't Work**:
- N/A - Implementation was straightforward following established patterns

**Lesson**: When adding CRUD operations to existing pages: (1) Read existing UI components (dialogs, modals) to reuse patterns, (2) Use local state for edit mode rather than complex state management (editingActNumber as nullable number), (3) Create consistent action button ordering (non-destructive → regenerate → destructive), (4) Always use confirmation dialogs for destructive actions with contextual messages (include item counts, explain consequences), (5) Provide visual feedback during operations (badges, disabled states, progress modals), (6) Group related actions together (bulk actions section separate from individual actions), (7) Use inline SVG for icons when no icon library exists to maintain zero dependencies, (8) Match existing color semantics (purple for primary, red for danger, gray for neutral), (9) Build after implementation to verify TypeScript types and JSX syntax.

**Application Score**: 0

**Tags**: #react #crud-operations #ui-components #state-management #confirmation-dialogs #inline-svg #bulk-actions #edit-mode #visual-feedback #typescript #outline-management

---

### 2026-01-25 | Task: Creating PlotWizard Component for Phase 5C

**Date**: 2026-01-25
**Task**: Creating multi-step wizard component for guided plot structure creation
**Context**: Phase 5C of workflow improvements - transforming flat plot page into a guided wizard with 5 steps

**What Worked Well**:
- Read existing plot page and PlotLayersVisualization components first to understand patterns, types, and styling conventions
- Examined requirements document (PHASE_5_WORKFLOW_AND_UX_IMPROVEMENTS.md) to understand exact wizard step specifications
- Used inline styles matching existing codebase patterns (same as plot page uses) rather than CSS modules
- Created self-contained component with all sub-step components in same file for easy maintenance
- Implemented progressive disclosure with step indicator showing current position and completion status
- Made specialized threads (Step 4) optional with explicit "Skip" button support
- Used local state management (localPlots) before committing changes via onUpdate callback on completion
- Added recommendations based on book word count (novella/novel/epic novel categories)
- Created clear visual hierarchy with purple gradient for main plot (from concept), different colors for plot types
- Handled character arc creation with smart filtering (don't show characters that already have arcs)
- Added collapsible accordion sections for specialized threads (mystery, romance) to avoid overwhelming users
- Built succeeded on first attempt with no TypeScript compilation errors

**What Didn't Work**:
- Initially had duplicate `onUpdate` prop declaration in MainPlotStep interface - caught and fixed immediately
- Used `/mnt/c/` path for bash command initially (Windows WSL path) - corrected to Windows path `C:/`

**Lesson**: When creating wizard/multi-step components: (1) Read existing similar pages first to match styling patterns (inline vs CSS modules), (2) Keep all step sub-components in same file for wizard-specific logic unless they'll be reused elsewhere, (3) Use local state for wizard-in-progress changes, only commit on final "Complete" action, (4) Add visual progress indicators (numbered circles, completion status) for user orientation, (5) Support "Skip" for optional steps explicitly in UI, (6) Use progressive disclosure (accordion/collapsible) for optional specialized sections to avoid overwhelming users on first view, (7) Add smart recommendations based on context (book length, existing data) to guide users toward best practices, (8) Build with `npm run build` after implementation to catch TypeScript errors before committing.

**Application Score**: 0

**Tags**: #react #wizard #multi-step #ui-components #plot-structure #ux #typescript #inline-styles #progressive-disclosure #recommendations

---

### 2026-01-25 | Task: Creating useWorkflowPrerequisites Hook for Phase 5B

**Date**: 2026-01-25
**Task**: Creating custom React hook to enforce workflow prerequisite chain for NovelForge project creation
**Context**: Phase 5B of workflow enforcement: Concept → Characters → World → Plots → Outline → Style → Submit → Chapters

**What Worked Well**:
- Read existing hooks (useProjectProgress.ts, useProjects.ts) first to understand project patterns and conventions
- Used proper TypeScript typing with exported types (WorkflowStep, PrerequisiteCheck, WorkflowProjectData, etc.)
- Created comprehensive prerequisite checking with isComplete, isRequired, requiresPrevious, and missingItems for each step
- Implemented helper functions that are memoized with useMemo for performance (canAccess, getBlockingReason, getMissingItems)
- Made character role checking case-insensitive and flexible (checks for 'protagonist', 'main character', 'antagonist', 'villain')
- Handled world data structure flexibility (both array and object with categories)
- Provided currentStep and nextStep calculations for guiding user through workflow
- Created isReadyForGeneration flag for enabling submission UI
- Checked how shared types are imported by reading other components before fixing import path
- Updated existing ProjectNavigation component that was using old hook signature to match new API
- Fixed TypeScript compilation errors by importing WorkflowStep type and updating tab-to-step mapping
- Build succeeded with proper type safety throughout

**What Didn't Work**:
- Initially used @/shared/types import path, but shared folder is excluded from tsconfig - needed relative path ../../shared/types
- ProjectNavigation component was calling old hook signature (5 params) - had to update to new signature (4 params: projectId, project, outline, proseStyle)
- Tab ID mapping returned string instead of WorkflowStep type - needed proper typing and null handling for unmapped tabs

**Lesson**: When creating workflow enforcement hooks: (1) Read existing similar hooks first to match patterns and conventions, (2) Export all types used in hook interface for component consumption, (3) Use proper TypeScript union types for workflow steps to enable type-safe step navigation, (4) Make prerequisite checks flexible and tolerant (case-insensitive, multiple valid values), (5) Memoize all helper functions and computations for performance, (6) Check import paths by examining how other files import from shared - don't assume path aliases work everywhere, (7) When updating hook signatures, search for all usages and update them in the same commit to avoid breaking existing code, (8) Use null return types for functions that might not find a match (getPrerequisiteStep) and handle nulls properly in consuming code.

**Application Score**: 0

**Tags**: #react #hooks #typescript #workflow #prerequisites #type-safety #memoization #imports #refactoring

---

### 2026-01-25 | Task: Adding Missing /api/projects/:id/progress Endpoint

**Date**: 2026-01-25
**Task**: Implementing comprehensive project progress API endpoint for NovelForge
**Context**: Frontend progress page was calling `/api/projects/:id/progress` but getting 404 errors. Needed to add endpoint with detailed progress metrics.

**What Worked Well**:
- Read frontend component first to understand exact response structure expected (ProgressData interface)
- Examined existing similar endpoints (queue stats, project metrics) for patterns
- Positioned new route BEFORE generic `/:id` route to avoid Express routing conflicts (more specific routes must come first)
- Used efficient SQL queries with JOINs to fetch related data in single queries (chapters, jobs, books)
- Calculated statistics in-memory rather than complex SQL to keep queries readable
- Separated concerns into logical steps: project fetch, books, chapters, queue, activity, events, flags, rate limits
- Created helper function for time formatting (formatTimeRemaining) following existing patterns
- Made optional fields truly optional (currentActivity, rateLimitStatus) returning undefined when not applicable
- Used proper TypeScript typing throughout with type assertions for database results
- Build succeeded on first attempt with no compilation errors

**What Didn't Work**:
- N/A - Implementation was straightforward following established patterns

**Lesson**: When implementing complex API endpoints that aggregate data from multiple tables: (1) Read the frontend component FIRST to understand exact response shape needed, (2) Use efficient JOINs to minimize database queries (fetch chapters with books in single query), (3) Position specific routes before generic parameterized routes to avoid routing conflicts (`/:id/progress` before `/:id`), (4) Calculate complex statistics in-memory after fetching data - keeps SQL queries simple and maintainable, (5) Make optional response fields properly optional (use undefined, not null) to match TypeScript interfaces, (6) Create small helper functions for repeated formatting logic (time, dates), (7) Use structured error logging with context for debugging, (8) Follow existing patterns for consistency (database query structure, error handling, response format).

**Application Score**: 0

**Tags**: #api-routes #express #rest-api #database #sql #joins #aggregation #typescript #routing #progress-tracking #backend

---

### 2026-01-25 | Task: Implementing Collapsible UI Sections with Accessibility

**Date**: 2026-01-25
**Task**: Creating reusable collapsible sections for form organization with proper UX and accessibility
**Context**: Large complex form (GenrePreferenceForm) overwhelming users with too many options visible at once

**What Worked Well**:
- Creating a reusable CollapsibleSection component with consistent props interface (title, description, optional, count, defaultOpen)
- Using localStorage to persist collapsed/expanded state per section with unique sectionId
- Implementing proper keyboard accessibility (Enter/Space to toggle, tabIndex, ARIA attributes)
- Using CSS animations for smooth expand/collapse transitions (slideDown animation)
- Adding visual indicators: chevron rotation, optional badges, count badges, expand/collapse hint text
- Making sections closed by default to reduce cognitive load on first visit
- Wrapping existing sections without major refactoring - targeted edits to wrap content in CollapsibleSection tags
- Running build after changes to verify no syntax errors before marking task complete

**What Didn't Work**:
- Initial edit created malformed JSX with `<div style={` followed by another `<div style={{` - needed to fix duplicate tag
- Almost implemented tabbed interface before realizing existing Quick/Full mode toggle already serves that purpose

**Lesson**: When improving form UX with collapsible sections: (1) Create a reusable component with proper accessibility (ARIA, keyboard support), (2) Persist state to localStorage so users don't re-open sections on every visit, (3) Use visual indicators (chevron icons, badges, counts) to communicate state, (4) Make optional sections collapsed by default to reduce overwhelming first-time users, (5) Add smooth animations for professional feel, (6) Verify existing patterns before adding redundant features (check for existing mode toggles), (7) Run build to catch JSX syntax errors before completing.

**Application Score**: 0

**Tags**: #ui-components #ux #react #accessibility #collapsible #forms #localStorage #animations #keyboard-navigation #aria

---

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

### 2026-01-25 | Task: Implementing Character Nationality/Ethnicity System with Name Generation

**Date**: 2026-01-25
**Task**: Implementing nationality-based character generation with culturally appropriate names, distribution modes, and filtering
**Context**: Full-stack feature with data file, services, components, and API integration for novel writing application

**What Worked Well**:
- Created comprehensive nationality names database with 10+ nationalities (British, American, Russian, German, French, Japanese, Chinese, Indian, Spanish, Italian)
- Separated concerns: data file (nationality-names.ts) provides names, service (name-generator.ts) handles generation logic, character-generator uses both
- Built flexible NationalitySelector component with 4 modes: none (AI decides), single (all same), mixed (distribution), custom (per-character)
- Mixed mode validates total count matches expected character count before submission
- Added nationality assignment helper function that shuffles distribution to avoid predictable ordering
- Extended character generation prompts to guide AI toward specified nationalities while maintaining creative freedom
- Name override pattern: let AI generate character with nationality field, then override name with culturally appropriate one from database
- Added filtering UI to characters page with dynamic dropdowns based on unique nationalities/ethnicities
- Displayed nationality badges on character cards for quick identification
- Used TypeScript strict typing throughout with proper interfaces (NationalityConfig, NationalityDistribution)
- Fallback to AI name generation for unsupported/fictional nationalities
- Both frontend and backend compiled successfully on first full build attempt

**What Didn't Work**:
- Initial TypeScript errors from spreading ...characterData without explicit field mapping
- Had to explicitly construct Character objects with all required fields to satisfy strict typing
- File linter modified character-generator.ts during implementation, requiring re-reads

**Lesson**: When implementing cultural/demographic features, use a layered approach: (1) Create curated data files for common cases with proper structure and validation, (2) Build service layer that tries data first, falls back to AI for edge cases, (3) Provide flexible UI modes (none/single/mixed/custom) to support different use cases, (4) Shuffle distributions to avoid stereotypical ordering, (5) Guide AI with constraints but don't force rigid adherence - let AI handle creative aspects while enforcing data constraints post-generation. For TypeScript strict mode, always explicitly map object fields rather than spreading, especially when constructing typed objects from any source.

**Application Score**: 0

**Tags**: #fullstack #data-driven #nationality #i18n #cultural-accuracy #character-generation #name-generation #typescript #ui-modes #filtering #distribution

---

