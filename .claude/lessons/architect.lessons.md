# Lessons Learned: Architect Agent

<!--
This file stores accumulated lessons learned by the architect agent.
It is automatically read before each task and updated after task completion.

MAINTENANCE RULES:
- Maximum 50 lessons per file (older lessons archived automatically)
- Lessons with score >= 5 are considered "proven" and prioritised
- Review and prune quarterly or when file exceeds 50 entries
-->

## Summary Statistics

- **Total tasks completed**: 3
- **Total lessons recorded**: 8
- **Last updated**: 2026-01-29
- **Proven lessons** (score >= 5): 0
- **Top themes**: #architecture #patterns #database #api #typescript #repository-pattern #circuit-breaker #navigation #ui-redesign #workflow #component-design #conversational-ai #intent-detection #chat-interface

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

### 2026-01-29 | Task: Editorial Assistant Conversational AI Architecture

**Date**: 2026-01-29
**Task**: Designing conversational AI chat interface for Edit Story page with intent detection and approval workflow
**Context**: Replace single-request AI refinement with multi-turn chat assistant that detects user intent (question/change/suggestion) and requires approval for recommendations

**What Worked Well**:
- Reading lessons from developer and code-reviewer agents first to understand implementation patterns and common pitfalls
- Systematic codebase exploration: existing refine-story endpoint (lines 5082-5227), design tokens, modal patterns, edit story page structure
- Designing stateless API (conversation history passed from client) to avoid session management complexity
- Using Claude for intent detection rather than building separate NLP classifier - leverages existing AI capabilities
- Three-tier intent system (question/change/suggestion) maps cleanly to three response types (answer/change_applied/recommendation)
- Separating intent detection (fast, low-token) from response generation (detailed, higher-token) for efficient API usage
- Project-scoped context only (Story Concept + DNA) prevents scope creep and keeps responses focused
- Ephemeral conversation state (component-level, resets on page navigation) avoids database persistence complexity
- Component hierarchy: EditorialAssistant (orchestrator) → ChatMessage (display) → RecommendationCard (approval UI) - clear separation of concerns
- Parent-child communication via onApplyChanges callback keeps form state in parent, assistant just proposes changes
- Comprehensive technical design document with: architecture diagrams, API schemas, component structure, integration points, security considerations, testing strategy
- Task breakdown into three phases: Backend Foundation (6-8h) → Frontend Components (8-10h) → Testing & Polish (4-5h) with clear dependencies
- Each task sized at 1-3 hours for realistic tracking and progress visibility
- Including code examples in both technical design AND implementation tasks - developers implement faster with reference implementations
- Documenting existing patterns to remove vs new patterns to add (what to delete, what to create, what to modify)

**What Didn't Work**:
- Initial consideration to persist conversations in database - realised ephemeral state is simpler and sufficient for use case
- Almost designed a complex state machine for intent flow - simplified to three straightforward response types
- First draft had separate services for each intent type - consolidated into single response generator with intent parameter

**Lesson**: For conversational AI features: (1) Use the AI itself for intent detection rather than building separate classifiers - Claude can classify with structured prompts, (2) Keep conversation state ephemeral in component unless persistence has clear user value - simpler architecture, (3) Design stateless APIs where client passes conversation history - avoids session management, (4) Separate fast classification (intent detection, ~200 tokens) from detailed generation (response, ~2000 tokens) for cost efficiency, (5) Use three-tier intent model (question/change/suggestion) which maps cleanly to UI patterns (answer/apply/approve), (6) Project-scope context ruthlessly - only include data user is actively editing to prevent hallucinations and scope creep, (7) Break component hierarchy clearly: orchestrator (state management) → display (rendering) → action cards (user interaction), (8) Use callback props (onApplyChanges) to keep form state in parent - child components propose, parent decides, (9) In technical design, include: intent detection prompt templates, API request/response schemas with examples, component code structure, integration points with existing code, (10) In implementation tasks, include: specific lines to delete from existing code, exact code to add, imports needed, files to create vs modify - reduces ambiguity for developers, (11) For features replacing existing functionality, document removal steps first (delete old state, remove old handlers, remove old JSX) then addition steps.

