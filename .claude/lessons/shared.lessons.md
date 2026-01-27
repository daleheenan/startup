# Shared Lessons Learned

<!--
This file contains cross-cutting lessons applicable to ALL agents.
Every agent should read this file before starting any task.
Add lessons here when they apply across multiple agent types.

MAINTENANCE RULES:
- Maximum 30 lessons (keep only the most universally applicable)
- Lessons with score >= 10 are considered "foundational"
- Any agent can add lessons; review for relevance quarterly
-->

## Summary Statistics

- **Total lessons recorded**: 23
- **Last updated**: 2026-01-25
- **Foundational lessons** (score >= 10): 5
- **Contributing agents**: Initial setup, bug-hunter, qa-test-engineer, project-director, developer

---

## Foundational Lessons (Score >= 10)

These lessons have proven universally valuable across many tasks and agents.

### Always Verify Before Modifying

**Lesson**: Before modifying any file, read it first to understand existing patterns, conventions, and context. Assumptions based on file names or documentation are often wrong.

**Application Score**: 10

**Tags**: #files #safety #patterns

---

### Run Build/Tests Before Claiming Done

**Lesson**: Never mark a task as complete without running the project's build and test commands. "It compiles on my machine" is not verification.

**Application Score**: 10

**Tags**: #testing #verification #quality

---

### Check Git Status Before Commits

**Lesson**: Always run `git status` and `git diff` before committing. Unintended files, debug code, and console.logs frequently sneak into commits.

**Application Score**: 10

**Tags**: #git #commits #cleanup

---

### Understand the Error Before Fixing

**Lesson**: Read the full error message and stack trace before attempting a fix. The first fix attempt based on the error headline often wastes time. The actual cause is usually in the details.

**Application Score**: 10

**Tags**: #debugging #errors #efficiency

---

### Small Changes, Frequent Verification

**Lesson**: Make small, incremental changes and verify each one works before proceeding. Large changes that break are hard to debug. Small changes that break are obvious.

**Application Score**: 10

**Tags**: #methodology #debugging #incremental

---

## Active Lessons (Most Recent First)

### 2026-01-25 | Pre-Deployment Checklist for Railway/Cloud Builds

**Context**: Railway deployment failures due to missing files and version incompatibilities

**Lesson**: Before pushing code that will trigger a Railway/cloud deployment, run this checklist:

1. **Check for untracked files**: `git status --short | grep "^??"` - ensure all imported modules are committed
2. **Verify TypeScript compilation**: `npx tsc --noEmit` in the backend directory
3. **Check third-party library versions**: Major version changes (e.g., Zod v3 → v4) can have breaking API changes
4. **Verify sync/async consistency**: Module initialization code (migrations, DB connections) must match expected sync/async behavior
5. **Test both frontend and backend builds**: `npm run build` in each directory
6. **Review imports with grep**: `grep -r "from '\.\./module" --include="*.ts"` to find all imports of a new module

Common failures this prevents:
- "Cannot find module" errors (untracked files)
- TypeScript compilation errors (type inference changes in library updates)
- "await only allowed in async function" (sync/async mismatch)
- Runtime crashes from breaking API changes in dependencies

**Application Score**: 0

**Tags**: #deployment #railway #ci-cd #verification #untracked-files #dependencies

---

### 2026-01-25 | React Query Integration Pattern

**Context**: Adding client-side data caching to Next.js applications

**Lesson**: When adding React Query (@tanstack/react-query) to Next.js:
1. Create a separate `QueryProvider.tsx` component with 'use client' directive
2. Initialize QueryClient inside useState to avoid SSR hydration mismatches
3. Wrap children in `QueryClientProvider` in the layout file
4. Set sensible defaults: `staleTime: 5min`, `gcTime: 30min`, `retry: 2`
5. Create hooks (e.g., `useProjects()`) that encapsulate query keys and fetch functions

**Application Score**: 0

**Tags**: #react-query #caching #frontend #next.js #patterns

---

### 2026-01-25 | Include Parameter Pattern for API Optimization

**Context**: Optimizing API endpoints to reduce N+1 query problems

**Lesson**: For parent-child data relationships, implement `?include=` query parameters:
1. Parse comma-separated include values: `req.query.include?.split(',')`
2. Use SQL JOINs to fetch related data in single queries
3. Group child data by parent ID using Map for O(n) attachment
4. Example: `GET /projects/:id?include=books,chapters` fetches all data in 2 queries instead of N+1

This pattern reduces HTTP requests and database round-trips significantly.

**Application Score**: 0

**Tags**: #api #performance #database #joins #optimization

---

### 2026-01-25 | Jest ESM Mock Type Casting

**Context**: TypeScript errors in Jest tests with ESM modules

**Lesson**: When Jest mock types conflict with TypeScript:
1. Use `: any` type annotation for mock variables: `let mockFn: any`
2. Cast mock chains: `(mockFn as any).mockResolvedValue(...)`
3. Use `(call: any[])` for mock.calls.filter callbacks
4. Use `(param: any)` for mock implementation parameters

This bypasses TypeScript's inability to properly infer jest.Mock types in ESM while maintaining working tests.

**Application Score**: 0

**Tags**: #jest #typescript #esm #mocking #testing

---

### 2026-01-25 | Error Boundaries Are Required

**Context**: React applications without proper error handling

**Lesson**: Every React application MUST have Error Boundaries at three levels:
1. **App level** - catches catastrophic failures, shows "something went wrong"
2. **Page level** - allows other pages to work if one crashes
3. **Feature level** - isolates component failures

