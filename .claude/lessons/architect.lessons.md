# Lessons Learned: Architect Agent

<!--
This file stores accumulated lessons learned by the architect agent.
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
- **Top themes**: #architecture #patterns #database #api #typescript

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

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
- Centralized error handler middleware
- Consistent error response format

**What Didn't Work**:
- Exposing internal error details to clients
- Swallowing errors silently in catch blocks

**Lesson**: Create a hierarchy of custom error classes (ValidationError, NotFoundError, AuthError). Map them to HTTP status codes in a central handler. Log full errors server-side, return sanitized messages to clients. Never swallow errors - at minimum, log them.

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
