# StoryScore Development Roadmap

## Document Information

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Status | Planning |
| Created | 2025-01-30 |
| Related | [STORYSCORE_INTEGRATION_SPEC.md](./STORYSCORE_INTEGRATION_SPEC.md) |

---

## Overview

This roadmap outlines the phased development of StoryScore as an extension of the NovelForge backend infrastructure. Each phase builds upon the previous, allowing for incremental delivery and validation.

---

## Phase 0: Foundation & Setup
**Duration**: 1 week
**Priority**: Critical
**Dependencies**: None

### Objectives
- Establish project structure
- Set up development environment
- Secure domain name

### Tasks

| ID | Task | Effort | Owner |
|----|------|--------|-------|
| 0.1 | **Domain Selection** - Research and register available domain | 2h | - |
|     | Options: StoryGrade.io, NarrativeScore.ai, ProseScore.co, StoryLens.io, ManuscriptMind.ai | | |
| 0.2 | **Create StoryScore Frontend Repo** - Separate Next.js project | 4h | - |
| 0.3 | **Backend Route Namespace** - Reserve `/api/story-scores/*` routes | 1h | - |
| 0.4 | **Add Job Types** - Extend JobType union in shared types | 30m | - |
| 0.5 | **Create Database Migration** - `story_score_analyses` table | 1h | - |
| 0.6 | **Documentation** - Update CLAUDE.md with StoryScore context | 1h | - |

### Deliverables
- [ ] Domain registered
- [ ] Frontend repository initialised
- [ ] Backend prepared for StoryScore routes
- [ ] Database schema ready

### Definition of Done
- Can run `npm run dev` on StoryScore frontend
- Backend starts without errors with new job types
- Migration runs successfully

---

## Phase 1: Core Backend Infrastructure
**Duration**: 2 weeks
**Priority**: High
**Dependencies**: Phase 0

### Objectives
- Implement job submission and retrieval
- Create basic analysis service
- Enable real-time progress tracking

### Tasks

| ID | Task | Effort | Owner |
|----|------|--------|-------|
| 1.1 | **Routes Module Structure** | 4h | - |
|     | Create `backend/src/routes/story-scores/index.ts` | | |
|     | Create `backend/src/routes/story-scores/analysis.ts` | | |
|     | Create `backend/src/routes/story-scores/results.ts` | | |
| 1.2 | **Job Submission Endpoint** | 4h | - |
|     | `POST /api/story-scores/analyse` | | |
|     | Input validation (Zod schema) | | |
|     | Job creation and queueing | | |
| 1.3 | **Results Retrieval Endpoint** | 3h | - |
|     | `GET /api/story-scores/:analysisId` | | |
|     | `GET /api/story-scores/:analysisId/detailed` | | |
| 1.4 | **Queue Worker Handler** | 6h | - |
|     | Add `story_score_full_analysis` case to worker.ts | | |
|     | Implement checkpoint tracking | | |
|     | Emit SSE progress events | | |
| 1.5 | **StoryScoreService - Basic** | 8h | - |
|     | Create `backend/src/services/story-score.service.ts` | | |
|     | Content fetching (book, chapter, raw) | | |
|     | Basic Claude analysis prompt | | |
|     | Result parsing and storage | | |
| 1.6 | **SSE Event Integration** | 4h | - |
|     | Add StoryScore-specific events | | |
|     | `story_score:started`, `story_score:progress`, `story_score:completed` | | |
| 1.7 | **Unit Tests** | 6h | - |
|     | Service tests | | |
|     | Route tests | | |
|     | Integration tests | | |

### Deliverables
- [ ] Working job submission API
- [ ] Basic analysis returning scores
- [ ] Real-time progress via SSE
- [ ] 80%+ test coverage

### Definition of Done
- Can submit a book for analysis via API
- Receive progress updates via SSE
- Retrieve completed analysis results
- All tests passing

---