**Application Score**: 0

**Tags**: #architecture #conversational-ai #intent-detection #chat-interface #stateless-api #claude-api #component-design #approval-workflow #uk-spelling #project-scoped-context #ephemeral-state #task-breakdown #code-examples #integration-patterns

---

### 2026-01-26 | Task: NovelForge Navigation & UI Redesign Architecture

**Date**: 2026-01-26
**Task**: Designing comprehensive navigation redesign with workflow enforcement, story ideas feature, and settings reorganisation
**Context**: Large-scale UX improvement affecting navigation, project workflow, story creation flow, and settings organisation

**What Worked Well**:
- Reading lessons from developer and code-reviewer agents first to understand implementation patterns and pain points
- Systematic codebase exploration: navigation (ProjectNavigation.tsx), new project page, projects dashboard, types, database schema
- Reading existing similar features (story-ideas routes, saved-concepts page) before designing new ones
- Creating comprehensive technical design first (architecture, data model, API routes, components) before implementation tasks
- Breaking implementation into phases with clear dependencies: Foundation → Navigation → Story Ideas → Project Updates → Settings
- Sizing tasks at 1-3 hours each for realistic tracking and progress visibility
- Including rollback procedures and feature flags in deployment strategy for risk mitigation
- Documenting both "what to build" (technical design) and "how to build it" (implementation tasks) in separate documents
- Providing code examples in technical design so developers have reference implementations
- Identifying reusable existing components (ProseStyleForm, ConfirmDialog) to reduce implementation time
- Designing additive changes (new pages, new components) before breaking changes (removing tabs) for safer rollout
- Including accessibility, performance, and testing strategies in technical design, not as afterthoughts

**What Didn't Work**:
- Initial design considered creating new database tables for navigation preferences - realised existing user_settings pattern is sufficient
- Almost designed story idea expansion as synchronous API - realised async job queue is more consistent with existing architecture
- First draft had prose style defaults in new table - simplified to reuse prose_styles table with project_id = null

**Lesson**: For large-scale UX redesigns affecting multiple pages and workflows: (1) Read existing codebase patterns extensively before designing (navigation, pages, routes, types), (2) Identify and reuse existing components to reduce implementation scope, (3) Design changes in phases: non-breaking additions first, breaking changes last with feature flags, (4) Break implementation into <3 hour tasks grouped by phase with clear dependencies, (5) Provide code examples in technical design docs, not just interfaces - developers implement faster with reference code, (6) Include rollback procedures and feature flags from the start for large changes, (7) Design for consistency - new features should match existing architectural patterns (async jobs, API structure, database conventions), (8) Consider the complete system: types → database → API → components → integration → testing in that order.

**Application Score**: 0

**Tags**: #architecture #navigation #ui-redesign #workflow #ux #component-design #phased-implementation #feature-flags #rollback-planning #code-examples #task-breakdown

---

### 2026-01-25 | Task: Sprint 18 - Database & Architecture Improvements

**Date**: 2026-01-25
**Task**: Designing database migration improvements, repository layer abstraction, and circuit breaker pattern for NovelForge backend
**Context**: Production-grade backend architecture using SQLite, Express.js, TypeScript, and Anthropic Claude API

**What Worked Well**:
- Reading existing codebase patterns first (migrate.ts, services, repositories) before designing new patterns
- Loading lessons from developer and code-reviewer agents to understand implementation challenges
- Breaking large architecture changes into phases with minimal dependencies
- Designing non-breaking changes first (database improvements), breaking changes last (repository layer)
- Providing specific file paths and code examples in implementation tasks
- Creating detailed acceptance criteria with clear success metrics
- Including rollback strategy and deployment order in technical design
- Using existing patterns as references (mystery-tracking.service.ts as repository refactor example)
- Estimating task time at 1-3 hours per task for granular tracking

**What Didn't Work**:
- Initial design considered using external circuit breaker libraries (Opossum, Cockatiel) - decided custom implementation is simpler for single API
- Almost missed integration points between new services (backup service needs to be called by migration service)

