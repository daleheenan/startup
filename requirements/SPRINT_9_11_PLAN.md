# NovelForge - Sprint 9-11 Implementation Plan

## Executive Summary

This document outlines the implementation plan for Sprints 9-11, which will complete NovelForge's transition to a production-ready SaaS application with backend deployment, authentication, agent learning system, and modern real-time UI.

**Current State:**
- Sprints 1-8 complete (241 story points)
- Backend built but NOT deployed (critical blocker)
- Frontend deployed on Railway but connects to localhost:3001 (fails in production)
- Database on persistent volume
- Public landing page only

**Target State:**
- Backend deployed and accessible
- Single-user authentication (owner-only access)
- Self-improving agent learning system
- Real-time progress dashboard
- Modern minimalist UI matching design requirements

**Total Scope:** 93 story points across 3 sprints
**Estimated Duration:** 3-4 Claude Max sessions

---

## Critical Architecture Decisions

### Decision 1: Backend Deployment Strategy

**Problem:** Backend is not deployed; frontend connects to localhost:3001 which fails in production.

**Options:**

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: Separate Railway Service** | - Clean separation<br>- Independent scaling<br>- Clear service boundaries | - Two services to manage<br>- CORS configuration needed<br>- Two deployments | ✅ **RECOMMENDED** |
| **B: Next.js API Routes** | - Single deployment<br>- Simpler architecture | - Mixing concerns<br>- Harder to scale<br>- Route conflicts possible | ❌ Not ideal |
| **C: Monorepo with Nx** | - Shared code<br>- Single repo | - Significant refactoring<br>- Added complexity | ❌ Overkill |

**Decision: Option A - Separate Railway Service**

**Rationale:**
- Backend already built as standalone Express app
- Clean separation between frontend (Next.js) and backend (Express)
- Railway makes multi-service deployments simple
- Can scale independently if needed

**Implementation Plan:**
1. Create new Railway service for backend (`novelforge-backend`)
2. Configure environment variables (DATABASE_PATH, ANTHROPIC_API_KEY)
3. Share database volume between services
4. Set NEXT_PUBLIC_API_URL in frontend to backend service URL
5. Configure CORS to allow frontend origin

---

### Decision 2: Authentication Approach

**Problem:** Need single-user authentication (owner-only access).

**Options:**

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: Simple Password + JWT** | - Minimal dependencies<br>- Full control<br>- Fast implementation | - Manual security management<br>- Password reset complexity | ✅ **RECOMMENDED** |
| **B: NextAuth.js** | - Battle-tested<br>- Multiple providers<br>- Session management | - Overkill for single user<br>- More dependencies | ❌ Too complex |
| **C: Railway Auth (env var)** | - Extremely simple<br>- No code needed | - Not user-friendly<br>- Hard to change | ❌ Not professional |

**Decision: Option A - Simple Password + JWT**

**Rationale:**
- Simple password stored as environment variable (hashed)
- JWT tokens for session management
- Minimal dependencies (just jsonwebtoken and bcrypt)
- Professional user experience
- Can add OAuth later if needed

**Implementation:**
- `/api/auth/login` endpoint validates password
- Returns JWT with 7-day expiration
- Middleware protects all `/projects/*` routes
- Public homepage remains accessible

---

### Decision 3: Real-Time Updates Approach

**Problem:** Dashboard needs to show live agent activity and progress.

**Options:**

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: Server-Sent Events (SSE)** | - Simple implementation<br>- Native browser support<br>- One-way communication perfect for updates | - One-way only<br>- Connection management | ✅ **RECOMMENDED** |
| **B: Polling** | - Simplest<br>- No connection management | - Inefficient<br>- Delay in updates<br>- Higher load | ❌ Not ideal |
| **C: WebSockets** | - True real-time<br>- Bi-directional | - Overkill for read-only updates<br>- More complex | ❌ Too complex |

**Decision: Option A - Server-Sent Events (SSE)**

**Rationale:**
- Dashboard only needs to RECEIVE updates (one-way)
- SSE is perfect for progress streams
- Native browser support with EventSource API
- Auto-reconnect handling
- Simpler than WebSockets for this use case

**Implementation:**
- `/api/progress/stream` endpoint sends SSE
- Frontend EventSource subscribes on dashboard mount
- Backend emits events on job state changes
- Real-time chapter completion, agent activity, ETA updates

---

### Decision 4: Agent Learning Database Schema

**Problem:** Need to store lessons and reflections for agent improvement.

**Schema Design:**

```sql
-- Lessons table: Stores validated, reusable lessons
CREATE TABLE lessons (
    id TEXT PRIMARY KEY,
    agent_type TEXT NOT NULL,        -- 'author', 'dev-editor', 'line-editor', etc.
    scope TEXT NOT NULL,              -- 'global', 'genre:{name}', 'project:{id}'
    category TEXT NOT NULL,           -- 'technique', 'pitfall', 'pattern', 'preference', 'correction'
    title TEXT NOT NULL,              -- Short description
    content TEXT NOT NULL,            -- The actual lesson
    score INTEGER DEFAULT 1,          -- Success score (incremented when helpful)
    context TEXT,                     -- JSON: Genre, project type, etc.
    tags TEXT,                        -- JSON array: searchable tags
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_lessons_agent ON lessons(agent_type);
CREATE INDEX idx_lessons_scope ON lessons(scope);
CREATE INDEX idx_lessons_category ON lessons(category);
CREATE INDEX idx_lessons_score ON lessons(score DESC);

-- Reflections table: Raw agent reflections before becoming lessons
CREATE TABLE reflections (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    chapter_id TEXT,
    project_id TEXT,
    reflection TEXT NOT NULL,        -- Raw reflection from agent
    lesson_id TEXT,                   -- NULL if not promoted to lesson yet
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
);

CREATE INDEX idx_reflections_job ON reflections(job_id);
CREATE INDEX idx_reflections_agent ON reflections(agent_type);
CREATE INDEX idx_reflections_lesson ON reflections(lesson_id);
```

