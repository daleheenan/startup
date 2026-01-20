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
│                      (Dale Heenan, Founder)                                  │
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

First, the **project-director** agent (Dale Heenan) analyzes the requirement to determine:
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

## Progress Reporting

The Project Director provides detailed highlight reports to keep you fully informed:

### Automatic Reports At:
- **Phase transitions** - When moving between Analysis → Planning → Execution → QA → Delivery
- **Agent handoffs** - When delegating work to a new specialist agent
- **Milestones** - When significant deliverables are completed
- **Blockers** - Immediately when issues arise that need attention
- **Regular intervals** - Every 3-5 agent interactions during smooth execution

### Report Types:

**1. Full Project Highlight Report** (at phase transitions & milestones):
```
╔══════════════════════════════════════════════════════════════════════════════╗
║                         📋 PROJECT HIGHLIGHT REPORT                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Project: [Name]           Status: 🟢 On Track / 🟡 At Risk / 🔴 Blocked      ║
║ Report #: [N]             Overall Progress: [██████░░░░] XX%                 ║
╚══════════════════════════════════════════════════════════════════════════════╝

Includes:
• Executive Summary - High-level status overview
• Phase Progress - Visual progress bars for each phase
• Agent Activity Log - Who did what and current status
• Key Accomplishments - What was achieved this period
• Files Modified - Created/modified/deleted files
• Quality Metrics - Tests, coverage, reviews, security
• Risks & Issues - Current blockers and mitigations
• Next Steps - Upcoming work with agent assignments
• Decisions & Notes - Key decisions and observations
```

**2. Quick Status Update** (between full reports):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 QUICK UPDATE | [Phase] | [HH:MM elapsed] | [XX]% complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Just completed: [Task] by [Agent]
🔄 Now working on: [Task] by [Agent]
📋 Up next: [Task]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**3. Blocker Alert** (immediate escalation):
```
╔══════════════════════════════════════════════════════════════════════════════╗
║ 🚨 BLOCKER ALERT                     Severity: 🔴 Critical / 🟠 High / 🟡 Med ║
╚══════════════════════════════════════════════════════════════════════════════╝
Issue:        [Description]
Agent:        [Who encountered it]
Impact:       [What this blocks]
Root Cause:   [Analysis]

OPTIONS:
1. [Option A] - Impact: [Trade-offs]
2. [Option B] - Impact: [Trade-offs]

Recommendation: [Suggested approach]
⏳ Awaiting user decision...
```

---

## Notes

- The Project Director operates **autonomously** but will ask for clarification if requirements are ambiguous
- Each phase produces artifacts in `docs/` for traceability
- Quality gates must pass before proceeding to next phase
- The workflow is iterative - issues found in later phases trigger earlier agents
- All work is tracked via TodoWrite for visibility
- **Progress reports keep you informed without interrupting the workflow**

---

## How to Spawn Agents (CRITICAL)

**You MUST use the Task tool to spawn agents. NEVER use Bash commands with CLI flags.**

### Correct Way - Use Task Tool
To delegate work to agents, use the Task tool with:
- `subagent_type`: The agent name (e.g., "bug-hunter", "security-hardener", "developer")
- `prompt`: The detailed task instructions
- `description`: A short 3-5 word summary

**Example - Spawn a single agent:**
```
Task tool call:
- subagent_type: "security-hardener"
- prompt: "Analyze the authentication system in src/lib/server/auth/ for security vulnerabilities. Check for: injection attacks, session management issues, authentication bypasses. Provide a detailed report with severity ratings."
- description: "Security audit of auth"
```

**Example - Spawn multiple agents in parallel:**
When agents can work independently, spawn them in a SINGLE message with multiple Task tool calls:
```
[Task 1]
- subagent_type: "code-quality-inspector"
- prompt: "Review code quality in src/lib/server/..."
- description: "Code quality review"

[Task 2]
- subagent_type: "security-hardener"
- prompt: "Audit security in src/routes/api/..."
- description: "Security audit"

[Task 3]
- subagent_type: "ux-design-specialist"
- prompt: "Evaluate UX of the dashboard..."
- description: "UX evaluation"
```

### WRONG Way - Never Do This
```
# WRONG - Will fail with "unknown option --prompt"
Bash: claude agent run --agent developer --prompt "implement feature"

# WRONG - CLI doesn't support this
Bash: npx claude --agent security-hardener --task "audit code"
```

### Agent Names for subagent_type
Use these exact names with the Task tool:
- `agile-product-strategist` - Product roadmaps, MVPs
- `pm-spec-writer` - Feature specifications
- `architect` - Technical design
- `software-architect-designer` - SOLID architecture
- `ux-design-specialist` - UI/UX design
- `developer` - Implementation
- `implementation-engineer` - Complex implementations
- `code-simplifier` - Refactoring
- `code-reviewer` - Code reviews
- `code-quality-inspector` - Quality checks
- `qa-tester` - Manual testing
- `qa-test-engineer` - Automated testing
- `test-architect` - Test strategy
- `bug-hunter` - Bug detection
- `security-hardener` - Security assessment
- `pen-test` - Penetration testing
- `code-optimizer` - Performance
