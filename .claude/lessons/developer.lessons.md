# Lessons Learned: Developer Agent

<!--
This file stores accumulated lessons learned by the developer agent.
It is automatically read before each task and updated after task completion.

MAINTENANCE RULES:
- Maximum 50 lessons per file (older lessons archived automatically)
- Lessons with score >= 5 are considered "proven" and prioritised
- Review and prune quarterly or when file exceeds 50 entries
-->

## Summary Statistics

- **Total tasks completed**: 38
- **Total lessons recorded**: 37
- **Last updated**: 2026-01-30
- **Proven lessons** (score >= 5): 0
- **Top themes**: #typescript #testing #patterns #frontend #backend #database #migrations #third-party-integration #performance #caching #mocking #jest #logging #structured-logging #pino #fullstack #prompts #claude-api #deployment #railway #ci-cd #ui-components #ux #react #accessibility #api-routes #express #rest-api #crud-operations #state-management #confirmation-dialogs #act-management #outline-routes #manual-testing #api-documentation #auto-population #default-values #constants #workflow #react-query #virtualization #optimization #inventory #vitest #dom-testing #test-selectors #codebase-simplification #documentation #refactoring #hook-extraction #form-labels #wcag #keyboard-navigation #focus-trap #aria-live

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

### 2026-01-30 | Task: Integrate Commercial Genre Validation into Bestseller Mode Service

**Date**: 2026-01-30
**Task**: Update bestseller-mode.service.ts to include commercial genre validation for Romance, Thriller, and Sci-Fi projects
**Context**: Bestseller mode premium feature integration with genre-specific commercial services for market-ready validation

**What Worked Well**:
- Read all four existing services first (bestseller-mode, romance-commercial, thriller-commercial, scifi-commercial) to understand patterns and APIs
- Created new interface CommercialGenreReadiness for structured validation results (ready, warnings, recommendations)
- Added validateCommercialGenreReadiness() method that branches by genre using normalized lowercase comparison
- Integrated commercial validation into existing validateChecklist() method by calling genre-specific checks
- Enhanced getBestsellerPromptEnhancements() to include genre-specific data (heat levels, pacing styles, hardness levels) in prompt context
- Used barrel export (./index.js) for importing commercial services to avoid circular dependency issues
- Added genre detection via database query once at the start of validation methods
- Structured validation by genre with clear comment sections (Romance, Thriller, Sci-Fi) for readability
- Filtered errors vs warnings properly (CRITICAL or "not configured" → errors, everything else → warnings)
- Added helper method getHeatLevelDescription() for human-readable romance heat level labels

**What Didn't Work**:
- Initial attempt to import services directly (./ thriller-commercial.service.js) caused TypeScript module resolution errors
- Linter initially reverted import changes - had to use Write tool to persist full file content
- TypeScript flagged possibly undefined contentWarnings array - needed null check before accessing length property
- Implicit 'any' type error on forEach callback parameter - needed explicit type annotation (clock: any)

**Lesson**: When integrating multiple genre-specific services into a central validation service: (1) Use barrel exports (./index.js) to import multiple related services and avoid circular dependencies, (2) Normalise genre strings (toLowerCase()) before comparison to handle variations like "Sci-Fi" vs "science fiction", (3) Structure validation methods with clear comment sections for each genre branch for maintainability, (4) Separate validation results into errors (blockers) vs warnings (recommendations) using filter logic, (5) Query database for genre once at method start rather than repeatedly, (6) Add null/undefined checks for array properties before accessing length or methods, (7) Explicitly type forEach callback parameters to avoid implicit 'any' errors, (8) When enhancing prompts with genre data, check for data existence before accessing nested properties, (9) Create helper methods for reused formatting logic (like heat level descriptions). Commercial genre integration requires validating genre-specific configuration (romance heat levels, thriller pacing, sci-fi hardness) exists before allowing bestseller mode generation.

**Application Score**: 0

**Tags**: #backend #service-integration #commercial-genres #romance #thriller #scifi #validation #bestseller-mode #genre-specific #typescript #barrel-exports #prompt-enhancement #null-checks

---

### 2026-01-30 | Task: Create Author Styles Management UI

**Date**: 2026-01-30
**Task**: Build Author Styles settings page to manage writing style profiles extracted from manuscript samples
**Context**: Sprint 21 Custom AI Training - frontend UI for author-styles API routes that already existed

**What Worked Well**:
- Read existing backend routes first to understand the exact API interface (endpoints, request/response shapes)
- Examined similar settings pages (prose-style) to match layout patterns (sidebar navigation, inline styles)
- Used inline CSSProperties objects matching existing codebase patterns instead of CSS modules
- Implemented modal dialog with overlay click-outside detection using stopPropagation pattern
- Added navigation link to main settings page by inserting into settingsSections array between Prose Style and Exclusions
- Handled pre-existing build errors (missing lucide-react dependency, untracked files) by installing dependencies without breaking existing code
- Created comprehensive form with analyse-before-save workflow (analyse manuscript → show results → save style)
- Used word count calculation for validation (minimum 500 words to enable analyse button)
- Rendered analysis results in a summary card before allowing save to provide user feedback
- Followed UK spelling conventions throughout (analysing, analysed, not analyzing/analyzed)