Without Error Boundaries, ANY runtime error causes a white screen crash. This is the #1 UX bug pattern.

**Application Score**: 0

**Tags**: #react #error-handling #ux #critical

---

### 2026-01-25 | Race Condition Prevention Pattern

**Context**: Multiple async operations that can trigger simultaneously

**Lesson**: Race conditions occur in predictable patterns. Prevent them with:
1. **Auth flows** - Use singleton flag for logout/redirect (prevent multiple 401 handlers)
2. **Form submissions** - Disable button during submit (prevent double-submit)
3. **State updates** - Check if component is mounted before setState
4. **Async callbacks** - Use functional setState to avoid stale closures

Always look for: "what if this triggers twice?"

**Application Score**: 0

**Tags**: #race-conditions #async #auth #patterns

---

### 2026-01-25 | Server-Side Validation Is Mandatory

**Context**: Form validation and API input handling

**Lesson**: Client-side validation is UX ONLY. Server MUST validate ALL inputs because:
1. DevTools can bypass any client validation
2. Direct API calls skip the UI entirely
3. Malicious users will exploit validation gaps

Use schema validation libraries (Zod, Joi) on the server. Never trust client input.

**Application Score**: 0

**Tags**: #security #validation #forms #api

---

### 2026-01-25 | Inventory Before Implementing

**Context**: Implementing new features in existing codebase

**Lesson**: Before writing new code, systematically check what already exists:
1. **Database** - Does the table/migration exist?
2. **Backend services** - Is the logic already written?
3. **API routes** - Are endpoints defined?
4. **Frontend components** - Are UI pieces built?

Often 50-80% of work is already done and just needs wiring. Check first, implement second.

**Application Score**: 0

**Tags**: #efficiency #existing-code #planning #fullstack

---

### 2026-01-20 | Cross-Agent Communication

**Context**: Workflow orchestration between multiple agents

**Lesson**: When handing off work between agents, always include:
1. What was completed
2. What files were changed
3. What the next agent needs to know
4. Any gotchas or warnings

Poor handoffs cause duplicate work and missed context.

**Application Score**: 3

**Tags**: #workflows #handoff #communication

---

### 2026-01-20 | Environment Assumptions

**Context**: Initial project setup and configuration

**Lesson**: Never assume environment variables, config files, or dependencies exist. Always check first and fail with helpful error messages if missing.

**Application Score**: 2

**Tags**: #environment #configuration #errors

---

### 2026-01-20 | Documentation Location

**Context**: Finding project documentation

**Lesson**: Check these locations for project-specific instructions in order:
1. `CLAUDE.md` in project root
2. `README.md` in project root
3. `.claude/` directory for agent configs
4. `docs/` directory
5. Package.json scripts and comments

**Application Score**: 2

**Tags**: #documentation #onboarding #context

---

### 2026-01-20 | TypeScript Strict Mode

**Context**: TypeScript projects with strict configuration

**Lesson**: In strict TypeScript projects:
- `any` type is almost always wrong - find the correct type
- `!` non-null assertions hide bugs - handle null properly
- `@ts-ignore` is technical debt - fix the underlying issue

**Application Score**: 1

**Tags**: #typescript #types #quality

---

### 2026-01-20 | Database Migrations

**Context**: Schema changes in projects with migrations

**Lesson**: For any database schema change:
1. Check if the project uses migrations (look for `/migrations`, `/prisma`, `/drizzle`)
2. Create a migration file, don't modify the schema directly
3. Ensure the migration is reversible when possible
4. Update TypeScript types/schemas to match

**Application Score**: 1

**Tags**: #database #migrations #schema

---

### 2026-01-20 | API Error Responses

**Context**: Building or modifying API endpoints

**Lesson**: Every API endpoint should have consistent error responses:
- Use appropriate HTTP status codes
- Include error message in response body
- Log errors server-side with context
- Never expose internal error details to clients

**Application Score**: 1

**Tags**: #api #errors #security

---

### 2026-01-20 | Test File Conventions

**Context**: Writing tests for new or existing code

**Lesson**: Before writing tests, check existing test files for:
- File naming convention (`.test.ts`, `.spec.ts`, `__tests__/`)
- Test framework (Jest, Vitest, Mocha, etc.)
- Mocking patterns used
- Setup/teardown conventions

Match existing patterns exactly.

**Application Score**: 1

**Tags**: #testing #conventions #patterns

---

### 2026-01-20 | Async/Await Error Handling

**Context**: Asynchronous JavaScript/TypeScript code

**Lesson**: Every `await` is a potential failure point:
- Wrap in try/catch or use `.catch()`
- Consider what should happen on failure
- Don't swallow errors silently
- Log with context for debugging

**Application Score**: 1

**Tags**: #async #errors #javascript

---

### 2026-01-20 | Import Path Consistency

**Context**: Adding new imports to files

**Lesson**: Match the import style already used in the file:
- Relative vs absolute paths
- Index imports vs direct file imports
- Named vs default exports
- Import ordering conventions

Inconsistent imports cause confusion and sometimes bundler issues.

**Application Score**: 1

**Tags**: #imports #consistency #style

---

### 2026-01-20 | Security-Sensitive Changes

**Context**: Code touching authentication, authorization, or user data

**Lesson**: For any security-sensitive code:
- Never log passwords, tokens, or PII
- Validate input on the server, not just client
- Use parameterized queries, never string concatenation
- Review OWASP Top 10 for the relevant vulnerability class

**Application Score**: 1

**Tags**: #security #authentication #validation

---

## Archived Lessons

*No archived lessons yet.*
