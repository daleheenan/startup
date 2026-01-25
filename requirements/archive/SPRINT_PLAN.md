# NovelForge - Sprint Plan

## Overview

This document details the 8-sprint development plan for NovelForge, spanning approximately 20 Claude Max sessions (~16-20 5-hour usage windows).

**Total Story Points:** 241 points
**Total Sessions:** ~20 sessions
**Duration:** Approximately 3-4 weeks (calendar time)
**Team:** Solo developer + AI agents

---

## Sprint Cadence & Session Notes

### Understanding Claude Max Sessions

A **Claude session** represents one 5-hour usage window from your Max subscription:

| Subscription | Messages per Session | Hours per Week | Sessions per Day |
|--------------|---------------------|----------------|------------------|
| **Max 5x** ($100/mo) | ~225 messages | ~15-35 hours | ~3-7 sessions |
| **Max 20x** ($200/mo) | ~900+ messages | ~60+ hours | ~12-24 sessions |

### Session Allocation Strategy

- **Sprint 1-2**: Foundation work - 5 sessions (days 1-2)
- **Sprint 3-4**: Content generation setup - 4 sessions (days 3-4)
- **Sprint 5-6**: Core engine + editing - 6 sessions (days 5-7)
- **Sprint 7-8**: Export + polish - 5 sessions (days 8-10)

With Max 5x, expect 2-3 sessions per day. With Max 20x, could complete multiple sprints per day.

---

## Sprint 1: Foundation & Infrastructure

**Sessions:** 1-3
**Story Points:** 31
**Duration:** 1-2 days
**Dependencies:** None

### Sprint Goal

Establish the core infrastructure with Claude Code SDK integration, resilient job queue system, and automatic rate limit handling.

### Key Deliverables

- Working Next.js frontend and Node.js backend
- SQLite database with complete schema
- Claude Code SDK authenticated with Max subscription
- Resilient job queue with checkpoint recovery
- Session tracking with precise reset time calculation
- Automatic pause/resume on rate limits

### Tasks

| Task | Points | Priority | Description |
|------|--------|----------|-------------|
| Project setup | 3 | P0 | Initialize Next.js frontend and Node.js backend with proper folder structure |
| SQLite schema | 3 | P0 | Create all database tables for projects, chapters, jobs, session tracking |
| Claude Code SDK integration | 5 | P0 | Authenticate with Max subscription, implement basic completions |
| Job queue core | 5 | P0 | Queue table, worker loop, job states (PENDING, RUNNING, COMPLETED, PAUSED, FAILED) |
| Session tracking | 5 | P0 | Track session start, calculate reset time (start + 5h) |
| Rate limit handling | 5 | P0 | Detect limits, pause jobs, auto-resume at precise reset time |
| Checkpoint system | 3 | P0 | Save/restore job state for recovery after crashes |
| Basic CLI | 2 | P1 | Test commands for queue operations and debugging |

### Success Criteria

- [ ] Can start Next.js frontend and Node.js backend
- [ ] SQLite database initializes with all tables
- [ ] Claude Code SDK makes authenticated API calls
- [ ] Job queue processes jobs sequentially
- [ ] Session tracking records first request timestamp
- [ ] Rate limit detection pauses queue automatically
- [ ] Queue resumes automatically after session reset
- [ ] Jobs recover from checkpoint after application restart

### Technical Dependencies

- Node.js 18+ installed
- Claude Code SDK configured with Max subscription credentials
- SQLite driver (better-sqlite3)
- Next.js 14+ for frontend

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Claude Code SDK authentication issues | Test authentication separately, have API key fallback |
| Session tracking calculation errors | Conservative 30-minute wait fallback if detection fails |
| Checkpoint serialization failures | Comprehensive error handling, job status flags |

### End-of-Sprint Demo

- Show queue processing a test job
- Trigger artificial rate limit
- Demonstrate automatic pause and resume
- Show checkpoint recovery after application restart

