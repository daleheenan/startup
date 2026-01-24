# NovelForge - Technical Architecture

## System Overview

NovelForge is a single-user, AI-powered novel writing application built on a resilient queue-based architecture that leverages Claude Max subscription for high-quality prose generation.

**Architecture Style:** Queue-based job processing with checkpoint recovery
**Deployment Model:** Local development server (single-user)
**AI Integration:** Claude Code SDK with Max subscription authentication

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│                  (Next.js Web Application)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/REST
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                       API Server                                │
│                  (Node.js + Express)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │   Routes     │  │   Services   │  │  Agent Definitions  │  │
│  │ - Projects   │  │ - Claude     │  │ - Author            │  │
│  │ - Generation │  │ - Generator  │  │ - Dev Editor        │  │
│  │ - Export     │  │ - Context    │  │ - Line Editor       │  │
│  └──────────────┘  └──────────────┘  │ - Continuity        │  │
│                                       │ - Copy Editor       │  │
│                                       └─────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      Job Queue System                           │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │   Worker     │  │  Checkpoint  │  │  Rate Limit Handler │  │
│  │   Loop       │  │   Manager    │  │                     │  │
│  └──────────────┘  └──────────────┘  └─────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Data & Storage Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │   SQLite DB  │  │  File System │  │  Claude Code SDK    │  │
│  │ - Projects   │  │ - Exports    │  │ (Max Subscription)  │  │
│  │ - Chapters   │  │ - Checkpoints│  │                     │  │
│  │ - Jobs       │  │              │  │                     │  │
│  │ - Sessions   │  │              │  │                     │  │
│  └──────────────┘  └──────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. Frontend (Next.js 14+)

**Technology:** Next.js with App Router, React, TypeScript, Tailwind CSS

**Responsibilities:**
- User interface for project setup
- Story preference input forms
- Concept selection and review
- Character and world editing
- Outline editing with drag-and-drop
- Real-time progress monitoring
- Manuscript export triggers
- Flagged issue management

**Key Pages:**

```
/                           → Home/project list
/project/new                → New project wizard
/project/[id]               → Project dashboard
/project/[id]/setup         → Setup flow (concepts, characters, world, outline)
/project/[id]/progress      → Generation progress monitoring
/project/[id]/chapters      → Chapter browser
/project/[id]/export        → Export options
/project/[id]/issues        → Flagged issues review
```

**Key Components:**

```typescript
components/
├── forms/
│   ├── PreferenceForm.tsx      // Genre, tone, theme selection
│   ├── CharacterEditor.tsx     // Character profile editing
│   └── WorldEditor.tsx         // World element editing
├── generation/
│   ├── ConceptCard.tsx         // Story concept display
│   ├── OutlineEditor.tsx       // Chapter outline with drag-drop
│   └── SceneCardEditor.tsx     // Scene card editing
├── progress/
│   ├── ProgressBar.tsx         // Visual progress indicator
│   ├── ActivityFeed.tsx        // Recent generation events
│   └── StatsGrid.tsx           // Metrics display
└── export/
    ├── ExportPanel.tsx         // Export options
    └── FlaggedIssuesPanel.tsx  // Issue review
```

**State Management:**
- React hooks for local state
- SWR for server state (real-time updates)
- Context for global app state (user settings)

---

### 2. Backend (Node.js + Express)

**Technology:** Node.js 18+, Express, TypeScript, better-sqlite3

**Responsibilities:**
- RESTful API endpoints
- Business logic orchestration
- Claude API integration
- Job queue management
- Database operations
- Export generation

**API Routes:**

```
backend/routes/
├── projects.ts              // Project CRUD
├── generation.ts            // Generation triggers
├── chapters.ts              // Chapter operations
├── export.ts                // Export endpoints
└── progress.ts              // Progress tracking
```

**Services:**

```
backend/services/
├── claude.service.ts        // Claude API wrapper
├── generator.service.ts     // Generation orchestration
├── context.service.ts       // Context assembly
├── export.service.ts        // DOCX/PDF generation
└── session-tracker.ts       // Session tracking
```

