# Unified Analysis Engine Plan

## Document Information

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Status | Draft |
| Created | 2025-01-30 |
| Supersedes | STORYSCORE_INTEGRATION_SPEC.md (partial) |

---

## 1. Executive Summary

This document outlines the plan to consolidate all NovelForge analysis features into a **single Unified Analysis Engine** that serves both NovelForge and StoryScore products. Every AI call will be tracked with clear product attribution, book/version context, and complete token accounting.

### Key Principles

1. **One Engine, Two Products** - All analysis logic lives in one place
2. **Complete Token Tracking** - Every AI call tracked with product, book, version, and request type
3. **Clear Product Attribution** - `novelforge` or `storyscore` tag on every request
4. **Version Awareness** - Analysis results tied to specific book versions
5. **Unified Scoring** - Consistent methodology across both products

---

## 2. Current State Analysis

### Existing Analysis Features (26+ Request Types)

| Category | Features | Current Location |
|----------|----------|------------------|
| **VEB (Editorial Board)** | Beta Swarm, Ruthless Editor, Market Analyst | `veb.service.ts` |
| **Outline Editorial** | Structure, Character Arc, Market Fit | `outline-editorial.service.ts` |
| **Quality Checks** | Coherence, Originality | `coherence.service.ts`, `plagiarism-checker.service.ts` |
| **Structure Validators** | Opening Hook, Tension Arc, Commercial Beats, Character Arc | Individual validator services |
| **Prose Analysis** | Readability, Sentence Variety, Passive Voice, Adverbs | `prose-reports/` |
| **Genre-Specific** | Romance Beats, Thriller Pacing, Sci-Fi Consistency | `*-commercial.service.ts` |

### Current Token Tracking

- **Location**: `metrics.service.ts`
- **Table**: `ai_request_log`
- **Tracks**: request_type, project_id, chapter_id, tokens, costs
- **Missing**: product attribution, book_id, version_id

---

## 3. Unified Engine Architecture

### 3.1 High-Level Design

```
┌─────────────────────┐     ┌─────────────────────┐
│  NovelForge         │     │  StoryScore         │
│  Frontend           │     │  Frontend           │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           │ product: 'novelforge'     │ product: 'storyscore'
           │                           │
           └─────────────┬─────────────┘
                         │
                         ▼
           ┌─────────────────────────────┐
           │  Unified Analysis Engine    │
           │  ─────────────────────────  │
           │  • Single entry point       │
           │  • Product-aware routing    │
           │  • Version-aware analysis   │
           │  • Complete token tracking  │
           └──────────────┬──────────────┘
                          │
           ┌──────────────┼──────────────┐
           │              │              │
           ▼              ▼              ▼
    ┌───────────┐  ┌───────────┐  ┌───────────┐
    │ Editorial │  │ Structure │  │  Genre    │
    │ Modules   │  │ Validators│  │ Analysers │
    └───────────┘  └───────────┘  └───────────┘
```

### 3.2 New Service Structure

```
backend/src/services/analysis-engine/
├── index.ts                    # Main engine export & orchestration
├── types.ts                    # Shared types for all analysis
├── tracking.ts                 # Token & cost tracking with product attribution
├── modules/
│   ├── editorial/
│   │   ├── beta-swarm.ts       # VEB Module A
│   │   ├── ruthless-editor.ts  # VEB Module B
│   │   └── market-analyst.ts   # VEB Module C
│   ├── structure/
│   │   ├── opening-hook.ts
│   │   ├── tension-arc.ts
│   │   ├── character-arc.ts
│   │   └── commercial-beats.ts
│   ├── prose/
│   │   ├── readability.ts
│   │   ├── sentence-variety.ts
│   │   ├── passive-voice.ts
│   │   └── adverbs.ts
│   ├── quality/
│   │   ├── coherence.ts
│   │   └── originality.ts
│   └── genre/
│       ├── romance-beats.ts
│       ├── thriller-pacing.ts
│       └── scifi-consistency.ts
└── scoring/
    ├── category-scores.ts      # Calculate category scores
    ├── overall-score.ts        # Aggregate to single score
    └── benchmarks.ts           # Genre benchmark comparisons
```

### 3.3 Core Types

