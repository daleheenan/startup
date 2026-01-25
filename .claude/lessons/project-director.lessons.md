# Lessons Learned: Project Director Agent

<!--
This file stores accumulated lessons learned by the project-director agent.
It is automatically read before each task and updated after task completion.

MAINTENANCE RULES:
- Maximum 50 lessons per file (older lessons archived automatically)
- Lessons with score >= 5 are considered "proven" and prioritized
- Review and prune quarterly or when file exceeds 50 entries
-->

## Summary Statistics

- **Total tasks completed**: 2
- **Total lessons recorded**: 5
- **Last updated**: 2026-01-25
- **Proven lessons** (score >= 5): 0
- **Top themes**: #project-management #orchestration #agents #reporting #planning

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

### 2026-01-25 | Task: NovelForge Project Review

**Date**: 2026-01-25
**Task**: Comprehensive project review with multiple analysis streams
**Context**: Complex project with test coverage, bugs, and lesson system review

**What Worked Well**:
- Running multiple agents in parallel (qa-test-engineer, bug-hunter, Explore)
- Using TodoWrite to track progress across complex tasks
- Providing structured reports with clear sections

**What Didn't Work**:
- Initial scope was too broad, had to prioritize

**Lesson**: For complex project reviews: (1) Spawn parallel agents for independent analysis streams, (2) Use structured reports with clear sections, (3) Prioritize findings by severity, (4) Track all tasks in TodoWrite, (5) Provide actionable recommendations, not just findings. Parallel agents reduce time by 3-4x.

**Application Score**: 1

**Tags**: #project-management #parallel #reporting #analysis

---

### 2026-01-25 | Task: Agent Orchestration

**Date**: 2026-01-25
**Task**: Coordinating multiple specialist agents
**Context**: Using Task tool to spawn agents

**What Worked Well**:
- Clear prompts specifying whether to research or implement
- Requesting specific output formats
- Checking agent results before acting on them

**What Didn't Work**:
- Vague prompts led to incomplete analysis

**Lesson**: When spawning agents: (1) Specify if task is research-only or includes implementation, (2) Request specific output format (table, report, code), (3) Provide file paths and context needed, (4) Set clear success criteria, (5) Review results before proceeding. Good prompts = good results.

**Application Score**: 1

**Tags**: #agents #orchestration #prompts #delegation

---

### 2026-01-25 | Task: Progress Reporting

**Date**: 2026-01-25
**Task**: Keeping stakeholders informed during complex tasks
**Context**: Multi-phase project execution

**What Worked Well**:
- Visual progress bars and status indicators
- Clear phase transitions with reports
- Highlighting key findings and decisions

**What Didn't Work**:
- Too much detail in some reports

**Lesson**: Progress reports should: (1) Start with high-level status (on track/at risk/blocked), (2) Show visual progress indicators, (3) Highlight key accomplishments since last report, (4) Call out blockers immediately, (5) End with next steps. Keep reports scannable - details available on request.

**Application Score**: 0

**Tags**: #reporting #communication #status #stakeholders

---

### 2026-01-25 | Task: Task Breakdown

**Date**: 2026-01-25
**Task**: Breaking complex requirements into executable tasks
**Context**: Implementing tier 1 and 2 lesson recommendations

**What Worked Well**:
- Breaking work into clear phases
- Identifying dependencies between tasks
- Assigning appropriate agents to each task

**What Didn't Work**:
- Initially underestimated task count

**Lesson**: Task breakdown process: (1) List all deliverables first, (2) Break each deliverable into atomic tasks, (3) Identify dependencies (what blocks what), (4) Assign agents based on expertise, (5) Estimate effort (small/medium/large). Good breakdown = predictable execution.

**Application Score**: 0

**Tags**: #planning #breakdown #tasks #estimation

---

### 2026-01-25 | Task: Quality Gate Enforcement

**Date**: 2026-01-25
**Task**: Ensuring quality standards are met before delivery
**Context**: Complex implementation with multiple outputs

**What Worked Well**:
- Running builds/tests after implementation
- Reviewing output for completeness
- Checking against original requirements

**What Didn't Work**:
- Skipping gates under time pressure

**Lesson**: Quality gates are non-negotiable: (1) Build must pass - no exceptions, (2) Tests must pass - no skipping, (3) Requirements must be met - verify each one, (4) Documentation must be updated - if behavior changed, (5) Code review for significant changes. Skipping gates creates tech debt.

**Application Score**: 0

**Tags**: #quality #gates #testing #requirements

---

## Archived Lessons

*No archived lessons yet.*
