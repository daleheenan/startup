# NovelForge - Task Breakdown

## Overview

This document provides a granular breakdown of all 241 story points across 8 sprints, with detailed acceptance criteria, technical dependencies, and complexity ratings.

**Total Tasks:** 57 tasks
**Total Story Points:** 241 points
**Average Task Size:** 4.2 points

---

## Task Complexity Legend

| Points | Complexity | Typical Duration | Description |
|--------|-----------|------------------|-------------|
| **1-2** | Trivial | < 30 minutes | Simple config, minor UI |
| **3** | Simple | 30-60 minutes | Basic feature, straightforward implementation |
| **5** | Medium | 1-2 hours | Standard feature, some complexity |
| **8** | Complex | 2-4 hours | Significant feature, multiple components |
| **13+** | Very Complex | 4+ hours | Major feature, architectural decisions |

---

## Sprint 1: Foundation & Infrastructure (31 points)

### Task 1.1: Project Setup
**Story Points:** 3
**Complexity:** Simple
**Priority:** P0

**Description:**
Initialize the project with Next.js frontend and Node.js backend, establishing the folder structure and basic configuration.

**Technical Requirements:**
- Next.js 14+ with App Router
- Node.js 18+ with Express
- TypeScript for type safety
- ESLint and Prettier for code quality

**Acceptance Criteria:**
- [ ] `frontend/` directory with Next.js initialized
- [ ] `backend/` directory with Express server
- [ ] Both servers start without errors
- [ ] TypeScript compilation works
- [ ] Basic folder structure matches spec

**File Structure to Create:**
```
novelforge/
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   ├── lib/
│   ├── package.json
│   └── tsconfig.json
├── backend/
│   ├── routes/
│   ├── services/
│   ├── agents/
│   ├── queue/
│   ├── db/
│   ├── server.ts
│   ├── package.json
│   └── tsconfig.json
├── data/
└── exports/
```

**Dependencies:** None

**Verification:**
```bash
cd frontend && npm run dev  # Should start on :3000
cd backend && npm run dev   # Should start on :3001
```

---

### Task 1.2: SQLite Schema
**Story Points:** 3
**Complexity:** Simple
**Priority:** P0

**Description:**
Create complete SQLite database schema with all tables for projects, books, chapters, jobs, and session tracking.

**Technical Requirements:**
- Use `better-sqlite3` for Node.js
- Migration scripts for schema creation
- Indexes on foreign keys

**Schema Tables:**

**projects**
```sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('standalone', 'trilogy')),
    genre TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('setup', 'generating', 'completed')),
    story_dna JSON,
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
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

**chapters**
```sql
CREATE TABLE chapters (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    chapter_number INTEGER NOT NULL,
    title TEXT,
    scene_cards JSON,
    content TEXT,
    summary TEXT,
    status TEXT NOT NULL CHECK(status IN ('pending', 'writing', 'editing', 'completed')),
    word_count INTEGER DEFAULT 0,
    flags JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
```

**jobs**
```sql
CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'completed', 'paused', 'failed')),
    checkpoint JSON,
    error TEXT,
    attempts INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME
);
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

**Acceptance Criteria:**
- [ ] All tables created successfully
- [ ] Foreign key constraints work
- [ ] Check constraints enforce valid values
- [ ] Indexes created on foreign keys
- [ ] Migration script runs idempotently

**Dependencies:** Task 1.1 (project setup)

**Verification:**
```bash
node backend/db/migrate.js
sqlite3 data/novelforge.db ".schema"
```

---

### Task 1.3: Claude Code SDK Integration
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Integrate Claude Code SDK with Max subscription authentication and implement basic completion functionality.

**Technical Requirements:**
- Claude Code SDK (`@anthropic-ai/sdk`)
- Max subscription credentials from environment variables
- Error handling for API failures
- Rate limit detection

**Implementation:**
```typescript
// backend/services/claude.service.ts
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-opus-4-5-20251101',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });

      return response.content[0].type === 'text'
        ? response.content[0].text
        : '';
    } catch (error) {
      if (error.status === 429) {
        throw new RateLimitError(error);
      }
      throw error;
    }
  }
}
```

**Acceptance Criteria:**
- [ ] SDK authenticates with Max subscription
- [ ] Can make basic completion requests
- [ ] Rate limit errors detected and thrown
- [ ] Response text extracted correctly
- [ ] Environment variables configured
- [ ] Error handling comprehensive

**Environment Variables:**
```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-5-20251101
```

**Dependencies:** Task 1.1 (project setup)

**Verification:**
```typescript
const service = new ClaudeService();
const result = await service.complete('Say hello!');
console.log(result); // Should get response
```

---

### Task 1.4: Job Queue Core
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Implement core job queue system with worker loop and job state management.

**Technical Requirements:**
- Background worker process
- Job state transitions (PENDING → RUNNING → COMPLETED/PAUSED/FAILED)
- Concurrent job limit (1 at a time initially)
- Job pickup logic

**Job States:**
- **PENDING**: Waiting to be processed
- **RUNNING**: Currently being processed
- **COMPLETED**: Successfully finished
- **PAUSED**: Rate limited, will auto-resume
- **FAILED**: Error after 3 retries

**Implementation:**
```typescript
// backend/queue/worker.ts
export class QueueWorker {
  private isRunning = false;

  async start() {
    this.isRunning = true;
    while (this.isRunning) {
      await this.processNextJob();
      await this.sleep(1000); // Check every second
    }
  }

  async processNextJob() {
    const job = await this.pickupJob();
    if (!job) return;

    try {
      await this.executeJob(job);
      await this.markCompleted(job.id);
    } catch (error) {
      if (error instanceof RateLimitError) {
        await this.pauseJob(job.id);
      } else {
        await this.retryOrFail(job.id, error);
      }
    }
  }

  async pickupJob(): Promise<Job | null> {
    // Get oldest pending job
    const job = db.prepare(`
      UPDATE jobs
      SET status = 'running', started_at = CURRENT_TIMESTAMP
      WHERE id = (
        SELECT id FROM jobs
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 1
      )
      RETURNING *
    `).get();

    return job || null;
  }
}
```

**Acceptance Criteria:**
- [ ] Worker loop starts and runs continuously
- [ ] Jobs picked up in FIFO order
- [ ] Job state transitions correctly
- [ ] Only one job runs at a time
- [ ] Worker can be stopped gracefully
- [ ] Database updates transactional

**Dependencies:** Task 1.2 (SQLite schema)

**Verification:**
- Create test jobs in database
- Start worker
- Verify jobs process sequentially
- Check state transitions in database

---

### Task 1.5: Session Tracking
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Implement session tracking that records first request timestamp and calculates precise reset time (start + 5 hours).

**Technical Requirements:**
- Track session start on first request
- Calculate reset time as start + 5 hours
- Detect when session has reset
- Clear session tracking on reset

**Implementation:**
```typescript
// backend/services/session-tracker.ts
export class SessionTracker {
  private db: Database;

  async trackRequest() {
    const session = this.getCurrentSession();

    if (!session || !session.is_active) {
      // Start new session
      this.startNewSession();
    } else {
      // Increment request count
      this.incrementRequests();
    }
  }

  private startNewSession() {
    const now = new Date();
    const resetTime = new Date(now.getTime() + 5 * 60 * 60 * 1000); // +5 hours

    this.db.prepare(`
      INSERT OR REPLACE INTO session_tracking (id, session_started_at, session_resets_at, is_active, requests_this_session)
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

**Acceptance Criteria:**
- [ ] First request creates session record
- [ ] Session start time recorded accurately
- [ ] Reset time calculated as start + 5 hours
- [ ] Request count increments
- [ ] Can detect when session has reset
- [ ] Session clears after reset

**Dependencies:** Task 1.2 (SQLite schema), Task 1.3 (Claude SDK)

**Verification:**
```typescript
const tracker = new SessionTracker();
await tracker.trackRequest();
console.log(tracker.getTimeUntilReset()); // ~18000000ms (5 hours)
```

---

### Task 1.6: Rate Limit Handling
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Detect rate limits from Claude API, pause jobs, and automatically resume at precise reset time.

**Technical Requirements:**
- Detect 429 rate limit responses
- Pause current job with checkpoint
- Calculate wait time until session reset
- Auto-resume queue at reset time
- No arbitrary delays (use precise timing)

**Implementation:**
```typescript
// backend/queue/rate-limit-handler.ts
export class RateLimitHandler {
  async handleRateLimit(job: Job) {
    // Pause the job
    await this.pauseJob(job);

    // Calculate precise wait time
    const waitMs = this.sessionTracker.getTimeUntilReset();

    console.log(`Rate limited. Waiting ${Math.round(waitMs / 1000 / 60)} minutes until reset...`);

    // Wait until session resets
    await this.sleep(waitMs);

    // Clear session tracking
    await this.sessionTracker.clearSession();

    // Resume all paused jobs
    await this.resumePausedJobs();
  }

  async pauseJob(job: Job) {
    db.prepare(`
      UPDATE jobs
      SET status = 'paused'
      WHERE id = ?
    `).run(job.id);
  }

  async resumePausedJobs() {
    db.prepare(`
      UPDATE jobs
      SET status = 'pending'
      WHERE status = 'paused'
    `).run();
  }
}
```