**Lesson Retrieval Strategy:**
1. Query lessons matching: agent_type, scope (exact or global), sorted by score
2. Limit to top 5-10 lessons per agent invocation
3. Increment score when lesson is used successfully
4. Prune lessons with score < 0 after multiple failures

---

## Sprint 9: Backend Deployment + Authentication

**Sessions:** 1-2
**Story Points:** 29
**Duration:** 1 day
**Dependencies:** None (Sprints 1-8 already complete)

### Sprint Goal

Deploy backend to Railway as a separate service and implement single-user authentication so the application is production-accessible.

### Key Deliverables

- Backend deployed on Railway (`novelforge-backend` service)
- Shared database volume between frontend and backend
- JWT-based authentication system
- Protected routes (only owner can access `/projects/*`)
- Public landing page with sign-in button
- Environment variable configuration

### Tasks

| Task | Points | Priority | Description |
|------|--------|----------|-------------|
| 9.1 Railway Backend Service | 5 | P0 | Create new Railway service for backend with build/deploy config |
| 9.2 Database Volume Sharing | 3 | P0 | Configure both services to use shared `novelforge_data` volume |
| 9.3 Environment Variables | 2 | P0 | Set DATABASE_PATH, ANTHROPIC_API_KEY, FRONTEND_URL in backend |
| 9.4 CORS Configuration | 2 | P0 | Update backend CORS to allow frontend origin |
| 9.5 Frontend API URL | 2 | P0 | Set NEXT_PUBLIC_API_URL to backend service URL |
| 9.6 Auth Backend (Login API) | 5 | P0 | `/api/auth/login` endpoint with password validation and JWT |
| 9.7 Auth Middleware | 3 | P0 | Middleware to verify JWT on protected routes |
| 9.8 Login Page UI | 3 | P0 | Simple login form at `/login` |
| 9.9 Auth Context | 2 | P0 | React Context for auth state, token storage |
| 9.10 Protected Routes | 2 | P0 | Redirect to `/login` if not authenticated |

**Progress:** 0 / 29 points (0%)

### Success Criteria

- [ ] Backend accessible at `https://novelforge-backend.up.railway.app/health`
- [ ] Frontend API calls successfully reach backend
- [ ] Database accessible from both services
- [ ] Can log in with password from environment variable
- [ ] JWT token stored in localStorage/sessionStorage
- [ ] All `/projects/*` routes require authentication
- [ ] Public homepage visible without authentication
- [ ] Sign in button redirects to `/login`
- [ ] Invalid password shows error
- [ ] Valid login redirects to `/projects` (or first project)

### Implementation Details

#### 9.1 Railway Backend Service

Create `railway.backend.toml`:

```toml
[build]
builder = "nixpacks"
buildCommand = "cd backend && npm install && npm run build"

[deploy]
startCommand = "cd backend && npm start"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

# Share database volume
[[mounts]]
source = "novelforge_data"
destination = "/data"
```

Environment variables:
- `DATABASE_PATH=/data/novelforge.db`
- `ANTHROPIC_API_KEY=<from-user-secret>`
- `FRONTEND_URL=https://novelforge-web.up.railway.app`
- `JWT_SECRET=<generate-random-secret>`
- `OWNER_PASSWORD_HASH=<bcrypt-hash>`
- `PORT=3001`

#### 9.6 Auth Backend Implementation

```typescript
// backend/src/routes/auth.ts
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { password } = req.body;
  const passwordHash = process.env.OWNER_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET;

  if (!passwordHash || !jwtSecret) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const valid = await bcrypt.compare(password, passwordHash);

  if (!valid) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = jwt.sign({ user: 'owner' }, jwtSecret, { expiresIn: '7d' });

  res.json({ token });
});

export default router;
```

#### 9.7 Auth Middleware

```typescript
// backend/src/middleware/auth.ts
import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET;

  try {
    jwt.verify(token, jwtSecret);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

Apply to all project routes:

```typescript
// backend/src/server.ts
app.use('/api/projects', requireAuth, projectsRouter);
app.use('/api/queue', requireAuth, queueRouter);
// ... etc for all protected routes
```

#### 9.8 Login Page UI

```typescript
// app/login/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(password);
      router.push('/projects');
    } catch (err) {
      setError('Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ /* minimal styling */ }}>
      <h1>Sign In to NovelForge</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </main>
  );
}
```

#### 9.9 Auth Context

```typescript
// app/lib/auth.ts
const TOKEN_KEY = 'novelforge_token';

