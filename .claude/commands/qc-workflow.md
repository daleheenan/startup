---
description: Execute comprehensive quality control workflow - optimization, testing, bug hunting, and security hardening - then automatically launch feature-workflow for fixes
argument-hint: [target-path-or-module] [optional: focus-area]
allowed-tools: Bash(git:*), Bash(npm:*), Read, Write, Edit, Grep, Glob
---

# Quality Control Workflow

Execute a comprehensive quality control analysis and automatically generate feature requests for the development workflow.

**Target**: $ARGUMENTS

---

## Overview

This workflow runs four specialized QC agents in sequence, each building on the previous findings. The consolidated output becomes the input for `/feature-workflow` to fix identified issues.

```
┌─────────────────────────────────────────────────────────────────┐
│                    QC WORKFLOW PIPELINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │    Code      │───►│    Test      │───►│     Bug      │      │
│  │  Optimizer   │    │  Architect   │    │   Hunter     │      │
│  │   (Marcus)   │    │   (Sarah)    │    │    (Ray)     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────────────────────────────────────────────┐      │
│  │         Integration Test Engineer (Priya)            │      │
│  │    Complete workflow tests with real database        │      │
│  └──────────────────────────────────────────────────────┘      │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              Security Hardener (Alex)                │      │
│  │         Final security review of all findings        │      │
│  └──────────────────────────────────────────────────────┘      │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────┐      │
│  │           QC CONSOLIDATED REPORT                     │      │
│  │         docs/qc/QC_REPORT.md                         │      │
│  └──────────────────────────────────────────────────────┘      │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────┐      │
│  │           /feature-workflow (auto-launch)            │      │
│  │         Implements fixes via PM→Arch→Dev→QA          │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Code Optimization Analysis

Have the **code-optimizer** agent (Marcus Chen) analyze the target code for:
- Performance bottlenecks
- Code quality issues
- Memory inefficiencies
- Redundant operations
- Opportunities for improvement

**Output**: `docs/qc/01_OPTIMIZATION_REPORT.md`

**Wait for completion before proceeding.**

---

## Phase 2: Test Architecture Analysis

Have the **test-architect** agent (Dr. Sarah Okonkwo) analyze the target code for:
- Test coverage gaps
- Missing test types (unit, integration, E2E)
- Test quality issues
- Critical untested paths
- Test infrastructure needs

**Context**: Include findings from Phase 1 to inform test priorities.

**Output**: `docs/qc/02_TEST_REPORT.md`

**Wait for completion before proceeding.**

---

## Phase 3: Bug Hunting

Have the **bug-hunter** agent (Detective Ray Morrison) analyze the target code for:
- Logic errors
- Null/undefined bugs
- Race conditions
- State management issues
- Error handling gaps
- Edge case failures

**Context**: Include findings from Phases 1-2 to focus investigation.

**Output**: `docs/qc/03_BUG_REPORT.md`

**Wait for completion before proceeding.**

---

## Phase 4: Integration Testing

Have the **integration-test-engineer** agent (Dr. Priya Sharma) verify:
- Complete workflow tests with real database
- Database schema correctness (all columns exist as expected)
- Foreign key relationships and cascade behaviours
- API endpoints with real data backing
- Cross-service data integrity
- SQL query correctness (catches `p.title` vs `p.name` errors)

**Context**: Review findings from previous phases to focus integration tests.

**Output**: `docs/qc/04_INTEGRATION_REPORT.md`

**Wait for completion before proceeding.**

---

## Phase 5: Security Hardening

Have the **security-hardener** agent (Commander Alex Volkov) analyze:
- All code in target area
- All findings from previous phases (security implications)
- OWASP Top 10 vulnerabilities
- Dependency vulnerabilities
- Security misconfigurations
- Attack surface analysis

**Context**: Review all previous reports for security-relevant findings.

**Output**: `docs/qc/05_SECURITY_REPORT.md`

**Wait for completion before proceeding.**

---

## Phase 6: Consolidation

Create a consolidated QC report that:

1. **Prioritizes all findings** by:
   - Severity (Critical > High > Medium > Low)
   - Type (Security > Bugs > Tests > Optimization)
   - Effort (Quick wins first)

2. **Creates feature requests** formatted for `/feature-workflow`:
   - Group related issues into logical features
   - Write clear acceptance criteria
   - Estimate complexity

3. **Generates executive summary**:
   - Overall code health score
   - Critical issues count
   - Recommended sprint allocation

**Output**: `docs/qc/QC_REPORT.md`

### Consolidated Report Format

```markdown
# Quality Control Report

**Target**: [analyzed path/module]
**Date**: [date]
**Overall Health Score**: [1-10]