```typescript
// backend/src/services/analysis-engine/types.ts

export type Product = 'novelforge' | 'storyscore';

export interface AnalysisContext {
  product: Product;
  projectId: string;
  bookId: string;
  versionId: string;           // Book version being analysed
  chapterId?: string;          // For chapter-specific analysis
  userId?: string;             // For StoryScore external users
  analysisId: string;          // Unique ID for this analysis run
}

export interface AnalysisRequest {
  context: AnalysisContext;
  analysisType: AnalysisType;
  options?: AnalysisOptions;
}

export type AnalysisType =
  // Full analyses
  | 'full_manuscript'          // Everything
  | 'quick_scan'               // Fast overview

  // Editorial
  | 'editorial_board'          // All 3 VEB modules
  | 'beta_swarm'
  | 'ruthless_editor'
  | 'market_analyst'

  // Structure
  | 'structure_complete'       // All structure validators
  | 'opening_hook'
  | 'tension_arc'
  | 'character_arc'
  | 'commercial_beats'

  // Prose
  | 'prose_complete'           // All prose analysis
  | 'readability'
  | 'sentence_variety'
  | 'passive_voice'
  | 'adverbs'

  // Quality
  | 'coherence'
  | 'originality'

  // Genre-specific
  | 'romance_beats'
  | 'thriller_pacing'
  | 'scifi_consistency';

export interface AnalysisResult {
  analysisId: string;
  context: AnalysisContext;

  // Unified scoring (StoryScore format)
  overallScore: number;        // 0-100
  categories: CategoryScores;

  // Detailed results by module
  modules: {
    editorial?: EditorialResult;
    structure?: StructureResult;
    prose?: ProseResult;
    quality?: QualityResult;
    genre?: GenreResult;
  };

  // Actionable outputs
  strengths: string[];
  weaknesses: string[];
  recommendations: Recommendation[];

  // Token tracking
  tokenUsage: TokenUsage;

  // Metadata
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface CategoryScores {
  plot: CategoryScore;
  character: CategoryScore;
  pacing: CategoryScore;
  prose: CategoryScore;
  marketability: CategoryScore;
  genre?: CategoryScore;       // Genre-specific if applicable
}

export interface CategoryScore {
  score: number;               // 0-100
  subscores: Record<string, number>;
  notes: string;
  confidence: number;          // 0-1
}

export interface TokenUsage {
  totalInput: number;
  totalOutput: number;
  byModule: Record<string, { input: number; output: number }>;
  estimatedCostUsd: number;
  estimatedCostGbp: number;
}

export interface Recommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  issue: string;
  suggestion: string;
  affectedChapters?: string[];
  estimatedImpact: string;
}
```

---

## 4. Enhanced Token Tracking

### 4.1 Updated Database Schema

```sql
-- Migration: xxx_enhanced_analysis_tracking.sql

-- Enhanced AI request log with product and version tracking
ALTER TABLE ai_request_log ADD COLUMN product TEXT DEFAULT 'novelforge';
ALTER TABLE ai_request_log ADD COLUMN book_id TEXT;
ALTER TABLE ai_request_log ADD COLUMN version_id TEXT;
ALTER TABLE ai_request_log ADD COLUMN analysis_id TEXT;

-- Index for product-based queries
CREATE INDEX idx_ai_request_log_product ON ai_request_log(product);
CREATE INDEX idx_ai_request_log_analysis ON ai_request_log(analysis_id);
CREATE INDEX idx_ai_request_log_book_version ON ai_request_log(book_id, version_id);

-- Analysis runs table (tracks complete analysis sessions)
CREATE TABLE IF NOT EXISTS analysis_runs (
  id TEXT PRIMARY KEY,
  product TEXT NOT NULL,           -- 'novelforge' or 'storyscore'
  project_id TEXT,                 -- NovelForge project (nullable for StoryScore)
  book_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  user_id TEXT,                    -- StoryScore user (nullable for NovelForge)

  analysis_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',   -- pending, running, completed, failed

  -- Aggregated results
  overall_score INTEGER,
  category_scores TEXT,            -- JSON
  result TEXT,                     -- Full JSON result

  -- Token tracking (aggregated from ai_request_log)
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  total_cost_usd DECIMAL DEFAULT 0,
  total_cost_gbp DECIMAL DEFAULT 0,

  -- Timing
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT,
  duration_ms INTEGER,

  error TEXT
);

CREATE INDEX idx_analysis_runs_product ON analysis_runs(product);
CREATE INDEX idx_analysis_runs_book ON analysis_runs(book_id, version_id);
CREATE INDEX idx_analysis_runs_status ON analysis_runs(status);
```

### 4.2 Tracking Service