## Phase 2: Analysis Engine
**Duration**: 3 weeks
**Priority**: High
**Dependencies**: Phase 1

### Objectives
- Implement comprehensive story analysis
- Create scoring algorithms
- Build genre comparison system

### Tasks

| ID | Task | Effort | Owner |
|----|------|--------|-------|
| 2.1 | **Plot Analysis Module** | 12h | - |
|     | Structure analysis (three-act, hero's journey, etc.) | | |
|     | Tension arc mapping | | |
|     | Plot hole detection | | |
|     | Pacing assessment | | |
| 2.2 | **Character Analysis Module** | 12h | - |
|     | Character arc evaluation | | |
|     | Relationship mapping | | |
|     | Voice consistency check | | |
|     | Character depth scoring | | |
| 2.3 | **Prose Analysis Module** | 10h | - |
|     | Readability metrics (Flesch-Kincaid, etc.) | | |
|     | Sentence variety analysis | | |
|     | Dialogue quality assessment | | |
|     | Show vs tell detection | | |
| 2.4 | **Marketability Analysis Module** | 8h | - |
|     | Genre convention adherence | | |
|     | Hook strength evaluation | | |
|     | Comp title suggestions | | |
|     | Target audience fit | | |
| 2.5 | **Scoring Algorithm** | 8h | - |
|     | Weighted scoring system | | |
|     | Category score calculation | | |
|     | Overall score aggregation | | |
|     | Confidence intervals | | |
| 2.6 | **Genre Benchmarks** | 6h | - |
|     | Import/create benchmark data | | |
|     | Percentile calculation | | |
|     | Comparison report generation | | |
| 2.7 | **Quick Scan Mode** | 6h | - |
|     | Lightweight analysis variant | | |
|     | Faster response time | | |
|     | Subset of metrics | | |

### Deliverables
- [ ] Comprehensive multi-category analysis
- [ ] Accurate scoring system
- [ ] Genre comparison reports
- [ ] Quick scan option

### Definition of Done
- Analysis covers plot, character, prose, marketability
- Scores correlate with human assessment (validation needed)
- Genre benchmarks provide meaningful comparisons
- Quick scan returns in <30 seconds

---

## Phase 3: Frontend MVP
**Duration**: 3 weeks
**Priority**: High
**Dependencies**: Phase 1, Phase 2 (partial)

### Objectives
- Build StoryScore frontend application
- Implement core user flows
- Create visualisation components

### Tasks

| ID | Task | Effort | Owner |
|----|------|--------|-------|
| 3.1 | **Project Setup** | 4h | - |
|     | Next.js 14+ with App Router | | |
|     | Tailwind CSS + shadcn/ui | | |
|     | Authentication setup | | |
| 3.2 | **Landing Page** | 8h | - |
|     | Product description | | |
|     | Feature highlights | | |
|     | Pricing tiers | | |
|     | CTA buttons | | |
| 3.3 | **Authentication Flow** | 6h | - |
|     | Sign up / Sign in | | |
|     | OAuth providers (optional) | | |
|     | Password reset | | |
| 3.4 | **Dashboard** | 12h | - |
|     | Analysis history list | | |
|     | Quick stats overview | | |
|     | Recent activity | | |
| 3.5 | **Submit Analysis Page** | 10h | - |
|     | File upload (DOCX, TXT) | | |
|     | Paste text option | | |
|     | Analysis type selection | | |
|     | Genre specification | | |
| 3.6 | **Analysis Progress View** | 8h | - |
|     | Real-time SSE integration | | |
|     | Progress bar | | |
|     | Step indicators | | |
|     | Estimated time remaining | | |
| 3.7 | **Results Dashboard** | 16h | - |
|     | Overall score display (gauge/dial) | | |
|     | Category breakdowns | | |
|     | Strengths/weaknesses cards | | |
|     | Recommendations list | | |
| 3.8 | **Score Visualisations** | 12h | - |
|     | Radar chart (categories) | | |
|     | Trend line (history) | | |
|     | Genre comparison bar chart | | |
|     | Tension arc graph | | |
| 3.9 | **Export/Share** | 6h | - |
|     | PDF report generation | | |
|     | Shareable link (read-only) | | |

### Deliverables
- [ ] Functional frontend application
- [ ] Complete user journey (submit → progress → results)
- [ ] Attractive visualisations
- [ ] Mobile-responsive design

### Definition of Done
- User can sign up, submit analysis, view results
- SSE progress updates work reliably
- Visualisations render correctly
- Lighthouse score >90 for performance

---

## Phase 4: Advanced Features
**Duration**: 4 weeks
**Priority**: Medium
**Dependencies**: Phase 2, Phase 3

### Objectives
- Add comparison and tracking features
- Implement revision analysis
- Build collaborative features

### Tasks

| ID | Task | Effort | Owner |
|----|------|--------|-------|
| 4.1 | **Version Comparison** | 12h | - |
|     | Compare two versions of same manuscript | | |
|     | Highlight improvements/regressions | | |
|     | Diff visualisation | | |
| 4.2 | **Score History Tracking** | 8h | - |
|     | Track scores over time | | |
|     | Progress charts | | |
|     | Milestone markers | | |
| 4.3 | **Chapter-by-Chapter Analysis** | 10h | - |
|     | Individual chapter scores | | |
|     | Chapter comparison | | |
|     | Weak chapter identification | | |
| 4.4 | **AI Recommendations Deep Dive** | 12h | - |
|     | Specific examples from text | | |
|     | Suggested rewrites | | |
|     | Before/after previews | | |
| 4.5 | **Team/Editor Sharing** | 10h | - |
|     | Invite collaborators | | |
|     | Role-based access | | |
|     | Comment threads | | |
| 4.6 | **Webhook Integration** | 6h | - |
|     | Webhook delivery | | |
|     | Retry logic | | |
|     | Event signatures | | |
| 4.7 | **API Documentation** | 8h | - |
|     | OpenAPI/Swagger spec | | |
|     | Interactive docs | | |
|     | Code examples | | |

### Deliverables
- [ ] Version comparison feature
- [ ] Historical score tracking
- [ ] Chapter-level analysis
- [ ] Collaboration tools
- [ ] Public API documentation

### Definition of Done
- Can compare manuscript revisions
- Track improvement over time
- Share results with team members
- API fully documented

---

## Phase 5: Monetisation & Scale
**Duration**: 4 weeks
**Priority**: Medium
**Dependencies**: Phase 3, Phase 4

### Objectives
- Implement payment processing
- Add usage metering
- Prepare for scale

### Tasks

| ID | Task | Effort | Owner |
|----|------|--------|-------|
| 5.1 | **Stripe Integration** | 12h | - |
|     | Subscription plans | | |
|     | One-time purchases | | |
|     | Customer portal | | |
| 5.2 | **Usage Metering** | 8h | - |
|     | Track analyses per user | | |
|     | Word count tracking | | |
|     | Overage handling | | |
| 5.3 | **Tier Limits** | 6h | - |
|     | Free tier (X analyses/month) | | |
|     | Pro tier (unlimited) | | |
|     | Enterprise features | | |
| 5.4 | **API Rate Limiting** | 6h | - |
|     | Per-user rate limits | | |
|     | Tier-based limits | | |
|     | Rate limit headers | | |
| 5.5 | **Caching Layer** | 10h | - |
|     | Redis integration | | |
|     | Result caching | | |
|     | Session caching | | |
| 5.6 | **Database Optimisation** | 8h | - |
|     | Query optimisation | | |
|     | Index tuning | | |
|     | Connection pooling | | |
| 5.7 | **Monitoring & Alerting** | 8h | - |
|     | Error tracking (Sentry) | | |
|     | Performance monitoring | | |
|     | Usage analytics | | |

### Deliverables
- [ ] Payment processing live
- [ ] Usage tracking accurate
- [ ] Performance optimised
- [ ] Monitoring in place

### Definition of Done
- Users can purchase subscriptions
- Free tier limits enforced
- 99.9% uptime achievable
- Alerts configured for anomalies

---

## Phase 6: NovelForge Integration
**Duration**: 2 weeks
**Priority**: Low
**Dependencies**: Phase 2

### Objectives
- Seamless StoryScore access from NovelForge
- Unified user experience

### Tasks

| ID | Task | Effort | Owner |
|----|------|--------|-------|
| 6.1 | **NovelForge UI Integration** | 8h | - |
|     | "Analyse with StoryScore" button | | |
|     | Inline score display | | |
|     | Results panel in NovelForge | | |
| 6.2 | **Single Sign-On** | 6h | - |
|     | Shared authentication | | |
|     | Seamless navigation | | |
| 6.3 | **Data Sync** | 6h | - |
|     | Book/chapter auto-sync | | |
|     | Score display in project view | | |

### Deliverables
- [ ] StoryScore accessible from NovelForge
- [ ] Unified auth experience
- [ ] Scores visible in project dashboard

### Definition of Done
- One-click analysis from NovelForge
- No separate login required
- Scores update in real-time

---

## Summary Timeline

```
Week 1-2:    Phase 0 - Foundation & Setup
Week 2-4:    Phase 1 - Core Backend Infrastructure
Week 4-7:    Phase 2 - Analysis Engine
Week 5-8:    Phase 3 - Frontend MVP (parallel with Phase 2)
Week 8-12:   Phase 4 - Advanced Features
Week 12-16:  Phase 5 - Monetisation & Scale
Week 16-18:  Phase 6 - NovelForge Integration (optional)
```

```
        Phase 0  Phase 1  Phase 2  Phase 3  Phase 4  Phase 5  Phase 6
Week 1  ████████
Week 2  ████████ ████████
Week 3           ████████
Week 4           ████████ ████████
Week 5                    ████████ ████████
Week 6                    ████████ ████████
Week 7                    ████████ ████████
Week 8                             ████████ ████████
Week 9                                      ████████
Week 10                                     ████████
Week 11                                     ████████
Week 12                                     ████████ ████████
Week 13                                              ████████
Week 14                                              ████████
Week 15                                              ████████
Week 16                                              ████████ ████████
Week 17                                                       ████████
Week 18                                                       ████████
```

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Claude API rate limits impact throughput | Medium | High | Implement queue throttling, offer "off-peak" pricing |
| Analysis quality doesn't meet user expectations | Medium | High | Extensive testing, user feedback loops, iterative improvement |
| Competition releases similar product | Low | Medium | Focus on NovelForge integration as unique value |
| Token costs exceed revenue | Medium | High | Careful pricing, caching, model selection |
| Domain name disputes | Low | Low | Register multiple variants, trademark if needed |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| User sign-ups (Month 1) | 100 | Analytics |
| Analyses completed (Month 1) | 500 | Database |
| User satisfaction | >4.0/5.0 | Survey |
| Analysis accuracy | >80% correlation with human editors | Validation study |
| System uptime | 99.9% | Monitoring |
| Average analysis time | <5 minutes (full) | Logs |
| Revenue (Month 3) | £1,000 MRR | Stripe |

---

## Appendix: Quick Start Checklist

For developers starting on StoryScore:

- [ ] Read [STORYSCORE_INTEGRATION_SPEC.md](./STORYSCORE_INTEGRATION_SPEC.md)
- [ ] Understand NovelForge queue system (`backend/src/queue/worker.ts`)
- [ ] Review SSE implementation (`backend/src/routes/progress.ts`)
- [ ] Familiarise with existing job types (`backend/src/shared/types/index.ts`)
- [ ] Set up local development environment
- [ ] Run existing NovelForge tests to ensure baseline works