**Acceptance Criteria:**
- [ ] 429 errors detected correctly
- [ ] Jobs pause immediately on rate limit
- [ ] Wait time calculated precisely (not arbitrary)
- [ ] Queue resumes automatically after wait
- [ ] All paused jobs resume
- [ ] No manual intervention required

**Dependencies:** Task 1.4 (job queue), Task 1.5 (session tracking)

**Verification:**
- Trigger rate limit (make many requests)
- Verify job pauses
- Verify wait time shown
- Verify auto-resume after wait

---

### Task 1.7: Checkpoint System
**Story Points:** 3
**Complexity:** Simple
**Priority:** P0

**Description:**
Save and restore job state at checkpoints to enable recovery after crashes or interruptions.

**Technical Requirements:**
- Serialize job state to JSON
- Save checkpoint to database
- Restore from checkpoint on job resume
- Handle partial completion

**Checkpoint Data Structure:**
```typescript
interface Checkpoint {
  jobId: string;
  step: string;           // Current processing step
  data: any;              // Step-specific data
  completedSteps: string[];
  timestamp: string;
}
```

**Implementation:**
```typescript
// backend/queue/checkpoint.ts
export class CheckpointManager {
  async saveCheckpoint(jobId: string, step: string, data: any) {
    const checkpoint: Checkpoint = {
      jobId,
      step,
      data,
      completedSteps: await this.getCompletedSteps(jobId),
      timestamp: new Date().toISOString(),
    };

    db.prepare(`
      UPDATE jobs
      SET checkpoint = ?
      WHERE id = ?
    `).run(JSON.stringify(checkpoint), jobId);
  }

  async restoreCheckpoint(jobId: string): Promise<Checkpoint | null> {
    const job = db.prepare('SELECT checkpoint FROM jobs WHERE id = ?').get(jobId);
    return job?.checkpoint ? JSON.parse(job.checkpoint) : null;
  }
}
```

**Acceptance Criteria:**
- [ ] Checkpoint saves after each major step
- [ ] Checkpoint includes all necessary state
- [ ] Can restore from checkpoint
- [ ] Partially completed jobs can resume
- [ ] No duplicate work on resume

**Dependencies:** Task 1.4 (job queue)

**Verification:**
- Start a job
- Kill process mid-job
- Restart process
- Verify job resumes from checkpoint

---

### Task 1.8: Basic CLI
**Story Points:** 2
**Complexity:** Trivial
**Priority:** P1

**Description:**
Create basic CLI commands for testing queue operations and debugging.

**Commands:**
- `npm run queue:start` - Start queue worker
- `npm run queue:status` - Show queue status
- `npm run queue:clear` - Clear all jobs
- `npm run test:job` - Create test job

**Implementation:**
```typescript
// backend/cli/queue-cli.ts
import { program } from 'commander';

program
  .command('start')
  .description('Start queue worker')
  .action(async () => {
    const worker = new QueueWorker();
    await worker.start();
  });

program
  .command('status')
  .description('Show queue status')
  .action(async () => {
    const stats = await getQueueStats();
    console.log(stats);
  });

program.parse();
```

**Acceptance Criteria:**
- [ ] CLI starts queue worker
- [ ] Can view queue status
- [ ] Can clear queue
- [ ] Can create test jobs
- [ ] Commands documented in README

**Dependencies:** Task 1.4 (job queue)

**Verification:**
```bash
npm run queue:status  # Should show pending/running jobs
npm run test:job      # Should create test job
```

---

## Sprint 2: Idea Generation (24 points)

### Task 2.1: Web UI Shell
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Create Next.js application with basic layout, navigation, and routing structure.

**Pages to Create:**
- `/` - Home/project list
- `/project/new` - New project wizard
- `/project/[id]` - Project dashboard
- `/project/[id]/setup` - Setup flow

**Implementation:**
```typescript
// frontend/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/">NovelForge</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}

// frontend/app/project/new/page.tsx
export default function NewProject() {
  return <ProjectWizard />;
}
```

**Styling:**
- Use Tailwind CSS for styling
- Responsive design (mobile-friendly)
- Clean, minimal UI

**Acceptance Criteria:**
- [ ] All routes accessible
- [ ] Navigation works
- [ ] Layout consistent across pages
- [ ] Responsive on mobile
- [ ] Loading states implemented

**Dependencies:** Task 1.1 (project setup)

---

### Task 2.2: Genre/Preference Form
**Story Points:** 3
**Complexity:** Simple
**Priority:** P0

**Description:**
Create input form for story preferences including genre, subgenre, tone, and themes.

**Form Fields:**
- **Genre** (dropdown): Fantasy, Sci-Fi, Romance, Mystery, Thriller, Literary, etc.
- **Subgenre** (conditional dropdown based on genre)
- **Tone** (multi-select): Dark, Humorous, Romantic, Inspirational, Gritty, etc.
- **Themes** (multi-select): Power, Love, Redemption, Revenge, Identity, etc.
- **Additional preferences** (textarea): Free-form input

**Implementation:**
```typescript
// frontend/components/PreferenceForm.tsx
export function PreferenceForm({ onSubmit }) {
  const [genre, setGenre] = useState('');
  const [subgenre, setSubgenre] = useState('');
  const [tones, setTones] = useState<string[]>([]);
  const [themes, setThemes] = useState<string[]>([]);

  return (
    <form onSubmit={handleSubmit}>
      <Select label="Genre" value={genre} onChange={setGenre}>
        <option value="fantasy">Fantasy</option>
        <option value="scifi">Science Fiction</option>
        {/* ... */}
      </Select>

      <MultiSelect label="Tone" values={tones} onChange={setTones}>
        <option value="dark">Dark</option>
        <option value="humorous">Humorous</option>
        {/* ... */}
      </MultiSelect>

      <button type="submit">Generate Concepts</button>
    </form>
  );
}
```

**Acceptance Criteria:**
- [ ] All fields validate correctly
- [ ] Subgenre options conditional on genre
- [ ] Multi-select works for tones and themes
- [ ] Form data serializes correctly
- [ ] Clear validation error messages

**Dependencies:** Task 2.1 (web UI shell)

---

### Task 2.3: Concept Generation Prompt
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Engineer prompts to generate 5 diverse, high-quality story concepts based on user preferences.

**Prompt Requirements:**
- Generate exactly 5 concepts
- Each concept includes: title, logline, synopsis
- Diverse story structures
- Genre-appropriate elements
- Compelling hooks

**Implementation:**
```typescript
// backend/agents/concept-generator.ts
export async function generateConcepts(preferences: Preferences): Promise<Concept[]> {
  const systemPrompt = `You are a bestselling author and story consultant. Generate 5 compelling novel concepts based on the user's preferences.

Each concept should include:
- Title: Evocative and genre-appropriate
- Logline: One compelling sentence
- Synopsis: 2-3 paragraph summary

Make concepts diverse in structure, tone, and approach while staying true to the genre.`;

  const userPrompt = `Generate 5 novel concepts with these preferences:

Genre: ${preferences.genre}
Subgenre: ${preferences.subgenre}
Tone: ${preferences.tones.join(', ')}
Themes: ${preferences.themes.join(', ')}
Additional: ${preferences.additional}

Return as JSON array.`;

  const response = await claude.complete(userPrompt, systemPrompt);
  return JSON.parse(response);
}
```

**Acceptance Criteria:**
- [ ] Generates exactly 5 concepts
- [ ] Concepts match genre and tone
- [ ] Loglines are compelling (1-2 sentences)
- [ ] Synopses are detailed (2-3 paragraphs)
- [ ] Concepts are diverse from each other
- [ ] Response parses as JSON

**Dependencies:** Task 1.3 (Claude SDK), Task 2.2 (preference form)

---

### Task 2.4: Concept Display UI
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Display generated concepts as cards with title, logline, and synopsis.

**UI Requirements:**
- Card layout for each concept
- Expandable synopsis (truncated by default)
- Selection mechanism
- Visual hierarchy (title > logline > synopsis)

**Implementation:**
```typescript
// frontend/components/ConceptCard.tsx
export function ConceptCard({ concept, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`card ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <h3>{concept.title}</h3>
      <p className="logline">{concept.logline}</p>
      <p className={expanded ? 'synopsis' : 'synopsis-truncated'}>
        {concept.synopsis}
      </p>
      <button onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Show Less' : 'Read More'}
      </button>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] All concepts display correctly
- [ ] Can expand/collapse synopsis
- [ ] Selection visually clear
- [ ] Responsive layout
- [ ] Loading state while generating

**Dependencies:** Task 2.3 (concept generation)

---

### Task 2.5: Concept Selection Flow
**Story Points:** 3
**Complexity:** Simple
**Priority:** P0

