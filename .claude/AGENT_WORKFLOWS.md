# Agent Workflow Documentation

This document describes the complete agent ecosystem, workflows, and how they interconnect to deliver automated, high-quality software development.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AGENT ECOSYSTEM                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         ORCHESTRATION LAYER                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │   Project    │  │    Sprint    │  │   Progress   │  │   Retro    │  │   │
│  │  │   Director   │  │ Orchestrator │  │   Reporter   │  │Facilitator │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          WORKFLOW LAYER                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │
│  │  │ Feature  │  │    QC    │  │    CI    │  │  Deploy  │  │  Design  │  │   │
│  │  │ Workflow │  │ Workflow │  │ Workflow │  │ Workflow │  │ Workflow │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         SPECIALIST AGENTS                                │   │
│  │                                                                          │   │
│  │  Planning        Development       Quality          Security/Perf        │   │
│  │  ─────────       ───────────       ───────          ─────────────        │   │
│  │  • PM Spec       • Developer       • Code Review    • Pen Test           │   │
│  │  • Architect     • API Agent       • QA Tester      • Security           │   │
│  │  • UX Design     • Frontend        • Test Engineer  • Performance        │   │
│  │  • Strategist    • Schema          • Bug Hunter     • SEO                │   │
│  │                  • Service         • Optimizer                           │   │
│  │                  • Integration     • Simplifier                          │   │
│  │                                    • Inspector                           │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         DEPLOYMENT LAYER                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │   │
│  │  │   Deployer   │  │   Monitor    │  │    Doctor    │                   │   │
│  │  │    (Pat)     │  │   (Zara)     │  │    (Ibe)     │                   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         LEARNING SYSTEM                                  │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │   │
│  │  │  .claude/lessons/                                                 │   │   │
│  │  │  ├── shared.lessons.md (cross-cutting lessons)                   │   │   │
│  │  │  ├── {agent-name}.lessons.md (per-agent lessons)                 │   │   │
│  │  │  └── Score-based promotion & archival                            │   │   │
│  │  └──────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Development Lifecycle

### Phase 1: Project Initiation

```
User Requirement
       │
       ▼
┌──────────────────┐
│ PROJECT DIRECTOR │ ◄─── /project command
│   (Dale Heenan)  │
└────────┬─────────┘
         │
         ├── Analyzes requirement scope
         ├── Determines complexity
         ├── Selects appropriate workflow(s)
         └── Creates execution plan
```

### Phase 2: Feature Development

```
/feature-workflow
       │
       ▼
┌──────────────────┐
│  PM SPEC WRITER  │ ─── Creates specification
│  (Emily Rodriguez)│     Output: docs/specs/FEATURE_SPEC.md
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    ARCHITECT     │ ─── Creates technical design
│ (Dr. James Okafor)│    Output: docs/specs/TECHNICAL_DESIGN.md
└────────┬─────────┘     Output: docs/specs/IMPLEMENTATION_TASKS.md
         │
         ▼
┌──────────────────────────────────────────────────────┐
│              IMPLEMENTATION LOOP                      │
│                                                       │
│  ┌─────────────┐     ┌─────────────┐                │
│  │  DEVELOPER  │────►│   CODE      │                │
│  │(Priya Sharma)│    │  REVIEWER   │                │
│  └─────────────┘     │(Michael Torres)              │
│         ▲            └──────┬──────┘                │
│         │                   │                        │
│         │ Changes           │ Approved               │
│         │ Requested         ▼                        │
│         │            ┌─────────────┐                │
│         └────────────│  QA TESTER  │                │
│                      │ (Lisa Chen) │                │
│                      └──────┬──────┘                │
│                             │                        │
│                      QA Passed                       │
└─────────────────────────────┼────────────────────────┘
                              │
                              ▼
                    Feature Complete!
```

### Phase 3: Quality Control

