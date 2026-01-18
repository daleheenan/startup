---
description: Autonomous project execution - give any requirement and the Project Director will orchestrate all necessary agents and workflows to complete it
argument-hint: [project-requirement]
allowed-tools: Bash(git:*), Bash(npm:*), Read, Write, Edit, Grep, Glob, TodoWrite
---

# Project Director Command

**The single entry point for any project requirement.**

Give me a requirement, and I'll autonomously orchestrate all necessary agents and workflows to deliver a complete solution.

**Project Requirement**: $ARGUMENTS

---

## Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROJECT DIRECTOR                                     │
│                    (Alexandra Sterling, CTO)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PHASE 1: ANALYSIS                                 │   │
│  │  • Parse requirement                                                 │   │
│  │  • Determine scope (feature/bug/improvement/project)                │   │
│  │  • Assess complexity                                                 │   │
│  │  • Select appropriate workflows                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PHASE 2: PLANNING                                 │   │
│  │  • Create project plan                                               │   │
│  │  • Define milestones                                                 │   │
│  │  • Set success criteria                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PHASE 3: EXECUTION                                │   │
│  │                                                                      │   │
│  │    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐      │   │
│  │    │ QC Workflow  │────►│   Feature    │────►│   Security   │      │   │
│  │    │  (if needed) │     │   Workflow   │     │   Review     │      │   │
│  │    └──────────────┘     └──────────────┘     └──────────────┘      │   │
│  │           │                    │                    │               │   │
│  │           ▼                    ▼                    ▼               │   │
│  │    ┌──────────────────────────────────────────────────────────┐    │   │
│  │    │ Agents: PM → Architect → Developer → Reviewer → QA       │    │   │
│  │    │         ↺ (iterate until quality gates pass)             │    │   │
│  │    └──────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PHASE 4: QUALITY GATES                            │   │
│  │  • All tests pass                                                    │   │
│  │  • Code review approved                                              │   │
│  │  • Security scan clean                                               │   │
│  │  • Requirements validated                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PHASE 5: DELIVERY                                 │   │
│  │  • Summary report                                                    │   │
│  │  • Documentation                                                     │   │
│  │  • Recommendations                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Process

### Step 1: Analyze the Requirement

First, the **project-director** agent (Alexandra Sterling) analyzes the requirement to determine:
- **Type**: New feature, bug fix, performance issue, security concern, or full project
- **Scope**: What needs to be delivered
- **Complexity**: Simple (1 agent), Medium (1 workflow), Complex (multiple workflows)
- **Success Criteria**: How we'll know when it's done

### Step 2: Create Project Plan

Create a detailed plan using TodoWrite with:
- Clear phases and milestones
- Agent/workflow assignments for each phase
- Dependencies between tasks
- Quality gates

### Step 3: Execute Workflows

Based on requirement type:

**For New Features**:
1. Run `/qc-workflow` on affected areas (if existing code)
2. Run `/feature-workflow` to implement the feature
3. Final security review

**For Bug Fixes**:
1. Have `bug-hunter` analyze the issue
2. Have `developer` implement fix
3. Have `code-reviewer` review
4. Have `qa-tester` verify fix

**For Performance Issues**:
1. Have `code-optimizer` profile and analyze
2. Have `architect` design optimizations
3. Have `developer` implement
4. Have `qa-test-engineer` benchmark

**For Security Concerns**:
1. Have `security-hardener` assess threats
2. Have `pen-test` verify vulnerabilities
3. Have `developer` remediate
4. Have `security-hardener` re-verify

**For Full Projects**:
1. `/qc-workflow` - Current state assessment
2. `/feature-workflow` - For each major component
3. Iterate until all requirements met

### Step 4: Quality Gates

Before delivery, verify:
- [ ] All automated tests pass
- [ ] Code review approved
- [ ] Security scan shows no critical issues
- [ ] Original requirements are met
- [ ] Documentation is updated

### Step 5: Deliver & Report

Provide comprehensive summary:
- What was accomplished
- Files created/modified
- Quality metrics
- Remaining work (if any)
- Recommendations

---

## Usage Examples

### Simple Feature
```
/project Add a dark mode toggle to the settings page
```

### Bug Fix
```
/project Fix the authentication error when users login with SSO
```

### Performance
```
/project The dashboard is loading slowly, optimize it
```

### Security
```
/project Ensure our API is secure against common attacks
```

### Full Project
```
/project Build a user notification system with email, push, and in-app notifications
```

---

## Notes

- The Project Director operates **autonomously** but will ask for clarification if requirements are ambiguous
- Each phase produces artifacts in `docs/` for traceability
- Quality gates must pass before proceeding to next phase
- The workflow is iterative - issues found in later phases trigger earlier agents
- All work is tracked via TodoWrite for visibility
