# Agent System Improvement Plan

**Created**: 2026-01-25
**Status**: Ready for Implementation
**Priority**: High

---

## Executive Summary

The NovelForge agent system is **well-designed and comprehensive**. All major lifecycle phases are covered. This plan focuses on **consistency improvements, gap filling, and workflow optimization** rather than fundamental restructuring.

---

## Current Agent Inventory (38 Agents)

### Core Agents (Well-Defined with Personas)

| Agent | Persona | Purpose | Lessons File |
|-------|---------|---------|--------------|
| `project-director` | Dale Heenan | Executive orchestrator | ✅ |
| `sprint-orchestrator` | Theo Smith | Sprint execution | ✅ |
| `deployer` | Pat Okonkwo | Commit, push, deploy | ✅ |
| `deployment-monitor` | Zara Hassan | Health monitoring | ❌ Missing |
| `deployment-doctor` | Ibe Kovacs | Failure diagnosis | ❌ Missing |
| `sprint-retrospective-facilitator` | Dr. Amara Osei | Retrospectives | ❌ Missing |
| `pm-spec-writer` | Emily Rodriguez | Feature specs | ❌ Missing |
| `agile-product-strategist` | David Kim | Product strategy | ❌ Missing |
| `architect` | Dr. James Okafor | Technical design | ✅ |
| `software-architect-designer` | Dr. Aisha Patel | SOLID architecture | ❌ Missing |
| `ux-design-specialist` | Maya Johnson | UI/UX design | ❌ Missing |
| `developer` | Priya Sharma | Implementation | ✅ |
| `implementation-engineer` | Carlos Mendez | Complex implementation | ❌ Missing |
| `code-simplifier` | Dr. Mei-Lin Wong | Refactoring | ❌ Missing |
| `code-reviewer` | Michael Torres | Code reviews | ✅ |
| `code-quality-inspector` | Dr. Yuki Tanaka | Quality checks | ✅ |
| `qa-tester` | Lisa Chen | Manual testing | ❌ Missing |
| `qa-test-engineer` | Kenji Watanabe | Automated testing | ✅ |
| `test-architect` | Dr. Sarah Okonkwo | Test strategy | ❌ Missing |
| `bug-hunter` | Det. Ray Morrison | Bug detection | ✅ |
| `security-hardener` | Cmdr. Alex Volkov | Security hardening | ✅ |
| `pen-test` | Viktor Kowalski | Penetration testing | ❌ Missing |
| `code-optimizer` | Marcus Chen | Performance | ✅ |

### Specialty/Domain Agents

| Agent | Purpose | Status |
|-------|---------|--------|
| `api-agent` | REST API development | Consider merging with developer |
| `frontend-agent` | UI development | Consider merging with developer |
| `schema-agent` | Database schemas | Consider merging with architect |
| `service-agent` | Business logic | Consider merging with developer |
| `setup-agent` | Project setup | Keep as utility |
| `integration-agent` | Integration work | Consider merging with developer |
| `seo-architect` | SEO optimization | Keep as specialty |
| `feature-builder` | Structured features | Keep but clarify vs developer |

### Deprecated/Duplicate Agents

| Agent | Issue | Recommendation |
|-------|-------|----------------|
| `software dev.md` | Duplicate of developer | **DELETE** |
| `tech-request.md` | Unclear purpose | Review and delete or repurpose |
| `design-workflow.md` | Misnamed (workflow not agent) | Move to commands or rename |

### Workflow Files (Correctly in .claude/commands/)

| Workflow | Purpose | Status |
|----------|---------|--------|
| `feature-workflow.md` | PM → Architect → Dev → Review → QA | ✅ Good |
| `qc-workflow.md` | Optimize → Test → Hunt Bugs → Secure | ✅ Good |
| `deploy-workflow.md` | Commit → Deploy → Monitor → Remediate | ✅ Good |
| `project.md` | Project Director invocation | ✅ Good |

