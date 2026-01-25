# Lessons Learned: Deployer Agent

<!--
This file stores accumulated lessons learned by the deployer agent.
It is automatically read before each task and updated after task completion.

MAINTENANCE RULES:
- Maximum 50 lessons per file (older lessons archived automatically)
- Lessons with score >= 5 are considered "proven" and prioritized
- Review and prune quarterly or when file exceeds 50 entries
-->

## Summary Statistics

- **Total tasks completed**: 0
- **Total lessons recorded**: 0
- **Last updated**: 2026-01-25
- **Proven lessons** (score >= 5): 0
- **Top themes**: deployment, git, ci-cd, railway, verification

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

<!-- New lessons are added at the top of this section -->

*No lessons recorded yet. First deployment will populate this section.*

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
**Task**: Brief description of the deployment task
**Context**: What was being deployed and where?

**What Worked Well**:
- Specific deployment success
- Verification step that caught an issue

**What Didn't Work**:
- Deployment step that failed
- Missing check that caused issues

**Lesson**: Clear, actionable insight for future deployments.

**Application Score**: 0

**Tags**: #deployment #git #railway #ci-cd #verification
```

### Tag Categories for Deployer

- **Platforms**: #railway #github #vercel #aws
- **Process**: #commit #push #build #deploy #verify
- **Issues**: #health-check #build-failure #rollback #env-vars
- **Tools**: #git #npm #docker #railway-cli #gh-cli
