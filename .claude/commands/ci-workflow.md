---
description: Execute continuous integration checks - code quality, static analysis, and tests before code review
argument-hint: [target-path-or-module] [optional: --quick|--full]
allowed-tools: Bash(git:*), Bash(npm:*), Bash(npx:*), Read, Write, Edit, Grep, Glob
---

# CI Workflow (Pre-Commit Quality Gate)

Execute automated quality checks before code review. This workflow runs in parallel for efficiency and fails fast on critical issues.

**Target**: $ARGUMENTS

---

## Overview

This workflow automates pre-commit checks to catch issues before they reach code review. Three specialized agents run **in parallel** for maximum efficiency.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CI WORKFLOW PIPELINE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │                    PARALLEL EXECUTION                              │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │     │
│  │  │   Code       │  │    Bug       │  │    Test      │            │     │
│  │  │  Quality     │  │   Hunter     │  │   Runner     │            │     │
│  │  │ Inspector    │  │    (Ray)     │  │   (Kenji)    │            │     │
│  │  │   (Yuki)     │  │              │  │              │            │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘            │     │
│  │                                                                    │     │
│  │  ┌──────────────────────────────────────────────────────────┐    │     │
│  │  │            Integration Test Engineer (Priya)              │    │     │
│  │  │         Verifies complete workflows with real database    │    │     │
│  │  └──────────────────────────────────────────────────────────┘    │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │                    RESULTS AGGREGATION                             │     │
│  │                                                                    │     │
│  │  ┌─────────┐         ┌─────────┐         ┌─────────┐             │     │
│  │  │ Lint &  │         │ Static  │         │  Test   │             │     │
│  │  │ Format  │         │Analysis │         │ Results │             │     │
│  │  └─────────┘         └─────────┘         └─────────┘             │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │           ✅ PASS: Ready for code review                          │     │
│  │           ❌ FAIL: Issues must be fixed first                     │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Execution Modes

### Quick Mode (Default)
Fast checks suitable for pre-commit:
- TypeScript compilation (`--noEmit`)
- Linting (ESLint)
- Changed file analysis only
- Unit tests for affected modules

```
/ci-workflow src/ --quick
```

### Full Mode
Comprehensive checks for PR readiness:
- All quick mode checks
- Full test suite
- Deep bug hunting
- Coverage analysis

```
/ci-workflow src/ --full
```

---

## Phase 1: Parallel Quality Checks

Launch all three agents **in parallel** using a single message with multiple Task tool calls.

### 1a. Code Quality Inspector (Dr. Yuki Tanaka)

Checks:
- TypeScript compilation errors
- ESLint violations
- Code formatting (Prettier)
- Import organization
- Dead code detection

**Output**: Pass/Fail with specific file:line locations

### 1b. Bug Hunter (Detective Ray Morrison)

Checks:
- Null/undefined risks
- Logic errors
- Unhandled promise rejections
- Race conditions in async code
- Type coercion issues

**Output**: List of potential bugs with severity

### 1c. Test Runner (Kenji Watanabe)

Checks:
- Run affected tests (quick mode) or full suite (full mode)
- Check test coverage for changed files
- Identify missing test coverage
- Verify no skipped tests (.skip, .only)

**Output**: Test results with coverage metrics

### 1d. Integration Test Engineer (Dr. Priya Sharma) - Full Mode Only

Checks:
- Complete workflow tests with real database
- Database schema correctness (column names, indexes)
- Foreign key constraint enforcement
- API endpoint behaviour with real data
- Cross-service data integrity

**Output**: Integration test results with schema verification

---

## Phase 2: Results Aggregation

After all parallel agents complete, aggregate results:

### CI Report Format

```markdown
# CI Quality Gate Report

**Target**: [analyzed path]
**Mode**: Quick / Full
**Date**: [timestamp]
**Duration**: [time]

## Summary

| Check | Status | Issues |
|-------|--------|--------|
| Compilation | ✅ PASS / ❌ FAIL | [count] |
| Linting | ✅ PASS / ❌ FAIL | [count] |
| Static Analysis | ✅ PASS / ❌ FAIL | [count] |
| Tests | ✅ PASS / ❌ FAIL | [passed]/[total] |
| Coverage | ✅ PASS / ❌ FAIL | [percentage]% |

## Overall Status: ✅ READY FOR REVIEW / ❌ FIXES REQUIRED

---

## Issues Found

### Critical (Must Fix)
1. [file:line] - [issue description]
2. [file:line] - [issue description]

### High Priority
1. [file:line] - [issue description]

### Warnings
1. [file:line] - [issue description]

---

## Test Results

**Passed**: [N] | **Failed**: [N] | **Skipped**: [N]

### Failed Tests
- [test name]: [failure reason]

### Coverage
| File | Lines | Branches | Functions |
|------|-------|----------|-----------|
| [file] | [%] | [%] | [%] |

---

## Recommendations

1. [Specific action to fix issues]
2. [Specific action to fix issues]
```