```
/qc-workflow (runs in parallel)
       │
       ├──────────────────────────────────────────────────┐
       │                                                   │
       ▼                   ▼                   ▼           ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│    CODE      │  │    TEST      │  │     BUG      │  │   SECURITY   │
│  OPTIMIZER   │  │  ARCHITECT   │  │   HUNTER     │  │  HARDENER    │
│(Marcus Chen) │  │(Dr. Sarah O.)│  │(Detective Ray)│ │(Cmdr. Alex)  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │                 │
       └─────────────────┴────────┬────────┴─────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────┐
                    │  CONSOLIDATED REPORT │
                    │  docs/qc/QC_REPORT.md│
                    └──────────┬───────────┘
                               │
                               ▼
                    Auto-launch /feature-workflow
                    to fix identified issues
```

### Phase 4: Pre-Commit Verification

```
/ci-workflow (runs in parallel)
       │
       ├────────────────────────────────────────┐
       │                                         │
       ▼                   ▼                     ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│    CODE      │  │     BUG      │  │     QA       │
│  QUALITY     │  │   HUNTER     │  │    TEST      │
│  INSPECTOR   │  │    (Ray)     │  │  ENGINEER    │
│   (Yuki)     │  │              │  │   (Kenji)    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       │ Lint/Compile    │ Static Analysis │ Run Tests
       │                 │                 │
       └─────────────────┴────────┬────────┘
                                  │
                                  ▼
                    ┌──────────────────────┐
                    │    GATE DECISION     │
                    │  ✅ Ready for Review │
                    │  ❌ Fixes Required   │
                    └──────────────────────┘
```

### Phase 5: Deployment

```
/deploy-workflow
       │
       ▼
┌──────────────────┐
│  PRE-DEPLOYMENT  │ ─── Code quality, tests, git status
│     CHECKS       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    DEPLOYER      │ ─── Commit, push, monitor pipeline
│  (Pat Okonkwo)   │
└────────┬─────────┘
         │
         ├── [Standard Mode] ───────────────────┐
         │                                       │
         ├── [Canary Mode] ──┐                  │
         │                   │                   │
         │        ┌──────────▼──────────┐       │
         │        │  CANARY VALIDATION  │       │
         │        │  10% → 25% → 50%    │       │
         │        │  → 100% rollout     │       │
         │        └──────────┬──────────┘       │
         │                   │                   │
         └───────────────────┴───────────────────┤
                                                 │
                                                 ▼
                              ┌──────────────────────────┐
                              │   DEPLOYMENT MONITOR     │
                              │     (Zara Hassan)        │
                              │                          │
                              │  • Multi-layer health    │
                              │  • Response time check   │
                              │  • Error rate monitoring │
                              │  • Dependency checks     │
                              └────────────┬─────────────┘
                                           │
                              ┌────────────┴────────────┐
                              │                         │
                         Health OK               Health FAIL
                              │                         │
                              ▼                         ▼
                    ┌──────────────┐        ┌──────────────────┐
                    │  DEPLOYMENT  │        │ DEPLOYMENT DOCTOR │
                    │   VERIFIED   │        │   (Dr. Ibe K.)    │
                    └──────────────┘        │                   │
                                            │  • Diagnose       │
                                            │  • Fix            │
                                            │  • Retry (max 2)  │
                                            │  • Auto-rollback  │
                                            └──────────────────┘
```

### Phase 6: Learning & Retrospective

```
Sprint Complete
       │
       ▼
┌────────────────────────────────────┐
│  SPRINT RETROSPECTIVE FACILITATOR  │
│        (Dr. Amara Osei)            │
└────────────────┬───────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Gather  │ │Synthesize│ │ Update │
│ Lessons │ │ Themes  │ │ Files  │
└─────────┘ └─────────┘ └─────────┘
    │            │            │
    └────────────┴────────────┘
                 │
                 ▼
┌──────────────────────────────────┐
│  AUTOMATED OUTPUTS               │
│                                  │
│  • Lesson effectiveness dashboard│
│  • Improvement tickets           │
│  • Cross-sprint trend analysis   │
│  • Shared lesson proposals       │
│  • Agent file update proposals   │
└──────────────────────────────────┘
                 │
                 ▼
       Next Sprint Starts
       (with lessons applied)
```

---

## Agent Reference

### Orchestration Agents