## Executive Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | X        | X    | X      | X   |
| Bugs     | X        | X    | X      | X   |
| Tests    | X        | X    | X      | X   |
| Performance | X     | X    | X      | X   |

**Recommendation**: [Sprint allocation recommendation]

## Critical Issues (Immediate Action)
[Top 5 most critical findings across all categories]

## Feature Requests for Development

### Feature 1: [Security Hardening - Authentication]
**Priority**: Critical
**Estimated Effort**: Medium
**Issues Addressed**: VULN-001, VULN-003, BUG-012

**Description**:
[Clear description of what needs to be built/fixed]

**Acceptance Criteria**:
- [ ] [Specific, testable criterion]
- [ ] [Specific, testable criterion]

---

### Feature 2: [Test Coverage - API Endpoints]
[Same format]

---

## Detailed Reports
- [01_OPTIMIZATION_REPORT.md](./01_OPTIMIZATION_REPORT.md)
- [02_TEST_REPORT.md](./02_TEST_REPORT.md)
- [03_BUG_REPORT.md](./03_BUG_REPORT.md)
- [04_INTEGRATION_REPORT.md](./04_INTEGRATION_REPORT.md)
- [05_SECURITY_REPORT.md](./05_SECURITY_REPORT.md)
```

---

## Phase 7: Automatic Feature Workflow Launch

After the consolidated report is complete:

1. **Ask for confirmation**: "QC analysis complete. Found X critical, Y high priority issues. Ready to launch /feature-workflow to implement fixes?"

2. **If approved**, automatically invoke `/feature-workflow` with:
   ```
   /feature-workflow "QC Fixes" "[Summary of top priority fixes from QC_REPORT.md]"
   ```

3. The feature workflow will:
   - Have PM create spec from QC findings
   - Have architect design fix implementation
   - Have developers implement fixes
   - Have reviewers verify fixes
   - Have QA validate fixes

---

## Usage Examples

### Full Codebase QC
```
/qc-workflow src/
```

### Specific Module QC
```
/qc-workflow src/lib/auth/ security
```

### Focus on Testing Gaps
```
/qc-workflow src/api/ testing
```

---

## Notes

- All reports are saved to `docs/qc/` directory
- Each phase builds on previous findings
- Critical security issues are flagged for immediate attention
- The workflow can be paused between any phases
- Previous QC reports are archived with timestamps

---

## How to Spawn Agents (CRITICAL)

**You MUST use the Task tool to spawn agents. NEVER use Bash commands with CLI flags.**

### Correct Way - Use Task Tool
When this workflow says "Have the **agent** agent...", you MUST use the Task tool:
- `subagent_type`: The agent name
- `prompt`: The detailed task instructions
- `description`: A short 3-5 word summary

**Run QC agents in parallel** by including multiple Task tool calls in a single message:

**Example - Launch all 5 QC agents in parallel:**
```
[Task 1]
- subagent_type: "code-optimizer"
- prompt: "Analyze code in [target path] for performance bottlenecks, code quality issues, memory inefficiencies, redundant operations. Write report to docs/qc/01_OPTIMIZATION_REPORT.md"
- description: "Code optimization analysis"

[Task 2]
- subagent_type: "test-architect"
- prompt: "Analyze test coverage in [target path]. Find gaps in unit, integration, E2E tests. Identify critical untested paths. Write report to docs/qc/02_TEST_REPORT.md"
- description: "Test coverage analysis"

[Task 3]
- subagent_type: "bug-hunter"
- prompt: "Hunt for bugs in [target path]. Look for logic errors, null/undefined issues, race conditions, state management bugs, error handling gaps. Write report to docs/qc/03_BUG_REPORT.md"
- description: "Bug detection analysis"

[Task 4]
- subagent_type: "integration-test-engineer"
- prompt: "Create and run integration tests for [target path]. Verify complete workflows with real database, check schema correctness (all columns exist), test foreign key constraints, verify API endpoints return correct data. Write report to docs/qc/04_INTEGRATION_REPORT.md"
- description: "Integration test verification"

[Task 5]
- subagent_type: "security-hardener"
- prompt: "Security audit of [target path]. Check OWASP Top 10, dependency vulnerabilities, security misconfigurations, attack surface. Write report to docs/qc/05_SECURITY_REPORT.md"
- description: "Security vulnerability scan"
```

### WRONG Way - Never Do This
```
# WRONG - Will fail with "unknown option --prompt"
Bash: claude agent run --agent bug-hunter --prompt "find bugs"

