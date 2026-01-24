# NovelForge - Development Roadmap

## Project Overview

**NovelForge** is a single-user, AI-powered application that transforms story ideas into professionally crafted novels with minimal user intervention. The system leverages Claude Max subscription for high-quality prose generation while implementing a resilient queue-based architecture that handles rate limits gracefully.

**Version:** 2.0 - Lightweight Architecture
**Date:** January 2026
**Development Timeline:** 8 sprints across ~20 Claude Max sessions

---

## Vision Statement

Transform a story idea into a publication-ready novel through AI-assisted writing that mimics the workflow of a bestselling author with a full editorial team.

---

## Key Features

- **Fire-and-forget generation**: Configure once, receive completed novel
- **Agent-based editing**: Specialized AI agents for developmental, line, continuity, and copy editing
- **Resilient queue system**: Automatic pause and resume on rate limits
- **Precise session tracking**: Waits only until actual reset time, not arbitrary delays
- **Zero marginal cost**: Leverages existing Claude Max subscription
- **Trilogy support**: Multi-book continuity tracking and series bible generation

---

## Technical Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14+ | React-based web UI |
| **Backend** | Node.js + Express | API server |
| **Database** | SQLite | Single-file, no setup required |
| **AI** | Claude Code SDK | Max subscription integration |
| **Queue** | Custom (SQLite-backed) | Resilient job processing |
| **Export** | docx-js, PDFKit | Document generation |

---

## System Architecture Overview

### Claude Max Integration

The system uses Claude Code SDK authenticated with the user's Max subscription:

| Feature | Max 5x ($100/mo) | Max 20x ($200/mo) |
|---------|------------------|-------------------|
| Usage vs Pro | 5x higher limits | 20x higher limits |
| Messages per session | ~225 messages | ~900+ messages |
| Opus 4.5 access | ~15-35 hours/week | ~60+ hours/week |
| Cost per novel | $0 (included) | $0 (included) |

### Lightweight Context Strategy

Each chapter generation uses minimal context (~3,000 tokens vs 37,000 in traditional approaches):

| Component | Tokens | Purpose |
|-----------|--------|---------|
| Story DNA | ~300 | Genre, tone, themes, prose style |
| POV Character Core | ~400 | Voice sample, current state, goals |
| Scene Card | ~300 | Location, characters, goal, conflict, outcome |
| Other Characters | ~450 | Mini-profiles for characters in scene |
| Last Chapter Summary | ~200 | Context from previous chapter |
| System Prompts | ~500 | Agent persona and instructions |
| **TOTAL** | **~2,150** | **90% reduction from full context** |

### Agent Ensemble

Five specialized AI agents process each chapter in sequence:

1. **Author Agent** - Writes all prose with genre-specific persona
2. **Developmental Editor** - Reviews structure, pacing, character arcs
3. **Line Editor** - Polishes prose, dialogue, sentence craft
4. **Continuity Editor** - Checks cross-book consistency
5. **Copy Editor** - Grammar, punctuation, style consistency

---

## User Workflow

### Phase 1: Setup (Web UI, ~30 minutes)
1. Select genre, subgenre, tone, and themes
2. Review 5 generated story concepts
3. Select preferred concept (or mix elements)
4. Review and edit generated characters
5. Review and edit world elements
6. Review and edit chapter outline with scene cards
7. Click 'Generate Novel' and walk away

### Phase 2: Generation (Automated, ~2-3 days)
- System generates each chapter through Author Agent
- Each chapter passes through all editing agents
- Continuity checked against running story bible
- Progress logged and checkpointed
- On rate limit: pause and auto-resume at reset time

### Phase 3: Delivery
- Notification when complete
- Download manuscript (DOCX/PDF)
- Download story bible
- Review any flagged issues
- Optionally regenerate specific chapters

---

## Development Timeline

| Sprint | Sessions | Focus | Points |
|--------|----------|-------|--------|
| **Sprint 1** | 1-3 | Foundation: Queue, Claude Code, Session Tracking | 31 |
| **Sprint 2** | 4-5 | Idea Generation: Concepts, Selection | 24 |
| **Sprint 3** | 6-7 | World & Characters: Profiles, Editing | 31 |
| **Sprint 4** | 8-9 | Outline: Structure, Scene Cards | 31 |
| **Sprint 5** | 10-12 | Chapter Generation: Author Agent | 31 |
| **Sprint 6** | 13-14 | Editing Agents: Dev, Line, Continuity, Copy | 32 |
| **Sprint 7** | 15-16 | Export: DOCX, PDF, Dashboard | 29 |
| **Sprint 8** | 17-20 | Trilogy: Multi-book, Polish | 32 |
| **TOTAL** | **~20 sessions** | | **241 points** |