| Agent | Persona | Role | Invocation |
|-------|---------|------|------------|
| project-director | Dale Heenan | Executive orchestrator | `/project [requirement]` |
| sprint-orchestrator | Theo Smith | Sprint execution | Internal use |
| progress-reporter | - | Real-time monitoring | Internal use |
| sprint-retrospective-facilitator | Dr. Amara Osei | End-of-sprint learning | After sprint |

### Planning Agents

| Agent | Persona | Role | Invocation |
|-------|---------|------|------------|
| pm-spec-writer | Emily Rodriguez | Feature specifications | Phase 1 of feature-workflow |
| architect | Dr. James Okafor | Technical design | Phase 2 of feature-workflow |
| software-architect-designer | Dr. Aisha Patel | SOLID architecture | System design tasks |
| agile-product-strategist | David Kim | Sprint planning, MVPs | Product planning |
| ux-design-specialist | Maya Johnson | UI/UX design | `/design-workflow` |

### Development Agents

| Agent | Persona | Role | When to Use |
|-------|---------|------|-------------|
| developer | Priya Sharma | General implementation | Full-stack features |
| implementation-engineer | Carlos Mendez | Complex implementations | Critical features |
| api-agent | - | REST API endpoints | API-focused tasks |
| frontend-agent | - | UI pages/components | UI-focused tasks |
| schema-agent | - | Database design | Database-focused tasks |
| service-agent | - | Business logic (TDD) | Complex business rules |
| integration-agent | - | E2E testing | Cross-stack integration |

### Quality Agents

| Agent | Persona | Role | When to Use |
|-------|---------|------|-------------|
| code-reviewer | Michael Torres | Code review | After implementation |
| code-quality-inspector | Dr. Yuki Tanaka | Comprehensive QC | `/ci-workflow` |
| qa-tester | Lisa Chen | Manual testing | After code review |
| qa-test-engineer | Kenji Watanabe | Automated testing | `/ci-workflow` |
| test-architect | Dr. Sarah Okonkwo | Test strategy | `/qc-workflow` |
| bug-hunter | Detective Ray Morrison | Bug detection | `/qc-workflow`, `/ci-workflow` |
| code-optimizer | Marcus Chen | Performance | `/qc-workflow` |
| code-simplifier | Dr. Mei-Lin Wong | Refactoring | Code cleanup tasks |

### Security & Performance Agents

| Agent | Persona | Role | When to Use |
|-------|---------|------|-------------|
| security-hardener | Commander Alex Volkov | Security audit | `/qc-workflow` |
| pen-test | Viktor Kowalski | Penetration testing | Security assessment |
| performance-test-engineer | Dr. Kai Nakamura | Load testing | Before release |

### Deployment Agents

| Agent | Persona | Role | When to Use |
|-------|---------|------|-------------|
| deployer | Pat Okonkwo | Commit/push/deploy | `/deploy-workflow` |
| deployment-monitor | Zara Hassan | Health monitoring | `/deploy-workflow` |
| deployment-doctor | Dr. Ibe Kovacs | Failure diagnosis | On deployment failure |

### Support Agents

| Agent | Persona | Role | When to Use |
|-------|---------|------|-------------|
| documentation-agent | Dr. Eleanor Wright | API docs, ADRs | After feature complete |
| lessons-curator | - | Maintain lesson files | Monthly or when needed |

---

## Workflow Commands

| Command | Purpose | Agents Used |
|---------|---------|-------------|
| `/project` | Universal entry point | All (as needed) |
| `/feature-workflow` | Complete feature development | PM → Architect → Dev → Review → QA |
| `/qc-workflow` | Quality control analysis | Optimizer, Test Architect, Bug Hunter, Security |
| `/ci-workflow` | Pre-commit quality gate | Quality Inspector, Bug Hunter, Test Engineer |
| `/deploy-workflow` | Deployment pipeline | Deployer, Monitor, Doctor |
| `/design-workflow` | UI/UX focused development | UX → Architect → Dev → QA → UX Verify |
| `/tech-request` | Technical implementation | Architect → Dev → Review → QA |

---

