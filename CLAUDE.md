# Claude Code Startup Kit

This repository contains reusable AI agents, workflows, and commands for Claude Code.

## Purpose

This is a template repository. Use the setup scripts to copy agents and commands to new projects.

## Setup for New Projects

```bash
# Bash/macOS/Linux
./scripts/setup.sh /path/to/project

# PowerShell/Windows
./scripts/setup.ps1 -TargetDir C:\path\to\project
```

## Key Files

- `.claude/agents/` - Specialized AI agents for different roles
- `.claude/commands/` - Slash commands that orchestrate workflows
- `scripts/setup.sh` - Setup script for bash
- `scripts/setup.ps1` - Setup script for PowerShell

## Maintenance

When adding new agents or commands:
1. Create the file in the appropriate directory
2. Test it in a real project
3. Commit to this repo for reuse

## Agents Overview

### Product & Planning
- `pm-spec-writer` - Product specifications
- `agile-product-strategist` - Sprint planning and backlog

### Architecture & Design
- `architect` - Technical design and task breakdown
- `software-architect-designer` - SOLID principles architecture
- `ux-design-specialist` - UI/UX guidance

### Development
- `developer` - Task implementation
- `implementation-engineer` - Best practices implementation
- `code-simplifier` - Refactoring

### Quality
- `code-reviewer` - Code review
- `code-quality-inspector` - Comprehensive quality checks
- `qa-tester` - Manual testing
- `qa-test-engineer` - Automated testing
- `pen-test` - Security testing

### Domain-Specific
- `council-motion` - Council motion writing
- `lines-to-take` - Political messaging
- `meeting-assistant` - Meeting preparation
- `seo-architect` - SEO optimization