---

## Improvement Actions

### Phase 1: Consistency (Priority: HIGH)

#### 1.1 Create Missing Lessons Files
Create lessons files for agents that don't have them:

```bash
# Files to create:
.claude/lessons/deployment-monitor.lessons.md
.claude/lessons/deployment-doctor.lessons.md
.claude/lessons/sprint-retrospective-facilitator.lessons.md
.claude/lessons/pm-spec-writer.lessons.md
.claude/lessons/agile-product-strategist.lessons.md
.claude/lessons/software-architect-designer.lessons.md
.claude/lessons/ux-design-specialist.lessons.md
.claude/lessons/implementation-engineer.lessons.md
.claude/lessons/code-simplifier.lessons.md
.claude/lessons/qa-tester.lessons.md
.claude/lessons/test-architect.lessons.md
.claude/lessons/pen-test.lessons.md
```

#### 1.2 Add Self-Reinforcement Learning Section
Ensure all agents have the standard learning section from `_agent-learning-section.md`.

#### 1.3 Standardize Agent File Structure
All agents should follow this structure:
```markdown
---
name: agent-name
description: One-line description
tools: [tool list]
model: sonnet/haiku
---

# Persona: [Full Name] - [Title]

## Your Background
## Your Personality
## Your Philosophy

## Your Role as [Agent Type]

## Process/Workflow

## Output Format

## Integration with Other Agents

## Self-Reinforcement Learning

## Important Rules
```

### Phase 2: Cleanup (Priority: MEDIUM)

#### 2.1 Delete Duplicate Agents
- [ ] Delete `software dev.md` (duplicate of `developer.md`)
- [ ] Review `tech-request.md` - delete if redundant

#### 2.2 Move Misplaced Files
- [ ] Move `design-workflow.md` to `.claude/commands/` if it's a workflow
- [ ] Move `feature-workflow.md` and `qc-workflow.md` from agents/ if duplicates

#### 2.3 Clarify Agent Scope
Update descriptions to clarify when to use each agent:

| Agent | Clarified Scope |
|-------|-----------------|
| `developer` | Single tasks, bug fixes, straightforward features |
| `implementation-engineer` | Complex multi-file features, refactoring, best practices |
| `architect` | Technical design, task breakdown, system architecture |
| `software-architect-designer` | SOLID principles, design patterns, enterprise architecture |

### Phase 3: Update Documentation (Priority: MEDIUM)

#### 3.1 Update README.md
Add all agents to the README with clear categories:

```markdown
## Agent Categories

### Orchestration
- project-director - Executive project orchestrator
- sprint-orchestrator - Sprint execution coordinator
- progress-reporter - Real-time progress monitoring

### Planning & Strategy
- pm-spec-writer - Feature specifications
- agile-product-strategist - Product roadmaps, sprint planning

### Architecture & Design
- architect - Technical design, task breakdown
- software-architect-designer - SOLID architecture, system design
- ux-design-specialist - UI/UX design, accessibility

### Implementation
- developer - Feature implementation
- implementation-engineer - Complex implementations
- code-simplifier - Refactoring, cleanup
- api-agent - REST API endpoints (specialty)
- frontend-agent - UI components (specialty)

### Quality Assurance
- code-reviewer - Code reviews
- code-quality-inspector - Comprehensive quality checks
- qa-tester - Manual testing
- qa-test-engineer - Automated testing, Playwright
- test-architect - Test strategy design
- bug-hunter - Proactive bug detection

### Security & Performance
- security-hardener - Security assessment, hardening
- pen-test - Penetration testing
- code-optimizer - Performance optimization

### Deployment & Operations
- deployer - Commit, push, deploy code
- deployment-monitor - Health and performance monitoring
- deployment-doctor - Failure diagnosis and remediation

### Learning & Improvement
- sprint-retrospective-facilitator - End-of-sprint retrospectives

### Workflows
- /feature-workflow - PM → Architect → Dev → Review → QA
- /qc-workflow - Optimize → Test → Bug Hunt → Security
- /deploy-workflow - Commit → Deploy → Monitor → Remediate
- /project - Full project orchestration
```

