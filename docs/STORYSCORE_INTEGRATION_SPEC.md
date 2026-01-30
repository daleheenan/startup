# StoryScore Integration Specification

## Document Information

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Status | Draft |
| Created | 2025-01-30 |
| Author | Technical Architecture |

---

## 1. Executive Summary

This document specifies how the **StoryScore** application can integrate with the existing **NovelForge** backend infrastructure. StoryScore is envisioned as a separate story analysis/scoring service that submits jobs and receives results asynchronously.

### 1.1 Key Decision

**Recommended Approach**: Shared Backend with Dedicated Routes

The NovelForge backend already contains a production-ready job queue system with:
- Persistent job storage (SQLite)
- Checkpoint-based recovery
- Rate limit handling
- Real-time progress via Server-Sent Events (SSE)
- Retry logic with configurable attempts

This infrastructure can be extended for StoryScore with minimal modifications.

---

## 2. Existing Infrastructure Analysis

### 2.1 Job Queue System

**Location**: `backend/src/queue/`

| File | Purpose |
|------|---------|
| `worker.ts` | Main queue worker - processes jobs sequentially |
| `checkpoint.ts` | Checkpoint manager for crash recovery |
| `rate-limit-handler.ts` | Handles Claude API rate limits |

**Current Job Types** (35+):
```typescript
type JobType =
  | 'generate_chapter'
  | 'dev_edit'
  | 'line_edit'
  | 'copy_edit'
  | 'proofread'
  | 'veb_beta_swarm'
  | 'veb_ruthless_editor'
  | 'veb_market_analyst'
  | 'coherence_check'
  | 'originality_check'
  // ... and more
```

**Job Lifecycle**:
```
pending → running → completed
                 ↘ failed (after 3 retries)
```

### 2.2 Real-Time Progress (SSE)

**Location**: `backend/src/routes/progress.ts`

**Event Types**:
| Event | Description |
|-------|-------------|
| `job:update` | Job status changes |
| `chapter:complete` | Chapter finished |
| `chapter:progress` | Generation progress |
| `queue:stats` | Queue statistics |

**Usage**:
```typescript
import { progressEmitter } from '../routes/progress.js';

// Emit an event
progressEmitter.emit('job:update', {
  jobId: 'xxx',
  status: 'completed',
  result: { /* ... */ }
});
```

### 2.3 Configuration

**Queue Config** (`backend/src/config/queue.config.ts`):
```typescript
export const QueueConfig = {
  POLL_INTERVAL_MS: 1000,           // Check for new jobs every second
  GRACEFUL_SHUTDOWN_TIMEOUT_MS: 60000,  // Wait 60s for shutdown
  MAX_JOB_RETRY_ATTEMPTS: 3,        // Retry failed jobs 3 times
  RATE_LIMIT_FALLBACK_WAIT_MS: 30 * 60 * 1000,  // 30 min fallback
};
```

**SSE Config** (`backend/src/config/sse.config.ts`):
```typescript
export const SSEConfig = {
  MAX_LISTENERS: 100,
  HIGH_CONNECTION_WARNING_THRESHOLD: 90,
  CONNECTION_MONITOR_INTERVAL_MS: 5 * 60 * 1000,
  CONNECTION_FORCE_CLOSE_TIMEOUT_MS: 60 * 60 * 1000,
};
```

### 2.4 Database Schema

**jobs Table**:
```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  checkpoint TEXT,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT
);
```

---

## 3. StoryScore Integration Architecture

### 3.1 High-Level Flow

```
┌─────────────────────┐
│  StoryScore         │
│  Frontend           │
│  (Separate App)     │
└──────────┬──────────┘
           │
           │ 1. POST /api/story-scores/analyse
           ▼
┌─────────────────────┐
│  NovelForge         │
│  Backend            │
│  (Shared)           │
├─────────────────────┤
│  • Creates job      │
│  • Returns jobId    │
└──────────┬──────────┘
           │
           │ 2. SSE connection for updates
           │
┌──────────┴──────────┐
│  Queue Worker       │
│  (Existing)         │
├─────────────────────┤
│  • Picks up job     │
│  • Calls Claude     │
│  • Saves results    │
│  • Emits progress   │
└─────────────────────┘
```

### 3.2 New Components Required

#### 3.2.1 New Job Types

Add to `backend/src/shared/types/index.ts`:

```typescript
export type JobType =
  // ... existing types ...
  // StoryScore job types
  | 'story_score_full_analysis'      // Complete book analysis
  | 'story_score_chapter_analysis'   // Single chapter analysis
  | 'story_score_quick_scan'         // Fast high-level assessment
  | 'story_score_comparison';        // Compare to genre benchmarks
```

#### 3.2.2 New Routes Module

**Location**: `backend/src/routes/story-scores/`

```
backend/src/routes/story-scores/
├── index.ts          # Router composition
├── analysis.ts       # Submit analysis jobs
├── results.ts        # Retrieve results
└── webhooks.ts       # Optional webhook callbacks
```

**index.ts**:
```typescript
import { Router } from 'express';
import analysisRouter from './analysis.js';
import resultsRouter from './results.js';
import webhooksRouter from './webhooks.js';

const router = Router();
router.use('/', analysisRouter);
router.use('/', resultsRouter);
router.use('/', webhooksRouter);

export default router;
```

**analysis.ts**:
```typescript
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { QueueWorker } from '../../queue/worker.js';
import { randomUUID } from 'crypto';
import db from '../../db/connection.js';

const router = Router();

/**
 * POST /api/story-scores/analyse
 * Submit a story for analysis
 */
router.post('/analyse', requireAuth, async (req, res) => {
  const { contentType, contentId, analysisType, webhookUrl } = req.body;

  // Validate input
  if (!contentType || !contentId) {
    return res.status(400).json({ error: 'contentType and contentId required' });
  }

  // Create analysis record
  const analysisId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO story_score_analyses (id, content_type, content_id, analysis_type, webhook_url, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `).run(analysisId, contentType, contentId, analysisType || 'full', webhookUrl || null, now);

  // Create job
  const jobId = QueueWorker.createJob('story_score_full_analysis', analysisId);

  res.status(202).json({
    analysisId,
    jobId,
    status: 'pending',
    message: 'Analysis queued. Connect to SSE stream for updates.',
    sseEndpoint: '/api/progress/stream',
  });
});

export default router;
```

#### 3.2.3 New Service

**Location**: `backend/src/services/story-score.service.ts`

```typescript
import { claudeService } from './claude.service.js';
import { metricsService } from './metrics.service.js';
import db from '../db/connection.js';
import { AI_REQUEST_TYPES } from '../constants/ai-request-types.js';

export interface StoryScoreResult {
  overallScore: number;  // 0-100
  categories: {
    plot: CategoryScore;
    character: CategoryScore;
    pacing: CategoryScore;
    prose: CategoryScore;
    marketability: CategoryScore;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  genreComparison: {
    genre: string;
    percentile: number;  // Where this story ranks vs genre
    benchmarkNotes: string;
  };
  detailedAnalysis: {
    plotAnalysis: PlotAnalysisResult;
    characterAnalysis: CharacterAnalysisResult;
    pacingAnalysis: PacingAnalysisResult;
    proseAnalysis: ProseAnalysisResult;
  };
  tokenUsage: {
    input: number;
    output: number;
  };
}

interface CategoryScore {
  score: number;
  subscores: Record<string, number>;
  notes: string;
}

export class StoryScoreService {
  /**
   * Run full story analysis
   */
  async analyseStory(analysisId: string): Promise<StoryScoreResult> {
    // Fetch content based on analysis record
    const analysis = db.prepare(`
      SELECT * FROM story_score_analyses WHERE id = ?
    `).get(analysisId) as any;

    if (!analysis) {
      throw new Error('Analysis not found');
    }

    // Get content (book, chapter, or raw text)
    const content = await this.fetchContent(analysis.content_type, analysis.content_id);

    // Run analysis with Claude
    const result = await this.runAnalysis(content, analysis.analysis_type);

    // Save results
    this.saveResults(analysisId, result);

    return result;
  }

  private async fetchContent(contentType: string, contentId: string): Promise<string> {
    switch (contentType) {
      case 'book':
        return this.fetchBookContent(contentId);
      case 'chapter':
        return this.fetchChapterContent(contentId);
      case 'raw':
        return this.fetchRawContent(contentId);
      default:
        throw new Error(`Unknown content type: ${contentType}`);
    }
  }

  private async runAnalysis(content: string, analysisType: string): Promise<StoryScoreResult> {
    // Implementation using Claude API
    // ...
  }

