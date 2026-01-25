# Lessons Learned: Deployment Doctor Agent

<!--
This file stores accumulated lessons learned by the deployment-doctor agent.
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
- **Top themes**: diagnosis, railway, health-check, debugging, production

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

<!-- New lessons are added at the top of this section -->

*No lessons recorded yet. First diagnosis will populate this section.*

---

## Archived Lessons

<!-- Lessons older than 50 entries or no longer relevant are moved here -->

*No archived lessons yet.*

---

## Common Issue Patterns Database

Keep track of recurring issues and their solutions here:

### Health Check Issues
| Symptom | Root Cause | Fix | Occurrences |
|---------|------------|-----|-------------|
| Unhealthy status | Wrong path | Update railway.toml | 0 |
| Timeout on startup | Slow migrations | Increase timeout | 0 |

### Build Issues
| Symptom | Root Cause | Fix | Occurrences |
|---------|------------|-----|-------------|
| Native module fail | Missing deps | Add to nixpacks | 0 |
| TypeScript error | Code issue | Fix locally first | 0 |

### Runtime Issues
| Symptom | Root Cause | Fix | Occurrences |
|---------|------------|-----|-------------|
| Immediate crash | Missing env var | Set variable | 0 |
| OOM (exit 137) | Memory leak | Fix code/upgrade | 0 |

---

## Lesson Format Reference

When adding a new lesson, use this format:

```markdown
### YYYY-MM-DD | Task: {Brief Diagnosis Description}

**Date**: YYYY-MM-DD
**Task**: What deployment issue was diagnosed?
**Context**: What environment and symptoms?

**Symptoms Observed**:
- Symptom 1
- Symptom 2

**Root Cause**: What was actually wrong?

**Solution Applied**: What fixed it?

**Lesson**: Clear insight for diagnosing similar issues.

**Application Score**: 0

**Tags**: #diagnosis #railway #health-check #build-failure
```

### Tag Categories for Deployment Doctor

- **Issue Type**: #health-check #build-failure #crash #oom #cors #env-vars
- **Platform**: #railway #vercel #aws #github-actions
- **Severity**: #critical #high #medium #low
- **Phase**: #triage #diagnosis #treatment #verification