**Description:**
Implement concept selection workflow: select, regenerate, or mix elements.

**Features:**
- Select a single concept
- Regenerate all concepts
- Mix elements from multiple concepts (future enhancement)

**Implementation:**
```typescript
// frontend/app/project/new/page.tsx
export default function NewProjectPage() {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  async function handleRegenerate() {
    const newConcepts = await api.generateConcepts(preferences);
    setConcepts(newConcepts);
  }

  async function handleSelect(index: number) {
    setSelected(index);
  }

  async function handleContinue() {
    if (selected !== null) {
      const project = await api.createProject(concepts[selected]);
      router.push(`/project/${project.id}/setup`);
    }
  }

  return (
    <div>
      <ConceptList concepts={concepts} selected={selected} onSelect={handleSelect} />
      <button onClick={handleRegenerate}>Regenerate</button>
      <button onClick={handleContinue} disabled={selected === null}>
        Continue
      </button>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Can select a concept
- [ ] Can regenerate all concepts
- [ ] Continue button disabled until selection
- [ ] Selection persists during regeneration
- [ ] Clear visual feedback

**Dependencies:** Task 2.4 (concept display)

---

### Task 2.6: Project Creation
**Story Points:** 3
**Complexity:** Simple
**Priority:** P1

**Description:**
Save selected concept as new project in database.

**Implementation:**
```typescript
// backend/routes/projects.ts
router.post('/projects', async (req, res) => {
  const { concept, preferences } = req.body;

  const projectId = generateUUID();
  const storyDNA = {
    genre: preferences.genre,
    subgenre: preferences.subgenre,
    tones: preferences.tones,
    themes: preferences.themes,
    concept: concept,
  };

  db.prepare(`
    INSERT INTO projects (id, title, type, genre, status, story_dna)
    VALUES (?, ?, 'standalone', ?, 'setup', ?)
  `).run(projectId, concept.title, preferences.genre, JSON.stringify(storyDNA));

  res.json({ id: projectId, title: concept.title });
});
```

**Acceptance Criteria:**
- [ ] Project created in database
- [ ] Story DNA saved correctly
- [ ] Project ID returned
- [ ] Can retrieve project by ID
- [ ] Status set to 'setup'

**Dependencies:** Task 2.5 (concept selection)

---

## Sprint 3: World & Characters (31 points)

### Task 3.1: Story DNA Generator
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Generate comprehensive story DNA including tone, themes, and prose style based on genre.

**Story DNA Components:**
- **Tone descriptors**: Dark, gritty, humorous, romantic, etc.
- **Theme analysis**: Deep dive into selected themes
- **Prose style guidelines**: Sentence structure, vocabulary level, pacing
- **Genre conventions**: Must-have elements for genre

**Prompt Engineering:**
```typescript
const systemPrompt = `You are a literary analyst specializing in genre fiction. Generate detailed story DNA that will guide consistent prose generation.

Analyze the genre and user preferences to produce:
1. Tone descriptors (how the story should feel)
2. Theme exploration (how themes manifest)
3. Prose style guide (sentence structure, vocabulary, pacing)
4. Genre conventions (must-have elements)

Be specific and actionable for AI-generated prose.`;
```

**Acceptance Criteria:**
- [ ] Generates appropriate tone for genre
- [ ] Themes explored in depth
- [ ] Prose style actionable and specific
- [ ] Genre conventions identified
- [ ] Consistent with user preferences

**Dependencies:** Task 2.6 (project creation)

---

### Task 3.2: Character Core Generator
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Generate protagonist with unique voice sample, personality traits, goals, and conflicts.

**Character Core Components:**
- **Name** (genre-appropriate)
- **Physical description** (brief)
- **Personality traits** (3-5 key traits)
- **Voice sample** (2-3 sentences in character's voice)
- **Goals** (external and internal)
- **Conflicts** (internal and external)
- **Character arc** (transformation journey)

**Voice Sample Requirement:**
The voice sample is critical for maintaining consistent character voice. It should demonstrate:
- Speech patterns and vocabulary
- Attitude and worldview
- Emotional baseline

**Example Voice Sample:**
> "I don't do mornings. Never have, never will. The world can burn before noon for all I care—and trust me, in this city, it usually does."

**Acceptance Criteria:**
- [ ] Protagonist has distinct personality
- [ ] Voice sample demonstrates unique voice
- [ ] Goals are clear and compelling
- [ ] Conflicts create tension
- [ ] Character arc has transformation
- [ ] Genre-appropriate naming

**Dependencies:** Task 3.1 (story DNA)

---

### Task 3.3: Supporting Cast Generator
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Generate supporting cast of 4-6 characters including antagonist, mentor, sidekick, and love interest.

**Character Roles:**
- **Antagonist**: Opposes protagonist's goals
- **Mentor**: Guides protagonist
- **Sidekick**: Loyal companion
- **Love Interest**: Romantic connection
- **Wildcard**: Unpredictable ally/enemy

**Implementation:**
Each supporting character needs:
- Name and role
- Brief description
- Personality traits (2-3)
- Voice sample
- Relationship to protagonist
- Role in story arc

**Acceptance Criteria:**
- [ ] Generates 4-6 supporting characters
- [ ] Each has distinct personality
- [ ] Relationships to protagonist defined
- [ ] Antagonist has compelling motivation
- [ ] Mentor has wisdom to share
- [ ] All characters genre-appropriate

**Dependencies:** Task 3.2 (character core)

---

### Task 3.4: Character Editing UI
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Create UI for editing character profiles including name, traits, voice sample, relationships, and arc.

**Editable Fields:**
- Name (text input)
- Physical description (textarea)
- Personality traits (tag input)
- Voice sample (textarea with character counter)
- Goals (textarea)
- Conflicts (textarea)
- Relationships (relationship selector + description)
- Character arc (textarea)

**Implementation:**
```typescript
// frontend/components/CharacterEditor.tsx
export function CharacterEditor({ character, onChange }) {
  return (
    <div className="character-editor">
      <input
        label="Name"
        value={character.name}
        onChange={(e) => onChange({ ...character, name: e.target.value })}
      />

      <textarea
        label="Voice Sample"
        value={character.voiceSample}
        maxLength={500}
        onChange={(e) => onChange({ ...character, voiceSample: e.target.value })}
      />

      <TagInput
        label="Personality Traits"
        values={character.traits}
        onChange={(traits) => onChange({ ...character, traits })}
      />

      {/* ... other fields ... */}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] All character fields editable
- [ ] Changes save to database
- [ ] Validation prevents invalid data
- [ ] Can add new characters
- [ ] Can delete characters
- [ ] Real-time save indicator

**Dependencies:** Task 3.3 (supporting cast)

---

### Task 3.5: World Element Generator
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Generate world elements including locations, factions, and magic/technology systems.

**World Elements:**

**Locations** (3-5 key locations):
- Name
- Description
- Significance to story
- Mood/atmosphere

**Factions** (2-4 groups):
- Name
- Purpose/goals
- Leadership
- Relationship to protagonist

**Magic/Technology** (1-2 systems):
- How it works
- Rules and limitations
- Who can use it
- Cost or consequences

**Genre-Specific Elements:**
- Fantasy: Magic system, mythical creatures, kingdoms
- Sci-Fi: Technology, alien species, planetary systems
- Romance: Social circles, venues, cultural norms
- Mystery: Investigation tools, jurisdictions, underworld

**Acceptance Criteria:**
- [ ] Generates genre-appropriate world elements
- [ ] Locations have distinct atmosphere
- [ ] Factions have clear motivations
- [ ] Magic/tech has defined rules and limits
- [ ] Elements interconnected and coherent
- [ ] Supports story concept

**Dependencies:** Task 3.1 (story DNA)

---

### Task 3.6: World Editing UI
**Story Points:** 3
**Complexity:** Simple
**Priority:** P1

**Description:**
Create UI for editing world elements and adding custom elements.

**Features:**
- Edit existing locations, factions, systems
- Add custom locations
- Add custom factions
- Add custom world rules
- Delete elements

**Implementation:**
```typescript
// frontend/components/WorldEditor.tsx
export function WorldEditor({ world, onChange }) {
  return (
    <div className="world-editor">
      <Section title="Locations">
        {world.locations.map((location) => (
          <LocationCard
            key={location.id}
            location={location}
            onEdit={(updated) => updateLocation(location.id, updated)}
          />
        ))}
        <button onClick={addLocation}>Add Location</button>
      </Section>

      <Section title="Factions">
        {/* Similar structure */}
      </Section>

      <Section title="Magic/Technology">
        {/* Similar structure */}
      </Section>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Can edit all world elements
- [ ] Can add custom elements
- [ ] Can delete elements
- [ ] Changes persist to database
- [ ] Validation prevents invalid data

**Dependencies:** Task 3.5 (world generator)

---

### Task 3.7: Story Bible Storage
**Story Points:** 3
**Complexity:** Simple
**Priority:** P1

**Description:**
Store all characters and world elements in database as structured JSON for easy retrieval.

**Data Structure:**
```typescript
interface StoryBible {
  characters: {
    protagonist: Character;
    supporting: Character[];
  };
  world: {
    locations: Location[];
    factions: Faction[];
    systems: System[];
  };
  timeline: Event[];
  rules: Rule[];
}
```

**Storage:**
- Add `story_bible` JSON column to `projects` table
- Update on every character/world change
- Version tracking for history

**Acceptance Criteria:**
- [ ] Story bible saves to database
- [ ] All elements included
- [ ] Can retrieve and parse
- [ ] Updates on changes
- [ ] No data loss

**Dependencies:** Task 3.4 (character editing), Task 3.6 (world editing)

---

## Sprint 4: Outline Generation (31 points)

### Task 4.1: Structure Selector
**Story Points:** 3
**Complexity:** Simple
**Priority:** P1

**Description:**
Allow user to select story structure template: 3-Act, Save the Cat, Hero's Journey, or Custom.

**Structure Templates:**

**3-Act Structure:**
- Act 1 (25%): Setup, inciting incident, first plot point
- Act 2 (50%): Rising action, midpoint, complications
- Act 3 (25%): Climax, resolution

**Save the Cat (15 Beats):**
- Opening Image, Setup, Catalyst, Debate, Break into Two, B Story, Fun & Games, Midpoint, Bad Guys Close In, All is Lost, Dark Night of the Soul, Break into Three, Finale, Final Image

**Hero's Journey (12 Stages):**
- Ordinary World, Call to Adventure, Refusal, Meeting Mentor, Crossing Threshold, Tests, Approach, Ordeal, Reward, Road Back, Resurrection, Return with Elixir

**Acceptance Criteria:**
- [ ] User can select structure
- [ ] Each structure has description
- [ ] Selection affects outline generation
- [ ] Can choose custom (no template)

**Dependencies:** Task 3.7 (story bible)

---

### Task 4.2: Act Breakdown Generator
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Generate high-level act structure with major plot points based on selected story structure.

**Output:**
For each act:
- Act number and percentage of story
- Major plot points
- Character development milestones
- Theme exploration
- Emotional arc

**Example (3-Act):**
```
Act 1 (Chapters 1-10, 25%):
- Opening: Introduce protagonist in normal world
- Inciting Incident: Event that disrupts normal (Ch 3)
- First Plot Point: Protagonist commits to journey (Ch 10)
- Character: Establish baseline, show flaws
- Theme: Introduce central question

Act 2 (Chapters 11-30, 50%):
- Rising Action: Obstacles and complications
- Midpoint: Major revelation or setback (Ch 20)
- Escalation: Stakes increase
- Character: Growth and setbacks
- Theme: Deepen exploration

Act 3 (Chapters 31-40, 25%):
- Climax: Final confrontation (Ch 35)
- Resolution: Consequences and outcomes
- Denouement: New normal established
- Character: Transformation complete
- Theme: Answer central question
```

**Acceptance Criteria:**
- [ ] Act breakdown matches structure
- [ ] Major plot points identified
- [ ] Character arc integrated
- [ ] Theme woven throughout
- [ ] Percentage allocations correct

**Dependencies:** Task 4.1 (structure selector)

---

### Task 4.3: Chapter Outline Generator
**Story Points:** 8
**Complexity:** Complex
**Priority:** P0

**Description:**
Generate chapter-by-chapter outline with summaries for entire novel (30-50 chapters).

**Chapter Summary Format:**
```
Chapter X: [Title]
POV: [Character]
Location: [Primary location]
Summary: [2-3 sentence summary of chapter events]
Purpose: [What this chapter accomplishes for plot/character/theme]
Ends with: [Emotional beat or cliffhanger]
```

**Prompt Engineering:**
The prompt must:
- Use act breakdown as guide
- Generate 30-50 chapters (target 2,000-2,500 words per chapter)
- Distribute plot points across chapters
- Vary chapter length and intensity
- Build tension and pacing

**Implementation:**
```typescript
async function generateChapterOutline(project: Project): Promise<ChapterOutline[]> {
  const systemPrompt = `You are a bestselling author creating a detailed chapter-by-chapter outline for a ${project.genre} novel.

Follow the act structure provided and generate 40 chapters with summaries that:
- Build tension and momentum
- Develop character arcs
- Advance plot logically
- Vary pacing (fast/slow)
- End with hooks or emotional beats

Each chapter should be 2,000-2,500 words (8-10 pages).`;

  const userPrompt = `Create chapter outline for:

Title: ${project.title}
Concept: ${project.concept}
Characters: ${JSON.stringify(project.characters)}
Act Breakdown: ${JSON.stringify(project.actBreakdown)}

Generate 40 chapters with summaries.`;

  const response = await claude.complete(userPrompt, systemPrompt);
  return parseChapterOutline(response);
}
```

**Acceptance Criteria:**
- [ ] Generates 30-50 chapters
- [ ] Each chapter has clear summary
- [ ] Plot points distributed logically
- [ ] Pacing varies appropriately
- [ ] Character arcs progress
- [ ] Tension builds to climax

**Dependencies:** Task 4.2 (act breakdown)

---

### Task 4.4: Scene Card Generator
**Story Points:** 8
**Complexity:** Complex
**Priority:** P0

**Description:**
Generate detailed scene cards for each chapter (1-3 scenes per chapter).

**Scene Card Structure:**
```typescript
interface SceneCard {
  sceneNumber: number;
  povCharacter: string;
  location: string;
  characters: string[];
  timeOfDay: string;
  goal: string;           // What POV character wants
  conflict: string;        // What opposes the goal
  outcome: string;         // Success, failure, or complication
  emotionalBeat: string;   // How POV character feels
  reveals: string[];       // Information revealed
  foreshadowing: string[]; // Future events hinted
}
```

**Scene Card Requirements:**

**Goal** must be:
- Specific and measurable
- Important to character
- Achievable in the scene

**Conflict** must be:
- Direct opposition to goal
- Escalating if possible
- Internal, external, or both

**Outcome** options:
- **Success**: Character achieves goal (but may have cost)
- **Failure**: Character fails to achieve goal (new problem)
- **Complication**: Partial success but new obstacle emerges

**Acceptance Criteria:**
- [ ] Each chapter has 1-3 scene cards
- [ ] Every scene has clear goal/conflict/outcome
- [ ] POV character specified
- [ ] Emotional beats tracked
- [ ] Reveals and foreshadowing noted
- [ ] Scene cards connect logically

**Dependencies:** Task 4.3 (chapter outline)

---

### Task 4.5: Outline Editing UI
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Create UI for editing outline with drag-and-drop reordering, chapter editing, and scene card editing.

**Features:**
- Drag-and-drop chapter reordering
- Edit chapter summaries
- Add/remove chapters
- Edit scene cards
- Add/remove scenes
- Split/merge chapters

**Implementation:**
```typescript
// frontend/components/OutlineEditor.tsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';

export function OutlineEditor({ outline, onChange }) {
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = outline.findIndex((ch) => ch.id === active.id);
      const newIndex = outline.findIndex((ch) => ch.id === over.id);
      onChange(arrayMove(outline, oldIndex, newIndex));
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={outline}>
        {outline.map((chapter) => (
          <ChapterCard
            key={chapter.id}
            chapter={chapter}
            onEdit={(updated) => updateChapter(chapter.id, updated)}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

**Acceptance Criteria:**
- [ ] Chapters reorderable via drag-and-drop
- [ ] Chapter summaries editable inline
- [ ] Can add new chapters
- [ ] Can delete chapters
- [ ] Scene cards editable
- [ ] Changes save to database
- [ ] Undo/redo functionality

**Dependencies:** Task 4.4 (scene cards)

---

### Task 4.6: Start Generation Button
**Story Points:** 2
**Complexity:** Trivial
**Priority:** P0

**Description:**
Implement "Start Generation" button that creates all chapter jobs and starts the queue.

**Functionality:**
- Create job for each chapter in outline
- Job type: "generate_chapter"
- Job target: chapter ID
- Start queue worker
- Navigate to progress page

**Implementation:**
```typescript
async function startGeneration(projectId: string) {
  const chapters = await getChapters(projectId);

  // Create jobs for all chapters
  for (const chapter of chapters) {
    await createJob({
      type: 'generate_chapter',
      target_id: chapter.id,
      status: 'pending',
    });
  }

  // Update project status
  await updateProject(projectId, { status: 'generating' });

  // Start queue worker (if not running)
  await startQueueWorker();

  // Navigate to progress page
  router.push(`/project/${projectId}/progress`);
}
```

**Acceptance Criteria:**
- [ ] Creates job for every chapter
- [ ] Jobs created in correct order
- [ ] Queue starts automatically
- [ ] Project status updates to "generating"
- [ ] User redirected to progress page
- [ ] Cannot start if already generating

**Dependencies:** Task 4.5 (outline editing)

---

## Sprint 5: Chapter Generation (31 points)

### Task 5.1: Context Assembly
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Build minimal context (~2,150 tokens) from story DNA, characters, scene cards, and previous chapter summary.

**Context Components:**

1. **Story DNA** (~300 tokens)
```typescript
const storyDNA = `
Genre: ${project.genre} - ${project.subgenre}
Tone: ${project.tone}
Themes: ${project.themes.join(', ')}
Prose Style: ${project.proseStyle}
`;
```

2. **POV Character Core** (~400 tokens)
```typescript
const povCharacter = `
Name: ${character.name}
Voice Sample: "${character.voiceSample}"
Current State: ${character.currentState}
Goals: ${character.goals}
Conflicts: ${character.conflicts}
`;
```

3. **Scene Card** (~300 tokens)
```typescript
const sceneCard = `
Location: ${scene.location}
Characters: ${scene.characters.join(', ')}
Goal: ${scene.goal}
Conflict: ${scene.conflict}
Outcome: ${scene.outcome}
Emotional Beat: ${scene.emotionalBeat}
`;
```

4. **Other Characters** (~450 tokens)
```typescript
const otherCharacters = scene.characters
  .filter((c) => c !== povCharacter)
  .map((c) => `${c.name}: ${c.briefDescription}`)
  .join('\n');
```

5. **Last Chapter Summary** (~200 tokens)
```typescript
const lastSummary = previousChapter?.summary || 'This is the first chapter.';
```

6. **System Prompts** (~500 tokens)

**Token Validation:**
Must validate total context size before sending to API.

**Acceptance Criteria:**
- [ ] Context assembly produces ~2,150 tokens
- [ ] All components included
- [ ] Token count validated
- [ ] Context formatted correctly
- [ ] Missing components handled gracefully

**Dependencies:** Task 1.3 (Claude SDK), Task 4.4 (scene cards)

---

### Task 5.2: Author Agent Persona
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Create Author Agent system prompt with genre-specific voice and style guidelines.

**Persona Components:**

**Role Definition:**
```
You are a bestselling [GENRE] author writing a novel. Your prose is [STYLE_DESCRIPTORS]. You write with [TONE] and explore themes of [THEMES].
```

**Prose Guidelines:**
- Sentence structure (simple, complex, varied)
- Vocabulary level (accessible, literary, technical)
- Show vs tell ratio
- Dialogue style
- Pacing (fast, measured, contemplative)

**Genre-Specific Guidelines:**

**Fantasy:**
- Rich world-building details
- Magic as metaphor
- Epic scope balanced with intimate moments

**Sci-Fi:**
- Technical details grounded in plausibility
- Explore implications of technology
- Balance exposition with action

**Romance:**
- Emotional interiority
- Romantic tension
- Sensory details

**Mystery:**
- Fair play clues
- Red herrings
- Reveal pacing

**Acceptance Criteria:**
- [ ] Persona matches genre conventions
- [ ] Style guidelines actionable
- [ ] Tone consistent with project
- [ ] Voice distinct and appropriate
- [ ] Generates quality prose

**Dependencies:** Task 3.1 (story DNA)

---

### Task 5.3: Chapter Generation Job
**Story Points:** 8
**Complexity:** Complex
**Priority:** P0

**Description:**
Implement chapter generation job that writes chapter from scene cards using assembled context.

**Job Workflow:**
1. Assemble context
2. Build Author Agent prompt
3. Call Claude API
4. Parse response
5. Save chapter content
6. Generate chapter summary
7. Update character states
8. Mark job complete

**Implementation:**
```typescript
async function executeChapterGenerationJob(job: Job) {
  const chapter = await getChapter(job.target_id);
  const context = await assembleContext(chapter);

  // Save checkpoint
  await saveCheckpoint(job.id, 'context_assembled', { context });

  // Generate chapter
  const systemPrompt = buildAuthorAgentPrompt(chapter.book.project);
  const userPrompt = buildChapterPrompt(context, chapter);

  const chapterText = await claude.complete(userPrompt, systemPrompt);

  // Save checkpoint
  await saveCheckpoint(job.id, 'chapter_generated', { chapterText });

  // Save chapter
  await updateChapter(chapter.id, {
    content: chapterText,
    word_count: countWords(chapterText),
    status: 'editing',
  });

  // Generate summary
  const summary = await generateChapterSummary(chapterText);
  await updateChapter(chapter.id, { summary });

  // Update character states
  await updateCharacterStates(chapter, chapterText);

  return { success: true };
}
```

**Acceptance Criteria:**
- [ ] Chapter generates from scene cards
- [ ] Word count 2,000-2,500 words
- [ ] Content matches scene specifications
- [ ] Checkpoints save at each step
- [ ] Chapter saves to database
- [ ] Job marked complete
- [ ] Generation time < 5 minutes

**Dependencies:** Task 5.1 (context assembly), Task 5.2 (author persona)

---

### Task 5.4: Chapter Summary Generator
**Story Points:** 3
**Complexity:** Simple
**Priority:** P0

**Description:**
Generate 200-token summary of chapter for use in next chapter's context.

**Summary Requirements:**
- 200 tokens max
- Key events captured
- Emotional beats noted
- Character developments included
- Cliffhangers or resolutions mentioned

**Implementation:**
```typescript
async function generateChapterSummary(chapterText: string): Promise<string> {
  const systemPrompt = `You are a precise summarizer. Create a 200-token summary of the chapter that captures:
  - Key events
  - Character emotional states
  - Important reveals
  - How chapter ends

  This summary will be used as context for the next chapter.`;

  const userPrompt = `Summarize this chapter in 200 tokens:\n\n${chapterText}`;

  return await claude.complete(userPrompt, systemPrompt);
}
```

**Acceptance Criteria:**
- [ ] Summary under 200 tokens
- [ ] Key events included
- [ ] Emotional beats captured
- [ ] Usable as next chapter context
- [ ] Generated quickly (< 30 seconds)

**Dependencies:** Task 5.3 (chapter generation)

---

### Task 5.5: State Update System
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Update character states and story bible after each chapter based on events.

**Character State Updates:**
- Current location
- Emotional state
- Relationships (changed dynamics)
- Goals (achieved, abandoned, new)
- Knowledge (what they now know)

**Story Bible Updates:**
- Timeline (new events)
- World state (changes to locations, factions)
- Mysteries (new questions, answers)
- Foreshadowing log (setup/payoff)

**Implementation:**
```typescript
async function updateCharacterStates(chapter: Chapter, chapterText: string) {
  const systemPrompt = `Analyze this chapter and extract character state changes.

  For each character, identify:
  - Current location
  - Emotional state
  - Relationship changes
  - Goal updates
  - New knowledge

  Return as JSON.`;

  const stateChanges = await claude.complete(
    `Analyze character states:\n\n${chapterText}`,
    systemPrompt
  );

  const changes = JSON.parse(stateChanges);

  for (const [characterName, state] of Object.entries(changes)) {
    await updateCharacter(characterName, state);
  }
}
```

**Acceptance Criteria:**
- [ ] Character states update after each chapter
- [ ] Location tracking accurate
- [ ] Emotional states captured
- [ ] Relationships updated
- [ ] Story bible reflects changes
- [ ] Timeline chronological

**Dependencies:** Task 5.3 (chapter generation), Task 3.7 (story bible)

---

### Task 5.6: Progress Tracking
**Story Points:** 5
**Complexity:** Medium
**Priority:** P1

**Description:**
Track chapters written and estimate time remaining based on actual generation speed.

**Metrics to Track:**
- Chapters completed
- Chapters remaining
- Total word count
- Average chapter generation time
- Estimated time remaining
- Session count used
- Current session progress

**Progress Calculation:**
```typescript
interface ProgressStats {
  chaptersCompleted: number;
  chaptersTotal: number;
  percentComplete: number;
  wordCount: number;
  targetWordCount: number;
  avgChapterTime: number; // milliseconds
  estimatedTimeRemaining: number; // milliseconds
  sessionsUsed: number;
}

async function calculateProgress(projectId: string): Promise<ProgressStats> {
  const chapters = await getChapters(projectId);
  const completed = chapters.filter((ch) => ch.status === 'completed');

  const totalTime = completed.reduce((sum, ch) => {
    const start = new Date(ch.created_at);
    const end = new Date(ch.updated_at);
    return sum + (end.getTime() - start.getTime());
  }, 0);

  const avgTime = totalTime / completed.length;
  const remaining = chapters.length - completed.length;
  const estimatedTime = avgTime * remaining;

  return {
    chaptersCompleted: completed.length,
    chaptersTotal: chapters.length,
    percentComplete: (completed.length / chapters.length) * 100,
    wordCount: completed.reduce((sum, ch) => sum + ch.word_count, 0),
    targetWordCount: chapters.length * 2250, // avg 2250 words/chapter
    avgChapterTime: avgTime,
    estimatedTimeRemaining: estimatedTime,
    sessionsUsed: Math.ceil(totalTime / (5 * 60 * 60 * 1000)), // 5-hour sessions
  };
}
```

**Acceptance Criteria:**
- [ ] Progress calculated accurately
- [ ] Time estimates based on actuals
- [ ] Word count tracked
- [ ] Session count tracked
- [ ] Updates in real-time
- [ ] Displayed in dashboard

**Dependencies:** Task 5.3 (chapter generation)

---

## Sprint 6: Editing Agents (32 points)

### Task 6.1: Developmental Editor Agent
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Create Developmental Editor agent that analyzes structure, pacing, and character development.

**Developmental Editor Checklist:**
- Scene structure (goal/conflict/outcome)
- Pacing (too slow, too rushed, just right)
- Character actions (motivated, consistent)
- Plot logic (makes sense, plot holes)
- Emotional beats (land effectively)
- Foreshadowing (setup for payoff)
- Theme integration

**Agent Prompt:**
```typescript
const systemPrompt = `You are a bestselling author's developmental editor. Your job is to analyze chapters for structural and narrative issues.

Evaluate:
1. Scene Structure: Does each scene have clear goal/conflict/outcome?
2. Pacing: Is the chapter too slow, too rushed, or well-paced?
3. Character: Are character actions motivated and consistent?
4. Plot: Does the plot logic make sense? Any holes?
5. Emotional Beats: Do emotional moments land effectively?
6. Foreshadowing: Is there appropriate setup for future payoff?
7. Theme: Are themes woven naturally into the narrative?

Provide:
- Overall assessment (APPROVE or NEEDS_REVISION)
- Specific issues with line references
- Suggested revisions
- Praise for what works well

Be constructive and specific.`;
```

**Output Format:**
```typescript
interface DevEditFeedback {
  assessment: 'APPROVE' | 'NEEDS_REVISION';
  issues: Array<{
    type: string;
    severity: 'minor' | 'major' | 'critical';
    location: string;
    description: string;
    suggestion: string;
  }>;
  strengths: string[];
  revisionGuidance?: string;
}
```

**Acceptance Criteria:**
- [ ] Identifies structural issues
- [ ] Assesses pacing accurately
- [ ] Catches character inconsistencies
- [ ] Spots plot holes
- [ ] Provides actionable feedback
- [ ] Balances critique with praise

**Dependencies:** Task 5.3 (chapter generation)

---

### Task 6.2: Line Editor Agent
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Create Line Editor agent that polishes prose quality, dialogue, and sentence craft.

**Line Editor Checklist:**
- Sentence variety (length, structure)
- Active vs passive voice
- Sensory details (vivid, specific)
- Dialogue (natural, character-specific)
- Show vs tell (balance appropriate)
- Word choice (precise, evocative)
- Redundancy (eliminate)
- Clichés (replace)

**Agent Prompt:**
```typescript
const systemPrompt = `You are a line editor specializing in commercial fiction. Polish prose while maintaining the author's voice.

Evaluate:
1. Sentence Craft: Variety in length and structure?
2. Voice: Active preferred over passive?
3. Sensory Details: Vivid and specific?
4. Dialogue: Natural and character-specific?
5. Show vs Tell: Appropriate balance?
6. Word Choice: Precise and evocative?
7. Redundancy: Eliminate repetition?
8. Clichés: Replace with fresh language?

Provide line-by-line edits where needed. Preserve author's voice while improving clarity and impact.`;
```

**Acceptance Criteria:**
- [ ] Improves prose quality measurably
- [ ] Maintains author voice
- [ ] Dialogue sounds natural
- [ ] Sensory details enhanced
- [ ] Redundancy eliminated
- [ ] Show vs tell balanced

**Dependencies:** Task 6.1 (developmental editor)

---

### Task 6.3: Continuity Editor Agent
**Story Points:** 8
**Complexity:** Complex
**Priority:** P0

**Description:**
Create Continuity Editor agent that checks consistency across chapters and with story bible.

**Continuity Checks:**
- Character names (spelling, nicknames)
- Physical descriptions (eye color, height, etc.)
- Timeline (time of day, season, days elapsed)
- Character knowledge (don't know what they can't know)
- World rules (magic, technology consistent)
- Locations (descriptions match previous)
- Relationships (dynamics consistent)
- Object tracking (items, weapons, etc.)

**Implementation:**
```typescript
async function checkContinuity(chapter: Chapter): Promise<ContinuityReport> {
  const storyBible = await getStoryBible(chapter.book.project_id);
  const previousChapters = await getPreviousChapters(chapter);

  const systemPrompt = `You are a continuity editor. Check this chapter against the story bible and previous chapters for inconsistencies.

  Story Bible: ${JSON.stringify(storyBible)}
  Previous Chapters: ${previousChapters.map((ch) => ch.summary).join('\n')}

  Check for:
  - Character name/description consistency
  - Timeline accuracy
  - Character knowledge consistency
  - World rule consistency
  - Location consistency
  - Relationship consistency

  Report any inconsistencies with specific details.`;

  const userPrompt = `Check continuity:\n\n${chapter.content}`;

  const report = await claude.complete(userPrompt, systemPrompt);
  return parseContinuityReport(report);
}
```

**Acceptance Criteria:**
- [ ] Catches character name inconsistencies
- [ ] Detects timeline errors
- [ ] Identifies knowledge inconsistencies
- [ ] Spots world rule violations
- [ ] Checks location descriptions
- [ ] Verifies relationship dynamics
- [ ] Provides specific line references

**Dependencies:** Task 5.5 (state updates), Task 3.7 (story bible)

---

### Task 6.4: Copy Editor Agent
**Story Points:** 3
**Complexity:** Simple
**Priority:** P0

**Description:**
Create Copy Editor agent that fixes grammar, punctuation, and style consistency.

**Copy Editor Checklist:**
- Grammar (subject-verb agreement, tense consistency)
- Punctuation (commas, em dashes, dialogue tags)
- Spelling (character names, place names)
- Capitalization (consistent style)
- Formatting (paragraph breaks, dialogue)
- Style guide (British vs American, Oxford comma)

**Agent Prompt:**
```typescript
const systemPrompt = `You are a copy editor. Fix grammar, punctuation, and style errors while preserving the author's voice.

Style Guide:
- American English spelling
- Oxford comma: YES
- Em dashes: No spaces (word—word)
- Dialogue tags: Comma before closing quote
- Single space after periods

Fix errors but do not rewrite for style. Preserve author's voice.`;
```

**Acceptance Criteria:**
- [ ] Fixes grammar errors
- [ ] Corrects punctuation
- [ ] Consistent spelling
- [ ] Style guide followed
- [ ] Author voice preserved

**Dependencies:** Task 6.3 (continuity editor)

---

### Task 6.5: Auto-Revision Loop
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Implement auto-revision loop where Author Agent revises chapter based on Developmental Editor feedback.

**Revision Workflow:**
1. Developmental Editor reviews chapter
2. If NEEDS_REVISION:
   - Extract revision guidance
   - Author Agent revises chapter
   - Save revised version
   - Developmental Editor reviews again (max 2 iterations)
3. If APPROVE:
   - Proceed to Line Editor

**Implementation:**
```typescript
async function autoRevisionLoop(chapter: Chapter): Promise<string> {
  let content = chapter.content;
  let iteration = 0;
  const maxIterations = 2;

  while (iteration < maxIterations) {
    const feedback = await developmentalEdit(content);

    if (feedback.assessment === 'APPROVE') {
      break;
    }

    // Author revises based on feedback
    content = await authorRevise(content, feedback.revisionGuidance);
    iteration++;
  }

  return content;
}

async function authorRevise(content: string, guidance: string): Promise<string> {
  const systemPrompt = buildAuthorAgentPrompt(chapter.book.project);
  const userPrompt = `Revise this chapter based on editorial feedback:

  Feedback: ${guidance}

  Original Chapter:
  ${content}

  Provide revised chapter that addresses the feedback while maintaining your voice and style.`;

  return await claude.complete(userPrompt, systemPrompt);
}
```

**Acceptance Criteria:**
- [ ] Revision loop runs automatically
- [ ] Max 2 iterations enforced
- [ ] Revisions improve chapter quality
- [ ] Author voice maintained
- [ ] Feedback addressed
- [ ] Loop terminates correctly

**Dependencies:** Task 6.1 (developmental editor), Task 5.2 (author persona)

---

### Task 6.6: Flag System
**Story Points:** 3
**Complexity:** Simple
**Priority:** P1

**Description:**
Flag unresolved issues for human review when agents cannot resolve automatically.

**Flagging Criteria:**
- Continuity issue cannot be resolved automatically
- Plot hole identified
- Character motivation unclear
- Revision loop fails to improve
- Critical error in logic

**Flag Structure:**
```typescript
interface Flag {
  id: string;
  chapterId: string;
  type: 'continuity' | 'plot' | 'character' | 'quality' | 'other';
  severity: 'info' | 'warning' | 'error';
  description: string;
  location: string; // line reference
  agentSource: string; // which agent flagged it
  timestamp: string;
  resolved: boolean;
}
```

**Acceptance Criteria:**
- [ ] Flags saved to database
- [ ] Multiple flags per chapter supported
- [ ] Flags categorized by type and severity
- [ ] Line references included
- [ ] Flagging agent tracked
- [ ] Can mark flags as resolved

**Dependencies:** Task 6.3 (continuity editor)

---

### Task 6.7: Edit Job Integration
**Story Points:** 3
**Complexity:** Simple
**Priority:** P0

**Description:**
Integrate all editing agents into the generation pipeline as sequential jobs.

**Pipeline Flow:**
```
Chapter Generation Job (Author Agent)
  ↓
Auto-Revision Loop Job (Dev Editor + Author)
  ↓
Line Edit Job (Line Editor)
  ↓
Continuity Check Job (Continuity Editor)
  ↓
Copy Edit Job (Copy Editor)
  ↓
Chapter Complete
```

**Implementation:**
```typescript
async function createChapterJobs(chapterId: string) {
  await createJob({ type: 'generate_chapter', target_id: chapterId, status: 'pending' });
  await createJob({ type: 'dev_edit', target_id: chapterId, status: 'pending' });
  await createJob({ type: 'line_edit', target_id: chapterId, status: 'pending' });
  await createJob({ type: 'continuity_check', target_id: chapterId, status: 'pending' });
  await createJob({ type: 'copy_edit', target_id: chapterId, status: 'pending' });
}
```

**Acceptance Criteria:**
- [ ] All edit jobs created for each chapter
- [ ] Jobs execute in correct sequence
- [ ] Each job completes before next starts
- [ ] Failures handled gracefully
- [ ] Chapter marked complete after all jobs

**Dependencies:** All Sprint 6 tasks

---

## Sprint 7: Export & Dashboard (29 points)

### Task 7.1: DOCX Export
**Story Points:** 8
**Complexity:** Complex
**Priority:** P0

**Description:**
Export manuscript as Word document with proper formatting.

**DOCX Requirements:**
- Title page (title, author)
- Table of contents (optional)
- Chapter headings (centered, bold, 18pt)
- Body text (12pt Times New Roman, 1.5 line spacing)
- Scene breaks (three centered asterisks)
- Page breaks between chapters
- Page numbers (bottom center)
- 1-inch margins

**Implementation:**
```typescript
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

async function exportToDOCX(projectId: string): Promise<Buffer> {
  const project = await getProject(projectId);
  const chapters = await getChapters(projectId);

  const doc = new Document({
    sections: [
      // Title page
      {
        properties: {},
        children: [
          new Paragraph({
            text: project.title,
            heading: HeadingLevel.TITLE,
            alignment: 'center',
          }),
          new Paragraph({
            text: 'by Your Name',
            alignment: 'center',
          }),
        ],
      },
      // Chapters
      ...chapters.map((chapter) => ({
        properties: { pageBreakBefore: true },
        children: [
          new Paragraph({
            text: `Chapter ${chapter.chapter_number}`,
            heading: HeadingLevel.HEADING_1,
            alignment: 'center',
          }),
          new Paragraph({
            text: chapter.title || '',
            heading: HeadingLevel.HEADING_2,
            alignment: 'center',
          }),
          ...parseChapterParagraphs(chapter.content),
        ],
      })),
    ],
  });

  return await Packer.toBuffer(doc);
}
```

**Acceptance Criteria:**
- [ ] DOCX opens in Microsoft Word
- [ ] Formatting preserved
- [ ] Chapter headings correct
- [ ] Page breaks between chapters
- [ ] Margins and spacing correct
- [ ] Scene breaks formatted
- [ ] No encoding issues

**Dependencies:** Task 5.3 (chapter generation)

---

### Task 7.2: PDF Export
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Export manuscript as print-ready PDF.

**PDF Requirements:**
- US Letter (8.5" x 11") or A4
- 1-inch margins
- Professional serif font (Times, Garamond)
- Page numbers
- Chapter headings
- Proper paragraph spacing

**Implementation:**
```typescript
import PDFDocument from 'pdfkit';

async function exportToPDF(projectId: string): Promise<Buffer> {
  const project = await getProject(projectId);
  const chapters = await getChapters(projectId);

  return new Promise((resolve) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 72, bottom: 72, left: 72, right: 72 }, // 1 inch
    });

    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    // Title page
    doc.fontSize(24).text(project.title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text('by Your Name', { align: 'center' });
    doc.addPage();

    // Chapters
    for (const chapter of chapters) {
      doc.fontSize(18).text(`Chapter ${chapter.chapter_number}`, { align: 'center' });
      if (chapter.title) {
        doc.fontSize(14).text(chapter.title, { align: 'center' });
      }
      doc.moveDown();
      doc.fontSize(12).text(chapter.content, { align: 'left', lineGap: 6 });
      doc.addPage();
    }

    doc.end();
  });
}
```

**Acceptance Criteria:**
- [ ] PDF opens in PDF readers
- [ ] Print-ready quality
- [ ] Fonts embedded
- [ ] Page numbers present
- [ ] Margins correct
- [ ] Chapter breaks on new pages

**Dependencies:** Task 5.3 (chapter generation)

---

### Task 7.3: Story Bible Export
**Story Points:** 5
**Complexity:** Medium
**Priority:** P1

**Description:**
Export story bible as DOCX or PDF with all characters, world elements, and timeline.

**Story Bible Sections:**
1. **Characters**
   - Protagonist
   - Supporting cast
   - Minor characters
2. **World**
   - Locations
   - Factions
   - Magic/Technology systems
3. **Timeline**
   - Chronological event list
4. **Themes**
   - Theme exploration
5. **Mysteries**
   - Questions raised and answered

**Acceptance Criteria:**
- [ ] All characters included
- [ ] World elements complete
- [ ] Timeline chronological
- [ ] Formatted professionally
- [ ] Exports as DOCX or PDF

**Dependencies:** Task 3.7 (story bible), Task 7.1 (DOCX export)

---

### Task 7.4: Progress Dashboard
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Create visual progress dashboard showing real-time generation progress.

**Dashboard Elements:**
- Overall progress bar
- Chapters completed (X / Y)
- Word count (current / target)
- Time estimate (remaining)
- Session count used
- Current chapter being generated
- Recent activity feed
- Rate limit status
- Flagged issues count

**Implementation:**
```typescript
// frontend/app/project/[id]/progress/page.tsx
export default function ProgressPage({ params }) {
  const { data: progress, isLoading } = useProgress(params.id);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="progress-dashboard">
      <ProgressBar value={progress.percentComplete} />

      <StatsGrid>
        <Stat label="Chapters" value={`${progress.completed} / ${progress.total}`} />
        <Stat label="Word Count" value={progress.wordCount.toLocaleString()} />
        <Stat label="Time Remaining" value={formatDuration(progress.timeRemaining)} />
        <Stat label="Sessions Used" value={progress.sessionsUsed} />
      </StatsGrid>

      <CurrentActivity chapter={progress.currentChapter} />

      <ActivityFeed events={progress.recentEvents} />

      <FlaggedIssues count={progress.flaggedIssues} />
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Progress updates in real-time
- [ ] All metrics displayed
- [ ] Visual progress bar
- [ ] Estimates accurate
- [ ] Activity feed shows recent events
- [ ] Responsive design

**Dependencies:** Task 5.6 (progress tracking)

---

### Task 7.5: Flagged Issues UI
**Story Points:** 3
**Complexity:** Simple
**Priority:** P1

**Description:**
Create UI for reviewing and resolving editor-flagged issues.

**Features:**
- List all flagged issues
- Filter by type/severity
- View issue details
- See chapter context
- Mark as resolved
- Add notes

**Implementation:**
```typescript
// frontend/components/FlaggedIssuesPanel.tsx
export function FlaggedIssuesPanel({ projectId }) {
  const { data: flags } = useFlags(projectId);
  const [filter, setFilter] = useState('all');

  const filteredFlags = flags?.filter((flag) => {
    if (filter === 'all') return true;
    return flag.type === filter;
  });

  return (
    <div>
      <FilterBar value={filter} onChange={setFilter} />

      {filteredFlags?.map((flag) => (
        <FlagCard
          key={flag.id}
          flag={flag}
          onResolve={() => resolveFlag(flag.id)}
        />
      ))}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] All flags displayed
- [ ] Can filter by type/severity
- [ ] Issue details visible
- [ ] Can mark as resolved
- [ ] Chapter context shown
- [ ] Resolved flags hidden

**Dependencies:** Task 6.6 (flag system)

---

### Task 7.6: Chapter Regeneration
**Story Points:** 3
**Complexity:** Simple
**Priority:** P1

**Description:**
Allow user to regenerate specific chapters on request.

**Features:**
- Select chapter to regenerate
- Confirm regeneration (warning about overwrite)
- Re-run full editing pipeline
- Track regeneration count

**Implementation:**
```typescript
async function regenerateChapter(chapterId: string) {
  // Mark existing jobs as cancelled
  await cancelChapterJobs(chapterId);

  // Clear chapter content
  await updateChapter(chapterId, { content: '', status: 'pending' });

  // Create new jobs
  await createChapterJobs(chapterId);

  // Queue will pick up new jobs automatically
}
```

**Acceptance Criteria:**
- [ ] Can select chapter to regenerate
- [ ] Warning shown before overwrite
- [ ] Full pipeline runs again
- [ ] Original content replaced
- [ ] Regeneration tracked

**Dependencies:** Task 6.7 (edit job integration)

---

## Sprint 8: Trilogy Support & Polish (32 points)

### Task 8.1: Multi-Book Projects
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Extend project model to support multiple books (trilogy).

**Data Model Changes:**
```sql
-- Projects can now be type 'trilogy'
ALTER TABLE projects ADD COLUMN book_count INTEGER DEFAULT 1;

-- Books table already supports multiple books per project
-- Add book order and status tracking
ALTER TABLE books ADD COLUMN book_order INTEGER;
ALTER TABLE books ADD COLUMN word_count INTEGER DEFAULT 0;
```

**UI Changes:**
- Book selector in project dashboard
- "Add Book" button for trilogy projects
- Book progress tracking
- Series-level progress

**Acceptance Criteria:**
- [ ] Can create trilogy project
- [ ] Can add multiple books
- [ ] Each book has own chapters
- [ ] Book order maintained
- [ ] Can switch between books in UI

**Dependencies:** Task 1.2 (SQLite schema)

---

### Task 8.2: Cross-Book Continuity
**Story Points:** 8
**Complexity:** Complex
**Priority:** P0

**Description:**
Track characters, timeline, and world state across all books in series.

**Cross-Book Tracking:**

**Character Evolution:**
```typescript
interface CharacterArc {
  characterId: string;
  bookArcs: Array<{
    bookId: string;
    startingState: CharacterState;
    endingState: CharacterState;
    keyMoments: string[];
    growth: string;
  }>;
}
```

**Timeline Tracking:**
```typescript
interface SeriesTimeline {
  events: Array<{
    bookId: string;
    chapterId: string;
    timestamp: string; // In-world time
    event: string;
    charactersInvolved: string[];
  }>;
}
```

**World State Changes:**
```typescript
interface WorldState {
  bookId: string;
  locations: LocationState[];
  factions: FactionState[];
  magicSystems: MagicSystemState[];
  changes: string[]; // What changed from previous book
}
```

**Continuity Editor Enhancement:**
For trilogy projects, Continuity Editor must check against all previous books, not just current book.

**Acceptance Criteria:**
- [ ] Character states carry over between books
- [ ] Timeline remains consistent
- [ ] World changes tracked
- [ ] Continuity Editor checks all books
- [ ] Relationship dynamics persist
- [ ] Knowledge accumulates

**Dependencies:** Task 8.1 (multi-book), Task 6.3 (continuity editor)

---

### Task 8.3: Series Bible Generator
**Story Points:** 5
**Complexity:** Medium
**Priority:** P0

**Description:**
Generate comprehensive series bible combining all books.

**Series Bible Sections:**

1. **Series Overview**
   - Series arc
   - Themes across books
   - Major plot threads

2. **Characters (All Books)**
   - Complete character evolution
   - Relationship timelines
   - Character fates

3. **World (All Books)**
   - Complete location guide
   - Faction histories
   - World state evolution

4. **Timeline (All Books)**
   - Chronological event list
   - Cross-references to chapters

5. **Mysteries & Payoffs**
   - Questions raised (by book)
   - Answers revealed (by book)
   - Outstanding mysteries

6. **Callbacks & Foreshadowing**
   - Setup in Book X, payoff in Book Y
   - Recurring elements

**Acceptance Criteria:**
- [ ] Includes all books
- [ ] Character arcs complete
- [ ] Timeline chronological
- [ ] Cross-references accurate
- [ ] Exports professionally

**Dependencies:** Task 8.2 (cross-book continuity), Task 7.3 (story bible export)

---

### Task 8.4: Book Transition Summaries
**Story Points:** 3
**Complexity:** Simple
**Priority:** P1

**Description:**
Generate summary documents explaining time gaps and changes between books.

**Transition Summary Contents:**
- Time elapsed between books
- Major events during gap (off-screen)
- Character changes during gap
- World state changes
- Where each character is at start of next book

**Implementation:**
```typescript
async function generateBookTransition(book1: Book, book2: Book): Promise<string> {
  const systemPrompt = `You are writing a transition summary between two books in a series.

  Explain:
  - How much time has passed
  - What happened during the gap
  - How characters have changed
  - Where each character is now
  - Any world changes

  Make it feel like a bridge between books.`;

  const userPrompt = `Create transition summary:

  Book 1 ending: ${book1.lastChapter.summary}
  Book 2 beginning: ${book2.firstChapter.summary}
  Characters: ${JSON.stringify(book1.project.characters)}

  Write transition summary (2-3 paragraphs).`;

  return await claude.complete(userPrompt, systemPrompt);
}
```

**Acceptance Criteria:**
- [ ] Summary explains time gap
- [ ] Character changes noted
- [ ] World changes explained
- [ ] Feels like natural bridge
- [ ] Saves to database

**Dependencies:** Task 8.1 (multi-book)

---

### Task 8.5: Testing and Bug Fixes
**Story Points:** 8
**Complexity:** Complex
**Priority:** P0

**Description:**
Comprehensive end-to-end testing and bug fixes.

**Test Coverage:**

**Unit Tests:**
- Context assembly
- Token counting
- Job state transitions
- Session tracking calculations
- Character state updates

**Integration Tests:**
- Full chapter generation pipeline
- Editing agent sequence
- Queue pause/resume
- Checkpoint recovery
- Export generation

**End-to-End Tests:**
- Complete novel generation (small test novel)
- Trilogy project creation
- Rate limit handling
- Application crash recovery

**Edge Cases:**
- Empty chapters
- Very long chapters (> 5,000 words)
- Special characters in text
- Corrupted checkpoints
- Database connection loss
- API timeouts

**Performance Tests:**
- Chapter generation speed
- Memory usage during generation
- Database query performance
- Export generation speed

**Acceptance Criteria:**
- [ ] All critical paths tested
- [ ] Edge cases handled
- [ ] No regressions
- [ ] Performance acceptable
- [ ] Error handling comprehensive
- [ ] Recovery mechanisms work

**Dependencies:** All previous tasks

---

### Task 8.6: Documentation
**Story Points:** 3
**Complexity:** Simple
**Priority:** P1

**Description:**
Write comprehensive user and developer documentation.

**Documentation to Create:**

**README.md:**
- Project overview
- Quick start guide
- Features list
- Technology stack

**SETUP.md:**
- Installation instructions
- Dependencies
- Configuration
- Environment variables
- Database setup

**USER_GUIDE.md:**
- How to create a project
- Story preferences guide
- Concept selection tips
- Character/world editing
- Outline editing
- Monitoring progress
- Exporting manuscripts
- Troubleshooting common issues

**API_DOCS.md:**
- All API endpoints
- Request/response formats
- Error codes
- Rate limiting

**ARCHITECTURE.md:**
- System architecture overview
- Component descriptions
- Data flow diagrams
- Agent pipeline
- Queue system
- Session tracking

**TROUBLESHOOTING.md:**
- Common problems and solutions
- Rate limit handling
- Checkpoint recovery
- Database issues
- Export problems

**Acceptance Criteria:**
- [ ] All documents complete
- [ ] Examples included
- [ ] Screenshots where helpful
- [ ] Clear and concise
- [ ] Covers all features
- [ ] Troubleshooting comprehensive

**Dependencies:** All previous tasks

---

## Task Summary Statistics

| Sprint | Tasks | Total Points | Avg Points/Task | Complexity Distribution |
|--------|-------|--------------|-----------------|-------------------------|
| Sprint 1 | 8 | 31 | 3.9 | Trivial: 1, Simple: 3, Medium: 4 |
| Sprint 2 | 6 | 24 | 4.0 | Simple: 3, Medium: 3 |
| Sprint 3 | 7 | 31 | 4.4 | Simple: 2, Medium: 5 |
| Sprint 4 | 6 | 31 | 5.2 | Trivial: 1, Simple: 1, Medium: 2, Complex: 2 |
| Sprint 5 | 6 | 31 | 5.2 | Simple: 1, Medium: 4, Complex: 1 |
| Sprint 6 | 7 | 32 | 4.6 | Simple: 3, Medium: 3, Complex: 1 |
| Sprint 7 | 6 | 29 | 4.8 | Simple: 3, Medium: 2, Complex: 1 |
| Sprint 8 | 6 | 32 | 5.3 | Simple: 2, Medium: 2, Complex: 2 |
| **TOTAL** | **57** | **241** | **4.2** | **T: 2, S: 17, M: 27, C: 11** |

---

**Last Updated:** January 2026
**Version:** 2.0