export async function login(password: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const { token } = await response.json();
  localStorage.setItem(TOKEN_KEY, token);
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
```

Update API client to include token:

```typescript
// app/lib/api.ts
import { getToken } from './auth';

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export async function checkHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    headers: getHeaders(),
  });
  // ... rest of implementation
}
```

#### 9.10 Protected Routes

```typescript
// app/projects/layout.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function ProjectsLayout({ children }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  if (!isAuthenticated()) {
    return null; // or loading spinner
  }

  return <>{children}</>;
}
```

### Testing Checklist

- [ ] Backend health endpoint responds at Railway URL
- [ ] Frontend can fetch queue stats from deployed backend
- [ ] Login with wrong password fails
- [ ] Login with correct password succeeds
- [ ] Token stored in localStorage
- [ ] Protected routes redirect to login when not authenticated
- [ ] Protected routes accessible when authenticated
- [ ] Token expires after 7 days
- [ ] Logout clears token

### Deployment Order

1. Deploy backend to Railway first
2. Get backend URL from Railway
3. Set `NEXT_PUBLIC_API_URL` in frontend environment
4. Redeploy frontend
5. Test authentication flow end-to-end

---

## Sprint 10: Agent Learning System

**Sessions:** 2-3
**Story Points:** 34
**Duration:** 1-2 days
**Dependencies:** Sprint 9 (backend deployment)

### Sprint Goal

Implement self-improving agent system where agents learn from each task through reflection, store lessons in a database, and retrieve relevant lessons before execution.

### Key Deliverables

- Lessons and reflections database tables
- Reflection prompt for each agent type
- Lesson storage and retrieval system
- Lesson scoring and pruning
- Integration with all existing agents
- Admin UI for viewing/managing lessons

### Tasks

| Task | Points | Priority | Description |
|------|--------|----------|-------------|
| 10.1 Database Schema | 3 | P0 | Add `lessons` and `reflections` tables to schema |
| 10.2 Lessons API | 5 | P0 | CRUD endpoints for lessons: create, read, update score, delete |
| 10.3 Reflections API | 3 | P0 | Create/read reflections linked to jobs |
| 10.4 Lesson Retrieval Service | 5 | P0 | Query lessons by agent, scope, tags; sort by score |
| 10.5 Reflection Prompts | 5 | P0 | Prompt engineering for each agent type's reflection |
| 10.6 Author Agent Integration | 3 | P0 | Retrieve lessons before generation, reflect after |
| 10.7 Editing Agents Integration | 5 | P0 | Add learning loop to all 4 editing agents |
| 10.8 Lesson Promotion Logic | 3 | P1 | Convert high-quality reflections to lessons |
| 10.9 Lesson Scoring | 2 | P1 | Increment score on reuse, decrement on failure |
| 10.10 Admin UI - Lessons Viewer | 5 | P1 | Page to view all lessons, filter by agent/scope |
| 10.11 Admin UI - Lesson Editor | 2 | P2 | Edit/delete lessons manually |

**Progress:** 0 / 34 points (0%)

### Success Criteria

- [ ] Database tables created and migrated
- [ ] Lessons stored with agent_type, scope, category, content
- [ ] Reflections linked to jobs and chapters
- [ ] Can retrieve top 10 lessons for a specific agent + genre
- [ ] Author Agent receives relevant lessons before generation
- [ ] All agents output reflection after completing work
- [ ] Reflections stored in database
- [ ] High-quality reflections promoted to lessons
- [ ] Lesson scores increment when reused
- [ ] Admin UI shows all lessons filterable by agent
- [ ] Can manually edit or delete lessons

### Implementation Details

#### 10.1 Database Schema

Add to `backend/src/db/schema.sql`:

```sql
-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    agent_type TEXT NOT NULL,
    scope TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('technique', 'pitfall', 'pattern', 'preference', 'correction')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    score INTEGER DEFAULT 1,
    context TEXT,
    tags TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lessons_agent ON lessons(agent_type);
CREATE INDEX IF NOT EXISTS idx_lessons_scope ON lessons(scope);
CREATE INDEX IF NOT EXISTS idx_lessons_category ON lessons(category);
CREATE INDEX IF NOT EXISTS idx_lessons_score ON lessons(score DESC);

