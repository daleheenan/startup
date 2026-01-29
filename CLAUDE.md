# NovelForge - Claude Code Instructions

This repository is an AI-powered novel writing application with a Next.js frontend and Express backend.

---

## Code Architecture Standards

**IMPORTANT**: Follow these patterns when writing or modifying code.

### Backend Routes

**Rule**: No route file should exceed 600 lines. Large routes MUST be modularised.

**Pattern**: Use the `projects/` module structure as the template:
```
backend/src/routes/[feature]/
├── index.ts          # Router composition - imports and mounts sub-routers
├── crud.ts           # Basic CRUD operations
├── [domain].ts       # Domain-specific endpoints (e.g., characters.ts, plot.ts)
└── utils.ts          # Shared utilities for this module
```

**When to modularise**:
- Route file exceeds 500 lines → Split into module
- Route handles 3+ distinct domains → Split by domain
- Multiple developers likely to edit simultaneously → Split to reduce conflicts

**Example** (from `projects/index.ts`):
```typescript
import { Router } from 'express';
import crudRouter from './crud.js';
import progressRouter from './progress.js';
import plotRouter from './plot.js';

const router = Router();
router.use('/', crudRouter);
router.use('/', progressRouter);
router.use('/', plotRouter);

export default router;
```

### Frontend Data & Constants

**Rule**: Static data (arrays, objects, configuration) should NOT live in components.

**Pattern**: Extract to `app/lib/[domain]/`:
```
app/lib/genre-data/
├── index.ts           # Barrel exports
├── genres.ts          # Genre definitions
├── subgenres.ts       # Subgenre mappings
└── ...
```

**When to extract**:
- Data exceeds 50 lines → Extract to dedicated file
- Data used by multiple components → Extract to lib/
- Data is configuration/reference → Extract to lib/

**Usage**:
```typescript
// Good
import { GENRES, TONES } from '@/lib/genre-data';

// Bad - don't define large arrays in components
const GENRES = [ /* 100+ lines */ ];
```

### Backend Services

**Rule**: Import services from the barrel export when possible.

**Pattern**:
```typescript
// Good - use barrel export
import { claudeService, metricsService } from '../services/index.js';

// Acceptable - direct import for specific needs
import { chapterOrchestratorService } from '../services/chapter-orchestrator.service.js';
```

### File Size Guidelines

| File Type | Warning | Must Split |
|-----------|---------|------------|
| Route file | 400 lines | 600 lines |
| Component | 300 lines | 500 lines |
| Service | 500 lines | 800 lines |
| Constants/data | 200 lines | Extract to module |

---

## Language & Spelling

**IMPORTANT**: All output must use UK British spelling conventions. This includes:
- Generated novel content, prose, and dialogue
- Documentation and comments
- Agent responses and reports

Common conversions:
- organize → organise (all -ize → -ise variants)
- color → colour
- behavior → behaviour
- favor → favour
- center → centre
- defense → defence
- modeling → modelling

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
