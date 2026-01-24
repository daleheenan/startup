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

- **Total tasks completed**: 4
- **Total lessons recorded**: 4
- **Last updated**: 2026-01-24
- **Proven lessons** (score >= 5): 0
- **Top themes**: #typescript #testing #patterns #frontend #backend

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

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