# WRONG - CLI doesn't support this
Bash: npx claude --agent security-hardener --task "audit code"
```

### Agent Names for subagent_type
- `code-optimizer` - Phase 1: Performance & code quality
- `test-architect` - Phase 2: Test strategy & coverage
- `bug-hunter` - Phase 3: Bug detection & logic errors
- `integration-test-engineer` - Phase 4: Integration tests with real database
- `security-hardener` - Phase 5: Security assessment

---

## Continuous QC Automation

### Automatic Trigger Points

The QC workflow can be configured to run automatically at these trigger points:

#### 1. On PR Creation
When a pull request is created, run a focused QC scan on changed files:
```
Trigger: PR created
Scope: Changed files only
Mode: Quick (parallel agents)
Action: Add findings as PR comments
```

#### 2. After N Commits to Main
Run full QC after accumulating changes:
```
Trigger: Every 10 commits to main branch
Scope: Full codebase
Mode: Comprehensive
Action: Create QC report, notify if critical issues
```

#### 3. Nightly Full Scan
Comprehensive overnight analysis:
```
Trigger: Daily at 2:00 AM
Scope: Full codebase
Mode: Deep analysis
Action: Generate report, create issues for new findings
```

#### 4. Pre-Release Gate
Mandatory QC before deployment:
```
Trigger: Before /deploy-workflow
Scope: Full codebase
Mode: Comprehensive with security focus
Action: Block deployment if critical issues, require approval for high issues
```

---

### Automation Configuration

Create `.qc-config.json` to configure automatic triggers:

```json
{
  "triggers": {
    "onPR": {
      "enabled": true,
      "scope": "changed_files",
      "agents": ["bug-hunter", "security-hardener"],
      "failOn": "critical"
    },
    "onCommitCount": {
      "enabled": true,
      "threshold": 10,
      "branch": "main",
      "scope": "full",
      "agents": "all"
    },
    "nightly": {
      "enabled": true,
      "time": "02:00",
      "timezone": "UTC",
      "scope": "full",
      "agents": "all"
    },
    "preRelease": {
      "enabled": true,
      "scope": "full",
      "agents": "all",
      "failOn": "high",
      "requireApproval": true
    }
  },
  "notifications": {
    "slack": "https://hooks.slack.com/...",
    "email": "team@example.com",
    "notifyOn": ["critical", "high"]
  },
  "history": {
    "keepReports": 30,
    "archiveLocation": "docs/qc/archive/"
  }
}
```

---

### Quick QC Mode

For rapid feedback during development:

```
/qc-workflow src/ --quick
```

Quick mode:
- Runs all 4 agents **in parallel** (not sequential)
- Focuses on critical and high severity only
- Skips deep analysis, focuses on obvious issues
- Target completion: < 5 minutes
- Output: Single consolidated report (no individual phase reports)

---

### Differential QC

Run QC only on files changed since last scan:

```
/qc-workflow --diff
```

Differential mode:
1. Check `.qc-last-scan` timestamp
2. Find files modified since then
3. Run QC only on those files
4. Update timestamp on completion

---

### QC Trend Tracking

Track QC metrics over time:

```markdown
## QC Health Dashboard

### Trend: Last 10 Scans
| Date | Health Score | Critical | High | Medium | Low |
|------|--------------|----------|------|--------|-----|
| 2026-01-27 | 8.5 | 0 | 2 | 5 | 12 |
| 2026-01-20 | 7.8 | 1 | 3 | 8 | 15 |
| 2026-01-13 | 7.2 | 2 | 5 | 10 | 18 |

### Issue Resolution Rate
| Category | Found | Fixed | Remaining | Fix Rate |
|----------|-------|-------|-----------|----------|
| Security | 5 | 4 | 1 | 80% |
| Bugs | 12 | 10 | 2 | 83% |
| Tests | 8 | 8 | 0 | 100% |
| Performance | 3 | 2 | 1 | 67% |

### Top Recurring Issues
1. **Missing error handling** - Found in 3 consecutive scans
2. **Insufficient test coverage** - Recurring for 2 weeks
```

---

### Integration with CI/CD

Add to GitHub Actions workflow:

```yaml
# .github/workflows/qc-check.yml
name: Quality Control Check

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Nightly at 2 AM
  workflow_dispatch:  # Manual trigger

jobs:
  qc-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run QC Workflow
        run: |
          # Invoke QC workflow via Claude Code
          # (Implementation depends on your CI integration)

      - name: Upload QC Report
        uses: actions/upload-artifact@v4
        with:
          name: qc-report
          path: docs/qc/QC_REPORT.md

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            // Post QC findings as PR comment
```

---

### Comparison Mode

Compare current state against baseline:

```
/qc-workflow src/ --compare baseline
```

Outputs:
- New issues introduced since baseline
- Issues that were fixed
- Regression detection
- Health score delta