-- Reflections table
CREATE TABLE IF NOT EXISTS reflections (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    chapter_id TEXT,
    project_id TEXT,
    reflection TEXT NOT NULL,
    lesson_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reflections_job ON reflections(job_id);
CREATE INDEX IF NOT EXISTS idx_reflections_agent ON reflections(agent_type);
CREATE INDEX IF NOT EXISTS idx_reflections_lesson ON reflections(lesson_id);
```

Create migration: `backend/src/db/migrations/003_agent_learning.sql`

#### 10.2 Lessons API

```typescript
// backend/src/routes/lessons.ts
import express from 'express';
import { lessonsService } from '../services/lessons.js';

const router = express.Router();

// GET /api/lessons?agent_type=author&scope=global
router.get('/', async (req, res) => {
  const { agent_type, scope, category, limit = 100 } = req.query;
  const lessons = await lessonsService.query({
    agent_type,
    scope,
    category,
    limit: Number(limit),
  });
  res.json(lessons);
});

// POST /api/lessons
router.post('/', async (req, res) => {
  const lesson = await lessonsService.create(req.body);
  res.json(lesson);
});

// PATCH /api/lessons/:id/score
router.patch('/:id/score', async (req, res) => {
  const { increment } = req.body; // +1 or -1
  const lesson = await lessonsService.updateScore(req.params.id, increment);
  res.json(lesson);
});

// DELETE /api/lessons/:id
router.delete('/:id', async (req, res) => {
  await lessonsService.delete(req.params.id);
  res.json({ success: true });
});

export default router;
```

#### 10.4 Lesson Retrieval Service

```typescript
// backend/src/services/lessons.ts
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';

export interface Lesson {
  id: string;
  agent_type: string;
  scope: string;
  category: string;
  title: string;
  content: string;
  score: number;
  context?: string;
  tags?: string[];
}

export const lessonsService = {
  /**
   * Retrieve lessons for a specific agent with scope filtering
   */
  async retrieve(agentType: string, genre?: string, projectId?: string): Promise<Lesson[]> {
    const scopes = ['global'];
    if (genre) scopes.push(`genre:${genre}`);
    if (projectId) scopes.push(`project:${projectId}`);

    const placeholders = scopes.map(() => '?').join(',');

    const stmt = db.prepare(`
      SELECT * FROM lessons
      WHERE agent_type = ? AND scope IN (${placeholders})
      ORDER BY score DESC, created_at DESC
      LIMIT 10
    `);

    const rows = stmt.all(agentType, ...scopes);

    return rows.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));
  },

  /**
   * Create a new lesson
   */
  async create(lesson: Omit<Lesson, 'id' | 'score'>): Promise<Lesson> {
    const id = uuidv4();
    const tags = lesson.tags ? JSON.stringify(lesson.tags) : null;

    db.prepare(`
      INSERT INTO lessons (id, agent_type, scope, category, title, content, context, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      lesson.agent_type,
      lesson.scope,
      lesson.category,
      lesson.title,
      lesson.content,
      lesson.context || null,
      tags
    );

    return { ...lesson, id, score: 1 };
  },

  /**
   * Increment or decrement lesson score
   */
  async updateScore(lessonId: string, increment: number): Promise<void> {
    db.prepare(`
      UPDATE lessons
      SET score = score + ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(increment, lessonId);
  },

  /**
   * Delete lessons with score below threshold
   */
  async pruneNegativeScores(): Promise<void> {
    db.prepare('DELETE FROM lessons WHERE score < -2').run();
  },
};
```

#### 10.5 Reflection Prompts

Each agent needs a reflection prompt. Example for Author Agent:

```typescript
// backend/src/agents/author.ts

const REFLECTION_PROMPT = `
You have just completed writing a chapter. Reflect on your work:

1. **What worked well?** Identify techniques or patterns that were effective.
2. **What could be improved?** Note any challenges or areas for refinement.
3. **Genre-specific insights:** What did you learn about writing in this genre?
4. **Pacing and structure:** How well did the chapter flow?
5. **Character voice:** Did you capture the POV character's unique voice?

Format your reflection as JSON:

{
  "worked_well": ["Technique 1", "Technique 2"],
  "improvements": ["Area 1", "Area 2"],
  "genre_insights": "Insight about genre conventions",
  "pacing_notes": "Notes on chapter pacing",
  "voice_notes": "Notes on character voice"
}

Be specific and actionable. These reflections will help improve future chapters.
`;

async function generateChapter(context: ChapterContext): Promise<string> {
  // 1. Retrieve lessons
  const lessons = await lessonsService.retrieve(
    'author',
    context.storyDNA.genre,
    context.projectId
  );

  // 2. Build prompt with lessons
  const lessonsText = lessons.map(l => `- ${l.content}`).join('\n');
  const prompt = `
${AUTHOR_SYSTEM_PROMPT}

**Lessons from Previous Work:**
${lessonsText}

${context.sceneCard}
${context.characters}
...
  `;

  // 3. Generate chapter
  const chapter = await claude.generateText(prompt);

  // 4. Request reflection
  const reflection = await claude.generateText(REFLECTION_PROMPT + '\n\nChapter:\n' + chapter);

  // 5. Store reflection
  await reflectionsService.create({
    job_id: context.jobId,
    agent_type: 'author',
    chapter_id: context.chapterId,
    project_id: context.projectId,
    reflection: reflection,
  });

  return chapter;
}
```

#### 10.8 Lesson Promotion Logic

```typescript
// backend/src/services/reflections.ts

export const reflectionsService = {
  /**
   * Analyze reflections and promote high-quality ones to lessons
   */
  async promoteToLessons(agentType: string, minCount: number = 3): Promise<void> {
    // Get unpromoted reflections
    const reflections = db.prepare(`
      SELECT * FROM reflections
      WHERE agent_type = ? AND lesson_id IS NULL
      ORDER BY created_at DESC
      LIMIT 50
    `).all(agentType);

    // Use Claude to analyze reflections and identify patterns
    const analysisPrompt = `
Analyze these agent reflections and identify common patterns, techniques, or pitfalls:

${reflections.map(r => r.reflection).join('\n\n---\n\n')}

Output JSON array of lessons:
[
  {
    "category": "technique|pitfall|pattern|preference|correction",
    "title": "Short title",
    "content": "Detailed lesson",
    "tags": ["tag1", "tag2"]
  }
]

Only include lessons that appear at least ${minCount} times across reflections.
    `;

    const lessonsJson = await claude.generateText(analysisPrompt);
    const lessons = JSON.parse(lessonsJson);

    // Create lessons
    for (const lesson of lessons) {
      await lessonsService.create({
        agent_type: agentType,
        scope: 'global', // or genre-specific
        category: lesson.category,
        title: lesson.title,
        content: lesson.content,
        tags: lesson.tags,
      });
    }
  },
};
```

#### 10.10 Admin UI - Lessons Viewer

```typescript
// app/admin/lessons/page.tsx
'use client';
import { useState, useEffect } from 'react';

