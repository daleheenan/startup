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
