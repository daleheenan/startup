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

## Phase 4: Security Hardening

Have the **security-hardener** agent (Commander Alex Volkov) analyze:
- All code in target area
- All findings from previous phases (security implications)
- OWASP Top 10 vulnerabilities
- Dependency vulnerabilities
- Security misconfigurations
- Attack surface analysis

**Context**: Review all previous reports for security-relevant findings.

**Output**: `docs/qc/04_SECURITY_REPORT.md`

**Wait for completion before proceeding.**

---

## Phase 5: Consolidation

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
- [04_SECURITY_REPORT.md](./04_SECURITY_REPORT.md)
```

---

## Phase 6: Automatic Feature Workflow Launch

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

**Example - Launch all 4 QC agents in parallel:**
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
- subagent_type: "security-hardener"
- prompt: "Security audit of [target path]. Check OWASP Top 10, dependency vulnerabilities, security misconfigurations, attack surface. Write report to docs/qc/04_SECURITY_REPORT.md"
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
- `security-hardener` - Phase 4: Security assessment