**Agent Definitions:**

```
backend/agents/
├── author-agent.ts          // Author persona and prompts
├── dev-editor-agent.ts      // Developmental editing
├── line-editor-agent.ts     // Line editing
├── continuity-agent.ts      // Continuity checking
└── copy-editor-agent.ts     // Copy editing
```

---

### 3. Job Queue System

**Architecture:** SQLite-backed job queue with worker loop and checkpoint recovery

**Job States:**
```
PENDING → RUNNING → COMPLETED
                 ↓
                PAUSED (rate limited, auto-resumes)
                 ↓
                FAILED (after 3 retries)
```

**Queue Worker:**

```typescript
// backend/queue/worker.ts
class QueueWorker {
  private isRunning = false;
  private currentJob: Job | null = null;

  async start() {
    this.isRunning = true;
    while (this.isRunning) {
      await this.processNextJob();
      await sleep(1000); // Check every second
    }
  }

  async processNextJob() {
    const job = await this.pickupJob();
    if (!job) return;

    this.currentJob = job;

    try {
      await this.executeJob(job);
      await this.markCompleted(job.id);
    } catch (error) {
      if (error instanceof RateLimitError) {
        await this.handleRateLimit(job);
      } else {
        await this.retryOrFail(job, error);
      }
    }

    this.currentJob = null;
  }

  async executeJob(job: Job) {
    switch (job.type) {
      case 'generate_chapter':
        return await this.generateChapter(job);
      case 'dev_edit':
        return await this.developmentalEdit(job);
      case 'line_edit':
        return await this.lineEdit(job);
      case 'continuity_check':
        return await this.continuityCheck(job);
      case 'copy_edit':
        return await this.copyEdit(job);
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }
}
```

**Checkpoint System:**

```typescript
// backend/queue/checkpoint.ts
interface Checkpoint {
  jobId: string;
  step: string;              // Current processing step
  data: any;                 // Step-specific data
  completedSteps: string[];  // Steps already completed
  timestamp: string;
}

class CheckpointManager {
  async saveCheckpoint(jobId: string, step: string, data: any) {
    const checkpoint = {
      jobId,
      step,
      data,
      completedSteps: await this.getCompletedSteps(jobId),
      timestamp: new Date().toISOString(),
    };

    await db.prepare(`
      UPDATE jobs SET checkpoint = ? WHERE id = ?
    `).run(JSON.stringify(checkpoint), jobId);
  }

  async restoreFromCheckpoint(job: Job): Promise<void> {
    const checkpoint = JSON.parse(job.checkpoint);
    // Resume from checkpoint.step
    // Skip completed steps
    // Use checkpoint.data to restore state
  }
}
```

---

### 4. Rate Limit Handling

**Strategy:** Precise session tracking with automatic pause/resume

**Session Tracking:**

```typescript
// backend/services/session-tracker.ts
class SessionTracker {
  private db: Database;

  async trackRequest() {
    const session = this.getCurrentSession();

    if (!session || this.hasSessionReset()) {
      this.startNewSession();
    } else {
      this.incrementRequests();
    }
  }

  private startNewSession() {
    const now = new Date();
    const resetTime = new Date(now.getTime() + 5 * 60 * 60 * 1000); // +5 hours

    this.db.prepare(`
      INSERT OR REPLACE INTO session_tracking
      (id, session_started_at, session_resets_at, is_active, requests_this_session)
      VALUES (1, ?, ?, 1, 1)
    `).run(now.toISOString(), resetTime.toISOString());
  }

  getTimeUntilReset(): number {
    const session = this.getCurrentSession();
    if (!session) return 0;

    const resetTime = new Date(session.session_resets_at);
    const now = new Date();
    return Math.max(0, resetTime.getTime() - now.getTime());
  }

  hasSessionReset(): boolean {
    return this.getTimeUntilReset() === 0;
  }
}
```

**Rate Limit Handler:**

