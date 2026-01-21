# Reusable Agent Prompts

This directory contains reusable agent prompts for common tasks. Reference these when you need specialized assistance.

## Project Orchestration

| Agent | Purpose | Usage |
|-------|---------|-------|
| [project-director.md](project-director.md) | Executive orchestrator for complete projects | `Use project-director to implement [feature]` |
| [sprint-orchestrator.md](sprint-orchestrator.md) | Execute single sprint with existing agents | `Run sprint-orchestrator for Sprint 1` |
| [progress-reporter.md](progress-reporter.md) | Monitor active sprints and report progress | `Monitor sprint progress` |

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
```

**Benefits:**
- Fresh context for each sprint (no context bloat)
- Real-time progress visibility
- Natural decision points between sprints
- Clear accountability per sprint

## Development Agents

| Agent | Purpose | Usage |
|-------|---------|-------|
| [developer.md](developer.md) | Feature implementation | `Implement [task]` |
| [architect.md](architect.md) | Technical design, task breakdown | `Design architecture for [feature]` |
| [api-agent.md](api-agent.md) | REST API endpoints | `Create API for [resource]` |
| [frontend-agent.md](frontend-agent.md) | UI pages and components | `Build UI for [feature]` |
| [schema-agent.md](schema-agent.md) | Database schemas and migrations | `Design schema for [feature]` |
| [service-agent.md](service-agent.md) | Business logic with TDD | `Implement [service] with tests` |
| [feature-builder.md](feature-builder.md) | 7-phase structured feature development | `Build feature: [description]` |

## Quality Agents

| Agent | Purpose | Usage |
|-------|---------|-------|
| [code-reviewer.md](code-reviewer.md) | Code review, standards compliance | `Review [files]` |
| [qa-tester.md](qa-tester.md) | Manual testing, edge cases | `Test [feature]` |
| [qa-test-engineer.md](qa-test-engineer.md) | Automated tests, Playwright | `Write tests for [feature]` |
| [test-architect.md](test-architect.md) | Test strategy design | `Design test strategy` |
| [bug-hunter.md](bug-hunter.md) | Find bugs proactively | `Hunt bugs in [area]` |
| [code-quality-inspector.md](code-quality-inspector.md) | Comprehensive quality checks | `Inspect [code]` |
| [code-simplifier.md](code-simplifier.md) | Refactor for clarity | `Simplify [code]` |
| [code-optimizer.md](code-optimizer.md) | Performance optimization | `Optimize [code]` |

## Security & Performance Agents

| Agent | Purpose | Usage |
|-------|---------|-------|
| [pen-test.md](pen-test.md) | Security vulnerability scanning | `Pen test [feature]` |
| [security-hardener.md](security-hardener.md) | Security assessment, hardening | `Harden [feature]` |
| [seo-architect.md](seo-architect.md) | Full-stack SEO optimization | `Optimize SEO for [pages]` |

## Planning Agents

| Agent | Purpose | Usage |
|-------|---------|-------|
| [pm-spec-writer.md](pm-spec-writer.md) | Feature specifications | `Write spec for [feature]` |
| [agile-product-strategist.md](agile-product-strategist.md) | Product roadmaps, sprint planning | `Plan sprints for [project]` |
| [software-architect-designer.md](software-architect-designer.md) | SOLID architecture, system design | `Design [system]` |
| [ux-design-specialist.md](ux-design-specialist.md) | UI/UX design, accessibility | `Design UX for [feature]` |

## Council/Political Agents

| Agent | Purpose | Usage |
|-------|---------|-------|
| [meeting-assistant.md](meeting-assistant.md) | Analyze agendas, suggest scrutiny questions | `Analyze this meeting agenda` |
| [council-motion.md](council-motion.md) | Draft formal council motions | `Draft a motion about [topic]` |
| [lines-to-take.md](lines-to-take.md) | Create Q&A briefing documents | `Create lines to take on [topic]` |

## Workflows

| Workflow | Purpose | Usage |
|----------|---------|-------|
| [feature-workflow.md](feature-workflow.md) | PM → Architect → Dev → Review → QA | `/feature-workflow [feature]` |
| [qc-workflow.md](qc-workflow.md) | Optimizer → Tester → Bug Hunter → Security | `/qc-workflow` |
| [design-workflow.md](design-workflow.md) | Complete UI/UX design implementation | `/design-workflow [feature]` |

## How to Use

1. **Reference an agent**: "Run the pen-test agent on the authentication system"
2. **Combine agents**: "Run the feature-builder agent, then the code-simplifier agent"
3. **Use orchestration**: "Use project-director to implement [complex feature]"
4. **Monitor progress**: Run progress-reporter alongside sprint-orchestrator

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
```

## Agent Categories

- **Orchestration**: project-director, sprint-orchestrator, progress-reporter
- **Security**: pen-test, security-hardener
- **Performance**: seo-architect, code-optimizer
- **Code Quality**: code-simplifier, code-quality-inspector, bug-hunter
- **Development Process**: feature-builder, developer, architect
- **Testing**: qa-tester, qa-test-engineer, test-architect
- **Planning**: pm-spec-writer, agile-product-strategist
- **Content Generation**: council-motion, lines-to-take, meeting-assistant
