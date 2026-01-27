# Lessons Learned: Performance Test Engineer

<!--
This file stores accumulated lessons learned by the performance-test-engineer agent.
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
- **Top themes**: #performance #load-testing #benchmarking #metrics

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
**Context**: Establishing baseline patterns for performance testing

**What Worked Well**:
- Always establish baselines before comparing
- Focus on percentiles (p95, p99) not just averages
- Test in production-like environments
- Monitor resource utilization alongside response times

**What Didn't Work**:
- N/A (initialization)

**Lesson**: Never report average response times alone - they hide tail latency issues. Always report p50, p95, and p99 percentiles to give a complete picture of user experience.

**Application Score**: 0

**Tags**: #performance #metrics #percentiles #initialization

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

- **Tech**: #k6 #artillery #jmeter #lighthouse #playwright
- **Process**: #baseline #regression #capacity-planning
- **Patterns**: #load-test #stress-test #spike-test #soak-test
- **Problems**: #bottleneck #memory-leak #slow-query #timeout
- **Metrics**: #latency #throughput #error-rate #apdex #core-web-vitals