```typescript
// backend/src/services/analysis-engine/tracking.ts

import { metricsService } from '../metrics.service.js';
import db from '../../db/connection.js';

export interface TrackingContext {
  product: Product;
  analysisId: string;
  projectId?: string;
  bookId: string;
  versionId: string;
  chapterId?: string;
}

export class AnalysisTrackingService {
  /**
   * Log an AI request with full context
   */
  async logRequest(
    context: TrackingContext,
    requestType: string,
    inputTokens: number,
    outputTokens: number,
    success: boolean,
    error?: string
  ): Promise<void> {
    const costUsd = this.calculateCost(inputTokens, outputTokens);
    const costGbp = costUsd * 0.79;

    db.prepare(`
      INSERT INTO ai_request_log (
        id, product, analysis_id, request_type,
        project_id, book_id, version_id, chapter_id,
        input_tokens, output_tokens,
        cost_usd, cost_gbp,
        success, error_message,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      context.product,
      context.analysisId,
      requestType,
      context.projectId || null,
      context.bookId,
      context.versionId,
      context.chapterId || null,
      inputTokens,
      outputTokens,
      costUsd,
      costGbp,
      success ? 1 : 0,
      error || null,
      new Date().toISOString()
    );

    // Update analysis run totals
    this.updateRunTotals(context.analysisId, inputTokens, outputTokens, costUsd, costGbp);
  }

  /**
   * Get token usage by product
   */
  async getUsageByProduct(
    startDate?: string,
    endDate?: string
  ): Promise<Record<Product, TokenSummary>> {
    const rows = db.prepare(`
      SELECT
        product,
        SUM(input_tokens) as total_input,
        SUM(output_tokens) as total_output,
        SUM(cost_usd) as total_cost_usd,
        SUM(cost_gbp) as total_cost_gbp,
        COUNT(*) as request_count
      FROM ai_request_log
      WHERE created_at >= COALESCE(?, '1970-01-01')
        AND created_at <= COALESCE(?, '9999-12-31')
      GROUP BY product
    `).all(startDate, endDate);

    // ... format and return
  }

  /**
   * Get usage breakdown for a specific analysis run
   */
  async getRunDetails(analysisId: string): Promise<AnalysisRunDetails> {
    const run = db.prepare(`
      SELECT * FROM analysis_runs WHERE id = ?
    `).get(analysisId);

    const requests = db.prepare(`
      SELECT * FROM ai_request_log WHERE analysis_id = ? ORDER BY created_at
    `).all(analysisId);

    return {
      ...run,
      requests,
      byModule: this.groupByRequestType(requests)
    };
  }

  private calculateCost(input: number, output: number): number {
    // Claude Opus 4.5 pricing
    const inputCost = (input / 1_000_000) * 15;
    const outputCost = (output / 1_000_000) * 75;
    return inputCost + outputCost;
  }
}

export const analysisTrackingService = new AnalysisTrackingService();
```

---

## 5. API Design

### 5.1 Unified Analysis Endpoints

```typescript
// backend/src/routes/analysis-engine/index.ts

import { Router } from 'express';

const router = Router();

/**
 * POST /api/analysis/run
 * Start a new analysis run
 */
router.post('/run', requireAuth, async (req, res) => {
  const {
    product,           // 'novelforge' | 'storyscore'
    bookId,
    versionId,
    analysisType,      // 'full_manuscript' | 'quick_scan' | specific module
    options
  } = req.body;

  // Validate product
  if (!['novelforge', 'storyscore'].includes(product)) {
    return res.status(400).json({ error: 'Invalid product' });
  }

  // Create analysis run
  const analysisId = randomUUID();

  // Queue the job
  const jobId = QueueWorker.createJob('analysis_engine_run', analysisId, {
    product,
    bookId,
    versionId,
    analysisType,
    options
  });

  res.status(202).json({
    analysisId,
    jobId,
    status: 'pending',
    sseEndpoint: '/api/progress/stream'
  });
});

/**
 * GET /api/analysis/:analysisId
 * Get analysis results
 */
router.get('/:analysisId', requireAuth, async (req, res) => {
  const { analysisId } = req.params;

  const run = db.prepare(`
    SELECT * FROM analysis_runs WHERE id = ?
  `).get(analysisId);

  if (!run) {
    return res.status(404).json({ error: 'Analysis not found' });
  }

  res.json({
    ...run,
    result: run.result ? JSON.parse(run.result) : null,
    categoryScores: run.category_scores ? JSON.parse(run.category_scores) : null
  });
});

/**
 * GET /api/analysis/:analysisId/tokens
 * Get detailed token breakdown for an analysis
 */
router.get('/:analysisId/tokens', requireAuth, async (req, res) => {
  const details = await analysisTrackingService.getRunDetails(req.params.analysisId);
  res.json(details);
});

/**
 * GET /api/analysis/usage
 * Get token usage summary (with product breakdown)
 */