---

## Sprint 2: Idea Generation

**Sessions:** 4-5
**Story Points:** 24
**Duration:** 1 day
**Dependencies:** Sprint 1 (infrastructure must be complete)

### Sprint Goal

Enable users to input story preferences and generate multiple story concepts through an intuitive web interface.

### Key Deliverables

- Functional web UI for story setup
- Genre/preference input forms
- AI-powered story concept generation (5 concepts)
- Concept selection and project creation workflow

### Tasks

| Task | Points | Priority | Description |
|------|--------|----------|-------------|
| Web UI shell | 5 | P0 | Next.js app with basic layout, navigation, and routing |
| Genre/preference form | 3 | P0 | Input form for genre, subgenre, tone, themes, story preferences |
| Concept generation prompt | 5 | P0 | Prompt engineering to generate 5 diverse story concepts |
| Concept display UI | 5 | P0 | Cards showing title, logline, synopsis for each concept |
| Concept selection flow | 3 | P0 | Select concept, regenerate all, or mix elements from multiple |
| Project creation | 3 | P1 | Save selected concept as new project in database |

### Success Criteria

- [ ] User can access web UI at localhost:3000
- [ ] Form validates all required story preferences
- [ ] System generates 5 unique story concepts within 2 minutes
- [ ] Concepts display with title, logline, and synopsis
- [ ] User can select a concept and create a project
- [ ] Can regenerate concepts if not satisfied
- [ ] Project saves to database with initial story DNA

### Workflow

```
User Input (preferences)
  → Generate 5 Concepts (Claude API)
    → Display Concepts (web UI)
      → User Selection
        → Create Project (database)
```

### Prompt Engineering Focus

Develop prompts that generate:
- Diverse concepts across different story structures
- Compelling loglines (1-2 sentences)
- Detailed synopses (2-3 paragraphs)
- Adherence to selected genre conventions
- Hook-driven concepts that intrigue readers

### End-of-Sprint Demo

- Enter preferences (e.g., "dark fantasy, grimdark tone, themes: power & corruption")
- Generate 5 story concepts
- Review concepts and select one
- Show project created in database

---

## Sprint 3: World & Characters

**Sessions:** 6-7
**Story Points:** 31
**Duration:** 1 day
**Dependencies:** Sprint 2 (project creation must work)

### Sprint Goal

Generate comprehensive character profiles and world elements, with full editing capability before generation begins.

### Key Deliverables

- Story DNA generator (tone, themes, prose style)
- Character generation (protagonist + supporting cast)
- World element generation (locations, factions, magic/technology)
- Editable UI for all characters and world elements
- Story bible storage system

### Tasks

| Task | Points | Priority | Description |
|------|--------|----------|-------------|
| Story DNA generator | 5 | P0 | Generate tone, themes, prose style based on genre |
| Character core generator | 5 | P0 | Generate protagonist with voice sample, traits, goals |
| Supporting cast generator | 5 | P0 | Generate antagonist, mentor, sidekick, love interest |
| Character editing UI | 5 | P0 | Edit name, traits, voice sample, relationships, arc |
| World element generator | 5 | P0 | Generate locations, factions, magic/technology systems |
| World editing UI | 3 | P1 | Edit and add custom world elements |
| Story bible storage | 3 | P1 | Store all elements in database as structured JSON |

### Success Criteria

- [ ] Story DNA generates appropriate tone and style for genre
- [ ] Protagonist has unique voice sample and clear goals
- [ ] Supporting cast (4-6 characters) with distinct personalities
- [ ] World elements appropriate to genre (fantasy gets magic, sci-fi gets tech)
- [ ] Can edit any character attribute through UI
- [ ] Can add custom characters and world elements
- [ ] All elements save to story bible in database

### Character Profile Structure

