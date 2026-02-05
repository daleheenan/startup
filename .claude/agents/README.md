---
name: README
---
# Reusable Agent Prompts

This directory contains reusable agent prompts for common tasks. Reference these when you need specialized assistance.

## Project Orchestration

| Agent | Purpose | Usage |
|-------|---------|-------|
| [project-director.md](project-director.md) | Executive orchestrator for complete projects | `Use project-director to implement [feature]` |
| [sprint-orchestrator.md](sprint-orchestrator.md) | Execute single sprint with existing agents | `Run sprint-orchestrator for Sprint 1` |
| [progress-reporter.md](progress-reporter.md) | Monitor active sprints and report progress | `Monitor sprint progress` |
| [sprint-retrospective-facilitator.md](sprint-retrospective-facilitator.md) | End-of-sprint retrospectives with automated learning | `Facilitate retrospective for Sprint N` |

### Recommended Workflow

For large projects with multiple sprints:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROJECT DIRECTOR                             │
│            Plans project, breaks into sprints                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 SPRINT ORCHESTRATOR (per sprint)                │
│     Executes one sprint using specialized agents                │
│     (developer, api-agent, frontend-agent, qa-tester, etc.)     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               │
┌─────────────────────────────┐               │
│     PROGRESS REPORTER       │◄──────────────┘
│  Monitors and reports       │  (polls during execution)
│  progress to user           │
└─────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│              SPRINT RETROSPECTIVE FACILITATOR                   │
│     Gathers lessons, updates shared learning, tracks metrics    │
└─────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Fresh context for each sprint (no context bloat)
- Real-time progress visibility
- Natural decision points between sprints
- Clear accountability per sprint
- Continuous learning via retrospectives

## Development Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| [developer.md](developer.md) | General feature implementation | Full-stack features, general coding tasks |
| [implementation-engineer.md](implementation-engineer.md) | Complex implementations with best practices | Critical features, high-quality implementations |
| [architect.md](architect.md) | Technical design, task breakdown | Before implementation, system design |
| [api-agent.md](api-agent.md) | REST API endpoints | API-focused tasks, multiple endpoints |
| [frontend-agent.md](frontend-agent.md) | UI pages and components | UI-focused tasks, SPA development |
| [schema-agent.md](schema-agent.md) | Database schemas and migrations | Database-focused tasks, schema design |
| [service-agent.md](service-agent.md) | Business logic with TDD | Complex business rules, financial calculations |
| [integration-agent.md](integration-agent.md) | E2E testing and deployment | Cross-stack integration, E2E tests |
| [feature-builder.md](feature-builder.md) | 7-phase structured feature development | Complex features needing structured approach |
| [setup-agent.md](setup-agent.md) | Project scaffolding and boilerplate | New project setup, initial configuration |

### Developer vs. Specialty Agent Decision Tree

```
Task involves multiple layers (frontend + backend + DB)?
├── YES → Use developer
└── NO → Task is focused on one layer?
    ├── API endpoints → Use api-agent
    ├── UI components → Use frontend-agent
    ├── Database schema → Use schema-agent
    ├── Business logic with TDD → Use service-agent
    └── General implementation → Use developer
```

## Quality Agents

| Agent | Purpose | Usage |
|-------|---------|-------|
| [code-reviewer.md](code-reviewer.md) | Code review, standards compliance | `Review [files]` |
| [qa-tester.md](qa-tester.md) | Manual testing, edge cases | `Test [feature]` |
| [qa-test-engineer.md](qa-test-engineer.md) | Automated tests, Playwright | `Write tests for [feature]` |
| [test-architect.md](test-architect.md) | Test strategy design | `Design test strategy` |
| [integration-test-engineer.md](integration-test-engineer.md) | Integration tests with real database | `Write integration tests for [feature]` |
| [bug-hunter.md](bug-hunter.md) | Find bugs proactively | `Hunt bugs in [area]` |
| [code-quality-inspector.md](code-quality-inspector.md) | Comprehensive quality checks | `Inspect [code]` |
| [code-simplifier.md](code-simplifier.md) | Refactor for clarity | `Simplify [code]` |
| [code-optimizer.md](code-optimizer.md) | Performance optimization | `Optimize [code]` |

## Security, Performance & Testing Agents

| Agent | Purpose | Usage |
|-------|---------|-------|
| [pen-test.md](pen-test.md) | Security vulnerability scanning | `Pen test [feature]` |
| [security-hardener.md](security-hardener.md) | Security assessment, hardening | `Harden [feature]` |
| [performance-test-engineer.md](performance-test-engineer.md) | Load testing, benchmarks, baselines | `Performance test [endpoint]` |
| [seo-architect.md](seo-architect.md) | Full-stack SEO optimization | `Optimize SEO for [pages]` |

