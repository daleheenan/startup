# Editorial Board -- Comprehensive Feature Specification

**Document**: editorial-board-spec.md
**Author**: Dale Heenan, Project Director
**Date**: 2026-01-28
**Status**: Draft
**Version**: 1.0

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Gap Analysis](#3-gap-analysis)
4. [Proposed Architecture](#4-proposed-architecture)
5. [Component Design](#5-component-design)
6. [Data Model Changes](#6-data-model-changes)
7. [API Requirements](#7-api-requirements)
8. [UI/UX Recommendations](#8-uiux-recommendations)
9. [Implementation Roadmap](#9-implementation-roadmap)
10. [Reusable Components Inventory](#10-reusable-components-inventory)

---

## 1. Executive Summary

The Editorial Board is the central hub for content review across all projects and books within NovelForge. The existing per-project Virtual Editorial Board (VEB) and Outline Editorial Board features provide powerful AI-driven analysis capabilities that must be surfaced and unified into a single cross-project view at `/editorial`.

The current global Editorial Board page (`app/editorial/page.tsx`) is a placeholder stub. Two fully functional editorial systems already exist underneath:

- **VEB (Virtual Editorial Board)** -- Post-completion manuscript review via three AI personas (Beta Swarm, Ruthless Editor, Market Analyst). Operates on `editorial_reports` table.
- **Outline Editorial Board** -- Pre-generation outline review via three AI personas (Structure Analyst, Character Arc Reviewer, Market Fit Analyst). Operates on `outline_editorial_reports` table.

This specification defines how to build the unified Editorial Board that aggregates, orchestrates, and presents all editorial activity across every project, whilst reusing the existing backend services, queue infrastructure, and data models wherever possible.

---

## 2. Current State Analysis

### 2.1 Global Editorial Board Page

**Location**: `app/editorial/page.tsx`
**Route**: `/editorial`
**Navigation Entry**: Sidebar -> Projects -> Editorial Board

The page renders a "Coming Soon" card inside `DashboardLayout`. It lists five planned features as static text:
- Unified review queue
- Approval workflows
- Revision tracking
- Editorial notes and feedback
- Style guide enforcement

**No API calls are made. No data is fetched. This is purely a placeholder.**

### 2.2 Virtual Editorial Board (VEB) -- Per-Project

**Service**: `backend/src/services/veb.service.ts`
**Routes**: `backend/src/routes/veb.ts`
**Frontend**: `app/projects/[id]/editorial-report/page.tsx`
**Navigation Entry**: Per-project nav -> Editorial -> Editorial Board (route `/editorial-report`)

The VEB is a fully implemented, production-ready feature. It provides:

#### Three Analysis Modules (AI Personas)
| Module | Persona | What It Analyses | Output |
|--------|---------|------------------|--------|
| Beta Swarm | "Marcus" the avid reader | Reader engagement, retention scores, DNF risk points, emotional reactions per chapter | `BetaSwarmResult` with per-chapter scores (1-10) |
| Ruthless Editor | Senior developmental editor | Value shifts, exposition issues (tell vs show), pacing problems, scene purpose | `RuthlessEditorResult` with structural score (1-10) |
| Market Analyst | Literary agent | Comparable titles, hook analysis, trope freshness, market positioning, commercial viability | `MarketAnalystResult` with viability score (1-10) |

#### Workflow
1. User clicks "Submit for Review" on the per-project editorial report page
2. `POST /api/projects/:projectId/veb/submit` creates an `editorial_reports` row and queues three jobs
3. Queue worker processes `veb_beta_swarm`, `veb_ruthless_editor`, `veb_market_analyst` jobs sequentially
4. `veb_finalize` job calculates weighted overall score (35% engagement + 35% structure + 30% commercial)
5. Frontend polls `GET /api/projects/:projectId/veb/status` every 5 seconds until complete
6. Completed report is displayed in a tabbed interface (Overview, Beta Swarm, Ruthless Editor, Market Analyst)

#### Database Schema
```sql
editorial_reports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  status TEXT ('pending' | 'processing' | 'completed' | 'failed'),
  beta_swarm_status TEXT,
  beta_swarm_results TEXT,      -- JSON blob
  beta_swarm_completed_at TEXT,
  ruthless_editor_status TEXT,
  ruthless_editor_results TEXT, -- JSON blob
  ruthless_editor_completed_at TEXT,
  market_analyst_status TEXT,
  market_analyst_results TEXT,  -- JSON blob
  market_analyst_completed_at TEXT,
  overall_score INTEGER,
  summary TEXT,
  recommendations TEXT,         -- JSON array
  total_input_tokens INTEGER,
  total_output_tokens INTEGER,
  created_at TEXT,
  completed_at TEXT,
  error TEXT
)

veb_feedback (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES editorial_reports(id),
  chapter_id TEXT REFERENCES chapters(id),
  module TEXT ('beta_swarm' | 'ruthless_editor' | 'market_analyst'),
  finding_index INTEGER,
  feedback_type TEXT ('accept' | 'reject' | 'rewrite_queued' | 'rewrite_completed'),
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
)
```

#### Existing API Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/projects/:projectId/veb/submit` | Submit manuscript for VEB analysis |
| GET | `/api/projects/:projectId/veb/status` | Poll processing status |
| GET | `/api/projects/:projectId/veb/report` | Get latest report |
| GET | `/api/projects/:projectId/veb/reports` | Get report history |
| GET | `/api/veb/reports/:reportId` | Get specific report by ID |
| POST | `/api/veb/reports/:reportId/feedback` | Submit feedback on a finding |
| GET | `/api/veb/reports/:reportId/feedback` | Get all feedback for a report |
| DELETE | `/api/veb/reports/:reportId` | Delete a report |

### 2.3 Outline Editorial Board -- Per-Project

**Service**: `backend/src/services/outline-editorial.service.ts`
**Routes**: `backend/src/routes/outline-editorial.ts`
**Frontend**: `app/projects/[id]/outline-review/page.tsx`
**Navigation Entry**: Per-project nav -> Editorial -> Outline Review (route `/outline-review`)

The Outline Editorial Board reviews outlines *before* chapter generation. It provides:

#### Three Analysis Modules
| Module | What It Analyses | Output |
|--------|------------------|--------|
| Structure Analyst | Plot structure score, pacing assessment, story arc, chapter-by-chapter notes | `StructureAnalystResult` with plot structure score (1-10) |
| Character Arc Reviewer | Protagonist arc, supporting character arcs, relationship dynamics, consistency issues | `CharacterArcResult` with character score (1-10) |
| Market Fit Analyst | Genre alignment, target audience, competitive analysis, hook assessment | `MarketFitResult` with market viability score (1-10) |

#### Workflow
1. User submits outline for review
2. Three jobs are queued: `outline_structure_analyst`, `outline_character_arc`, `outline_market_fit`
3. `outline_editorial_finalize` calculates overall score (35% structure + 35% character + 30% market)
4. Score >= 60 marks the project as `readyForGeneration`
5. User can skip outline review entirely via `POST /api/projects/:projectId/outline-editorial/skip`

#### Database Schema
```sql
outline_editorial_reports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  outline_id TEXT REFERENCES outlines(id),
  status TEXT ('pending' | 'processing' | 'completed' | 'failed'),
  structure_analyst_status TEXT,
  structure_analyst_results TEXT,      -- JSON blob
  structure_analyst_completed_at TEXT,
  character_arc_status TEXT,
  character_arc_results TEXT,          -- JSON blob
  character_arc_completed_at TEXT,
  market_fit_status TEXT,
  market_fit_results TEXT,             -- JSON blob
  market_fit_completed_at TEXT,
  overall_score INTEGER,
  summary TEXT,
  recommendations TEXT,                -- JSON array
  ready_for_generation INTEGER,        -- Boolean (0/1)
  total_input_tokens INTEGER,
  total_output_tokens INTEGER,
  created_at TEXT,
  completed_at TEXT,
  error TEXT
)

outline_editorial_feedback (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES outline_editorial_reports(id),
  module TEXT ('structure_analyst' | 'character_arc' | 'market_fit'),
  finding_index INTEGER,
  feedback_type TEXT ('accept' | 'reject' | 'revision_planned' | 'revision_completed'),
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
)
```

#### Existing API Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/projects/:projectId/outline-editorial/submit` | Submit outline for review |
| GET | `/api/projects/:projectId/outline-editorial/status` | Poll processing status |
| GET | `/api/projects/:projectId/outline-editorial/report` | Get latest report |
| POST | `/api/projects/:projectId/outline-editorial/skip` | Skip review entirely |
| POST | `/api/outline-editorial/reports/:reportId/feedback` | Submit feedback |
| GET | `/api/outline-editorial/reports/:reportId/feedback` | Get feedback |
| DELETE | `/api/outline-editorial/reports/:reportId` | Delete report |

### 2.4 Shared Infrastructure

The following infrastructure is shared across both editorial systems and must be preserved:

- **Queue Worker** (`backend/src/queue/worker.ts`): Handles all VEB and outline editorial job types via a switch statement. Jobs are created via `QueueWorker.createJob(type, targetId)`.
- **Claude Service** (`backend/src/services/claude.service.ts`): `createCompletionWithUsage()` provides AI completions with token tracking.
- **JSON Extractor** (`backend/src/utils/json-extractor.js`): Parses structured JSON from AI responses.
- **Logger Service**: Structured logging via `createLogger(namespace)`.
- **Table Auto-Creation**: Both route files include middleware that auto-creates tables if migrations have not run, preventing runtime crashes.

---

## 3. Gap Analysis

### What Exists vs. What Is Needed

| Required Feature | Current State | Gap | Effort |
|-----------------|---------------|-----|--------|
| **Unified review queue** | Per-project only. No cross-project view. | Need aggregation endpoint + UI | Medium |
| **Approval workflows** | `veb_feedback` supports accept/reject/rewrite_queued/rewrite_completed. `outline_editorial_feedback` supports accept/reject/revision_planned/revision_completed. | Feedback exists but no workflow orchestration or status tracking across findings | Low-Medium |
| **Revision tracking** | Feedback types include `rewrite_queued` and `rewrite_completed` but no mechanism links revisions to specific findings or tracks progress | Need revision tracking model linking findings to chapter edits | Medium |
| **Editorial notes and feedback** | Both systems have feedback tables with `notes` field. Per-finding feedback with module + finding_index addressing. | Feedback exists per-report. Need thread-style notes visible in the unified board | Low |
| **Style guide enforcement** | `ProseStyle` and `StyleCheck` types exist in shared types. `prose-styles` route exists. Per-chapter style consistency scores are computed. | Style checks exist but are not integrated into the editorial board workflow or displayed as editorial findings | Medium |

### Key Architectural Observations

1. **No cross-project aggregation endpoint exists.** The VEB endpoints are all scoped to `:projectId`. The global editorial board needs a new endpoint that queries across all projects.

2. **Report types are structurally similar but use different schemas.** Both have status, per-module results (3 modules each), overall_score, summary, recommendations, feedback tables. They can be unified into a common display model on the frontend.

3. **The queue worker already handles all job types.** No changes needed to the processing pipeline for existing editorial features.

4. **Style checks (`StyleCheck` type) exist in shared types but are not wired into editorial flows.** The `StyleConsistencyDeviation` type has severity levels and descriptions that map naturally to editorial findings.

5. **The DashboardLayout component provides the correct shell for the global Editorial Board page.** It handles sidebar navigation, header with title/subtitle, and content area.

---

## 4. Proposed Architecture

### 4.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Global Editorial Board                             │
│                     /editorial (frontend)                             │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ Review Queue │  │  Approval    │  │  Revision    │  │  Style   │ │
│  │   (unified)  │  │  Workflows   │  │  Tracking    │  │  Guide   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────┬─────┘ │
│         │                 │                  │               │       │
└─────────┼─────────────────┼──────────────────┼───────────────┼───────┘
          │                 │                  │               │
┌─────────┼─────────────────┼──────────────────┼───────────────┼───────┐
│         ▼                 ▼                  ▼               ▼       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │          New: Aggregation API Endpoint                        │    │
│  │    GET /api/editorial/queue                                   │    │
│  │    GET /api/editorial/queue?projectId=&type=&status=          │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌──────────────┐    ┌──────────────────────────────────────────┐    │
│  │ VEB Service  │    │  Outline Editorial Service                │    │
│  │ (existing)   │◄──►│  (existing)                               │    │
│  └──────────────┘    └──────────────────────────────────────────┘    │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              Existing: Queue Worker                           │    │
│  │  veb_beta_swarm | veb_ruthless_editor | veb_market_analyst   │    │
│  │  outline_structure_analyst | outline_character_arc            │    │
│  │  outline_market_fit | outline_editorial_finalize              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              Existing: Database (SQLite)                      │    │
│  │  editorial_reports | veb_feedback                             │    │
│  │  outline_editorial_reports | outline_editorial_feedback       │    │
│  └──────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────┘
```

### 4.2 What Gets Built vs. What Gets Reused

**Reuse (no changes):**
- VEB service, routes, queue jobs, database tables
- Outline Editorial service, routes, queue jobs, database tables
- Queue worker job handling
- DashboardLayout shell component
- Sidebar navigation (already has the Editorial Board link)

**New Backend:**
- Aggregation route: `GET /api/editorial/queue` -- queries both `editorial_reports` and `outline_editorial_reports` across all projects, joins with project titles, returns a unified list
- Aggregation route: `GET /api/editorial/stats` -- summary counts (pending, processing, completed, failed) across all editorial work

**New Frontend (replaces the stub):**
- Editorial Board page with tabs: Review Queue, By Project, Activity Feed
- Review Queue tab: unified list of all editorial reports across projects, filterable by status, report type, project
- By Project tab: project cards showing editorial health (outline review status + VEB report status)
- Activity Feed tab: chronological list of editorial actions (submissions, completions, feedback)
- Action buttons that link through to existing per-project VEB and outline editorial pages

### 4.3 Data Flow

```
User visits /editorial
    │
    ▼
Editorial Board Page (React)
    │
    ├── Fetches GET /api/editorial/queue
    │       └── Returns unified list from editorial_reports + outline_editorial_reports
    │           joined with projects table for titles
    │
    ├── Fetches GET /api/editorial/stats
    │       └── Returns aggregate counts by status and type
    │
    └── Renders tabs:
        ├── Review Queue: sorted list of all reports
        │       └── Each item links to /projects/:id/editorial-report or /projects/:id/outline-review
        ├── By Project: cards per project
        │       └── Shows outline review badge + VEB report badge
        └── Activity Feed: timeline of recent editorial events
```

---

## 5. Component Design

### 5.1 Page Structure

```
EditorialBoardPage (replaces current stub)
├── DashboardLayout (existing shell)
│   ├── Header: title="Editorial Board", subtitle="Review and manage editorial activity across all projects"
│   └── Content
│       ├── StatsBar (new)
│       │   ├── Total Reports stat card
│       │   ├── In Progress stat card
│       │   ├── Completed stat card
│       │   └── Awaiting Feedback stat card
│       ├── TabBar (new)
│       │   ├── Review Queue tab
│       │   ├── By Project tab
│       │   └── Activity Feed tab
│       └── TabContent (new)
│           ├── ReviewQueueTab (new)
│           ├── ByProjectTab (new)
│           └── ActivityFeedTab (new)
```

### 5.2 ReviewQueueTab Component

Displays a unified, filterable list of all editorial reports.

**Filters:**
- Status: All | Pending | Processing | Completed | Failed
- Report Type: All | VEB (Manuscript) | Outline Review
- Project: All | [project name list]

**List Item Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│  📋 [Project Title] -- [Report Type]           [Status Badge]   │
│  Created: 28 Jan 2026  │  Score: 78/100  │  [View Report →]    │
│  ████████░░ 80% complete (3/3 modules done)                     │
└─────────────────────────────────────────────────────────────────┘
```

**Behaviour:**
- Sorted by `created_at DESC` by default
- Status badge colours: Pending (grey), Processing (amber), Completed (green), Failed (red)
- "View Report" links to the existing per-project editorial report or outline review page
- Progress bar shows module completion (0%, 33%, 67%, 100%)

### 5.3 ByProjectTab Component

Shows a card per project with editorial health status.

**Card Structure:**
```
┌──────────────────────────────────────────────────┐
│  📖 My Fantasy Novel                             │
│  ─────────────────────────────────────────────── │
│  Outline Review:  ✅ Approved (Score: 82)        │
│  VEB Report:      ⏳ No report yet               │
│                                                  │
│  [Submit to VEB →]          [View Project →]     │
└──────────────────────────────────────────────────┘
```

**States per editorial dimension:**
- Not started / Skipped / In Progress / Completed (with score) / Failed

### 5.4 ActivityFeedTab Component

Chronological feed of editorial events across all projects.

**Event Types:**
- Report submitted (VEB or Outline)
- Module completed (with module name)
- Report finalised (with overall score)
- Feedback submitted (accept/reject/rewrite)
- Report failed (with error summary)

**Entry Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  28 Jan 2026, 14:32                                         │
│  ✅ VEB Report completed for "My Fantasy Novel"             │
│  Overall Score: 82/100 · Agent Recommendation: Yes          │
└─────────────────────────────────────────────────────────────┘
```

### 5.5 Unified Report Type (Frontend Model)

Both VEB and Outline Editorial reports are normalised to a common display model:

```typescript
interface EditorialQueueItem {
  id: string;
  projectId: string;
  projectTitle: string;
  reportType: 'veb' | 'outline_editorial';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  overallScore: number | null;
  modulesCompleted: number;        // 0-3
  modulesTotal: number;            // Always 3
  createdAt: string;
  completedAt: string | null;
  summary: string | null;
  viewUrl: string;                 // Links to per-project page
}
```

---

## 6. Data Model Changes

### 6.1 New Tables

No new tables are required. The unified Editorial Board aggregates data from existing tables:
- `editorial_reports` (VEB)
- `outline_editorial_reports` (Outline Editorial)
- `projects` (for project titles)
- `veb_feedback` and `outline_editorial_feedback` (for activity feed)

### 6.2 New Indexes (Recommended)

The aggregation queries will benefit from indexes that may not already exist:

```sql
-- Support cross-project status queries
CREATE INDEX IF NOT EXISTS idx_editorial_reports_status_created
  ON editorial_reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outline_editorial_reports_status_created
  ON outline_editorial_reports(status, created_at DESC);

-- Support activity feed queries (feedback by date)
CREATE INDEX IF NOT EXISTS idx_veb_feedback_created
  ON veb_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outline_editorial_feedback_created
  ON outline_editorial_feedback(created_at DESC);
```

### 6.3 Existing Data Model Sufficiency

The existing data models are well-structured for the unified view:

| Needed Information | Source |
|-------------------|--------|
| Project title | `projects.title` via JOIN |
| Report type | Distinguished by which table the row comes from |
| Status | Both tables have `status` column with identical enum values |
| Overall score | Both tables have `overall_score` INTEGER column |
| Module completion | Both tables track per-module status columns |
| Feedback/notes | Both feedback tables have `notes` TEXT and `feedback_type` |
| Timestamps | Both tables have `created_at` and `completed_at` |

---

## 7. API Requirements

### 7.1 New Endpoints

#### GET /api/editorial/queue

Returns a unified list of all editorial reports across all projects.

**Query Parameters:**
| Parameter | Type | Values | Default |
|-----------|------|--------|---------|
| `status` | string | `pending`, `processing`, `completed`, `failed`, `all` | `all` |
| `type` | string | `veb`, `outline_editorial`, `all` | `all` |
| `projectId` | string | UUID | (none -- returns all) |
| `limit` | number | 1-100 | 20 |
| `offset` | number | >= 0 | 0 |
| `sort` | string | `created_at`, `overall_score`, `status` | `created_at` |
| `order` | string | `asc`, `desc` | `desc` |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "projectTitle": "My Fantasy Novel",
      "reportType": "veb",
      "status": "completed",
      "overallScore": 82,
      "modulesCompleted": 3,
      "modulesTotal": 3,
      "createdAt": "2026-01-28T14:30:00Z",
      "completedAt": "2026-01-28T14:35:00Z",
      "summary": "Overall Score: 82/100. Engagement: 8.2/10. ...",
      "viewUrl": "/projects/uuid/editorial-report"
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

**SQL Implementation Sketch:**
```sql
SELECT
  er.id, er.project_id, p.title as project_title,
  'veb' as report_type,
  er.status, er.overall_score,
  CASE WHEN er.beta_swarm_status = 'completed' THEN 1 ELSE 0 END +
  CASE WHEN er.ruthless_editor_status = 'completed' THEN 1 ELSE 0 END +
  CASE WHEN er.market_analyst_status = 'completed' THEN 1 ELSE 0 END as modules_completed,
  3 as modules_total,
  er.created_at, er.completed_at, er.summary
FROM editorial_reports er
JOIN projects p ON er.project_id = p.id
UNION ALL
SELECT
  oer.id, oer.project_id, p.title as project_title,
  'outline_editorial' as report_type,
  oer.status, oer.overall_score,
  CASE WHEN oer.structure_analyst_status = 'completed' THEN 1 ELSE 0 END +
  CASE WHEN oer.character_arc_status = 'completed' THEN 1 ELSE 0 END +
  CASE WHEN oer.market_fit_status = 'completed' THEN 1 ELSE 0 END as modules_completed,
  3 as modules_total,
  oer.created_at, oer.completed_at, oer.summary
FROM outline_editorial_reports oer
JOIN projects p ON oer.project_id = p.id
ORDER BY created_at DESC
LIMIT ? OFFSET ?
```

#### GET /api/editorial/stats

Returns summary statistics for the editorial dashboard.

**Response:**
```json
{
  "totalReports": 42,
  "byStatus": {
    "pending": 2,
    "processing": 3,
    "completed": 35,
    "failed": 2
  },
  "byType": {
    "veb": 18,
    "outline_editorial": 24
  },
  "recentActivity": [
    {
      "type": "report_completed",
      "reportType": "veb",
      "projectTitle": "My Fantasy Novel",
      "overallScore": 82,
      "timestamp": "2026-01-28T14:35:00Z"
    }
  ],
  "activeProjects": 5
}
```

#### GET /api/editorial/activity

Returns a chronological activity feed across all editorial work.

**Query Parameters:**
| Parameter | Type | Default |
|-----------|------|---------|
| `limit` | number | 30 |
| `offset` | number | 0 |
| `projectId` | string | (none) |

**Response:**
```json
{
  "events": [
    {
      "timestamp": "2026-01-28T14:35:00Z",
      "eventType": "report_completed",
      "reportType": "veb",
      "reportId": "uuid",
      "projectId": "uuid",
      "projectTitle": "My Fantasy Novel",
      "details": {
        "overallScore": 82,
        "summary": "..."
      }
    },
    {
      "timestamp": "2026-01-28T14:32:00Z",
      "eventType": "feedback_submitted",
      "reportType": "veb",
      "reportId": "uuid",
      "projectId": "uuid",
      "projectTitle": "My Fantasy Novel",
      "details": {
        "module": "ruthless_editor",
        "feedbackType": "accept",
        "notes": "Good catch on the pacing issue in chapter 3"
      }
    }
  ],
  "total": 156,
  "limit": 30,
  "offset": 0
}
```

### 7.2 Route Registration

New routes will be added to a new file `backend/src/routes/editorial-board.ts` and registered in `server.ts`:

```typescript
import editorialBoardRouter from './routes/editorial-board.js';

// In the protected routes section:
app.use('/api/editorial', apiLimiter, requireAuth, editorialBoardRouter);
```

### 7.3 Existing Endpoints -- No Changes Required

All existing VEB and outline editorial endpoints remain unchanged. The unified board only reads aggregated data; it does not modify any editorial workflows.

---

## 8. UI/UX Recommendations

### 8.1 Design Consistency

The Editorial Board page must use the existing `DashboardLayout` component and design tokens (`colors`, `typography`, `spacing`, `borderRadius`, `shadows`) from `app/lib/design-tokens.ts`. This ensures visual consistency with the rest of the dashboard.

### 8.2 Empty States

Three distinct empty states are needed:

1. **No projects exist** -- "Create your first novel to begin editorial review"
2. **Projects exist but no editorial work** -- "Submit an outline or completed manuscript for editorial review. Start from any project page."
3. **Filters active but no results** -- "No reports match your current filters"

### 8.3 Loading States

- Initial page load: skeleton cards in the stats bar + shimmer list items
- Tab switching: lightweight spinner within the tab content area only
- Status polling: subtle "Refreshing..." indicator, not a full reload

### 8.4 Colour Coding

Reuse the severity/status colour palette already established across the codebase:

| Status | Colour | Hex |
|--------|--------|-----|
| Completed | Green | `#10B981` |
| Processing | Amber | `#F59E0B` |
| Pending | Grey | `#6B7280` |
| Failed | Red | `#EF4444` |
| Score >= 80 | Green | `#10B981` |
| Score 60-79 | Amber | `#F59E0B` |
| Score < 60 | Red | `#EF4444` |

### 8.5 Navigation Between Views

- From the Review Queue list item, clicking "View Report" navigates to the existing per-project editorial report or outline review page
- From the By Project card, "Submit to VEB" navigates to the per-project editorial report page (which has its own submit button)
- All navigation uses Next.js `Link` components for client-side routing

### 8.6 Responsive Behaviour

- Stats bar: 4-column grid on desktop, 2x2 on tablet, stacked on mobile
- Review Queue list: full-width cards on all breakpoints
- By Project cards: 2-column grid on desktop, single column on mobile

---

## 9. Implementation Roadmap

### Phase 1 -- Backend Aggregation (Low Risk, High Value)

**Deliverable**: New route file with aggregation endpoints

| Task | Description | Effort |
|------|-------------|--------|
| Create `backend/src/routes/editorial-board.ts` | New route file with table existence checks (matching the pattern used by `veb.ts` and `outline-editorial.ts`) | 2 hours |
| Implement `GET /api/editorial/queue` | UNION ALL query across both report tables, with filtering, pagination, sorting | 3 hours |
| Implement `GET /api/editorial/stats` | Aggregate counts by status and type | 2 hours |
| Implement `GET /api/editorial/activity` | Timeline query from reports + feedback tables | 3 hours |
| Register route in `server.ts` | Add import and `app.use()` line | 15 min |
| Add recommended indexes | Four indexes for query performance | 15 min |

### Phase 2 -- Frontend Unified Board (Medium Effort)

**Deliverable**: Fully functional Editorial Board page replacing the stub

| Task | Description | Effort |
|------|-------------|--------|
| Replace `app/editorial/page.tsx` stub | New component using `DashboardLayout`, fetch hooks, tab structure | 4 hours |
| Build StatsBar component | Four stat cards with loading skeletons | 2 hours |
| Build ReviewQueueTab | Filterable list with status badges, progress bars, action links | 4 hours |
| Build ByProjectTab | Project cards with editorial health indicators | 3 hours |
| Build ActivityFeedTab | Chronological event timeline | 3 hours |
| Add custom React hook `useEditorialBoard` | Centralise all API calls and state management | 2 hours |

### Phase 3 -- Style Guide Integration (Future, Post-MVP)

**Deliverable**: Style check results surfaced as editorial findings

| Task | Description | Effort |
|------|-------------|--------|
| Surface `StyleCheck` results in VEB reports | Existing style checks become an additional editorial dimension | 4 hours |
| Add style guide findings to the Review Queue | Style deviations appear as actionable items | 3 hours |

### Phase 4 -- Revision Tracking (Future, Post-MVP)

**Deliverable**: Linkage between editorial findings and chapter revisions

| Task | Description | Effort |
|------|-------------|--------|
| Design revision tracking data model | Link findings to chapter edits | 2 hours |
| Implement revision status updates | When chapters are edited, auto-update related findings | 4 hours |
| Surface revision progress in the board | Show which findings have been addressed | 3 hours |

---

## 10. Reusable Components Inventory

The following existing components and patterns should be leveraged during implementation:

### Backend Patterns to Reuse

| Pattern | Source | Apply To |
|---------|--------|----------|
| Table existence middleware | `veb.ts` lines 28-142 | New editorial-board route |
| Report row parser | `veb.ts` `parseReportRow()` | Unified queue item normalisation |
| Error response helpers | `sendBadRequest`, `sendNotFound`, `sendInternalError` | All new endpoints |
| Structured logging | `createLogger('routes:editorial-board')` | New route file |
| Auth middleware | `requireAuth` in server.ts | Route registration |

### Frontend Patterns to Reuse

| Pattern | Source | Apply To |
|---------|--------|----------|
| DashboardLayout shell | `app/components/dashboard/DashboardLayout.tsx` | Page wrapper |
| Design tokens | `app/lib/design-tokens.ts` | All styling |
| Score colour logic | `editorial-report/page.tsx` `getScoreColor()` | Stats bar, queue items |
| Severity colour logic | `editorial-report/page.tsx` `getSeverityColor()` | Activity feed |
| Status badge pattern | `editorial-report/page.tsx` status rendering | Queue item badges |
| Auth token fetch | `getToken()` from `app/lib/auth` | API calls |
| API base URL | `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'` | Hook |
| Polling pattern | `editorial-report/page.tsx` `useEffect` with `setInterval` | Processing status refresh |

### TypeScript Types to Reuse

| Type | Source | Use In |
|------|--------|--------|
| `EditorialReport` | `backend/src/services/veb.service.ts` | Aggregation query results |
| `OutlineEditorialReport` | `backend/src/services/outline-editorial.service.ts` | Aggregation query results |
| `BetaSwarmResult`, `RuthlessEditorResult`, `MarketAnalystResult` | `veb.service.ts` | Activity feed detail rendering |
| `StructureAnalystResult`, `CharacterArcResult`, `MarketFitResult` | `outline-editorial.service.ts` | Activity feed detail rendering |

---

*End of Specification*

*This document was produced by analysing the NovelForge codebase as of 2026-01-28. All file paths, type names, and API endpoints are drawn directly from the live codebase and verified against source code.*
