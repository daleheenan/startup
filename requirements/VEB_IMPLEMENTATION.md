# Virtual Editorial Board (VEB) Implementation Guide

**Status**: In Progress
**Last Updated**: 2026-01-27
**Sprint**: 32

---

## Overview

The Virtual Editorial Board is a post-manuscript review system that analyzes completed novels through three AI personas and produces a comprehensive Editorial Report.

---

## Implementation Checklist

### Phase 1: Backend Infrastructure
- [ ] Database migration (`027_editorial_reports.sql`)
- [ ] VEB Service (`veb.service.ts`)
  - [ ] Module A: Beta Swarm
  - [ ] Module B: Ruthless Editor
  - [ ] Module C: Market Analyst
- [ ] Job types added to `types/index.ts`
- [ ] Worker handlers in `worker.ts`

### Phase 2: API Layer
- [ ] POST `/api/projects/:id/veb/submit` - Submit manuscript to VEB
- [ ] GET `/api/projects/:id/veb/report` - Get editorial report
- [ ] GET `/api/projects/:id/veb/status` - Check VEB job status
- [ ] POST `/api/projects/:id/veb/feedback` - Submit feedback for rewrites

### Phase 3: Frontend
- [ ] Editorial Report page component
- [ ] Report display with chapter-level findings
- [ ] Feedback submission UI
- [ ] VEB status indicator on project dashboard

---

## Database Schema

```sql
-- Table: editorial_reports
CREATE TABLE editorial_reports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed

  -- Module A: Beta Swarm results
  beta_swarm_status TEXT DEFAULT 'pending',
  beta_swarm_results TEXT, -- JSON: chapter reactions, retention scores

  -- Module B: Ruthless Editor results
  ruthless_editor_status TEXT DEFAULT 'pending',
  ruthless_editor_results TEXT, -- JSON: structural analysis

  -- Module C: Market Analyst results
  market_analyst_status TEXT DEFAULT 'pending',
  market_analyst_results TEXT, -- JSON: commercial viability

  -- Aggregated report
  overall_score INTEGER, -- 1-100
  summary TEXT,

  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  error TEXT
);

-- Table: veb_feedback
CREATE TABLE veb_feedback (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES editorial_reports(id),
  chapter_id TEXT REFERENCES chapters(id),
  feedback_type TEXT NOT NULL, -- 'accept', 'reject', 'rewrite'
  finding_id TEXT, -- Reference to specific finding
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## Job Types

```typescript
// Add to types/index.ts
export type JobType =
  | ... existing types ...
  | 'veb_beta_swarm'
  | 'veb_ruthless_editor'
  | 'veb_market_analyst';
```

---

## VEB Service Structure

```typescript
// backend/src/services/veb.service.ts