```typescript
// backend/queue/rate-limit-handler.ts
class RateLimitHandler {
  async handleRateLimit(job: Job) {
    // Pause the job
    await this.pauseJob(job);

    // Calculate precise wait time
    const waitMs = this.sessionTracker.getTimeUntilReset();

    console.log(`Rate limited. Waiting ${Math.round(waitMs / 1000 / 60)} minutes...`);

    // Wait until session resets
    await sleep(waitMs);

    // Clear session tracking
    await this.sessionTracker.clearSession();

    // Resume all paused jobs
    await this.resumePausedJobs();
  }
}
```

---

## Data Architecture

### Database Schema (SQLite)

**projects**
```sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('standalone', 'trilogy')),
    genre TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('setup', 'generating', 'completed')),
    story_dna JSON,              -- Genre, tone, themes, prose style
    story_bible JSON,            -- Characters, world, timeline
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**books**
```sql
CREATE TABLE books (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    book_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('setup', 'generating', 'completed')),
    word_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_books_project ON books(project_id);
```

**chapters**
```sql
CREATE TABLE chapters (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    chapter_number INTEGER NOT NULL,
    title TEXT,
    scene_cards JSON,            -- Array of scene specifications
    content TEXT,                -- Generated chapter text
    summary TEXT,                -- Summary for context in next chapter
    status TEXT NOT NULL CHECK(status IN ('pending', 'writing', 'editing', 'completed')),
    word_count INTEGER DEFAULT 0,
    flags JSON,                  -- Issues flagged by editors
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX idx_chapters_book ON chapters(book_id);
CREATE INDEX idx_chapters_status ON chapters(status);
```

**jobs**
```sql
CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,          -- generate_chapter, dev_edit, line_edit, etc.
    target_id TEXT NOT NULL,     -- Chapter ID or other target
    status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'completed', 'paused', 'failed')),
    checkpoint JSON,             -- Recovery checkpoint
    error TEXT,                  -- Error message if failed
    attempts INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created ON jobs(created_at);
```

**session_tracking**
```sql
CREATE TABLE session_tracking (
    id INTEGER PRIMARY KEY,
    session_started_at DATETIME,
    session_resets_at DATETIME,
    is_active INTEGER DEFAULT 0,
    requests_this_session INTEGER DEFAULT 0
);
```

### Data Flow Diagrams

**Chapter Generation Flow:**

```
User clicks "Start Generation"
  ↓
Create jobs for all chapters
  ↓
Queue worker picks up first job
  ↓
Assemble context (~2,150 tokens)
  ├── Story DNA (300 tokens)
  ├── POV Character (400 tokens)
  ├── Scene Card (300 tokens)
  ├── Other Characters (450 tokens)
  ├── Last Summary (200 tokens)
  └── System Prompts (500 tokens)
  ↓
Author Agent generates chapter
  ↓
Save chapter to database
  ↓
Generate chapter summary
  ↓
Update character states
  ↓
Create editing jobs
  ↓
Dev Editor reviews chapter
  ↓
Author Agent revises (if needed)
  ↓
Line Editor polishes prose
  ↓
Continuity Editor checks consistency
  ↓
Copy Editor fixes errors
  ↓
Mark chapter as completed
  ↓
Queue picks up next chapter job
```

**Rate Limit Handling Flow:**

```
Claude API returns 429 error
  ↓
RateLimitError thrown
  ↓
Queue worker catches error
  ↓
Save checkpoint for current job
  ↓
Mark job as PAUSED
  ↓
Calculate time until session reset
  ↓
Wait (sleep) until reset time
  ↓
Session resets
  ↓
Clear session tracking
  ↓
Mark all PAUSED jobs as PENDING
  ↓
Queue worker picks up next job
  ↓
Resume generation
```

---

## AI Agent Ensemble

### Agent Pipeline Architecture

Each chapter passes through 5 specialized agents in sequence:

```
1. Author Agent
   ↓
2. Developmental Editor
   ↓ (if NEEDS_REVISION)
   ↓
1. Author Agent (revision)
   ↓ (if APPROVE)
   ↓
3. Line Editor
   ↓
4. Continuity Editor
   ↓
5. Copy Editor
   ↓