**Note:** A Claude session = one 5-hour Max subscription usage window. With Max 5x, expect ~225 messages per session. With Max 20x, expect ~900 messages per session.

---

## Key Milestones

| Session | Milestone | Deliverable |
|---------|-----------|-------------|
| 3 | Queue System Complete | Rate limit handling works automatically |
| 5 | Idea Phase Complete | Can generate and select story concepts |
| 9 | Planning Phase Complete | Full outline with scene cards ready |
| 14 | Writing Phase Complete | Can generate edited chapters |
| 16 | Export Complete | Can download finished manuscripts |
| 20 | Production Ready | Full trilogy support, documented |

---

## Documentation Navigation

This requirements folder contains the complete development roadmap:

### Planning Documents

- **[SPRINT_PLAN.md](./SPRINT_PLAN.md)** - Detailed sprint breakdown with goals, deliverables, session allocations, dependencies, and success criteria

- **[TASK_BREAKDOWN.md](./TASK_BREAKDOWN.md)** - Granular task breakdown with story points, complexity ratings, technical dependencies, and acceptance criteria

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture including system components, data flow diagrams, API specifications, database schema, and agent ensemble design

- **[PROGRESS_TRACKER.md](./PROGRESS_TRACKER.md)** - Progress tracking template with sprint progress tables, task completion checklists, blocker tracking, and session logs

### Source Document

- **NovelForge_Requirements_v2.docx** - Original requirements document (comprehensive specification)

---

## Success Criteria

The project will be considered successful when it can:

1. Generate 80,000+ word novels autonomously after initial setup
2. Maintain character and world consistency throughout
3. Produce prose quality comparable to traditionally published fiction
4. Handle rate limits without user intervention
5. Complete novel generation within 2-3 days (across multiple sessions)

---

## Non-Functional Requirements

| Requirement | Target | Notes |
|-------------|--------|-------|
| Chapter generation time | < 5 minutes | Using Claude Opus 4.5 |
| Resume after rate limit | < 1 minute | After session reset |
| Database size | < 100 MB | Per project |
| Checkpoint frequency | Every job | No work lost on crash |
| Max chapters per book | 50 | Configurable |

---

## Risk Management Overview

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Claude Code SDK changes | Medium | High | Abstract SDK calls behind wrapper |
| Rate limits too restrictive | Low | Medium | Efficient context, batch operations |
| Generation quality inconsistent | Medium | High | Multi-pass editing, human review option |
| Context window exceeded | Low | High | Lightweight context strategy, summarization |
| Session tracking fails | Low | Medium | Conservative fallback (30 min wait) |
| Max subscription price increase | Low | Low | API fallback option available |

---

## Getting Started

1. Review this README for project overview
2. Read **[ARCHITECTURE.md](./ARCHITECTURE.md)** to understand the technical design
3. Review **[SPRINT_PLAN.md](./SPRINT_PLAN.md)** for development sequence
4. Reference **[TASK_BREAKDOWN.md](./TASK_BREAKDOWN.md)** for implementation details
5. Use **[PROGRESS_TRACKER.md](./PROGRESS_TRACKER.md)** to track development progress

---

## File Structure

```
novelforge/
├── frontend/           # Next.js application
│   ├── app/            # App router pages
│   ├── components/     # React components
│   └── lib/            # Utilities
├── backend/            # Node.js API
│   ├── routes/         # API endpoints
│   ├── services/       # Business logic
│   ├── agents/         # AI agent definitions
│   ├── queue/          # Job queue system
│   └── db/             # Database schema
├── data/               # SQLite database
├── exports/            # Generated manuscripts
└── requirements/       # This folder - planning documents
```

---

## Glossary

| Term | Definition |
|------|------------|
| **Story DNA** | Core story attributes: genre, tone, themes, prose style |
| **Character Core** | Lightweight character profile for context injection |
| **Scene Card** | Detailed scene specification: POV, goal, conflict, outcome |
| **Session** | 5-hour usage window for Claude Max subscription |
| **Checkpoint** | Saved state allowing job recovery after interruption |
| **Story Bible** | Complete reference of characters, world, and timeline |
| **Agent** | Specialized AI persona for specific editorial task |

---

**Last Updated:** January 2026
**Version:** 2.0