## Planning & Design Agents

| Agent | Purpose | Usage |
|-------|---------|-------|
| [pm-spec-writer.md](pm-spec-writer.md) | Feature specifications | `Write spec for [feature]` |
| [agile-product-strategist.md](agile-product-strategist.md) | Product roadmaps, sprint planning | `Plan sprints for [project]` |
| [software-architect-designer.md](software-architect-designer.md) | SOLID architecture, system design | `Design [system]` |
| [ux-design-specialist.md](ux-design-specialist.md) | UI/UX design, accessibility | `Design UX for [feature]` |
| [documentation-agent.md](documentation-agent.md) | API docs, ADRs, README updates | `Document [feature]` |

## Deployment & Operations Agents

| Agent | Purpose | Usage |
|-------|---------|-------|
| [deployer.md](deployer.md) | Commit, push, deploy code | `Deploy [changes]` |
| [deployment-monitor.md](deployment-monitor.md) | Health checks, monitoring | `Monitor deployment` |
| [deployment-doctor.md](deployment-doctor.md) | Diagnose and fix deployment failures | `Fix deployment failure` |

## Maintenance Agents

| Agent | Purpose | Usage |
|-------|---------|-------|
| [lessons-curator.md](lessons-curator.md) | Curate and maintain agent lessons | `Curate lessons` |

## Content & Creative Agents

| Agent | Purpose | Usage |
|-------|---------|-------|
| [prose-editor.md](prose-editor.md) | Fiction editing, prose economy | `Edit prose for [chapter]` |
| [social-marketer.md](social-marketer.md) | Social media engagement | `Post to social media` |

## How to Use

1. **Reference an agent**: "Run the pen-test agent on the authentication system"
2. **Combine agents**: "Run the feature-builder agent, then the code-simplifier agent"
3. **Use orchestration**: "Use project-director to implement [complex feature]"
4. **Monitor progress**: Run progress-reporter alongside sprint-orchestrator

## Workflows (See .claude/commands/)

Workflows orchestrate multiple agents. They live in `.claude/commands/`:

| Workflow | Purpose | Command |
|----------|---------|---------|
| project | Universal entry point for any requirement | `/project [requirement]` |
| feature-workflow | PM → Architect → Dev → Review → QA | `/feature-workflow [feature]` |
| qc-workflow | Optimizer → Tester → Bug Hunter → Security | `/qc-workflow [target]` |
| ci-workflow | Pre-commit quality gate | `/ci-workflow [target]` |
| deploy-workflow | Commit → Deploy → Monitor → Verify | `/deploy-workflow [message]` |
| design-workflow | UX → Architect → Dev → QA → Verify | `/design-workflow [feature]` |
| tech-request | Technical request without PM spec | `/tech-request [request]` |

## Adding New Agents

Create a new `.md` file with frontmatter:

```yaml
---
name: agent-name
description: One-line description
tools: Read, Write, Edit, Grep, Glob, Bash, TodoWrite
model: sonnet
---

# Agent content here...

## Self-Reinforcement Learning

### Pre-Task: Load Lessons
1. **Read**: `.claude/lessons/agent-name.lessons.md` and `.claude/lessons/shared.lessons.md`

### Post-Task: Reflect and Record
1. **Reflect**: What worked? What didn't?
2. **Update Scores**: Increment scores for patterns that worked
3. **Record New Lesson**: Append to lessons file with tags
```

Don't forget to create a corresponding `.claude/lessons/agent-name.lessons.md` file!

## Agent Categories

- **Orchestration**: project-director, sprint-orchestrator, progress-reporter, sprint-retrospective-facilitator
- **Development**: developer, implementation-engineer, architect, api-agent, frontend-agent, schema-agent, service-agent, integration-agent, feature-builder, setup-agent
- **Quality**: code-reviewer, qa-tester, qa-test-engineer, test-architect, integration-test-engineer, bug-hunter, code-quality-inspector, code-simplifier, code-optimizer
- **Security & Performance**: pen-test, security-hardener, performance-test-engineer, seo-architect
- **Planning & Design**: pm-spec-writer, agile-product-strategist, software-architect-designer, ux-design-specialist, documentation-agent
- **Deployment**: deployer, deployment-monitor, deployment-doctor
- **Maintenance**: lessons-curator
- **Content & Creative**: prose-editor, social-marketer
