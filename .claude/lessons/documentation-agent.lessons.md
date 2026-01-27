# Lessons Learned: Documentation Agent

<!--
This file stores accumulated lessons learned by the documentation-agent agent.
It is automatically read before each task and updated after task completion.

MAINTENANCE RULES:
- Maximum 50 lessons per file (older lessons archived automatically)
- Lessons with score >= 5 are considered "proven" and prioritized
- Review and prune quarterly or when file exceeds 50 entries
-->

## Summary Statistics

- **Total tasks completed**: 0
- **Total lessons recorded**: 0
- **Last updated**: 2026-01-27
- **Proven lessons** (score >= 5): 0
- **Top themes**: #documentation #api-docs #adr #readme

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

<!-- New lessons are added at the top of this section -->

### Initial Best Practices

**Date**: 2026-01-27
**Task**: Agent initialization
**Context**: Establishing baseline patterns for documentation

**What Worked Well**:
- Code examples that readers can copy-paste and run
- Consistent formatting across all documentation
- Tables for structured information (parameters, errors)
- Scannable structure with clear headings

**What Didn't Work**:
- N/A (initialization)

**Lesson**: Always test code examples before including them in documentation. Broken examples destroy trust faster than missing documentation.

**Application Score**: 0

**Tags**: #documentation #examples #trust #initialization

---

## Archived Lessons

<!-- Lessons older than 50 entries or no longer relevant are moved here -->

*No archived lessons yet.*

---

## Lesson Format Reference

When adding a new lesson, use this format:

```markdown
### YYYY-MM-DD | Task: {Brief Task Description}

**Date**: YYYY-MM-DD
**Task**: Brief description of the task
**Context**: What was the situation/environment?

**What Worked Well**:
- Specific thing that helped
- Another success factor

**What Didn't Work**:
- Specific challenge encountered
- Time wasted on X

**Lesson**: Clear, actionable insight that can be applied to future tasks.

**Application Score**: 0

**Tags**: #relevant #tags #here
```

### Tag Categories

Use consistent tags for searchability:

- **Tech**: #openapi #markdown #asciidoc #dita
- **Process**: #review #versioning #changelog
- **Patterns**: #api-docs #adr #readme #guides #tutorials
- **Problems**: #stale-docs #broken-links #jargon #inconsistency
- **Tools**: #swagger #redoc #docusaurus #mkdocs