  private saveResults(analysisId: string, result: StoryScoreResult): void {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE story_score_analyses
      SET status = 'completed',
          result = ?,
          overall_score = ?,
          input_tokens = ?,
          output_tokens = ?,
          completed_at = ?
      WHERE id = ?
    `).run(
      JSON.stringify(result),
      result.overallScore,
      result.tokenUsage.input,
      result.tokenUsage.output,
      now,
      analysisId
    );
  }
}

export const storyScoreService = new StoryScoreService();
```

#### 3.2.4 Queue Worker Handler

Add to `backend/src/queue/worker.ts`:

```typescript
// In executeJob switch statement:
case 'story_score_full_analysis':
  return await this.storyScoreFullAnalysis(job);

// New method:
private async storyScoreFullAnalysis(job: Job): Promise<void> {
  const analysisId = job.target_id;
  logger.info({ analysisId }, 'story_score_full_analysis: Starting');

  try {
    const { storyScoreService } = await import('../services/story-score.service.js');

    checkpointManager.saveCheckpoint(job.id, 'started', { analysisId });

    // Update status to processing
    db.prepare(`UPDATE story_score_analyses SET status = 'processing' WHERE id = ?`).run(analysisId);

    // Emit progress
    progressEmitter.emit('job:update', {
      jobId: job.id,
      type: 'story_score_full_analysis',
      status: 'processing',
      analysisId,
    });

    // Run analysis
    const result = await storyScoreService.analyseStory(analysisId);

    // Emit completion
    progressEmitter.emit('job:update', {
      jobId: job.id,
      type: 'story_score_full_analysis',
      status: 'completed',
      analysisId,
      overallScore: result.overallScore,
    });

    // Check for webhook
    const analysis = db.prepare(`SELECT webhook_url FROM story_score_analyses WHERE id = ?`).get(analysisId) as any;
    if (analysis?.webhook_url) {
      await this.sendWebhook(analysis.webhook_url, {
        event: 'analysis_completed',
        analysisId,
        result,
      });
    }

    checkpointManager.saveCheckpoint(job.id, 'completed', { analysisId });
  } catch (error) {
    logger.error({ error, analysisId }, 'story_score_full_analysis: Error');

    // Update status to failed
    db.prepare(`UPDATE story_score_analyses SET status = 'failed', error = ? WHERE id = ?`).run(
      error instanceof Error ? error.message : 'Unknown error',
      analysisId
    );

    throw error;
  }
}
```

#### 3.2.5 New Database Tables

**Migration**: `backend/src/db/migrations/xxx_story_score_tables.sql`

```sql
-- Story score analysis requests
CREATE TABLE IF NOT EXISTS story_score_analyses (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,  -- 'book', 'chapter', 'raw'
  content_id TEXT NOT NULL,
  analysis_type TEXT DEFAULT 'full',  -- 'full', 'quick', 'comparison'
  webhook_url TEXT,
  status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  result TEXT,  -- JSON result
  overall_score INTEGER,
  error TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

-- Raw content submissions (for external content)
CREATE TABLE IF NOT EXISTS story_score_submissions (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT NOT NULL,
  genre TEXT,
  word_count INTEGER,
  metadata TEXT,  -- JSON for additional context
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Historical score trends
CREATE TABLE IF NOT EXISTS story_score_history (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  score_snapshot TEXT,  -- JSON of scores at this point
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_id) REFERENCES story_score_analyses(id)
);

CREATE INDEX idx_story_score_analyses_content ON story_score_analyses(content_type, content_id);
CREATE INDEX idx_story_score_analyses_status ON story_score_analyses(status);
CREATE INDEX idx_story_score_history_content ON story_score_history(content_id);
```

---

## 4. API Specification

### 4.1 Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/story-scores/analyse` | Submit content for analysis |
| POST | `/api/story-scores/submit` | Submit raw text content |
| GET | `/api/story-scores/:analysisId` | Get analysis status/results |
| GET | `/api/story-scores/:analysisId/detailed` | Get detailed breakdown |
| GET | `/api/story-scores/history/:contentId` | Get score history |
| DELETE | `/api/story-scores/:analysisId` | Cancel pending analysis |

### 4.2 Request/Response Examples

**Submit Analysis**:
```http
POST /api/story-scores/analyse
Authorization: Bearer <token>
Content-Type: application/json

{
  "contentType": "book",
  "contentId": "book-uuid-here",
  "analysisType": "full",
  "webhookUrl": "https://storyscore.app/webhooks/results"  // Optional
}
```

**Response**:
```json
{
  "analysisId": "analysis-uuid",
  "jobId": "job-uuid",
  "status": "pending",
  "message": "Analysis queued. Connect to SSE stream for updates.",
  "sseEndpoint": "/api/progress/stream"
}
```

**Get Results**:
```http
GET /api/story-scores/analysis-uuid
Authorization: Bearer <token>
```

**Response**:
```json
{
  "analysisId": "analysis-uuid",
  "status": "completed",
  "completedAt": "2025-01-30T10:30:00Z",
  "result": {
    "overallScore": 78,
    "categories": {
      "plot": { "score": 82, "subscores": { "structure": 85, "originality": 79 }, "notes": "..." },
      "character": { "score": 75, "subscores": { "depth": 72, "arcs": 78 }, "notes": "..." },
      "pacing": { "score": 80, "subscores": { "tension": 82, "flow": 78 }, "notes": "..." },
      "prose": { "score": 76, "subscores": { "voice": 80, "clarity": 72 }, "notes": "..." },
      "marketability": { "score": 74, "subscores": { "genre_fit": 80, "hooks": 68 }, "notes": "..." }
    },
    "strengths": [
      "Strong narrative voice",
      "Well-paced action sequences",
      "Compelling protagonist arc"
    ],
    "weaknesses": [
      "Secondary characters underdeveloped",
      "Middle section drags slightly",
      "Some dialogue feels stilted"
    ],
    "recommendations": [
      "Expand secondary character backstories",
      "Tighten chapters 8-12 by 15%",
      "Add more subtext to key dialogue scenes"
    ]
  },
  "tokenUsage": {
    "input": 45000,
    "output": 2500
  }
}
```

### 4.3 SSE Events

StoryScore-specific events via the existing SSE stream:

```javascript
// Client-side
const eventSource = new EventSource('/api/progress/stream?token=<jwt>');

eventSource.addEventListener('story_score:started', (e) => {
  const data = JSON.parse(e.data);
  // { analysisId, contentType, estimatedTime }
});

eventSource.addEventListener('story_score:progress', (e) => {
  const data = JSON.parse(e.data);
  // { analysisId, step, progress, message }
  // step: 'fetching_content' | 'analysing_plot' | 'analysing_characters' | ...
  // progress: 0-100
});

eventSource.addEventListener('story_score:completed', (e) => {
  const data = JSON.parse(e.data);
  // { analysisId, overallScore, completedAt }
});

eventSource.addEventListener('story_score:failed', (e) => {
  const data = JSON.parse(e.data);
  // { analysisId, error }
});
```

---

## 5. Authentication & Authorisation

### 5.1 Shared Auth Strategy

StoryScore can use the same JWT authentication system as NovelForge:

```typescript
// Existing middleware
import { requireAuth } from '../../middleware/auth.js';

// Apply to StoryScore routes
router.use(requireAuth);
```

### 5.2 Separate API Keys (Optional)

For B2B/API access, add API key support:

```typescript
// New middleware: backend/src/middleware/api-key.ts
import db from '../db/connection.js';

export const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const key = db.prepare(`
    SELECT * FROM api_keys WHERE key = ? AND is_active = 1
  `).get(apiKey);

  if (!key) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.apiKeyOwner = key.user_id;
  next();
};
```

---

## 6. Deployment Options

### 6.1 Option A: Single Deployment (Recommended)

Both NovelForge and StoryScore frontends connect to the same backend:

```
┌─────────────────┐     ┌─────────────────┐
│  NovelForge     │     │  StoryScore     │
│  Frontend       │     │  Frontend       │
│  (Private)      │     │  (Public/Separate) │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Shared Backend       │
         │  (Express + SQLite)   │
         │  - NovelForge routes  │
         │  - StoryScore routes  │
         └───────────────────────┘
```

**Pros**:
- Single deployment to maintain
- Shared infrastructure (queue, auth, database)
- Lower hosting costs
- Simpler architecture

**Cons**:
- Downtime affects both services
- Must manage route namespacing

### 6.2 Option B: Separate Microservices

StoryScore as independent service with its own database:

```
┌─────────────────┐     ┌─────────────────┐
│  NovelForge     │     │  StoryScore     │
│  Frontend       │     │  Frontend       │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  NovelForge     │     │  StoryScore     │
│  Backend        │     │  Backend        │
└─────────────────┘     └────────┬────────┘
                                 │
                                 │ Internal API
                                 ▼
                        ┌─────────────────┐
                        │  Shared Queue   │
                        │  Service        │
                        └─────────────────┘
```

**Pros**:
- Independent scaling
- Isolated failures
- Cleaner separation of concerns

**Cons**:
- More complex infrastructure
- Data synchronisation challenges
- Higher hosting costs

---

## 7. Cost Considerations

### 7.1 Token Usage Estimates

| Analysis Type | Est. Input Tokens | Est. Output Tokens | Est. Cost (Claude Sonnet) |
|--------------|-------------------|--------------------|-----------------------------|
| Quick Scan | 10,000 | 500 | ~$0.04 |
| Chapter Analysis | 20,000 | 1,500 | ~$0.10 |
| Full Book (80k words) | 120,000 | 5,000 | ~$0.55 |
| Comparison Analysis | 50,000 | 2,000 | ~$0.22 |

### 7.2 Rate Limiting

The existing rate limit handler will protect against Claude API limits:

```typescript
// Existing: backend/src/queue/rate-limit-handler.ts
// Auto-pauses queue when rate limited
// Resumes after cooldown period
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
// backend/src/services/__tests__/story-score.service.test.ts
describe('StoryScoreService', () => {
  describe('analyseStory', () => {
    it('should return valid score structure', async () => {
      const result = await storyScoreService.analyseStory(mockAnalysisId);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.categories).toHaveProperty('plot');
      expect(result.categories).toHaveProperty('character');
    });

    it('should handle missing content gracefully', async () => {
      await expect(storyScoreService.analyseStory('invalid-id'))
        .rejects.toThrow('Analysis not found');
    });
  });
});
```

### 8.2 Integration Tests

```typescript
// backend/src/routes/__tests__/story-scores.test.ts
describe('POST /api/story-scores/analyse', () => {
  it('should create analysis job and return 202', async () => {
    const response = await request(app)
      .post('/api/story-scores/analyse')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        contentType: 'book',
        contentId: testBookId,
      });

    expect(response.status).toBe(202);
    expect(response.body).toHaveProperty('analysisId');
    expect(response.body).toHaveProperty('jobId');
  });
});
```

---

## 9. Security Considerations

### 9.1 Input Validation

```typescript
import { z } from 'zod';

const AnalyseRequestSchema = z.object({
  contentType: z.enum(['book', 'chapter', 'raw']),
  contentId: z.string().uuid(),
  analysisType: z.enum(['full', 'quick', 'comparison']).optional(),
  webhookUrl: z.string().url().optional(),
});
```

### 9.2 Rate Limiting (API Level)

```typescript
import rateLimit from 'express-rate-limit';

const storyScoreLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many analysis requests, please try again later',
});

router.use('/story-scores', storyScoreLimiter);
```

### 9.3 Webhook Validation

```typescript
// Only allow HTTPS webhooks
if (webhookUrl && !webhookUrl.startsWith('https://')) {
  return res.status(400).json({ error: 'Webhook URL must use HTTPS' });
}
```

---

## 10. Appendices

### 10.1 Alternative Name Suggestions

Since `storyscore.com` is taken, consider these alternatives:

**Score-based**:
- StoryGrade.io
- NarrativeScore.ai
- ProseScore.co
- TaleMetrics.io
- ManuscriptScore.ai

**Analysis-focused**:
- StoryPulse.io
- NarrativeIQ.ai
- ProseAnalytics.co
- StoryLens.io
- ManuscriptMind.ai

**Modern/Tech**:
- Storywise.ai
- ProseAI.io
- NarrativeEngine.ai
- StorySignal.io
- TaleTest.ai

### 10.2 File Locations Summary

| Component | Location |
|-----------|----------|
| Routes | `backend/src/routes/story-scores/` |
| Service | `backend/src/services/story-score.service.ts` |
| Types | `backend/src/shared/types/index.ts` |
| Migration | `backend/src/db/migrations/xxx_story_score_tables.sql` |
| Tests | `backend/src/routes/__tests__/story-scores.test.ts` |
| Config | `backend/src/config/story-score.config.ts` |

### 10.3 Dependencies

No new dependencies required - uses existing:
- Express.js (routing)
- SQLite (database)
- JWT (authentication)
- Anthropic SDK (Claude API)
- EventEmitter (SSE)