## Self-Reinforcement Learning System

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    LEARNING LOOP                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PRE-TASK                                                    │
│     ┌─────────────────────────────────────────────────────────┐│
│     │ Agent reads:                                             ││
│     │ • .claude/lessons/{agent-name}.lessons.md               ││
│     │ • .claude/lessons/shared.lessons.md                     ││
│     │ • Related agents' lessons (cross-reference)             ││
│     └─────────────────────────────────────────────────────────┘│
│                              │                                  │
│                              ▼                                  │
│  2. DURING TASK                                                 │
│     ┌─────────────────────────────────────────────────────────┐│
│     │ Agent applies lessons:                                   ││
│     │ • Proven patterns (score >= 5)                          ││
│     │ • Active lessons being validated                        ││
│     │ • Notes which lessons helped                            ││
│     └─────────────────────────────────────────────────────────┘│
│                              │                                  │
│                              ▼                                  │
│  3. POST-TASK                                                   │
│     ┌─────────────────────────────────────────────────────────┐│
│     │ Agent updates lessons:                                   ││
│     │ • Increment scores for applied lessons                  ││
│     │ • Record new lessons learned                            ││
│     │ • Tag with relevant categories                          ││
│     └─────────────────────────────────────────────────────────┘│
│                              │                                  │
│                              ▼                                  │
│  4. SPRINT END (Retrospective)                                  │
│     ┌─────────────────────────────────────────────────────────┐│
│     │ Facilitator aggregates:                                  ││
│     │ • Cross-agent patterns → shared.lessons.md              ││
│     │ • Stale lessons archived                                ││
│     │ • Effectiveness tracked                                 ││
│     │ • Improvement tickets generated                         ││
│     └─────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Lesson Scoring

| Score | Status | Description |
|-------|--------|-------------|
| 0-4 | Active | Being tested/validated |
| 5-9 | Proven | Validated through repeated success |
| 10+ | Foundational | Core to agent's operation |
| <3 after 10 uses | Archive candidate | Not providing value |

### Lesson File Structure

```markdown
# Lessons Learned: {Agent Name}

## Summary Statistics
- Total tasks completed: N
- Proven lessons (score >= 5): N
- Top themes: #tag1 #tag2

## Proven Lessons (Score >= 5)
[High-value validated lessons]

## Active Lessons (Most Recent First)
[Lessons being tested]

## Archived Lessons
[Obsolete or low-value lessons]
```

---

## Automation Triggers

### QC Workflow Triggers

| Trigger | When | Scope | Agents |
|---------|------|-------|--------|
| On PR | PR created | Changed files | Bug Hunter, Security |
| On Commit Count | Every 10 commits to main | Full | All |
| Nightly | Daily 2:00 AM UTC | Full | All |
| Pre-Release | Before `/deploy-workflow` | Full | All |

### Deploy Workflow Safety

| Check | Threshold | Action |
|-------|-----------|--------|
| Error Rate | > 5% | Auto-rollback |
| Health Check Failures | 3 consecutive | Auto-rollback |
| Response Time p95 | > 1000ms | Auto-rollback |
| Critical Errors | > 0 | Auto-rollback |

---

## Quick Reference

### Starting a New Feature
```
/project Add user authentication with OAuth2 support
```

### Running Quality Checks
```
/qc-workflow src/
```

### Pre-Commit Validation
```
/ci-workflow backend/src/
```

### Deploying Changes
```
/deploy-workflow "feat: Add OAuth2 authentication"
```

### Canary Deployment
```
/deploy-workflow "feat: Payment processing" --canary
```

### Emergency Rollback
```
/deploy-workflow --rollback
```

---

## File Locations

```
.claude/
├── agents/                    # Agent definitions
│   ├── README.md             # Agent catalog
│   ├── project-director.md
│   ├── developer.md
│   └── ... (35+ agents)
├── commands/                  # Workflow definitions
│   ├── project.md
│   ├── feature-workflow.md
│   ├── qc-workflow.md
│   ├── ci-workflow.md
│   ├── deploy-workflow.md
│   ├── design-workflow.md
│   └── tech-request.md
├── lessons/                   # Learning system
│   ├── shared.lessons.md
│   └── {agent}.lessons.md
└── AGENT_WORKFLOWS.md        # This document
```

---

**Version**: 1.0
**Last Updated**: January 2026
**Maintainer**: NovelForge Team
