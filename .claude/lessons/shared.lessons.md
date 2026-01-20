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

- **Total lessons recorded**: 15
- **Last updated**: 2026-01-20
- **Foundational lessons** (score >= 10): 5
- **Contributing agents**: Initial setup

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