Chapter Complete
```

### Agent Specifications

**1. Author Agent**

**Role:** Write all prose with genre-specific persona

**System Prompt Structure:**
```typescript
const systemPrompt = `You are a bestselling ${genre} author.

Your prose is ${proseStyle}.
Your tone is ${tone}.
You explore themes of ${themes}.

Writing Guidelines:
${genreSpecificGuidelines}

Generate chapter from scene cards with:
- Strong character voice
- Vivid sensory details
- Natural dialogue
- Show > tell
- Appropriate pacing for ${genre}

Target: 2,000-2,500 words`;
```

**Input:**
- Story DNA
- POV character core
- Scene cards
- Other character profiles
- Last chapter summary

**Output:**
- Chapter text (2,000-2,500 words)

---

**2. Developmental Editor**

**Role:** Review structure, pacing, character development

**System Prompt:**
```typescript
const systemPrompt = `You are a developmental editor for commercial fiction.

Evaluate:
1. Scene Structure: Clear goal/conflict/outcome?
2. Pacing: Too slow, rushed, or well-paced?
3. Character: Actions motivated and consistent?
4. Plot: Logic sound? Any holes?
5. Emotional Beats: Land effectively?
6. Foreshadowing: Appropriate setup?
7. Theme: Naturally woven?

Return:
{
  "assessment": "APPROVE" | "NEEDS_REVISION",
  "issues": [...],
  "strengths": [...],
  "revisionGuidance": "..."
}`;
```

**Input:**
- Chapter text
- Scene cards (expected outcomes)
- Character profiles
- Story bible

**Output:**
- Assessment (APPROVE/NEEDS_REVISION)
- Issues list
- Revision guidance

---

**3. Line Editor**

**Role:** Polish prose quality, dialogue, sentence craft

**System Prompt:**
```typescript
const systemPrompt = `You are a line editor specializing in commercial fiction.

Improve:
1. Sentence variety (length, structure)
2. Active voice (over passive)
3. Sensory details (vivid, specific)
4. Dialogue (natural, character-specific)
5. Show vs tell (appropriate balance)
6. Word choice (precise, evocative)
7. Redundancy (eliminate)
8. Clichés (replace)

Maintain author's voice. Polish, don't rewrite.`;
```

**Input:**
- Chapter text (post dev edit)
- Genre and prose style

**Output:**
- Polished chapter text

---

**4. Continuity Editor**

**Role:** Check consistency across chapters and story bible

**System Prompt:**
```typescript
const systemPrompt = `You are a continuity editor.

Check against story bible and previous chapters for:
1. Character names and descriptions
2. Timeline accuracy
3. Character knowledge consistency
4. World rule consistency
5. Location consistency
6. Relationship consistency

Return:
{
  "issues": [
    {
      "type": "character_description",
      "severity": "minor" | "major",
      "description": "...",
      "location": "line X",
      "correction": "..."
    }
  ]
}`;
```

**Input:**
- Chapter text
- Story bible
- Previous chapter summaries
- All previous chapters (for trilogy)

**Output:**
- Continuity issues list
- Corrected chapter text (if auto-fixable)
- Flags for manual review (if not fixable)

---

**5. Copy Editor**

**Role:** Fix grammar, punctuation, style

**System Prompt:**
```typescript
const systemPrompt = `You are a copy editor.

Fix:
1. Grammar (subject-verb, tense)
2. Punctuation (commas, dashes, dialogue tags)
3. Spelling (character names, places)
4. Capitalization
5. Formatting

Style Guide:
- American English
- Oxford comma: YES
- Em dashes: No spaces (word—word)
- Dialogue tags: Comma before closing quote

Preserve author's voice.`;
```

**Input:**
- Chapter text

**Output:**
- Copy-edited chapter text

---

## Context Management

### Lightweight Context Strategy

**Goal:** Minimize token usage while maintaining quality

**Traditional Approach:** ~37,000 tokens per chapter
**NovelForge Approach:** ~2,150 tokens per chapter
**Reduction:** 90%

### Context Assembly

**1. Story DNA (~300 tokens)**
```typescript
const storyDNA = {
  genre: 'Dark Fantasy',
  subgenre: 'Grimdark',
  tone: 'Dark, gritty, morally complex',
  themes: ['Power and corruption', 'Redemption', 'Moral ambiguity'],
  proseStyle: 'Visceral, intense, with dark humor',
};
```

**2. POV Character Core (~400 tokens)**
```typescript
const povCharacter = {
  name: 'Kael Draven',
  role: 'Protagonist',
  voiceSample: '"I don\'t do mornings. Never have, never will. The world can burn before noon for all I care—and trust me, in this city, it usually does."',
  currentState: {
    location: 'The Broken Crown tavern, Lower District',
    emotionalState: 'Bitter, cynical, but spark of hope emerging',
    goals: 'Find evidence of the Council\'s corruption',
    conflicts: 'Internal: Can\'t trust anyone. External: Council hunting him.',
  },
};
```

**3. Scene Card (~300 tokens)**
```typescript
const sceneCard = {
  sceneNumber: 1,
  povCharacter: 'Kael Draven',
  location: 'The Broken Crown tavern',
  characters: ['Kael', 'Mira', 'Barkeep'],
  timeOfDay: 'Night',
  goal: 'Get information from Mira about Council meeting',
  conflict: 'Mira doesn\'t trust Kael, guards watching',
  outcome: 'Complication - Gets partial info but guards get suspicious',
  emotionalBeat: 'Frustration mixed with determination',
};
```

**4. Other Characters (~450 tokens)**
```typescript
const otherCharacters = [
  {
    name: 'Mira',
    briefDescription: 'Former Council spy, now helping resistance. Cautious, intelligent. Doesn\'t trust easily.',
  },
  {
    name: 'Barkeep',
    briefDescription: 'Neutral observer, keeps secrets for coin. Gruff exterior, soft heart.',
  },
];
```

**5. Last Chapter Summary (~200 tokens)**
```typescript
const lastSummary = `Kael escaped the Council's ambush at the docks, barely surviving. He killed two guards in self-defense, adding to his wanted status. He learned that someone inside the resistance is leaking information. Emotionally, he's more isolated than ever, trusting no one. He ends the chapter deciding to seek out Mira, despite the risk.`;
```

**6. System Prompts (~500 tokens)**
- Agent persona
- Genre guidelines
- Prose style instructions
- Technical requirements (word count, format)

**Total: ~2,150 tokens**

---

## API Specification

### REST API Endpoints

#### Project Management

**POST /api/projects**
Create new project

Request:
```json
{
  "concept": {
    "title": "Shadow Rising",
    "logline": "...",
    "synopsis": "..."
  },
  "preferences": {
    "genre": "fantasy",
    "subgenre": "grimdark",
    "tones": ["dark", "gritty"],
    "themes": ["power", "corruption"]
  }
}
```

Response:
```json
{
  "id": "uuid",
  "title": "Shadow Rising",
  "status": "setup"
}
```

---

**GET /api/projects/:id**
Get project details

Response:
```json
{
  "id": "uuid",
  "title": "Shadow Rising",
  "type": "standalone",
  "genre": "fantasy",
  "status": "generating",
  "storyDNA": {...},
  "storyBible": {...},
  "createdAt": "2026-01-24T...",
  "updatedAt": "2026-01-24T..."
}
```

---

**PUT /api/projects/:id**
Update project

Request:
```json
{
  "storyBible": {
    "characters": [...],
    "world": {...}
  }
}
```

---

**DELETE /api/projects/:id**
Delete project

Response: 204 No Content

---

#### Generation

**POST /api/projects/:id/generate/concepts**
Generate story concepts

Request:
```json
{
  "genre": "fantasy",
  "subgenre": "grimdark",
  "tones": ["dark", "gritty"],
  "themes": ["power", "corruption"]
}
```

Response:
```json
{
  "concepts": [
    {
      "title": "Shadow Rising",
      "logline": "...",
      "synopsis": "..."
    },
    // ... 4 more
  ]
}
```

---

**POST /api/projects/:id/generate/characters**
Generate characters

Response:
```json
{
  "protagonist": {...},
  "supporting": [...]
}
```

---

**POST /api/projects/:id/generate/world**
Generate world elements

Response:
```json
{
  "locations": [...],
  "factions": [...],
  "systems": [...]
}
```

---

**POST /api/projects/:id/generate/outline**
Generate chapter outline

Request:
```json
{
  "structure": "save_the_cat",
  "targetChapters": 40
}
```

Response:
```json
{
  "acts": [...],
  "chapters": [
    {
      "number": 1,
      "title": "The Broken Crown",
      "summary": "...",
      "sceneCards": [...]
    },
    // ...
  ]
}
```

---

**POST /api/projects/:id/generate/start**
Start novel generation

Response:
```json
{
  "jobsCreated": 200,  // 40 chapters × 5 agents
  "status": "generating"
}
```

---

**GET /api/projects/:id/progress**
Get generation progress

Response:
```json
{
  "chaptersCompleted": 15,
  "chaptersTotal": 40,
  "percentComplete": 37.5,
  "wordCount": 33750,
  "targetWordCount": 90000,
  "avgChapterTime": 180000,
  "estimatedTimeRemaining": 4500000,
  "sessionsUsed": 2,
  "currentChapter": {
    "number": 16,
    "status": "editing"
  },
  "recentEvents": [...]
}
```

---

**GET /api/projects/:id/progress/stream**
SSE progress updates

Server-Sent Events stream with real-time progress updates.

---

#### Export

**GET /api/projects/:id/export/docx**
Export as DOCX

Response: application/vnd.openxmlformats-officedocument.wordprocessingml.document

---

**GET /api/projects/:id/export/pdf**
Export as PDF

Response: application/pdf

---

**GET /api/projects/:id/export/bible**
Export story bible

Response: application/vnd.openxmlformats-officedocument.wordprocessingml.document

---

#### Chapters

**GET /api/projects/:id/chapters**
List all chapters

Response:
```json
{
  "chapters": [
    {
      "id": "uuid",
      "number": 1,
      "title": "The Broken Crown",
      "status": "completed",
      "wordCount": 2250,
      "flags": []
    },
    // ...
  ]
}
```

---

**GET /api/chapters/:id**
Get chapter details

Response:
```json
{
  "id": "uuid",
  "number": 1,
  "title": "The Broken Crown",
  "content": "...",
  "summary": "...",
  "sceneCards": [...],
  "status": "completed",
  "wordCount": 2250,
  "flags": []
}
```

---

**POST /api/chapters/:id/regenerate**
Regenerate chapter

Response:
```json
{
  "jobsCreated": 5,
  "status": "pending"
}
```

---

### Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Claude API rate limit exceeded",
    "details": {
      "resetTime": "2026-01-24T15:30:00Z"
    }
  }
}
```