### Phase 4: Enhance Looping Workflow (Priority: MEDIUM)

#### 4.1 Add Explicit Loop States to project-director

Update project-director.md to include explicit loop tracking:

```markdown
## Requirement Loop Protocol

When processing multiple requirements:

### Loop State Machine
```
REQUIREMENTS_PENDING
    ↓
┌─> ANALYZING_REQUIREMENT
│       ↓
│   PLANNING_IMPLEMENTATION
│       ↓
│   EXECUTING_WORKFLOW ─────────────┐
│       │                           │
│       ↓                           ↓
│   DEPLOYING ─────────────> DEPLOYMENT_FAILED
│       │                           │
│       ↓                           ↓
│   MONITORING                DIAGNOSING
│       │                           │
│       ↓                           ↓
│   VERIFYING <──────────── RETRYING
│       │
│       ↓
│   REQUIREMENT_COMPLETE
│       │
└───────┘ (next requirement)
    ↓
ALL_REQUIREMENTS_COMPLETE
    ↓
RETROSPECTIVE
    ↓
DONE
```

### Loop Tracking
Maintain state in TodoWrite:
- Current requirement index
- Total requirements
- Failed/retried requirements
- Deployment status per requirement
```

### Phase 5: Verify Learning System (Priority: LOW)

#### 5.1 Audit All Agent Files
Check that each agent has:
- [ ] Self-Reinforcement Learning section
- [ ] Correct lesson file path
- [ ] Tag suggestions for lesson categorization

#### 5.2 Create Lesson File Templates
For missing lessons files, use this template:

```markdown
# {Agent Name} Lessons

## Summary Statistics
- **Total tasks completed**: 0
- **Total lessons recorded**: 0
- **Last updated**: YYYY-MM-DD
- **Proven lessons** (score >= 5): 0
- **Active lessons**: 0
- **Archived lessons**: 0

---

## Proven Lessons (Score >= 5)

*No proven lessons yet. Complete tasks and record lessons to build this section.*

---

## Active Lessons

*No active lessons yet. Start recording lessons after completing tasks.*

---

## Archived Lessons

*Empty - lessons archived when obsolete or score remains < 3 after 10 tasks.*
```

---

## Implementation Timeline

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1 | Create 12 lessons files, add learning sections | 1-2 hours |
| Phase 2 | Delete duplicates, move files, clarify scope | 30 mins |
| Phase 3 | Update README with full catalog | 30 mins |
| Phase 4 | Enhance project-director loop tracking | 30 mins |
| Phase 5 | Audit and verify learning system | 1 hour |

**Total: 3-4 hours**

---

## Success Criteria

After implementing this plan:

1. **All agents have lessons files** - 100% coverage
2. **All agents have Self-Reinforcement Learning section** - 100% coverage
3. **No duplicate agents** - Clean agent directory
4. **README lists all agents** - Complete catalog
5. **Project-director has explicit loop states** - Clear requirement processing
6. **Consistent file structure** - All agents follow standard template

---

## Not Recommended (Over-Engineering)

These changes were considered but deemed unnecessary:

1. **Creating more workflow files** - The 4 existing workflows cover all common patterns
2. **Splitting developer into more specialists** - Current split is sufficient
3. **Adding monitoring dashboard agent** - deployment-monitor handles this
4. **Creating integration test agent** - qa-test-engineer covers this
5. **Adding rollback-specialist agent** - deployment-doctor handles rollbacks

The current system is comprehensive. Focus on consistency, not expansion.

---

**Document Version**: 1.0
**Last Updated**: 2026-01-25
**Author**: Agent System Review