router.get('/usage', requireAuth, async (req, res) => {
  const { startDate, endDate, product } = req.query;

  const usage = await analysisTrackingService.getUsageByProduct(startDate, endDate);

  if (product) {
    return res.json(usage[product]);
  }

  res.json(usage);
});
```

### 5.2 Product-Specific Convenience Routes

```typescript
// NovelForge convenience routes (keep existing patterns)
// backend/src/routes/veb.ts - delegates to analysis engine

router.post('/:projectId/editorial-board', async (req, res) => {
  const { projectId } = req.params;
  const { bookId, versionId } = req.body;

  // Delegate to unified engine
  const result = await analysisEngine.run({
    context: {
      product: 'novelforge',
      projectId,
      bookId,
      versionId,
      analysisId: randomUUID()
    },
    analysisType: 'editorial_board'
  });

  res.json(result);
});

// StoryScore routes
// backend/src/routes/story-scores/analysis.ts

router.post('/analyse', async (req, res) => {
  const { bookId, versionId, analysisType } = req.body;

  // Delegate to unified engine
  const result = await analysisEngine.run({
    context: {
      product: 'storyscore',
      bookId,
      versionId,
      userId: req.user.id,
      analysisId: randomUUID()
    },
    analysisType: analysisType || 'full_manuscript'
  });

  res.json(result);
});
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2)

| ID | Task | Effort | Description |
|----|------|--------|-------------|
| 1.1 | Create analysis-engine directory structure | 2h | Set up new service structure |
| 1.2 | Define core types | 4h | `types.ts` with all interfaces |
| 1.3 | Database migration | 2h | Add product, book_id, version_id columns |
| 1.4 | Create tracking service | 6h | `tracking.ts` with full attribution |
| 1.5 | Create main engine orchestrator | 8h | `index.ts` entry point |
| 1.6 | Add analysis_runs table | 2h | Track complete analysis sessions |

**Deliverables:**
- [ ] New service structure in place
- [ ] Database schema updated
- [ ] Tracking service logging with product attribution
- [ ] Main orchestrator shell ready

### Phase 2: Module Migration (Week 2-4)

| ID | Task | Effort | Description |
|----|------|--------|-------------|
| 2.1 | Migrate VEB modules | 8h | beta-swarm, ruthless-editor, market-analyst |
| 2.2 | Migrate structure validators | 6h | opening-hook, tension-arc, character-arc, commercial-beats |
| 2.3 | Migrate prose analysers | 4h | readability, sentence-variety, passive-voice, adverbs |
| 2.4 | Migrate quality checks | 4h | coherence, originality |
| 2.5 | Migrate genre analysers | 6h | romance-beats, thriller-pacing, scifi-consistency |
| 2.6 | Update all modules to use tracking | 4h | Ensure every AI call goes through tracking |

**Deliverables:**
- [ ] All analysis modules under `analysis-engine/modules/`
- [ ] Each module using `analysisTrackingService.logRequest()`
- [ ] Consistent interfaces across all modules

### Phase 3: Unified Scoring (Week 4-5)

| ID | Task | Effort | Description |
|----|------|--------|-------------|
| 3.1 | Create category scoring logic | 8h | Map module outputs to category scores |
| 3.2 | Create overall score aggregation | 4h | Weighted combination of categories |
| 3.3 | Build recommendation synthesiser | 6h | Combine module recommendations |
| 3.4 | Add genre benchmarks | 4h | Percentile calculations |
| 3.5 | Create quick scan mode | 6h | Fast subset of analyses |

**Deliverables:**
- [ ] Unified 0-100 scoring across all analyses
- [ ] Category breakdown (plot, character, pacing, prose, marketability)
- [ ] Aggregated recommendations with priorities
- [ ] Quick scan returning in <30 seconds

### Phase 4: API & Routes (Week 5-6)

| ID | Task | Effort | Description |
|----|------|--------|-------------|
| 4.1 | Create unified analysis routes | 6h | `/api/analysis/*` endpoints |
| 4.2 | Update NovelForge routes to delegate | 4h | Existing routes call engine |
| 4.3 | Create StoryScore routes | 4h | `/api/story-scores/*` endpoints |
| 4.4 | Add usage/reporting endpoints | 4h | Token usage by product/book |
| 4.5 | SSE events for analysis progress | 4h | Real-time updates |
| 4.6 | Integration tests | 8h | End-to-end testing |

**Deliverables:**
- [ ] Unified `/api/analysis` routes working
- [ ] NovelForge routes delegating to engine
- [ ] StoryScore routes ready
- [ ] Token usage dashboard data available

### Phase 5: Reporting Dashboard (Week 6-7)