**Error Codes:**
- `INVALID_REQUEST` - Validation error (400)
- `NOT_FOUND` - Resource not found (404)
- `RATE_LIMIT_EXCEEDED` - Claude API rate limit (429)
- `INTERNAL_ERROR` - Server error (500)
- `JOB_FAILED` - Job execution failed (500)

---

## Deployment Architecture

### Development Environment

**Requirements:**
- Node.js 18+
- npm or yarn
- SQLite3

**Services:**
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Database: data/novelforge.db (file)

**Environment Variables:**
```
# Claude API
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-5-20251101

# Database
DATABASE_PATH=./data/novelforge.db

# Server
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### File Structure

```
novelforge/
├── frontend/                    # Next.js application
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── project/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── setup/page.tsx
│   │   │       ├── progress/page.tsx
│   │   │       ├── chapters/page.tsx
│   │   │       ├── export/page.tsx
│   │   │       └── issues/page.tsx
│   ├── components/
│   │   ├── forms/
│   │   ├── generation/
│   │   ├── progress/
│   │   └── export/
│   ├── lib/
│   │   ├── api.ts
│   │   └── utils.ts
│   ├── package.json
│   └── tsconfig.json
├── backend/                     # Node.js API
│   ├── routes/
│   │   ├── projects.ts
│   │   ├── generation.ts
│   │   ├── chapters.ts
│   │   ├── export.ts
│   │   └── progress.ts
│   ├── services/
│   │   ├── claude.service.ts
│   │   ├── generator.service.ts
│   │   ├── context.service.ts
│   │   ├── export.service.ts
│   │   └── session-tracker.ts
│   ├── agents/
│   │   ├── author-agent.ts
│   │   ├── dev-editor-agent.ts
│   │   ├── line-editor-agent.ts
│   │   ├── continuity-agent.ts
│   │   └── copy-editor-agent.ts
│   ├── queue/
│   │   ├── worker.ts
│   │   ├── checkpoint.ts
│   │   └── rate-limit-handler.ts
│   ├── db/
│   │   ├── schema.sql
│   │   ├── migrate.ts
│   │   └── connection.ts
│   ├── server.ts
│   ├── package.json
│   └── tsconfig.json
├── data/                        # SQLite database
│   └── novelforge.db
├── exports/                     # Generated manuscripts
│   └── [project-id]/
│       ├── manuscript.docx
│       ├── manuscript.pdf
│       └── story-bible.docx
├── package.json
└── README.md
```

---

## Performance Considerations

### Target Performance Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Chapter generation | < 5 minutes | Using Claude Opus 4.5 |
| Context assembly | < 5 seconds | In-memory processing |
| Chapter summary | < 30 seconds | Short prompt |
| Dev edit | < 2 minutes | Analysis task |
| Line edit | < 2 minutes | Prose polishing |
| Continuity check | < 2 minutes | Comparison task |
| Copy edit | < 1 minute | Quick fixes |
| **Total per chapter** | **< 15 minutes** | **All agents** |
| DOCX export | < 10 seconds | Per project |
| PDF export | < 30 seconds | Per project |
| Database queries | < 100ms | Indexed queries |

### Optimization Strategies

**1. Context Reduction**
- Use minimal context (~2,150 tokens vs ~37,000)
- Summarize previous chapters (200 tokens)
- Mini character profiles (not full profiles)

**2. Parallel Processing**
- Each chapter processed sequentially
- But chapters can queue in parallel
- Export generation can run async

**3. Caching**
- Cache story bible in memory
- Cache character profiles
- Cache prose style guidelines

**4. Database Optimization**
- Indexes on foreign keys
- Indexes on status fields
- Prepared statements

**5. Rate Limit Management**
- Precise session tracking
- No arbitrary delays
- Smart request batching

---

## Security Considerations

### API Key Management

- Store Claude API key in environment variables
- Never commit to version control
- Use .env.local for development

### Data Security

- Single-user application (no authentication needed)
- Local SQLite database (file-based)
- Exports stored locally
- No cloud uploads (unless user chooses)

### Error Handling

- Sensitive errors logged, not exposed to frontend
- Generic error messages to user
- Detailed logs for debugging

---

## Monitoring & Logging

### Logging Strategy

**Log Levels:**
- **ERROR**: Failed jobs, API errors, crashes
- **WARN**: Rate limits, retries, slow operations
- **INFO**: Job starts/completions, session resets
- **DEBUG**: Detailed execution traces (dev only)

**Log Targets:**
- Console (development)
- File (production): logs/novelforge.log
- Database: Critical errors logged to database

**Key Events to Log:**
- Session start/reset
- Rate limit hit/resume
- Job state transitions
- Chapter completions
- Export generation
- Errors and retries

---

## Testing Strategy

### Unit Tests
- Context assembly
- Token counting
- Job state transitions
- Session tracking calculations
- Character state updates

### Integration Tests
- Full chapter generation pipeline
- Editing agent sequence
- Queue pause/resume
- Checkpoint recovery
- Export generation

### End-to-End Tests
- Complete novel generation (small test novel)
- Trilogy project creation
- Rate limit handling
- Application crash recovery

---

**Last Updated:** January 2026
**Version:** 2.0