export interface BetaSwarmResult {
  chapterResults: Array<{
    chapterId: string;
    chapterNumber: number;
    retentionScore: number; // 1-10
    reactions: Array<{
      paragraphIndex: number;
      tag: 'BORED' | 'HOOKED' | 'CONFUSED' | 'ENGAGED' | 'EMOTIONAL';
      explanation: string;
    }>;
    dnfRiskPoints: Array<{
      location: string;
      reason: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  }>;
  overallEngagement: number; // 1-10
}

export interface RuthlessEditorResult {
  chapterResults: Array<{
    chapterId: string;
    chapterNumber: number;
    valueShift: {
      openingCharge: string; // e.g., "hopeful", "tense"
      closingCharge: string;
      shiftMagnitude: number; // 1-10
    };
    expositionAudit: Array<{
      location: string;
      issue: 'telling_not_showing' | 'info_dump' | 'unnecessary_backstory';
      quote: string;
      suggestion: string;
    }>;
    pacingIssues: Array<{
      location: string;
      issue: 'too_slow' | 'too_fast' | 'no_plot_advancement';
      suggestion: string;
    }>;
    scenePurpose: {
      earned: boolean;
      reasoning: string;
    };
  }>;
  overallStructureScore: number; // 1-10
}

export interface MarketAnalystResult {
  compTitles: Array<{
    title: string;
    author: string;
    year: number;
    similarity: string;
  }>;
  hookAnalysis: {
    openingLineScore: number; // 1-10
    openingParagraphScore: number; // 1-10
    openingChapterScore: number; // 1-10
    strengths: string[];
    weaknesses: string[];
  };
  tropeAnalysis: Array<{
    trope: string;
    freshness: 'fresh' | 'familiar' | 'overdone';
    execution: string;
  }>;
  marketPositioning: {
    targetAudience: string;
    marketingAngle: string;
    potentialChallenges: string[];
  };
  commercialViabilityScore: number; // 1-10
}
```

---

## Module Prompts

### Module A: Beta Swarm ("Marcus")

```
PERSONA: You are "Marcus," an avid reader of [GENRE] fiction. You consume 50+ books
a year and have strong opinions about what keeps you turning pages.

TASK: Read each chapter and provide authentic reader reactions.

For each chapter, provide:
1. Retention Score (1-10): Would you keep reading?
2. Paragraph-level reactions: Tag specific paragraphs with your emotional state
3. DNF Risk Points: Where might a reader put the book down?

TAGS TO USE:
- [BORED]: Attention wandering, considering skipping
- [HOOKED]: Can't stop reading, need to know what happens
- [CONFUSED]: Lost or need to re-read
- [ENGAGED]: Interested and following along
- [EMOTIONAL]: Strong emotional response (specify which emotion)
```

### Module B: Ruthless Editor

```
PERSONA: You are a senior developmental editor with 20 years of experience.
You've edited NYT bestsellers and have no patience for amateur mistakes.

TASK: Analyze each chapter with ruthless objectivity.

For each chapter, provide:
1. Value Shift: What's the emotional charge at start vs end?
2. Exposition Audit: Flag "telling" vs "showing" violations
3. Pacing Check: Identify scenes that don't advance the plot
4. Scene Purpose: Does this scene earn its place in the book?

Be specific. Quote the text. Don't sugarcoat.
```

### Module C: Market Analyst

```
PERSONA: You are a literary agent at a top agency. You've seen thousands of
manuscripts and know exactly what sells.

TASK: Evaluate this manuscript's commercial viability.

Provide:
1. Comp Titles: 3-5 comparable published books (2020-present)
2. Hook Analysis: Grade the opening line, paragraph, and chapter
3. Trope Analysis: Identify tropes and rate their freshness
4. Market Positioning: Target audience and marketing angle

Be honest about marketability. Publishers don't buy "good enough."
```

---

## API Endpoints

### POST /api/projects/:id/veb/submit
Submit a completed manuscript to the VEB.

Request: `{}`
Response: `{ reportId: string, jobIds: { betaSwarm, ruthlessEditor, marketAnalyst } }`

### GET /api/projects/:id/veb/report
Get the editorial report.

Response:
```json
{
  "id": "report-uuid",
  "status": "completed",
  "betaSwarm": { ... },
  "ruthlessEditor": { ... },
  "marketAnalyst": { ... },
  "overallScore": 75,
  "summary": "...",
  "createdAt": "...",
  "completedAt": "..."
}
```

### GET /api/projects/:id/veb/status
Check VEB processing status.

Response:
```json
{
  "status": "processing",
  "modules": {
    "betaSwarm": "completed",
    "ruthlessEditor": "processing",
    "marketAnalyst": "pending"
  },
  "progress": 33
}
```

---

## Frontend Components

### EditorialReportPage
- Located at `/projects/[id]/editorial-report`
- Tabs for each module's findings
- Chapter-by-chapter breakdown
- Overall scores and summary

### FeedbackSubmission
- Accept/Reject individual findings
- Queue chapters for rewrite
- Track feedback status

---

## Resume Instructions

If this session ends, resume by:

1. Check this file for completion status
2. Run `git status` to see uncommitted changes
3. Continue from the first unchecked item in the checklist
4. Key files to check:
   - `backend/src/db/migrations/027_editorial_reports.sql`
   - `backend/src/services/veb.service.ts`
   - `backend/src/queue/worker.ts` (VEB handlers)
   - `backend/src/routes/veb.ts`
   - `app/projects/[id]/editorial-report/page.tsx`

---

## Document History

| Date | Status | Notes |
|------|--------|-------|
| 2026-01-27 | Started | Initial documentation, beginning implementation |