| ID | Task | Effort | Description |
|----|------|--------|-------------|
| 5.1 | Usage by product view | 6h | NovelForge vs StoryScore breakdown |
| 5.2 | Usage by book/version view | 4h | Per-manuscript token tracking |
| 5.3 | Cost projection tools | 4h | Estimate costs for analysis types |
| 5.4 | Export functionality | 4h | CSV/JSON export of usage data |

**Deliverables:**
- [ ] Admin dashboard showing product-level usage
- [ ] Book-level token/cost breakdown
- [ ] Cost projection for planning

---

## 7. Migration Strategy

### 7.1 Backward Compatibility

During migration, maintain existing service interfaces:

```typescript
// backend/src/services/veb.service.ts (updated)

import { analysisEngine } from './analysis-engine/index.js';

class VEBService {
  // Existing interface preserved
  async runBetaSwarm(projectId: string, bookId: string): Promise<BetaSwarmResult> {
    // Delegate to unified engine
    const result = await analysisEngine.runModule('beta_swarm', {
      product: 'novelforge',
      projectId,
      bookId,
      versionId: await this.getCurrentVersion(bookId),
      analysisId: randomUUID()
    });

    return result.modules.editorial.betaSwarm;
  }

  // ... other methods delegate similarly
}
```

### 7.2 Gradual Rollout

1. **Phase 1**: New engine runs in parallel, results compared
2. **Phase 2**: NovelForge switched to use new engine
3. **Phase 3**: StoryScore uses engine from day one
4. **Phase 4**: Old services deprecated and removed

---

## 8. Token Tracking Examples

### 8.1 NovelForge Analysis Request

```json
{
  "id": "req_abc123",
  "product": "novelforge",
  "analysis_id": "ana_xyz789",
  "request_type": "VEB_BETA_SWARM",
  "project_id": "proj_456",
  "book_id": "book_123",
  "version_id": "v_2",
  "chapter_id": null,
  "input_tokens": 45000,
  "output_tokens": 2500,
  "cost_usd": 0.86,
  "cost_gbp": 0.68,
  "success": true,
  "created_at": "2025-01-30T10:30:00Z"
}
```

### 8.2 StoryScore Analysis Request

```json
{
  "id": "req_def456",
  "product": "storyscore",
  "analysis_id": "ana_abc123",
  "request_type": "FULL_MANUSCRIPT",
  "project_id": null,
  "book_id": "ss_book_789",
  "version_id": "v_1",
  "chapter_id": null,
  "input_tokens": 120000,
  "output_tokens": 8000,
  "cost_usd": 2.40,
  "cost_gbp": 1.90,
  "success": true,
  "created_at": "2025-01-30T11:00:00Z"
}
```

### 8.3 Usage Summary Query

```sql
SELECT
  product,
  DATE(created_at) as date,
  COUNT(*) as requests,
  SUM(input_tokens) as input_tokens,
  SUM(output_tokens) as output_tokens,
  SUM(cost_gbp) as cost_gbp
FROM ai_request_log
WHERE created_at >= '2025-01-01'
GROUP BY product, DATE(created_at)
ORDER BY date DESC;
```

Result:
```
| product     | date       | requests | input_tokens | output_tokens | cost_gbp |
|-------------|------------|----------|--------------|---------------|----------|
| novelforge  | 2025-01-30 | 45       | 2,340,000    | 156,000       | 42.50    |
| storyscore  | 2025-01-30 | 12       | 1,440,000    | 96,000        | 26.10    |
```

---

## 9. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Token tracking accuracy | 100% | All AI calls logged with product |
| Module migration | 100% | All existing analysers in engine |
| API response time (quick scan) | <30s | Monitoring |
| API response time (full) | <5min | Monitoring |
| Test coverage | >80% | Jest coverage report |
| Cost visibility | Complete | Dashboard shows all costs by product |

---

## 10. Appendix: Module to Category Mapping

| Module | Primary Category | Secondary |
|--------|-----------------|-----------|
| Beta Swarm | Character, Pacing | - |
| Ruthless Editor | Plot, Prose | Pacing |
| Market Analyst | Marketability | - |
| Opening Hook | Plot | Marketability |
| Tension Arc | Pacing | Plot |
| Character Arc | Character | Plot |
| Commercial Beats | Plot | Marketability |
| Readability | Prose | - |
| Sentence Variety | Prose | - |
| Passive Voice | Prose | - |
| Coherence | Plot | Character |
| Originality | Marketability | - |
| Romance Beats | Genre | Pacing |
| Thriller Pacing | Genre | Pacing |
| Sci-Fi Consistency | Genre | Plot |