**Lesson**: When designing major architectural improvements, always read the existing codebase patterns first, especially implementations from the same domain. Break changes into phases: non-breaking changes deploy first, breaking changes deploy last with rollback plans. Provide concrete code examples in tasks, not just interfaces - developers implement faster with reference code. Size tasks at 1-3 hours each for realistic tracking. For external dependencies (circuit breakers, ORMs), evaluate if custom implementation (<100 lines) is simpler than library integration (200KB+ dependencies).

**Application Score**: 0

**Tags**: #architecture #repository-pattern #circuit-breaker #migrations #solid-principles #phased-deployment

---

### 2026-01-25 | Task: Database Schema Design

**Date**: 2026-01-25
**Task**: Designing database schemas for new features
**Context**: SQLite database with migration system

**What Worked Well**:
- Creating migration files instead of modifying schema directly
- Using foreign keys with proper CASCADE rules
- Adding indexes for frequently queried columns

**What Didn't Work**:
- Initially forgot to add indexes on foreign keys
- Missed adding updated_at triggers

**Lesson**: Every database table should have: id (UUID), created_at, updated_at columns. Foreign keys need indexes. Always create migrations, never modify schema directly. Plan for soft deletes if data might need recovery.

**Application Score**: 0

**Tags**: #database #migrations #schema #indexes

---

### 2026-01-25 | Task: API Route Architecture

**Date**: 2026-01-25
**Task**: Designing RESTful API routes
**Context**: Express.js backend with TypeScript

**What Worked Well**:
- Consistent route naming conventions (/api/resource/:id/subresource)
- Separating route handlers from business logic (services)
- Using middleware for auth, validation, error handling

**What Didn't Work**:
- Mixing route logic and database queries in handlers

**Lesson**: Routes should only handle request parsing and response formatting. All business logic goes in services. All database access goes through repositories or dedicated db modules. This separation enables testing and reuse.

**Application Score**: 0

**Tags**: #api #routes #separation-of-concerns #express

---

### 2026-01-25 | Task: Error Handling Strategy

**Date**: 2026-01-25
**Task**: Designing consistent error handling across the stack
**Context**: Full-stack TypeScript application

**What Worked Well**:
- Custom error classes with HTTP status codes
- Centralised error handler middleware
- Consistent error response format

**What Didn't Work**:
- Exposing internal error details to clients
- Swallowing errors silently in catch blocks

**Lesson**: Create a hierarchy of custom error classes (ValidationError, NotFoundError, AuthError). Map them to HTTP status codes in a central handler. Log full errors server-side, return sanitised messages to clients. Never swallow errors - at minimum, log them.

**Application Score**: 0

**Tags**: #error-handling #api #security #logging

---

### 2026-01-25 | Task: State Management Architecture

**Date**: 2026-01-25
**Task**: Designing frontend state management
**Context**: Next.js with React components

**What Worked Well**:
- Using React Query for server state
- Keeping form state local to components
- Context for global app state (auth, theme)

**What Didn't Work**:
- Putting all state in global context
- Not cleaning up subscriptions on unmount

**Lesson**: Distinguish between server state (React Query/SWR), global app state (Context/Zustand), and local UI state (useState). Server state should use a data-fetching library with caching. Local state stays in components. Global state should be minimal.

**Application Score**: 0

**Tags**: #state-management #react #frontend #patterns

---

### 2026-01-25 | Task: TypeScript Interface Design

**Date**: 2026-01-25
**Task**: Designing type definitions for shared models
**Context**: Full-stack TypeScript with shared types

**What Worked Well**:
- Shared types between frontend and backend
- Using discriminated unions for variant types
- Strict null checking enabled

**What Didn't Work**:
- Using `any` type as a shortcut
- Not handling null/undefined cases

**Lesson**: Enable TypeScript strict mode from the start. Share types between frontend and backend via a shared package or directory. Use discriminated unions for types with variants. Never use `any` - use `unknown` and narrow with type guards if needed.

**Application Score**: 0

**Tags**: #typescript #types #strict-mode #patterns

---

## Archived Lessons

*No archived lessons yet.*