Each character should include:
- **Name** (full name, nickname)
- **Role** (protagonist, antagonist, mentor, etc.)
- **Physical description** (brief)
- **Personality traits** (3-5 key traits)
- **Voice sample** (2-3 sentences in character's voice)
- **Goals** (what they want)
- **Conflicts** (internal and external)
- **Relationships** (to other characters)
- **Character arc** (how they change)

### World Element Structure

World elements should include:
- **Locations** (name, description, significance)
- **Factions** (groups, organizations, governments)
- **Magic/Technology** (how the world works)
- **History** (relevant backstory)
- **Rules** (constraints and limitations)

### End-of-Sprint Demo

- Generate protagonist for a fantasy novel
- Show voice sample in character's unique style
- Generate supporting cast of 5 characters
- Generate world elements (magic system, key locations)
- Edit a character's traits and goals
- Add a custom location
- Show story bible in database

---

## Sprint 4: Outline Generation

**Sessions:** 8-9
**Story Points:** 31
**Duration:** 1 day
**Dependencies:** Sprint 3 (characters and world must exist)

### Sprint Goal

Generate a complete chapter-by-chapter outline with detailed scene cards that will guide chapter generation.

### Key Deliverables

- Story structure selector (3-act, Save the Cat, Hero's Journey)
- Act breakdown generator
- Chapter outline with summaries
- Scene card generator (detailed scene specs)
- Outline editing UI with drag-and-drop
- "Start Generation" workflow trigger

### Tasks

| Task | Points | Priority | Description |
|------|--------|----------|-------------|
| Structure selector | 3 | P1 | Choose story structure: 3-act, Save the Cat, Hero's Journey |
| Act breakdown generator | 5 | P0 | Generate high-level act structure with major plot points |
| Chapter outline generator | 8 | P0 | Generate chapter summaries (30-50 chapters for 80k words) |
| Scene card generator | 8 | P0 | Detailed scene cards per chapter (POV, goal, conflict, outcome) |
| Outline editing UI | 5 | P0 | Drag/drop chapters, edit summaries and scene cards |
| Start generation button | 2 | P0 | Trigger full generation queue when outline approved |

### Success Criteria

- [ ] User selects story structure preference
- [ ] Act breakdown shows major plot points aligned to structure
- [ ] Chapter outline generates 30-50 chapters
- [ ] Each chapter has 1-3 scene cards
- [ ] Can reorder chapters via drag-and-drop
- [ ] Can edit chapter summaries and scene cards
- [ ] Can add or remove chapters
- [ ] "Start Generation" creates all chapter jobs in queue

### Scene Card Structure

Each scene card must include:
- **Chapter number** and **scene number**
- **POV character** (who's perspective)
- **Location** (where scene takes place)
- **Characters present** (who's in the scene)
- **Scene goal** (what POV character wants)
- **Conflict** (what opposes the goal)
- **Outcome** (what happens - success, failure, complication)
- **Emotional beat** (how POV character feels)

### Story Structure Templates

**3-Act Structure:**
- Act 1 (25%): Setup, inciting incident, first plot point
- Act 2 (50%): Rising action, midpoint, complications
- Act 3 (25%): Climax, resolution, denouement

**Save the Cat (15 beats):**
- Opening Image → Setup → Catalyst → Debate → Break into Two → B Story → Fun & Games → Midpoint → Bad Guys Close In → All is Lost → Dark Night of the Soul → Break into Three → Finale → Final Image

### End-of-Sprint Demo

- Select "Save the Cat" structure
- Generate act breakdown showing all 15 beats
- Generate 40 chapters with summaries
- Show scene cards for Chapter 1 (3 scenes)
- Edit a scene card's conflict and outcome
- Drag Chapter 5 to become Chapter 3
- Click "Start Generation" and show jobs queued

---

## Sprint 5: Chapter Generation

**Sessions:** 10-12
**Story Points:** 31
**Duration:** 1-2 days
**Dependencies:** Sprint 4 (outline must be complete)

### Sprint Goal

Implement the core chapter writing engine with Author Agent, context assembly, and progress tracking.

### Key Deliverables

- Minimal context assembly system (~2,150 tokens)
- Author Agent with genre-specific persona
- Chapter generation job processor
- Chapter summary generator (for next chapter context)
- Character state tracking system
- Progress dashboard

### Tasks

| Task | Points | Priority | Description |
|------|--------|----------|-------------|
| Context assembly | 5 | P0 | Build minimal context: Story DNA, POV character, scene cards, other characters, last summary |
| Author Agent persona | 5 | P0 | System prompt with genre-specific voice and style |
| Chapter generation job | 8 | P0 | Write chapter from scene cards using assembled context |
| Chapter summary generator | 3 | P0 | Generate 200-token summary after writing |
| State update system | 5 | P0 | Update character states, story bible after each chapter |
| Progress tracking | 5 | P1 | Track chapters written, estimate time remaining |

### Success Criteria

- [ ] Context assembly produces ~2,150 tokens per chapter
- [ ] Author Agent writes chapters in appropriate genre style
- [ ] Chapter generation completes in < 5 minutes
- [ ] Chapter summaries capture key events and emotional beats
- [ ] Character states update (location, emotional state, relationships)
- [ ] Story bible updates with new information
- [ ] Progress dashboard shows completion percentage

### Context Assembly Details

For each chapter generation, assemble:

1. **Story DNA** (~300 tokens)
   - Genre and subgenre
   - Tone and themes
   - Prose style guidelines

2. **POV Character Core** (~400 tokens)
   - Name and role
   - Voice sample
   - Current emotional state
   - Current goals and conflicts

3. **Scene Card** (~300 tokens)
   - Location and characters
   - Scene goal, conflict, outcome
   - Emotional beat

4. **Other Characters** (~450 tokens)
   - Mini-profiles for characters in scene
   - Current relationships to POV character

5. **Last Chapter Summary** (~200 tokens)
   - What just happened
   - Emotional momentum

6. **System Prompts** (~500 tokens)
   - Author Agent instructions
   - Genre-specific guidelines

### Author Agent Persona

The Author Agent should:
- Write in genre-appropriate style (literary, commercial, YA, etc.)
- Match tone (dark, humorous, romantic, etc.)
- Show, don't tell
- Use strong character voice
- Create vivid sensory details
- Build tension and pacing
- Honor scene card specifications

### End-of-Sprint Demo

- Show context assembly for Chapter 1
- Generate Chapter 1 (should complete in ~3-5 minutes)
- Review generated chapter for quality
- Show chapter summary generated
- Show character states updated
- Display progress (1/40 chapters, 2.5% complete)

---

## Sprint 6: Editing Agents

**Sessions:** 13-14
**Story Points:** 32
**Duration:** 1 day
**Dependencies:** Sprint 5 (chapter generation must work)

### Sprint Goal

Implement the full editing pipeline with four specialized agents that automatically refine each chapter.

### Key Deliverables

- Developmental Editor agent (structure, pacing, character arcs)
- Line Editor agent (prose quality, dialogue)
- Continuity Editor agent (cross-chapter consistency)
- Copy Editor agent (grammar, punctuation)
- Auto-revision loop (Author revises based on feedback)
- Issue flagging system

### Tasks

| Task | Points | Priority | Description |
|------|--------|----------|-------------|
| Developmental Editor agent | 5 | P0 | Analyze structure, pacing, character development, plot logic |
| Line Editor agent | 5 | P0 | Improve prose quality, dialogue, showing vs telling |
| Continuity Editor agent | 8 | P0 | Check consistency across chapters and with story bible |
| Copy Editor agent | 3 | P0 | Fix grammar, punctuation, style consistency |
| Auto-revision loop | 5 | P0 | Author Agent revises based on Developmental Editor feedback |
| Flag system | 3 | P1 | Flag unresolved issues for human review |
| Edit job integration | 3 | P0 | Add all edit jobs to generation pipeline |

### Success Criteria

- [ ] Developmental Editor identifies pacing and arc issues
- [ ] Line Editor improves prose quality measurably
- [ ] Continuity Editor catches inconsistencies with story bible
- [ ] Copy Editor fixes grammar and style issues
- [ ] Auto-revision loop produces improved chapters
- [ ] Unresolved issues flagged for review
- [ ] Full pipeline runs automatically after Author Agent

### Agent Pipeline Flow

```
Author Agent (initial draft)
  ↓
Developmental Editor (structure feedback)
  ↓
Author Agent (revision based on dev feedback)
  ↓
Line Editor (prose polish)
  ↓
Continuity Editor (consistency check)
  ↓
Copy Editor (final cleanup)
  ↓
Chapter Complete (or flagged for review)
```

### Developmental Editor Checklist

- [ ] Scene goals clear and compelling?
- [ ] Conflict present and escalating?
- [ ] Character actions consistent with motivation?
- [ ] Pacing appropriate (not too slow or rushed)?
- [ ] Plot logic sound?
- [ ] Emotional beats land effectively?
- [ ] Foreshadowing/setup present?

### Line Editor Checklist

- [ ] Strong, varied sentence structure?
- [ ] Active voice preferred over passive?
- [ ] Sensory details vivid and specific?
- [ ] Dialogue natural and character-specific?
- [ ] Show > tell ratio appropriate?
- [ ] Metaphors and descriptions fresh?
- [ ] Redundancy eliminated?

### Continuity Editor Checklist

- [ ] Character names and descriptions consistent?
- [ ] Timeline consistent (time of day, season, etc.)?
- [ ] Character knowledge consistent (don't know what they can't know)?
- [ ] World rules consistent (magic, technology)?
- [ ] Locations consistent with descriptions?
- [ ] Relationships consistent with previous chapters?

### Copy Editor Checklist

- [ ] Grammar correct?
- [ ] Punctuation correct (dialogue tags, commas)?
- [ ] Spelling consistent (character names, place names)?
- [ ] Style guide followed (British vs American, Oxford comma, etc.)?
- [ ] Formatting consistent?

### End-of-Sprint Demo

- Generate a chapter with deliberate issues
- Show Developmental Editor identify pacing problem
- Show Author Agent revision improving pacing
- Show Line Editor improving prose
- Show Continuity Editor catching name inconsistency
- Show Copy Editor fixing grammar
- Display flagged issue for human review

---

## Sprint 7: Export & Dashboard

**Sessions:** 15-16
**Story Points:** 29
**Duration:** 1 day
**Dependencies:** Sprint 6 (editing pipeline must work)

### Sprint Goal

Enable export of completed manuscripts in professional formats and provide visibility into generation progress.

### Key Deliverables

- DOCX export (Word format with proper formatting)
- PDF export (print-ready)
- Story bible export
- Progress dashboard with estimates
- Flagged issues UI
- Chapter regeneration capability

### Tasks

| Task | Points | Priority | Description |
|------|--------|----------|-------------|
| DOCX export | 8 | P0 | Formatted manuscript with chapters, page breaks, proper styles |
| PDF export | 5 | P0 | Print-ready PDF with fonts, margins, page numbers |
| Story bible export | 5 | P1 | Characters, world, timeline document (DOCX or PDF) |
| Progress dashboard | 5 | P0 | Visual progress with chapters complete, time estimates |
| Flagged issues UI | 3 | P1 | Review and resolve editor-flagged issues |
| Chapter regeneration | 3 | P1 | Regenerate specific chapters on request |

### Success Criteria

- [ ] DOCX export opens in Microsoft Word with proper formatting
- [ ] PDF export is print-ready with professional appearance
- [ ] Story bible export includes all characters and world elements
- [ ] Progress dashboard shows real-time completion percentage
- [ ] Time remaining estimate based on actual generation speed
- [ ] Can view all flagged issues in dedicated UI
- [ ] Can regenerate a specific chapter and re-run editing

### DOCX Format Specifications

- **Title page**: Title, author name
- **Chapter headings**: Centered, bold, larger font
- **Body text**: 12pt serif font, 1.5 line spacing
- **Scene breaks**: Three centered asterisks (* * *)
- **Page breaks**: Between chapters
- **Margins**: 1 inch all sides
- **Headers/footers**: Page numbers

### PDF Format Specifications

- **Font**: Professional serif (Times New Roman, Garamond)
- **Size**: US Letter (8.5" x 11") or A4
- **Margins**: 1 inch (or 2.5cm) all sides
- **Page numbers**: Bottom center or top right
- **Chapter starts**: New page
- **Scene breaks**: Visual separator

### Progress Dashboard Elements

- **Overall progress bar**: Percentage complete
- **Chapter count**: X of Y chapters complete
- **Word count**: Current total vs target
- **Time estimate**: Based on average chapter generation time
- **Session count**: Sessions used so far
- **Rate limit status**: Current session usage
- **Recent activity**: Last 10 chapters generated
- **Issues flagged**: Count of unresolved issues

### End-of-Sprint Demo

- Generate a 3-chapter mini-project
- Export to DOCX and open in Word
- Export to PDF and show print-ready format
- Export story bible showing all characters
- Show progress dashboard at 75% complete
- View flagged issue from earlier sprint
- Regenerate Chapter 2

---

## Sprint 8: Trilogy Support & Production Polish

**Sessions:** 17-20
**Story Points:** 32
**Duration:** 2 days
**Dependencies:** Sprint 7 (export must work)

### Sprint Goal

Add multi-book trilogy support, cross-book continuity tracking, and polish the application for production use.

### Key Deliverables

- Multi-book project support
- Cross-book continuity tracking
- Series bible generator
- Book transition summaries
- Comprehensive testing
- User documentation

### Tasks

| Task | Points | Priority | Description |
|------|--------|----------|-------------|
| Multi-book projects | 5 | P0 | Project can contain multiple books (trilogy) |
| Cross-book continuity | 8 | P0 | Track characters, timeline, world state across books |
| Series bible generator | 5 | P0 | Combined bible for entire series |
| Book transition summaries | 3 | P1 | Summary documents between books |
| Testing and bug fixes | 8 | P0 | End-to-end testing, edge cases, error handling |
| Documentation | 3 | P1 | User guide, API docs, setup instructions |

### Success Criteria

- [ ] Can create trilogy project with 3 books
- [ ] Character states carry over between books
- [ ] Timeline remains consistent across books
- [ ] World state changes tracked (political shifts, etc.)
- [ ] Series bible includes all books
- [ ] Book transition summaries explain gaps between books
- [ ] All critical paths tested
- [ ] Documentation complete for setup and usage

### Multi-Book Data Model

Extend project structure:
```json
{
  "project_id": "uuid",
  "title": "The Shadow Trilogy",
  "type": "trilogy",
  "books": [
    {
      "book_id": "uuid",
      "book_number": 1,
      "title": "Shadow Rising",
      "status": "completed",
      "chapters": [...]
    },
    {
      "book_id": "uuid",
      "book_number": 2,
      "title": "Shadow Falling",
      "status": "generating",
      "chapters": [...]
    }
  ]
}
```

### Cross-Book Continuity Features

- **Character evolution**: Track character growth across books
- **Timeline tracking**: Maintain chronological consistency
- **World state changes**: Political shifts, destroyed locations, new factions
- **Relationship dynamics**: How relationships evolve
- **Recurring elements**: Items, prophecies, mysteries
- **Callbacks**: Reference events from previous books

### Series Bible Enhancements

The series bible should include:
- **Character index**: All characters across all books
- **Timeline**: Chronological event list across series
- **World state evolution**: How world changes book to book
- **Mystery tracking**: Questions raised and answered
- **Themes**: How themes develop across series
- **Foreshadowing log**: Setup and payoff tracking

### Testing Focus Areas

| Area | Test Cases |
|------|------------|
| **Queue resilience** | Crash during generation, rate limit handling, checkpoint recovery |
| **Session tracking** | Precise reset time calculation, session rollover |
| **Context assembly** | Token count validation, all components present |
| **Agent pipeline** | Each agent runs, revision loop works, flags saved |
| **Export** | DOCX format, PDF generation, story bible completeness |
| **Multi-book** | Character state carry-over, timeline consistency |
| **Edge cases** | Empty chapters, very long chapters, special characters |

### Documentation Requirements

1. **README.md**: Project overview, quick start
2. **SETUP.md**: Installation instructions
3. **USER_GUIDE.md**: How to use the application
4. **API_DOCS.md**: API endpoint documentation
5. **TROUBLESHOOTING.md**: Common issues and solutions
6. **ARCHITECTURE.md**: Technical architecture overview

### End-of-Sprint Demo

- Create trilogy project
- Generate Book 1 (or show already generated)
- Start Book 2 generation
- Show character state carried over from Book 1
- Show timeline consistency check
- Export series bible with all books
- Run full test suite
- Walk through user documentation

---

## Cross-Sprint Dependencies

```
Sprint 1 (Foundation)
  ↓
Sprint 2 (Idea Generation) ← depends on Sprint 1
  ↓
Sprint 3 (Characters/World) ← depends on Sprint 2
  ↓
Sprint 4 (Outline) ← depends on Sprint 3
  ↓
Sprint 5 (Chapter Generation) ← depends on Sprint 4
  ↓
Sprint 6 (Editing Agents) ← depends on Sprint 5
  ↓
Sprint 7 (Export) ← depends on Sprint 6
  ↓
Sprint 8 (Trilogy) ← depends on Sprint 7
```

**Critical Path:** Each sprint builds on the previous sprint. No parallel sprint work possible.

---

## Definition of Done (All Sprints)

A sprint is considered complete when:

- [ ] All P0 tasks are completed
- [ ] Success criteria met
- [ ] Code reviewed and merged
- [ ] Tests written and passing
- [ ] Demo successful
- [ ] Documentation updated
- [ ] No critical bugs
- [ ] Ready for next sprint dependency

---

## Session Budget Tracking

| Sprint | Planned Sessions | Actual Sessions | Variance | Notes |
|--------|-----------------|-----------------|----------|-------|
| Sprint 1 | 3 | | | |
| Sprint 2 | 2 | | | |
| Sprint 3 | 2 | | | |
| Sprint 4 | 2 | | | |
| Sprint 5 | 3 | | | |
| Sprint 6 | 2 | | | |
| Sprint 7 | 2 | | | |
| Sprint 8 | 4 | | | |
| **TOTAL** | **20** | | | |

---

## Risk Register

| Sprint | Risk | Mitigation |
|--------|------|------------|
| Sprint 1 | Session tracking algorithm wrong | Conservative 30-min fallback |
| Sprint 2 | Poor concept generation quality | Iterative prompt engineering |
| Sprint 3 | Character voices not distinct | Voice sample refinement |
| Sprint 4 | Scene cards too vague | Detailed structure template |
| Sprint 5 | Chapter generation too slow | Optimize context, use Claude Opus 4.5 |
| Sprint 6 | Editing agents miss issues | Multi-pass review, human review option |
| Sprint 7 | Export formatting broken | Test with multiple sample manuscripts |
| Sprint 8 | Cross-book continuity failures | Comprehensive timeline tracking |

---

**Last Updated:** January 2026
**Version:** 2.0
