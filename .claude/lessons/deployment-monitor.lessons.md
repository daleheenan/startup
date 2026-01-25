# Lessons Learned: Deployment Monitor Agent

<!--
This file stores accumulated lessons learned by the deployment-monitor agent.
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
- **Top themes**: monitoring, alerts, health-check, performance, production

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

<!-- New lessons are added at the top of this section -->

*No lessons recorded yet. First monitoring session will populate this section.*

---

## Archived Lessons

<!-- Lessons older than 50 entries or no longer relevant are moved here -->

*No archived lessons yet.*

---

## Performance Baselines

Track normal performance metrics here for comparison:

### Response Times
| Endpoint | Baseline | Warning | Critical |
|----------|----------|---------|----------|
| /api/health | < 100ms | > 500ms | > 2000ms |
| /api/health/detailed | < 200ms | > 1000ms | > 3000ms |

### Error Rates
| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| 5xx errors | < 0.1% | > 1% | > 5% |
| 4xx errors | < 5% | > 10% | > 25% |

---

## Lesson Format Reference

When adding a new lesson, use this format:

```markdown
### YYYY-MM-DD | Task: {Brief Monitoring Description}

**Date**: YYYY-MM-DD
**Task**: What was being monitored?
**Context**: Post-deployment check, ongoing monitoring, or incident response?

**What Worked Well**:
- Detection method that worked
- Alert threshold that was accurate

**What Didn't Work**:
- False positive/negative
- Missed detection

**Lesson**: Clear insight for better monitoring.

**Application Score**: 0

**Tags**: #monitoring #alerts #performance #health-check
```

### Tag Categories for Deployment Monitor

- **Check Type**: #health-check #performance #error-rate #response-time
- **Alert Level**: #critical #high #medium #informational
- **Status**: #healthy #degraded #unhealthy
- **Action**: #auto-remediate #escalate #document