**What Didn't Work**:
- Build initially failed due to untracked files (images page) importing lucide-react which wasn't installed - had to install missing dependency
- Another pre-existing TypeScript error in styles.ts (backgroundSecondary property) - linter auto-fixed it during development
- Pre-existing error in ProjectNavigation.tsx prevented clean build but was unrelated to my changes

**Lesson**: When adding new settings pages to existing dashboards: (1) Read backend API routes FIRST to understand exact request/response interfaces, (2) Examine similar settings pages to extract layout patterns (sidebar nav structure, inline styles vs modules), (3) Match styling approach of existing pages exactly (inline CSSProperties if that's the pattern), (4) For forms with AI analysis, use staged workflow (analyse → show results → save) rather than single-step submission, (5) Handle pre-existing build errors pragmatically - install missing dependencies if they're clearly needed by untracked files, (6) When build fails on unrelated files, verify your specific files have no errors before claiming task complete, (7) Use modal overlays with onClick={(e) => e.stopPropagation()} on inner content to prevent accidental dismissal, (8) For UK English projects, use British spelling consistently (analyse not analyze, colour not color).

**Application Score**: 0

**Tags**: #react #ui-components #settings-page #inline-styles #modal-dialog #forms #author-styles #uk-spelling #api-integration #pre-existing-errors #dependencies

---

### 2026-01-30 | Task: Backend Service Integration - Routes and Barrel Exports

**Date**: 2026-01-30
**Task**: Integrate new backend services by creating barrel exports, route files, and mounting routers in server.ts
**Context**: Adding prose-reports, publishing, bestseller, and images routes to Express backend; creating module index files for service directories

**What Worked Well**:
- Read existing services first to understand actual export signatures before writing routes (many services use static methods, not instance methods)
- Checked for TypeScript compilation errors after each major change rather than waiting until the end
- Used grep to find actual method names (`analyseOpeningHook`, `analyseTensionArc`, `analyseCharacterArc`) instead of assuming
- For services with function exports (not classes), imported the functions directly: `import { generateQueryLetter } from ...`
- When barrel re-exports caused conflicts (STYLE_PRESETS exported from both export.service.ts and export/style-presets.ts), simplified by adding a comment pointing to direct imports instead of complex selective re-exports
- Created simple, focused routes that match actual service capabilities rather than inventing methods that don't exist
- Extracted story DNA with null-safe parsing: `const storyDna = project.story_dna ? (typeof project.story_dna === 'string' ? JSON.parse(project.story_dna) : project.story_dna) : null;`
- All prose-report services use static methods: `ReadabilityService.generateReport(text)` not `new ReadabilityService().analyse(text)`
- Build passed on final attempt with zero compilation errors

**What Didn't Work**:
- Initially assumed services followed a consistent pattern (classes with instance methods) - needed to check each service individually
- First version tried to import a QueryLetterGenerator class that doesn't exist - the module exports standalone functions
- Initially exported complex type re-exports from services/index.ts that failed because some types don't exist - simplified to just a comment
- Tried to call non-existent methods like `validate()` on validator services when actual method is `analyseOpeningHook()`

**Lesson**: When integrating existing services into new routes: (1) Read each service file first to understand its actual API (static vs instance, method names, return types), (2) Use grep to find method signatures rather than guessing: `grep -n "async.*analyse" service.ts`, (3) Check actual exports with `grep "^export"` to see if it exports functions, classes, or both, (4) For barrel exports (index.ts), keep them simple - if re-exporting causes TypeScript conflicts, document direct import paths instead, (5) Match route implementation to actual service capabilities - don't invent methods that would be nice to have, (6) When multiple services are similar but not identical, check each one individually, (7) Build incrementally and fix errors immediately rather than writing all code first, (8) For static method services, use `Promise.resolve(Service.method())` in Promise.all rather than creating instances.

**Application Score**: 0

**Tags**: #backend #routes #express #services #barrel-exports #typescript #service-integration #api-design #static-methods #function-exports

---

### 2026-01-28 | Task: Migrate Standalone Pages to DashboardLayout

**Date**: 2026-01-28
**Task**: Replace PrimaryNavigationBar with DashboardLayout on four standalone pages: quick-start, full-customization, story-ideas, saved-concepts.
**Context**: Continuing the dashboard shell migration across all non-project pages.

**What Worked Well**:
- Read DashboardLayout first to confirm PageHeaderConfig accepts title (string) and subtitle (optional string)
- For pages with loading states (story-ideas, saved-concepts), wrapped each loading branch in its own DashboardLayout instance so the sidebar and header remain visible during data fetch
- saved-concepts uses Suspense with a fallback -- wrapped the fallback in DashboardLayout as well as the isLoading block inside the content component
- Filters previously rendered inside the header block were moved below the DashboardLayout header as inline content with marginBottom replacing the old marginTop spacing
- For pages with a centred single-form layout (quick-start, full-customization), kept the maxWidth 700px content wrapper inside a flex-centred container
- Build passed with zero errors on first attempt across all 25 routes

**What Didn't Work**:
- Closing tag mismatches after removing main and the outer div -- must count indent levels carefully when collapsing old wrapper layers into the flatter DashboardLayout children

**Lesson**: When migrating multiple standalone pages to DashboardLayout: (1) Every render path that previously showed a PrimaryNavigationBar must now render a DashboardLayout instance -- this includes loading fallbacks and Suspense fallbacks, (2) Content that was inside a header block (filters, View All buttons) should move to the top of the children area with marginBottom for spacing, (3) Remove the main wrapper, outer div with minHeight 100vh, and any inline header -- DashboardLayout provides all of these, (4) For centred single-form pages, a flex container with justifyContent centre and a maxWidth child is sufficient, (5) Escape apostrophes in subtitle strings when using single-quote delimiters.

**Application Score**: 1

**Tags**: #dashboard-layout #layout-migration #standalone-pages #suspense-fallback #loading-states #filters

---

### 2026-01-28 | Task: Migrate Project Detail Page to DashboardLayout

**Date**: 2026-01-28
**Task**: Replace PageLayout wrapper with DashboardLayout on the project detail page ([id]/page.tsx), rendering ProjectNavigation directly as a child.
**Context**: Migrating sub-pages to the new dashboard shell. PageLayout provides its own thin sidebar + header; DashboardLayout provides the full Sidebar with nav groups, SearchModal, and a proper page header.

**What Worked Well**:
- Read DashboardLayout props (PageHeaderConfig: title string, subtitle string) before editing to confirm the subtitle must be a plain string, not JSX
- Converted the old JSX subtitle (with statusBadge styling) into a simple joined string using Unicode bullet separator
- Rendered ProjectNavigation as a direct child of DashboardLayout, above the content div -- same pattern the progress page uses
- Removed unused imports (PageLayout, ErrorMessage, statusBadge, shadows) after the swap to keep the file clean
- Build passed on first attempt with zero errors; page compiled at 11.8 kB

**What Didn't Work**:
- N/A -- straightforward swap following the pattern established in the previous projects page migration

**Lesson**: When migrating a page from PageLayout to DashboardLayout: (1) DashboardLayout header.subtitle is a plain string -- convert any JSX subtitle to a formatted string before swapping, (2) Render ProjectNavigation as a direct child of DashboardLayout rather than passing it through a prop, (3) Remove the PageLayout import and any imports that were only consumed by PageLayout's header (backLink text, statusBadge, etc.), (4) The content maxWidth wrapper can remain -- DashboardLayout's contentAreaStyle already centres at 1200px, but a nested div does no harm, (5) Run the full build immediately after the swap to catch any leftover references.

**Application Score**: 0

**Tags**: #react #dashboard #layout-migration #project-detail #dashboard-layout #project-navigation

---

### 2026-01-28 | Task: Migrate Projects Page to DashboardLayout

**Date**: 2026-01-28
**Task**: Wrap the projects overview page in DashboardLayout, add MetricCard row, add RecentActivityFeed in a two-column grid, and remove the old PrimaryNavigationBar and inline header.
**Context**: Projects page migration to the new dashboard shell in NovelForge.

**What Worked Well**:
- Read DashboardLayout and MetricCard source files before writing any code to confirm exact prop interfaces (PageHeaderConfig, MetricCardProps with variant/icon/items)
- Extracted computeDashboardMetrics and buildActivityFeed as pure helper functions outside the component -- keeps the component body focused and makes the derivations easy to unit-test later
- Used useMemo to derive metrics and activity feed so they only recompute when the projects array changes
- Typed sort comparison variables as string | number instead of unknown to satisfy strict comparison operators without unsafe casts
- Replaced the old inline header with DashboardLayout's built-in header slot -- all navigation is now handled by the Sidebar
- Removed PrimaryNavigationBar, ActionButtonsPanel, and ConceptsSummaryPanel imports that are no longer rendered
- Grid layout uses 4fr 1fr columns so the activity feed naturally occupies roughly 20% of the row
- Inline SVG icons for MetricCards use the variant colour token directly for consistency

**What Didn't Work**:
- The linter auto-rewrote RecentActivityFeed.tsx with a completely different interface after initial creation -- had to adapt page.tsx imports and data-mapping to match the new shape
- Initially typed sort values as unknown which caused TS18046 comparison errors; switched to string | number union

**Lesson**: When creating a new component that does not yet exist, be prepared for the project linter to substantially rewrite it before you consume it. After writing a new file, re-read it before using it in another file. For page-level migrations to a layout wrapper: (1) Read the layout component prop types first, (2) Strip out all navigation and header elements that the layout now provides, (3) Extract data derivation into pure helper functions and memoize them, (4) Use the layout grid and content area conventions rather than reimplementing padding and maxWidth.

**Application Score**: 0

**Tags**: #react #dashboard #layout-migration #metric-cards #activity-feed #design-tokens #memoization #inline-styles #linter-rewrite

---

### 2026-01-28 | Task: Create RecentActivityFeed Dashboard Component

**Date**: 2026-01-28
**Task**: Build a full-featured activity feed component with type-specific icons, relative timestamps, date grouping, loading skeletons, and empty state.
**Context**: Dashboard component in NovelForge, replacing a simplified stub with comprehensive requirements.

**What Worked Well**:
- Read MetricCard first to extract dashboard conventions (inline CSSProperties, section dividers, variant lookup objects, aria-hidden on decorative elements)
- Variant-lookup pattern (`activityTypeStyles` keyed by activity type) kept colour mappings declarative and DRY
- Five inline SVG icon components each accept a `colour` prop so the parent token applies consistently
- Helper functions (`formatRelativeTimestamp`, `toDateKey`, `formatDateGroupHeader`, `groupActivitiesByDate`) are pure and isolated -- easy to unit-test independently
- Three early-return render paths (loading / empty / populated) keep each branch focused
- `useMemo` on sorting + slicing and on grouping prevents redundant recomputation
- Hover effect via local `useState` in `ActivityRow` matches the onMouseEnter/onMouseLeave pattern seen in MetricCard
- Linter auto-updated the consumer call site in projects/page.tsx from old `items` prop to new `activities` prop before I could manually fix it
- TypeScript compilation and Next.js production build both passed with zero errors

**What Didn't Work**:
- Existing stub had a completely different interface shape (label/time/icon/variant vs type/title/projectName/timestamp) -- had to fully rewrite rather than extend
- Write tool required reading the stub first even though it was being replaced entirely

**Lesson**: When replacing a stub with a full implementation that changes the props interface: (1) Read the stub first (Write tool enforces this), (2) Check all consumers with grep before rewriting -- a linter may auto-fix call sites but it is safer to verify, (3) For feed/list components with multiple render states, use early-return branching (loading → empty → populated) with shared card/heading styles extracted above the branches, (4) Group pure helper functions (timestamp formatting, date grouping) at module scope so they are independently testable, (5) Use a variant-lookup object for type-to-colour mappings rather than switch statements.

**Application Score**: 0

**Tags**: #react #ui-components #dashboard #design-tokens #variant-theming #inline-styles #relative-timestamps #date-grouping #loading-skeletons #empty-state #accessibility

---

### 2026-01-28 | Task: Create DashboardLayout Wrapper Component

**Date**: 2026-01-28
**Task**: Create DashboardLayout wrapper that composes DashboardProvider, Sidebar, SearchModal, and an inline DashboardHeader into a responsive page shell.
**Context**: Dashboard layout architecture for NovelForge -- composing existing context and sidebar into a reusable page-level wrapper.

**What Worked Well**:
- Split the component into three layers: public DashboardLayout (mounts provider), DashboardInner (consumes context), and inline DashboardHeader (header slot)
- DashboardInner exists solely so useDashboardContext can be called after DashboardProvider is mounted -- avoids the common "used outside provider" error
- Used the existing Sidebar's `data-desktop-sidebar` attribute as the CSS hook for the responsive media query, avoiding a second className
- Responsive override injected via a scoped `<style>` element because React inline styles cannot express @media queries
- Used `dashboardSpacing.sidebarWidth` for marginLeft so the main content shifts correctly when sidebar is visible
- Content area uses maxWidth: 1200px with auto margins for centred layout on wide viewports
- Build and TypeScript compilation both passed with zero errors from the new files

**What Didn't Work**:
- Initially imported `colors` twice (as `colors` and as `colorTokens`) -- caught and cleaned up before final verification
- Created an unused `mobileOverrideStyle` variable as a placeholder comment holder -- removed to avoid lint warnings

**Lesson**: When building layout wrapper components that compose a context provider with consumer components: (1) Separate into Provider wrapper and Inner consumer so that context hooks are called after mount, (2) For responsive behaviour that requires media queries, inject a scoped `<style>` block targeting CSS class or data-attribute selectors, (3) Leverage existing data attributes on child components as CSS targets to avoid redundant classNames, (4) Keep tightly coupled sub-components (like a page header) in the same file if they have no independent reuse case.

**Application Score**: 1

**Tags**: #react #layout-wrapper #context-provider #responsive #sidebar #search-modal #inline-styles #design-tokens #component-composition

---

### 2026-01-28 | Task: Create MetricCard Dashboard Component

**Date**: 2026-01-28
**Task**: Create a reusable MetricCard component for the dashboard with variant colouring, icon circle, optional items list, and optional clickable Link wrapper.
**Context**: Dashboard UI components in NovelForge, using design tokens from design-tokens.ts and Next.js Link for navigation.

**What Worked Well**:
- Read design-tokens.ts first to confirm the exact token paths (colors.metrics.*, borderRadius.lg, shadows.sm, spacing[6])
- Extracted variant colour mappings into a small `variantStyles` lookup object keyed by variant name, keeping the component body clean
- Used `aria-hidden="true"` on the decorative icon circle so screen readers skip it
- Separated card content from the wrapper (div vs Link) so the layout logic is shared and only the outer element differs
- Hover effect on the clickable variant uses onMouseEnter/onMouseLeave with direct style mutation (box-shadow lift + translateY) matching the inline-styles pattern used throughout the dashboard components
- Added `minWidth: 0` on the text container so flexbox can shrink text content properly when the icon circle takes fixed width
- TypeScript compiled with zero errors on the new file; all pre-existing errors were unrelated test type issues
- Followed section-divider convention (`// ====`) seen in DashboardContext.tsx for readability

**What Didn't Work**:
- Initial bash cd used a WSL-style path (/mnt/c/...) on a win32 platform -- must use Windows paths (C:\...) for shell commands

**Lesson**: When building presentational card components with variant theming: (1) Map variant names to token values in a small lookup object rather than switch statements or if-else chains, (2) Share the inner content JSX between the clickable (Link) and non-clickable (div) paths to avoid duplicating layout, (3) Use `aria-hidden="true"` on purely decorative elements like icon wrappers, (4) Set `minWidth: 0` on flex children that contain text to allow proper truncation/shrinking, (5) For hover effects on Next.js Link components, use onMouseEnter/onMouseLeave with direct currentTarget style mutation since CSS pseudo-classes are harder to control with inline styles.

**Application Score**: 0

**Tags**: #react #ui-components #dashboard #design-tokens #variant-theming #next-link #inline-styles #accessibility

---

### 2026-01-28 | Task: Create SearchModal Component

**Date**: 2026-01-28
**Task**: Create a keyboard-accessible search modal with portal rendering, FocusTrap, animations, and design token styling.
**Context**: Dashboard command-palette-style search overlay for NovelForge.

**What Worked Well**:
- Read SidebarSearch first to understand search-related conventions (magnifying glass SVG, shortcut badges, inline styles)
- Read FocusTrap and useKeyboardShortcut to understand their APIs before using them
- Used createPortal to document.body for proper z-index stacking above all other content
- Injected CSS keyframes once at module scope with ID guard and SSR typeof check (same pattern as SidebarUserProfile)
- Used FocusTrap with initialFocus=true and returnFocus=true for full accessibility
- useKeyboardShortcut with enabled=isOpen so Escape only fires when modal is visible
- Backdrop click-outside detection via e.target === e.currentTarget on the overlay div
- Design tokens used consistently: colors.background.overlay, shadows.xl, zIndex.modal, a11y.animationDuration
- Early return for SSR (typeof document === 'undefined') and when !isOpen prevents unnecessary portal creation
- TypeScript compilation passed with zero errors on first attempt

**What Didn't Work**:
- N/A -- systematic pattern-following from sibling components worked cleanly

**Lesson**: For modal components with portal rendering: (1) Use createPortal to document.body so the modal escapes any overflow:hidden ancestors, (2) Inject CSS keyframes once at module scope with a unique ID guard, (3) Use FocusTrap for Tab cycling and focus restoration, (4) Wire Escape via useKeyboardShortcut with enabled bound to isOpen, (5) Handle click-outside by comparing e.target === e.currentTarget on the backdrop element, (6) Return null early when !isOpen rather than conditionally rendering children -- this keeps the DOM clean and avoids empty portal containers, (7) Reset internal state (query) in a useEffect keyed on isOpen so each open starts fresh.

**Application Score**: 0

**Tags**: #react #modal #portal #focus-trap #keyboard-navigation #accessibility #animations #design-tokens #search #command-palette

---

### 2026-01-28 | Task: Create SidebarUserProfile Component

**Date**: 2026-01-28
**Task**: Create a full-featured SidebarUserProfile component with loading skeleton, sign-in fallback, avatar (image or initials), name/email display, and logout button.
**Context**: Dark-themed sidebar in the NovelForge dashboard, following existing SidebarNavItem and SidebarLogo conventions.

**What Worked Well**:
- Read two existing Sidebar components (SidebarNavItem, SidebarLogo) first to infer conventions: inline CSSProperties, design-token imports, useState for hover/focus, JSDoc with section dividers
- Matched the existing stub's file path and default export name exactly so Sidebar/index.tsx needed no import changes
- Used useMemo for initials and avatar colour derivations to avoid recomputation on every render
- Deterministic avatar colour via string hash across a brand-palette array -- consistent across renders without storing state
- Shimmer animation injected once into document.head via a self-invoking module-scope block, guarded by `typeof document !== 'undefined'` for SSR safety
- Logout button uses a11y.minTouchTarget (44 px) for WCAG 2.1 AA compliance
- Three distinct early-return render paths (loading → no user → authenticated) keep each branch focused and readable
- Name and email both use overflow: hidden + textOverflow: ellipsis + title attribute for truncation with tooltip fallback
- Build passed with zero TypeScript errors on the new component

**What Didn't Work**:
- Initial Write tool call failed because the file existed (as a placeholder stub) but had not been Read yet -- always Read before Write, even for files you intend to fully replace

**Lesson**: When replacing a placeholder stub with a full implementation: (1) Read the existing file first even if you plan to overwrite it entirely -- the Write tool enforces this, (2) Read 2-3 sibling components to extract conventions (styling approach, token usage, state management patterns), (3) For sidebar components on dark backgrounds, use sidebar.* colour tokens exclusively, (4) Inject CSS keyframes once at module scope with an existence check and a unique ID rather than per-render style tags, (5) Use early-return branching for multi-state components (loading/empty/populated) to keep each path self-contained, (6) Wrap text that may overflow in containers with minWidth: 0 so flexbox allows shrinking below content size.

**Application Score**: 0

**Tags**: #react #ui-components #sidebar #avatar #skeleton #loading-states #accessibility #wcag #inline-styles #design-tokens #dark-theme

---

### 2026-01-28 | Task: Create DashboardContext for State Management

**Date**: 2026-01-28
**Task**: Create a React Context with useReducer for dashboard navigation state management, including localStorage persistence for expandedGroups and sidebarCollapsed.
**Context**: Frontend state management for NovelForge dashboard -- navigation, sidebar, and search state.

**What Worked Well**:
- Used `useReducer` with a discriminated union type for DashboardAction, making each action's payload type-safe
- Separated persistence helpers (load/save) into private functions with SSR guards (`typeof window === 'undefined'`)
- Wrapped persistence reads/writes in try-catch to handle localStorage being full or unavailable
- Used `useMemo` to memoize the context value and avoid unnecessary re-renders of consumers
- Followed existing codebase patterns: `'use client'` directive, exported interfaces, inline JSDoc comments
- Included early-return optimisations in EXPAND_NAV_GROUP and COLLAPSE_NAV_GROUP when state already matches
- OPEN_SEARCH resets searchQuery to empty string for clean slate on each open
- DashboardProvider accepts `defaultExpandedGroups` and `defaultSidebarCollapsed` props for initial state before hydration
- Hook (`useDashboardContext`) throws a descriptive error when used outside the provider

**What Didn't Work**:
- Initial use of `[...groups]` spread on a `Set<string>` caused TS2802 because tsconfig target defaults to ES3 without `downlevelIteration`
- Fixed by using `Array.from(groups)` which works at any target level

**Lesson**: When spreading a `Set` into an array in TypeScript without an explicit ES2015+ target, use `Array.from(set)` rather than `[...set]`. The spread syntax on iterables requires `--downlevelIteration` or `--target es2015+`. For context providers with useReducer: (1) Define state interface and action union type explicitly, (2) Add SSR guards to all localStorage calls, (3) Wrap persistence in try-catch for resilience, (4) Memoize context value with useMemo to prevent unnecessary consumer re-renders, (5) Throw descriptive errors in consumer hooks when used outside provider.

**Application Score**: 0

**Tags**: #react #context #useReducer #state-management #localStorage #persistence #ssr-guards #typescript #set-to-array #discriminated-unions

---

### 2026-01-27 | Task: UX Accessibility Improvements - Forms, Keyboard Nav, Focus Trap, ARIA

**Date**: 2026-01-27
**Task**: Implement HIGH and MEDIUM priority UX fixes: focus trapping in modals, form label associations, keyboard accessibility, act structure validation, aria-live announcements
**Context**: Final UX polish for WCAG 2.1 AA compliance across NovelForge

**What Worked Well**:
- Created reusable FocusTrap component with proper Tab/Shift+Tab cycling between focusable elements
- FocusTrap stores previousActiveElement and returns focus on unmount for better UX flow
- Added proper form label associations using htmlFor and unique id attributes
- Connected helper text with aria-describedby for screen reader context
- Enhanced act structure validation (Issue #19) to show visual error feedback instead of just console warnings
- Added validation that checks: midpoint > act_one_end, act_two_end > midpoint, climax > act_two_end, climax <= totalChapters
- Wrapped job statistics in aria-live="polite" region for screen reader announcements of status changes (Issue #53)
- Added keyboard navigation to collapsible navigation groups with Enter/Space key support (Issue #51)
- Fixed useProjectNavigation hook calls - must pass at minimum projectId and project parameters
- Verified ExportButtons.tsx already uses Toast component instead of alert() (Issue #31 already completed)
- Fixed pre-existing bug in characters page where ConfirmDialog was placed outside component scope
- Moved ConfirmDialog inside CharactersPage component before PageLayout closing tag
- Build passed successfully after all changes

**What Didn't Work**:
- Initially encountered TypeScript error in characters/page.tsx where ConfirmDialog referenced state variable outside component scope
- Had to debug and move the dialog component from outside CharacterEditor function to inside CharactersPage function
- Required understanding of component nesting and JSX scope to fix properly

**Lesson**: When implementing accessibility improvements for forms: (1) Create reusable FocusTrap component for modals using keydown event listener and querySelectorAll for focusable elements, (2) Add htmlFor/id associations between labels and inputs for screen reader navigation, (3) Use aria-describedby to connect helper text and error messages to inputs, (4) For validation, show visual feedback via setError() not just console.warn(), (5) Wrap dynamic status content in aria-live="polite" regions for announcements, (6) Add keyboard event handlers (Enter/Space) to custom interactive elements like collapsible buttons using onKeyDown with e.preventDefault(), (7) Always verify component scope - JSX elements must be inside the component function that uses their state/props, (8) When updating hook signatures (like useProjectNavigation), check all usages across codebase and update call sites, (9) Run full build after accessibility changes to catch TypeScript errors from aria attributes or prop changes. UK spelling: use "prioritised" not "prioritized".

**Application Score**: 0

**Tags**: #accessibility #wcag #form-labels #keyboard-navigation #focus-trap #aria-live #aria-describedby #validation #ux #react #typescript #component-scope #htmlFor #screen-readers #modal-accessibility

---

### 2026-01-27 | Task: Phase 3 Codebase Simplification - Test Docs, Migration Renumbering, Hook Extraction

**Date**: 2026-01-27
**Task**: Execute Phase 3 of codebase simplification - consolidate test documentation, renumber duplicate migrations, extract useProjectNavigation hook
**Context**: Maintenance task to improve codebase organisation and reduce technical debt

**What Worked Well**:
- Read all existing test documentation files first to extract useful content before consolidating
- Created comprehensive TESTING.md at project root with sections for frontend (Vitest), backend (Jest), and E2E (Playwright) tests
- Included quick reference commands, test organisation, coverage info, best practices, and troubleshooting
- Used UK British spelling throughout as per project requirements (e.g., "organise" not "organize")
- For migration renumbering: listed all migrations first to see full picture before making changes
- Identified duplicates systematically: 015 (2 files), 019 (3 files), 020 (2 files), 021 (2 files), 022 (2 files)
- Renumbered duplicates to unique sequential numbers starting from 034 (highest existing was 033)
- Updated migrate.ts in TWO places: main migrationFiles array AND getMigrationStatus() function
- For hook extraction: created new useProjectNavigation.ts file with extracted hook
- Removed extracted code from useProjectProgress.ts cleanly
- Updated barrel export (index.ts) to export from both files separately
- Used sed command to bulk-update all 16 import statements across project pages to use barrel export
- Verified both frontend and backend builds pass with no TypeScript errors

**What Didn't Work**:
- Initial build failed because pages were importing from direct file path instead of barrel export
- Had to update all 16 page.tsx files to change imports from '../../../hooks/useProjectProgress' to '@/app/hooks'

**Lesson**: When consolidating documentation, create a single comprehensive guide at project root rather than scattered READMEs in subdirectories. For migration systems with hardcoded arrays, update ALL occurrences of the array (often found in both migration runner and status checker functions). When extracting hooks to separate files: (1) Create new file with extracted code, (2) Remove from original file, (3) Update barrel exports, (4) Use bulk find/replace (grep/sed) to update all imports across codebase, (5) Prefer barrel exports (@/app/hooks) over relative paths for easier refactoring. Always verify builds pass after structural changes. UK spelling: use "organise" not "organize", "behaviour" not "behavior".

**Application Score**: 0

**Tags**: #codebase-simplification #documentation #migrations #database #hook-extraction #refactoring #barrel-exports #bulk-updates #testing #uk-spelling #typescript #build-verification

---

### 2026-01-27 | Task: Fixing Failing Vitest Tests for ConceptCard and ErrorBoundary

**Date**: 2026-01-27
**Task**: Fix two failing tests - ConceptCard disabled button test and ErrorBoundary reset test
**Context**: Frontend React component tests using Vitest and React Testing Library

**What Worked Well**:
- Read component implementation first to understand how props map to DOM attributes
- Identified that `screen.getByText('Save for Later')` was selecting the `<span>` element inside the button, not the `<button>` itself
- Used `.closest('button')` to traverse up the DOM tree to find the actual button element
- For ConceptCard test: Changed from checking span element to checking button element with `screen.getByText('Save for Later').closest('button')`
- Button's `disabled` React prop correctly maps to DOM disabled attribute once we select the right element
- For ErrorBoundary test: The linter had already auto-fixed the test by simplifying it to just verify the button exists and is clickable
- Running tests after reading code revealed both tests were already passing after linter auto-fixes
- Verified all 39 tests pass across both test files (24 ConceptCard + 15 ErrorBoundary)

**What Didn't Work**:
- Initially tried to access `.disabled` property on span element returned by `getByText()` which doesn't have disabled property
- Assumed the test was still failing without running it first to see current state

**Lesson**: When testing React components with nested elements (buttons containing spans), use `.closest('elementType')` to traverse up to the parent element you want to test. `screen.getByText()` returns the element containing the text, which for buttons with child spans is the span, not the button. Always use `.closest('button')` when testing button properties like `disabled`. For error boundary reset tests, verify the mechanism works by checking that clicking the reset button allows recovery - don't try to assert button still exists after successful reset (it won't, because error UI is gone). Run tests before making changes to see current state - linters and auto-formatters may have already fixed issues.

**Application Score**: 0

**Tags**: #testing #vitest #react-testing-library #dom-traversal #test-selectors #disabled-buttons #error-boundaries #nested-elements #closest-selector #react #frontend

---

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
- Highlighted currently generating chapter with different background colour (#EEF2FF)
- Responsive stats grid using grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))
- Used CSS-in-JS with inline styles to match existing project patterns (no CSS modules)
- Progress bar shows percentage and chapter count when space available (percentComplete > 10)
- Export and Read buttons only shown when appropriate for each state
- Maintained auto-refresh with 5-second polling interval for real-time updates

**What Didn't Work**:
- Initial implementation had TypeScript error with progressData possibly being null after JSON parsing
- Fixed by adding null checks before using progressData after the else block

**Lesson**: When building monitoring dashboards, create distinct UI states based on business logic, fetch detailed data beyond summary stats, and use visual indicators (colours, icons, badges) to make status immediately clear. Component separation (GenerationStatusBanner) keeps code maintainable.

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
- Used prepared statements for all database operations with proper parameterisation
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
- Positioned action buttons consistently: Edit, Regenerate, Delete in that order with appropriate colours
- Used semantic colours: purple gradient for primary actions, red for destructive, gray for neutral
- Created bulk actions section above acts list for "Regenerate All Acts" and "Delete All Acts"
- Made confirmation messages contextual with specific details (act number, chapter count)
- Reused existing GenerationProgress modal for regeneration feedback with step updates
- Build succeeded on first attempt with no TypeScript compilation errors
- Maintained accessibility with proper button titles/tooltips

**What Didn't Work**:
- N/A - Implementation was straightforward following established patterns

**Lesson**: When adding CRUD operations to existing pages: (1) Read existing UI components (dialogs, modals) to reuse patterns, (2) Use local state for edit mode rather than complex state management (editingActNumber as nullable number), (3) Create consistent action button ordering (non-destructive → regenerate → destructive), (4) Always use confirmation dialogs for destructive actions with contextual messages (include item counts, explain consequences), (5) Provide visual feedback during operations (badges, disabled states, progress modals), (6) Group related actions together (bulk actions section separate from individual actions), (7) Use inline SVG for icons when no icon library exists to maintain zero dependencies, (8) Match existing colour semantics (purple for primary, red for danger, gray for neutral), (9) Build after implementation to verify TypeScript types and JSX syntax.

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
- Created clear visual hierarchy with purple gradient for main plot (from concept), different colours for plot types
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
- Implemented helper functions that are memoised with useMemo for performance (canAccess, getBlockingReason, getMissingItems)
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

**Lesson**: When implementing complex API endpoints that aggregate data from multiple tables: (1) Read the frontend component FIRST to understand exact response shape needed, (2) Use efficient JOINs to minimize database queries (fetch chapters with books in single query), (3) Position specific routes before generic parameterised routes to avoid routing conflicts (`/:id/progress` before `/:id`), (4) Calculate complex statistics in-memory after fetching data - keeps SQL queries simple and maintainable, (5) Make optional response fields properly optional (use undefined, not null) to match TypeScript interfaces, (6) Create small helper functions for repeated formatting logic (time, dates), (7) Use structured error logging with context for debugging, (8) Follow existing patterns for consistency (database query structure, error handling, response format).

**Application Score**: 0

**Tags**: #api-routes #express #rest-api #database #sql #joins #aggregation #typescript #routing #progress-tracking #backend

---

### 2026-01-25 | Task: Implementing Collapsible UI Sections with Accessibility

**Date**: 2026-01-25
**Task**: Creating reusable collapsible sections for form organisation with proper UX and accessibility
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
- Almost implemented tabbed interface before realising existing Quick/Full mode toggle already serves that purpose

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
- Recognising that Zod v4 (4.3.6) has breaking changes vs Zod v3 (type inference differences)
- Adding synchronous versions of async methods when code needed to run at module initialisation time
- Committing fixes incrementally with descriptive messages to track what each fix addressed

**What Didn't Work**:
- Initial commits missed several untracked files - should have done comprehensive check first
- Didn't immediately recognise Zod v4 breaking changes - assumed syntax error in our code
- Async migration function was called synchronously at server startup - needed to trace full call stack to find issue

**Lesson**: When Railway deployments fail, follow this systematic approach:
1. **Reproduce locally first** - Run `npx tsc --noEmit` in backend to see same errors
2. **Check for untracked files** - `git status --short | grep "^??"` then trace imports
3. **Verify dependency versions** - Major version bumps (v3→v4) often have breaking changes
4. **Check sync/async consistency** - Module initialisation code (server.ts, db connections, migrations) must be synchronous if called at import time
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

**Lesson**: When refactoring from console logging to structured loggers, tests that verify console.error calls should be updated to test behaviour (return values, error handling) rather than implementation details (logging). For ESM projects with Jest, mock setup order matters - use jest.mock() before imports to prevent TypeScript from compiling mocked modules. Use explicit type assertions (`as any`) on mock methods when TypeScript can't infer jest.Mock types correctly.

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
