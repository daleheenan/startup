# Quality Control Workflow

**Command:** `/qc-workflow`

**Purpose:** Orchestrates a comprehensive quality control pipeline that analyzes code for optimization opportunities, test gaps, bugs, and security vulnerabilities, then automatically feeds findings into the feature development workflow.

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    QC WORKFLOW PIPELINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: CODE OPTIMIZER (Marcus Chen)                         │
│  ├── Performance analysis                                       │
│  ├── Code quality review                                        │
│  └── Output: docs/qc/01_OPTIMIZATION_REPORT.md                 │
│                           │                                     │
│                           ▼                                     │
│  Phase 2: TEST ARCHITECT (Dr. Sarah Okonkwo)                   │
│  ├── Coverage analysis                                          │
│  ├── Test quality assessment                                    │
│  └── Output: docs/qc/02_TEST_REPORT.md                         │
│                           │                                     │
│                           ▼                                     │
│  Phase 3: BUG HUNTER (Detective Ray Morrison)                  │
│  ├── Logic error detection                                      │
│  ├── Race condition analysis                                    │
│  └── Output: docs/qc/03_BUG_REPORT.md                          │
│                           │                                     │
│                           ▼                                     │
│  Phase 4: SECURITY HARDENER (Commander Alex Volkov)            │
│  ├── Vulnerability assessment                                   │
│  ├── OWASP Top 10 check                                         │
│  └── Output: docs/qc/04_SECURITY_REPORT.md                     │
│                           │                                     │
│                           ▼                                     │
│  Phase 5: CONSOLIDATION                                         │
│  ├── Prioritize all findings                                    │
│  ├── Generate feature requests                                  │
│  └── Output: docs/qc/QC_REPORT.md                              │
│                           │                                     │
│                           ▼                                     │
│  Phase 6: AUTO-LAUNCH /feature-workflow                        │
│  └── PM → Architect → Developer → Reviewer → QA                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Agents Used

| Agent | Persona | Specialty |
|-------|---------|-----------|
| code-optimizer | Marcus Chen | Performance & code quality |
| test-architect | Dr. Sarah Okonkwo | Test strategy & coverage |
| bug-hunter | Detective Ray Morrison | Bug detection & logic errors |
| security-hardener | Commander Alex Volkov | Security & vulnerability assessment |

## Usage

```bash
# Full codebase analysis
/qc-workflow src/

# Specific module
/qc-workflow src/lib/auth/

# With focus area
/qc-workflow src/api/ security
```

## Output Structure

```
docs/qc/
├── 01_OPTIMIZATION_REPORT.md
├── 02_TEST_REPORT.md
├── 03_BUG_REPORT.md
├── 04_SECURITY_REPORT.md
└── QC_REPORT.md (consolidated)
```

## Integration with Feature Workflow

The consolidated QC_REPORT.md contains:
- Prioritized issues by severity
- Feature requests formatted for `/feature-workflow`
- Sprint allocation recommendations

When approved, the workflow automatically launches:
```
/feature-workflow "QC Fixes" "[extracted feature requests]"
```

This triggers the full development cycle:
1. PM creates spec from QC findings
2. Architect designs fix implementation
3. Developer implements fixes
4. Reviewer verifies fixes
5. QA validates fixes

## Best Practices

1. **Run regularly**: Weekly or before major releases
2. **Focus areas**: Target high-risk modules first
3. **Track trends**: Compare reports over time
4. **Fix critical first**: Security > Bugs > Tests > Optimization
5. **Automate**: Consider CI/CD integration for continuous QC

---

## How to Spawn Agents (CRITICAL)

**You MUST use the Task tool to spawn agents. NEVER use Bash commands with CLI flags.**

### Correct Way - Use Task Tool
When launching agents in this workflow, use the Task tool with:
- `subagent_type`: The agent name
- `prompt`: The detailed task instructions
- `description`: A short 3-5 word summary

**Run agents in parallel when possible** by including multiple Task tool calls in a single message:

**Example - Launch all QC agents in parallel:**
```
[Task 1 - Code Optimizer]
- subagent_type: "code-optimizer"
- prompt: "Analyze code in [target path] for performance issues, code quality, and optimization opportunities. Write findings to docs/qc/01_OPTIMIZATION_REPORT.md"
- description: "Code optimization analysis"

[Task 2 - Test Architect]
- subagent_type: "test-architect"
- prompt: "Analyze test coverage and quality in [target path]. Identify gaps and recommend improvements. Write findings to docs/qc/02_TEST_REPORT.md"
- description: "Test coverage analysis"

[Task 3 - Bug Hunter]
- subagent_type: "bug-hunter"
- prompt: "Analyze code in [target path] for bugs, logic errors, race conditions, and potential runtime failures. Write findings to docs/qc/03_BUG_REPORT.md"
- description: "Bug detection analysis"

[Task 4 - Security Hardener]
- subagent_type: "security-hardener"
- prompt: "Perform security assessment of [target path]. Check OWASP Top 10, authentication, authorization, injection vulnerabilities. Write findings to docs/qc/04_SECURITY_REPORT.md"
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
- `security-hardener` - Phase 4: Security & vulnerability assessment

---

## Self-Reinforcement Learning

### Pre-Workflow: Load Lessons
1. **Read**: `.claude/lessons/qc-workflow.lessons.md` and `.claude/lessons/shared.lessons.md`
2. **Cross-reference**: Check lessons from all QC agents

### Post-Workflow: Reflect and Record
1. **Reflect**: What findings were most critical? What was missed by individual agents?
2. **Update Scores**: Increment scores for QC patterns that found important issues
3. **Record New Lesson**: Append to `.claude/lessons/qc-workflow.lessons.md` with tags like `#workflow #quality #security`