export default function LessonsAdminPage() {
  const [lessons, setLessons] = useState([]);
  const [filter, setFilter] = useState({ agent: 'all', scope: 'all' });

  useEffect(() => {
    fetch(`/api/lessons?agent_type=${filter.agent}&scope=${filter.scope}`)
      .then(res => res.json())
      .then(setLessons);
  }, [filter]);

  return (
    <div>
      <h1>Agent Lessons</h1>

      <div>
        <select onChange={e => setFilter({ ...filter, agent: e.target.value })}>
          <option value="all">All Agents</option>
          <option value="author">Author</option>
          <option value="dev-editor">Developmental Editor</option>
          <option value="line-editor">Line Editor</option>
          <option value="continuity-editor">Continuity Editor</option>
          <option value="copy-editor">Copy Editor</option>
        </select>

        <select onChange={e => setFilter({ ...filter, scope: e.target.value })}>
          <option value="all">All Scopes</option>
          <option value="global">Global</option>
          <option value="genre:fantasy">Fantasy</option>
          <option value="genre:sci-fi">Sci-Fi</option>
          {/* ... more genres */}
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Agent</th>
            <th>Category</th>
            <th>Title</th>
            <th>Score</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {lessons.map(lesson => (
            <tr key={lesson.id}>
              <td>{lesson.agent_type}</td>
              <td>{lesson.category}</td>
              <td>{lesson.title}</td>
              <td>{lesson.score}</td>
              <td>
                <button onClick={() => viewLesson(lesson.id)}>View</button>
                <button onClick={() => deleteLesson(lesson.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Token Overhead Analysis

**Per chapter with learning:**
- Lesson retrieval: 10 lessons × ~50 tokens = ~500 tokens added to prompt
- Reflection request: ~100 tokens for reflection prompt
- Reflection response: ~200 tokens from agent

**Total overhead:** ~800 tokens per chapter (~4% of 200k context)

**Benefit:** Continuously improving quality with minimal overhead

### Testing Checklist

- [ ] Database migration creates tables successfully
- [ ] Can create lesson via API
- [ ] Can retrieve lessons filtered by agent + genre
- [ ] Author Agent retrieves lessons before generation
- [ ] Author Agent outputs reflection after generation
- [ ] Reflection stored in database
- [ ] Lesson score increments on successful reuse
- [ ] Admin UI displays all lessons
- [ ] Can filter lessons by agent and scope
- [ ] Promotion logic identifies common patterns

---

## Sprint 11: Real-Time Progress UI & Design Overhaul

**Sessions:** 3-4
**Story Points:** 30
**Duration:** 1-2 days
**Dependencies:** Sprint 9 (backend deployment), Sprint 10 (learning system)

### Sprint Goal

Implement real-time progress dashboard with live agent activity and redesign UI to match the modern minimalist aesthetic from design requirements.

### Key Deliverables

- Real-time SSE progress stream
- Modern dashboard with live updates
- Left sidebar navigation (Architect, Bible, Engine, Exports)
- Claude Max session status widget
- Current Activity panel with live streaming
- Agent Ensemble checklist
- Chapter Progress list
- Agent Activity Log
- Story DNA status card
- Ultra-modern, minimalist UI theme

### Tasks

| Task | Points | Priority | Description |
|------|--------|----------|-------------|
| 11.1 SSE Progress Stream | 5 | P0 | `/api/progress/stream` endpoint with Server-Sent Events |
| 11.2 Job Event Emitter | 3 | P0 | Emit events when jobs change state |
| 11.3 Frontend EventSource | 3 | P0 | Subscribe to SSE stream on dashboard mount |
| 11.4 UI Theme System | 3 | P0 | Light theme with modern color palette |
| 11.5 Left Sidebar Navigation | 3 | P0 | Architect, Bible, Engine, Exports icons |
| 11.6 Claude Max Status Widget | 3 | P0 | Circular timer showing reset time |
| 11.7 Current Activity Panel | 5 | P0 | Live text streaming window + agent checklist |
| 11.8 Chapter Progress List | 3 | P1 | Individual chapter status with progress bars |
| 11.9 Agent Activity Log | 2 | P1 | Scrolling log with timestamps |
| 11.10 Story DNA Card | 2 | P1 | Small status card showing genre/tone |
| 11.11 Overall Progress Bar | 2 | P1 | Total completion with ETA |

**Progress:** 0 / 30 points (0%)

### Success Criteria

- [ ] SSE stream sends events on job state changes
- [ ] Frontend receives real-time updates
- [ ] Dashboard updates without page refresh
- [ ] Light-themed sidebar with navigation icons
- [ ] Claude Max status shows "Reset in 2h 14m" format
- [ ] Current Activity panel shows live chapter text
- [ ] Agent checklist shows: Author (Complete), Dev (Running), Line (Waiting)
- [ ] Chapter list shows individual progress
- [ ] Activity log scrolls automatically
- [ ] Story DNA card shows genre and tone
- [ ] Overall progress bar accurate
- [ ] UI matches design requirements (minimalist, ultra-modern)

### Implementation Details

#### 11.1 SSE Progress Stream

```typescript
// backend/src/routes/progress.ts
import express from 'express';
import { EventEmitter } from 'events';

const router = express.Router();
export const progressEmitter = new EventEmitter();

router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial state
  sendEvent('init', { message: 'Connected to progress stream' });

  // Listen for job updates
  const jobUpdateHandler = (job: any) => {
    sendEvent('job_update', job);
  };

  const chapterCompleteHandler = (chapter: any) => {
    sendEvent('chapter_complete', chapter);
  };

  progressEmitter.on('job:update', jobUpdateHandler);
  progressEmitter.on('chapter:complete', chapterCompleteHandler);

  // Cleanup on disconnect
  req.on('close', () => {
    progressEmitter.off('job:update', jobUpdateHandler);
    progressEmitter.off('chapter:complete', chapterCompleteHandler);
    res.end();
  });
});

export default router;
```

#### 11.2 Job Event Emitter

Update job queue worker to emit events:

```typescript
// backend/src/queue/worker.ts
import { progressEmitter } from '../routes/progress.js';

async function processJob(job: Job): Promise<void> {
  // Update job status
  job.status = 'running';
  updateJob(job);

  // Emit event
  progressEmitter.emit('job:update', {
    id: job.id,
    type: job.type,
    status: 'running',
    target_id: job.target_id,
    timestamp: new Date().toISOString(),
  });

  // ... process job

  // Emit completion
  progressEmitter.emit('job:update', {
    id: job.id,
    type: job.type,
    status: 'completed',
    target_id: job.target_id,
    timestamp: new Date().toISOString(),
  });
}
```

#### 11.3 Frontend EventSource

```typescript
// app/lib/progress-stream.ts
export function useProgressStream() {
  const [events, setEvents] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/api/progress/stream`);

    eventSource.addEventListener('init', () => {
      setConnected(true);
    });

    eventSource.addEventListener('job_update', (e) => {
      const job = JSON.parse(e.data);
      setEvents(prev => [...prev, job]);
    });

    eventSource.addEventListener('chapter_complete', (e) => {
      const chapter = JSON.parse(e.data);
      // Update chapter state
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return { events, connected };
}
```

#### 11.4-11.11 UI Components

Design system based on requirements:

**Theme:**
```typescript
// app/lib/theme.ts
export const theme = {
  colors: {
    background: '#FAFAFA',      // Light background
    surface: '#FFFFFF',         // Card background
    border: '#E0E0E0',          // Borders
    text: '#212121',            // Primary text
    textSecondary: '#757575',   // Secondary text
    primary: '#667eea',         // Primary accent (purple-blue)
    primaryDark: '#764ba2',     // Dark accent
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.08)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 25px rgba(0,0,0,0.12)',
  },
};
```

**Layout:**
```typescript
// app/projects/[id]/layout.tsx
export default function ProjectLayout({ children }) {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left Sidebar */}
      <aside style={{
        width: '240px',
        background: theme.colors.surface,
        borderRight: `1px solid ${theme.colors.border}`,
        padding: '1rem',
      }}>
        <nav>
          <NavItem icon="🏗️" label="Architect" href="/architect" />
          <NavItem icon="📖" label="Bible" href="/bible" />
          <NavItem icon="⚙️" label="Engine" href="/engine" />
          <NavItem icon="📦" label="Exports" href="/exports" />
        </nav>

        <ClaudeMaxStatus />
        <StoryDNACard />
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
```

**Claude Max Status Widget:**
```typescript
// app/components/ClaudeMaxStatus.tsx
export function ClaudeMaxStatus() {
  const { sessionStatus } = useProgressStream();

  const timeRemaining = sessionStatus?.timeRemaining || '0h 0m';
  const percentage = calculatePercentage(sessionStatus);

  return (
    <div style={{
      background: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '12px',
      padding: '1rem',
      marginTop: 'auto',
    }}>
      <h3 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
        Claude Max Status
      </h3>

      {/* Circular Progress */}
      <CircularProgress percentage={percentage} />

      <p style={{ fontSize: '0.75rem', color: theme.colors.textSecondary }}>
        Reset in {timeRemaining}
      </p>
    </div>
  );
}
```

**Current Activity Panel:**
```typescript
// app/components/CurrentActivity.tsx
export function CurrentActivity() {
  const { currentJob, events } = useProgressStream();

  return (
    <div style={{
      background: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '12px',
      padding: '1.5rem',
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: '1.5rem',
    }}>
      {/* Left: Live Text Streaming */}
      <div>
        <h3>Chapter {currentJob?.chapterNumber} - Live Preview</h3>
        <div style={{
          background: '#F5F5F5',
          borderRadius: '8px',
          padding: '1rem',
          height: '400px',
          overflow: 'auto',
          fontFamily: 'Georgia, serif',
          fontSize: '0.9rem',
          lineHeight: 1.6,
        }}>
          {currentJob?.liveText || 'Waiting for generation...'}
        </div>
      </div>

      {/* Right: Agent Ensemble Checklist */}
      <div>
        <h3>Agent Ensemble</h3>
        <AgentChecklist
          agents={[
            { name: 'Author', status: 'completed' },
            { name: 'Developmental', status: 'running' },
            { name: 'Line', status: 'waiting' },
            { name: 'Continuity', status: 'waiting' },
            { name: 'Copy', status: 'waiting' },
          ]}
        />
      </div>
    </div>
  );
}
```

**Agent Checklist:**
```typescript
// app/components/AgentChecklist.tsx
export function AgentChecklist({ agents }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {agents.map(agent => (
        <li key={agent.name} style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.75rem',
          borderBottom: `1px solid ${theme.colors.border}`,
        }}>
          <StatusIcon status={agent.status} />
          <span style={{ marginLeft: '0.5rem' }}>{agent.name}</span>
        </li>
      ))}
    </ul>
  );
}

function StatusIcon({ status }) {
  const icons = {
    completed: '✅',
    running: '🔄',
    waiting: '⏳',
    failed: '❌',
  };
  return <span>{icons[status]}</span>;
}
```

**Chapter Progress List:**
```typescript
// app/components/ChapterProgressList.tsx
export function ChapterProgressList({ chapters }) {
  return (
    <div style={{
      background: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '12px',
      padding: '1.5rem',
    }}>
      <h3>Chapter Progress</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {chapters.map(chapter => (
          <li key={chapter.id} style={{
            padding: '0.75rem 0',
            borderBottom: `1px solid ${theme.colors.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Chapter {chapter.number}: {chapter.title}</span>
              <span style={{ color: theme.colors.textSecondary }}>
                {chapter.status}
              </span>
            </div>
            <ProgressBar percentage={chapter.progress} />
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Design Requirements Compliance

| Requirement | Implementation |
|-------------|----------------|
| Light-themed sidebar | ✅ `background: '#FAFAFA'` |
| Navigation icons | ✅ Architect, Bible, Engine, Exports |
| Claude Max Status | ✅ Circular timer with reset countdown |
| Job Queue | ✅ Shows pending chapter count |
| Current Chapter module | ✅ Live streaming + agent checklist |
| Story DNA card | ✅ Shows genre/tone |
| Minimalist aesthetic | ✅ Clean borders, subtle shadows |
| Ultra-modern typography | ✅ System fonts, proper hierarchy |

### Testing Checklist

- [ ] SSE connection established on page load
- [ ] Events received when jobs update
- [ ] Dashboard updates without refresh
- [ ] Sidebar navigation works
- [ ] Claude Max timer counts down correctly
- [ ] Live text appears during generation
- [ ] Agent checklist updates in real-time
- [ ] Chapter progress shows accurate percentages
- [ ] Activity log scrolls automatically
- [ ] UI looks modern and minimalist
- [ ] All colors match theme
- [ ] Responsive on different screen sizes

---

## Cross-Sprint Integration

### Sprint 9 → Sprint 10

After Sprint 9 completes:
- Backend is deployed and accessible
- Protected routes require authentication
- Frontend can make authenticated API calls

Sprint 10 can then:
- Add lessons/reflections tables via migration
- Expose lesson APIs (already protected by auth)
- Admin UI accessible only when authenticated

### Sprint 10 → Sprint 11

After Sprint 10 completes:
- Agents are generating reflections
- Lessons being stored and retrieved
- Learning system operational

Sprint 11 can then:
- Show agent reflections in activity log
- Display lesson count in admin dashboard
- Real-time updates include reflection status

---

## Risk Register

| Sprint | Risk | Likelihood | Impact | Mitigation |
|--------|------|------------|--------|------------|
| Sprint 9 | Railway volume sharing fails | Low | High | Test volume mounting early; fallback to separate DBs |
| Sprint 9 | JWT secret leaked | Low | Critical | Use Railway secrets; never commit to git |
| Sprint 9 | CORS misconfiguration | Medium | High | Test API calls from deployed frontend immediately |
| Sprint 10 | Lesson retrieval too slow | Medium | Medium | Index on agent_type + scope; limit to 10 lessons |
| Sprint 10 | Reflection quality poor | Medium | Medium | Iterative prompt engineering; manual review initially |
| Sprint 10 | Token overhead too high | Low | Medium | Monitor context sizes; prune lessons aggressively |
| Sprint 11 | SSE connection drops | Medium | Medium | Auto-reconnect with exponential backoff |
| Sprint 11 | Live streaming lag | Low | Low | Use chunked responses; buffer on frontend |
| Sprint 11 | UI performance issues | Low | Medium | Virtualize long chapter lists; debounce updates |

---

## Definition of Done (All Sprints)

Each sprint is complete when:

- [ ] All P0 tasks completed
- [ ] Success criteria met
- [ ] Backend changes deployed to Railway
- [ ] Frontend changes deployed to Railway
- [ ] End-to-end testing passed
- [ ] No critical bugs
- [ ] Documentation updated
- [ ] Git commits with clear messages
- [ ] Ready for next sprint

---

## Deployment Checklist

### Sprint 9 Deployment

**Backend:**
1. Create Railway service `novelforge-backend`
2. Link to GitHub repo
3. Set root directory to `/backend`
4. Configure build command: `npm install && npm run build`
5. Configure start command: `npm start`
6. Add environment variables:
   - `DATABASE_PATH=/data/novelforge.db`
   - `ANTHROPIC_API_KEY=<secret>`
   - `JWT_SECRET=<random-64-char-string>`
   - `OWNER_PASSWORD_HASH=<bcrypt-hash-of-password>`
   - `FRONTEND_URL=https://novelforge-web.up.railway.app`
   - `PORT=3001`
7. Mount `novelforge_data` volume to `/data`
8. Deploy and verify health endpoint

**Frontend:**
1. Add environment variable to existing service:
   - `NEXT_PUBLIC_API_URL=https://novelforge-backend.up.railway.app`
2. Redeploy
3. Verify API calls reach backend

**Testing:**
1. Visit frontend URL
2. Click "Sign In"
3. Enter password
4. Verify redirect to `/projects`
5. Verify authenticated API calls work

### Sprint 10 Deployment

**Backend:**
1. Run migration: `npm run migrate` (or auto-run on startup)
2. Verify tables created: `lessons`, `reflections`
3. Deploy updated backend code
4. Test lesson creation via API

**Frontend:**
1. Deploy admin UI for lessons
2. Verify lessons page accessible at `/admin/lessons`

**Testing:**
1. Generate a chapter
2. Verify reflection stored in database
3. Check lesson retrieval before next chapter
4. View lessons in admin UI

### Sprint 11 Deployment

**Backend:**
1. Deploy SSE endpoint
2. Verify event emission on job updates

**Frontend:**
1. Deploy new dashboard UI
2. Verify SSE connection established
3. Test real-time updates

**Testing:**
1. Start chapter generation
2. Watch dashboard update in real-time
3. Verify agent checklist updates
4. Verify chapter progress accurate

---

## Session Budget

| Sprint | Planned Sessions | Complexity | Notes |
|--------|-----------------|------------|-------|
| Sprint 9 | 1-2 | Medium | Railway deployment straightforward; auth simple |
| Sprint 10 | 2-3 | High | Learning system complex; prompt engineering needed |
| Sprint 11 | 1-2 | Medium | SSE simple; UI work time-consuming but straightforward |
| **TOTAL** | **4-7** | | With Max 5x: 2 days. With Max 20x: 1 day |

---

## Success Metrics

### Sprint 9

- [ ] Backend health endpoint returns 200
- [ ] 100% of API calls from frontend succeed
- [ ] Login success rate: 100% for valid password
- [ ] Token expiration works correctly

### Sprint 10

- [ ] Lessons stored: >0 after first chapter
- [ ] Reflections stored: 1 per agent per chapter
- [ ] Lesson retrieval time: <100ms
- [ ] Agent quality improvement visible by Chapter 10

### Sprint 11

- [ ] SSE connection uptime: >99%
- [ ] Dashboard update latency: <500ms
- [ ] UI renders in <2 seconds
- [ ] No console errors in browser

---

## Post-Sprint 11 Roadmap

After completing Sprints 9-11, NovelForge will be production-ready with:
- Deployed backend and frontend
- Single-user authentication
- Self-improving agents
- Real-time progress dashboard
- Modern UI

**Future enhancements (beyond Sprint 11):**

1. **Multi-user support** (15 points)
   - User registration and accounts
   - Project ownership
   - Sharing and collaboration

2. **Payment integration** (13 points)
   - Stripe subscription
   - Usage-based billing
   - Free tier limits

3. **Advanced editing** (20 points)
   - Manual chapter editing
   - Version control for chapters
   - Diff view for agent edits

4. **Genre templates** (10 points)
   - Pre-built story structures per genre
   - Genre-specific prompts
   - Style guides

5. **Export enhancements** (8 points)
   - ePub format
   - Audiobook script format
   - Publishing-ready formatting

---

## Appendices

### A. Environment Variables Reference

**Backend (`novelforge-backend` service):**
```env
DATABASE_PATH=/data/novelforge.db
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=<64-char-random-string>
OWNER_PASSWORD_HASH=$2b$10$...
FRONTEND_URL=https://novelforge-web.up.railway.app
PORT=3001
NODE_ENV=production
```

**Frontend (`novelforge-web` service):**
```env
NEXT_PUBLIC_API_URL=https://novelforge-backend.up.railway.app
NODE_ENV=production
```

### B. Database Migration Order

1. `001_initial_schema.sql` (Sprint 1)
2. `002_outlines.sql` (Sprint 4)
3. `003_agent_learning.sql` (Sprint 10)

### C. API Endpoints

**Authentication:**
- `POST /api/auth/login` - Login with password

**Lessons:**
- `GET /api/lessons` - Query lessons
- `POST /api/lessons` - Create lesson
- `PATCH /api/lessons/:id/score` - Update score
- `DELETE /api/lessons/:id` - Delete lesson

**Reflections:**
- `GET /api/reflections` - Query reflections
- `POST /api/reflections` - Create reflection

**Progress:**
- `GET /api/progress/stream` - SSE stream

**Existing (from Sprints 1-8):**
- `GET /health` - Health check
- `GET /api/queue/stats` - Queue statistics
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- ... (all other project/chapter/export endpoints)

---

**Last Updated:** 2026-01-24
**Version:** 1.0
**Status:** Ready for implementation

---

## Quick Start Guide

To implement these sprints:

1. **Sprint 9 first**: Deploy backend, get authentication working
2. **Sprint 10 second**: Add learning system while testing on localhost
3. **Sprint 11 third**: Polish UI and add real-time features

Each sprint builds on the previous, so order matters.

**Estimated Total Time:** 4-7 Claude Max sessions (2-3 days calendar time)

**Go/No-Go Decision Points:**
- After Sprint 9: Can you log in and access backend? If no, debug before continuing.
- After Sprint 10: Are reflections being stored? If no, debug prompts before continuing.
- After Sprint 11: Does SSE stream work? If no, consider polling fallback.

Good luck!