---

## Phase 3: Gate Decision

Based on aggregated results:

### ✅ PASS Criteria (ALL must be true)
- TypeScript compiles without errors
- No ESLint errors (warnings allowed)
- All tests pass
- No critical bugs detected
- Coverage >= threshold (if configured)

### ❌ FAIL Actions
1. Report specific failures with file:line locations
2. Provide actionable fix suggestions
3. Optionally auto-fix simple issues (formatting, imports)

---

## Auto-Fix Capability

For certain issues, offer to auto-fix:

```markdown
## Auto-Fixable Issues

The following issues can be automatically fixed:
- [ ] 5 formatting issues (Prettier)
- [ ] 3 import ordering issues
- [ ] 2 unused imports

Run auto-fix? This will modify files directly.
```

If approved, run:
```bash
npx prettier --write [files]
npx eslint --fix [files]
```

---

## How to Spawn Agents (CRITICAL)

**You MUST use the Task tool to spawn agents. NEVER use Bash commands with CLI flags.**

### Correct Way - Launch All 3 Agents in Parallel

Send a SINGLE message with multiple Task tool calls:

```
[Task 1]
- subagent_type: "code-quality-inspector"
- prompt: "Run quality checks on [target path]:
  1. TypeScript compilation: npx tsc --noEmit
  2. ESLint: npx eslint [target] --format json
  3. Check for dead code and unused exports
  Report specific file:line locations for all issues."
- description: "Code quality checks"

[Task 2]
- subagent_type: "bug-hunter"
- prompt: "Static analysis on [target path]:
  1. Find null/undefined risks
  2. Check for unhandled promise rejections
  3. Look for logic errors and type coercion issues
  4. Identify race conditions in async code
  Focus on changed files if this is a quick check."
- description: "Static bug analysis"

[Task 3]
- subagent_type: "qa-test-engineer"
- prompt: "Run tests for [target path]:
  1. Execute: npm test [-- --coverage if full mode]
  2. Report pass/fail counts
  3. List any failed tests with reasons
  4. Check coverage percentages
  5. Flag any .skip or .only in test files"
- description: "Run test suite"

[Task 4] (Full mode only)
- subagent_type: "integration-test-engineer"
- prompt: "Run integration tests for [target path]:
  1. Execute integration tests: npm test -- --testPathPattern=integration
  2. Verify database schema correctness
  3. Check complete workflow tests pass
  4. Verify foreign key constraints are working
  5. Report any SQL errors or schema mismatches"
- description: "Integration tests"
```

### WRONG Way - Never Do This
```
# WRONG - Will fail
Bash: claude agent run --agent code-quality-inspector --prompt "check quality"
```

### Agent Names for subagent_type
- `code-quality-inspector` - Lint, compile, format checks
- `bug-hunter` - Static analysis for bugs
- `qa-test-engineer` - Test execution and coverage
- `integration-test-engineer` - Integration tests with real database (full mode)

---

## Usage Examples

### Pre-Commit Check
```
/ci-workflow src/
```

### Check Specific Module
```
/ci-workflow backend/src/services/
```

### Full PR Readiness Check
```
/ci-workflow . --full
```

### Check Changed Files Only
```
/ci-workflow $(git diff --name-only HEAD~1) --quick
```

---

## Integration with Other Workflows

### Before Feature Workflow
Run CI checks before starting `/feature-workflow` to ensure clean baseline:
```
/ci-workflow src/
# If passes...
/feature-workflow "New Feature" "Description"
```

### Before Deploy Workflow
Run full CI before deployment:
```
/ci-workflow . --full
# If passes...
/deploy-workflow "Release v1.2.0"
```

### After QC Workflow Fixes
Verify QC fixes pass CI:
```
/qc-workflow src/lib/auth/
# Fix issues...
/ci-workflow src/lib/auth/
```

---

## Configuration

The workflow respects project configuration files:
- `tsconfig.json` - TypeScript settings
- `.eslintrc.*` - ESLint rules
- `.prettierrc` - Formatting rules
- `vitest.config.*` or `jest.config.*` - Test settings

### Coverage Thresholds (Optional)

If `coverage.threshold` is configured in test config:
- Lines: >= threshold
- Branches: >= threshold
- Functions: >= threshold

---

## Notes

- Parallel execution reduces total check time significantly
- Quick mode is designed for sub-30-second feedback
- Full mode may take several minutes depending on test suite size
- Auto-fix is safe for formatting but requires approval
- Failed CI should block code review submission

---

**Version**: 1.0
**Last Updated**: January 2026
**Maintainer**: NovelForge Team
