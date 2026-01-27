# NovelForge - Project Roadmap

**Last Updated**: 2026-01-26
**Document Version**: 3.0

---

## Executive Summary

NovelForge is an AI-powered novel writing platform that transforms story ideas into publication-ready manuscripts. The project has completed **~785 story points** across 23 sprints, with a robust feature set including end-to-end generation, multi-agent editing, trilogy support, and PWA mobile support.

| Milestone | Story Points | Status |
|-----------|--------------|--------|
| **Phase 1: Core Platform** (Sprints 1-11) | 334 | ✅ Complete |
| **Phase 1B: Quality & Testing** (Sprints 12-15) | 142 | ✅ Complete |
| **Phase 2A: User Experience** (Sprints 16-19) | 161 | ✅ Complete |
| **Phase 2B: Advanced Features** (Sprints 22-23, 26) | 112 | ✅ Complete |
| **Phase 2C: Remaining** (Sprints 20-21, 24-25, 27-29, 31) | ~317 | ❌ Not Started |
| **Phase 3B: Testing & Quality** (Sprints 34-37) | 190 | ❌ Not Started |
| **Sprint 38: Post-Completion Features** | 35 | ❌ Not Started |
| **Sprint 30: AI Agent Expansion** | 40 | ✅ Complete |
| **Sprint 32: Virtual Editorial Board** | 55 | ✅ Complete |

**Total Completed**: ~840 points | **Remaining**: ~557 points

---

## Current State

### Implemented Features

| Category | Features |
|----------|----------|
| **Core Generation** | Fire-and-forget novel generation, 5-agent editing ensemble, trilogy support |
| **Content Creation** | Story concepts, characters, world-building, outlines, scene cards |
| **User Control** | Interactive editing, regeneration tools, prose style control, author presets |
| **Analytics** | Pacing visualization, character tracking, readability scoring |
| **Export** | DOCX, PDF, story bible generation |
| **Infrastructure** | React Query, virtualization, Zod validation, Pino logging, Sentry |
| **Mobile** | PWA manifest, service worker, responsive CSS, offline caching |
| **Quality** | 112+ tests, WCAG AA accessibility, 50+ database indexes |

### Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+, React Query, TypeScript |
| Backend | Node.js, Express, SQLite |
| AI | Claude Code SDK (Max subscription) |
| Deployment | Railway + Nixpacks (Node 20) |
| Testing | Jest (backend), Vitest (frontend) |
| Monitoring | Pino logging, Sentry error tracking |

---

## Remaining Sprints

### High Priority

#### Sprint 16: Security Enhancements (~35 points)

**Goal**: Harden authentication and authorization

| Task | Points | Description |
|------|--------|-------------|
| Short-lived access tokens | 8 | 15-minute JWT with refresh tokens |
| Refresh token system | 8 | Secure token rotation |
| Token revocation | 5 | Logout/invalidation mechanism |
| SSE authentication | 5 | Single-use tokens for event streams |
| CSRF protection | 5 | Token-based CSRF mitigation |
| Password requirements | 4 | Complexity validation |

**Why High Priority**: Current auth uses long-lived tokens; refresh tokens are industry standard.

---

#### Sprint 20: Revenue Infrastructure (~40 points)

**Goal**: Enable monetization with subscription payments

| Task | Points | Description |
|------|--------|-------------|
| Stripe integration | 8 | Payment processing with webhooks |
| Subscription tiers | 5 | Starter/Pro/Publisher tiers |
| Usage quota tracking | 8 | Words, novels, API calls |
| Billing dashboard | 5 | Invoices, upgrade/downgrade |
| Free trial system | 5 | 7-day trial with limits |
| Usage alerts | 3 | Notify when approaching limits |
| Referral program | 5 | Credits for referrals |

**Pricing Strategy**:
| Tier | Price | Limits |
|------|-------|--------|
| Starter | $29/mo | 1 novel/month, 50k words |
| Professional | $79/mo | 3 novels/month, 100k words |
| Publisher | $199/mo | Unlimited, priority queue |

---

### Medium Priority

#### Sprint 25: Publishing & Marketing Tools (~47 points)

**Goal**: Support manuscript-to-market workflow

| Task | Points | Description |
|------|--------|-------------|
| Book blurb generator | 8 | Multiple blurb styles |
| Query letter generator | 5 | Agent query letters |
| Series synopsis generator | 5 | Multi-book descriptions |
| Amazon keyword optimizer | 8 | SEO for book listings |
| Comp titles suggester | 5 | Comparable published titles |
| Metadata manager | 5 | ISBN, categories, tags |
| Marketing copy export | 3 | Bundle all materials |

---

#### Sprint 28: Publishing Platform Integration (~38 points)

**Goal**: Streamline publishing workflow

| Task | Points | Description |
|------|--------|-------------|
| KDP export format | 8 | Kindle Direct Publishing ready |
| Vellum format support | 5 | Professional formatting |
| Draft2Digital integration | 8 | Multi-platform distribution |
| IngramSpark format | 5 | Print-on-demand ready |
| Atticus format | 5 | Author platform support |
| Direct upload API | 7 | Automated publishing |

---

### Low Priority

#### Sprint 21: Custom AI Training (~45 points)

**Goal**: Train AI on user's writing style

| Task | Points | Description |
|------|--------|-------------|
| Manuscript upload | 8 | Upload for analysis |
| Voice pattern extraction | 10 | Identify unique style |
| Style transfer | 8 | Apply extracted style |
| Custom model management | 10 | Save/load trained models |
| Fine-tuning integration | 9 | Claude fine-tuning API |

**Note**: Depends on Claude fine-tuning API availability

---

#### Sprint 24: Visual Enhancements (~42 points)

**Goal**: Add AI-generated imagery

| Task | Points | Description |
|------|--------|-------------|
| Image generation service | 8 | DALL-E/Stable Diffusion API |
| Character portraits | 8 | Generate from descriptions |
| Portrait gallery UI | 5 | Display and manage images |
| Location images | 5 | Key location visualization |
| Scene illustrations | 5 | Optional scene headers |
| Cover art generator | 5 | Book cover concepts |
| Visual story bible | 3 | Include images in PDF |
| Style consistency | 3 | Maintain art style |

---

#### Sprint 27: Collaboration Features (~40 points)

**Goal**: Enable team use and beta readers

| Task | Points | Description |
|------|--------|-------------|
| Multi-user sharing | 8 | Project access control |
| Role permissions | 5 | Owner/editor/viewer roles |
| Comment threads | 8 | Chapter-level comments |
| Suggestion mode | 10 | Track changes interface |
| Activity log | 5 | Change history |
| Real-time collaboration | 4 | Websocket sync |

---

#### Sprint 29: Community & Marketplace (~45 points)

**Goal**: Build user community and marketplace

| Task | Points | Description |
|------|--------|-------------|
| User profiles | 5 | Public author pages |
| Project showcase | 8 | Gallery of completed works |
| Template marketplace | 10 | Buy/sell custom templates |
| Prompt library sharing | 8 | Community prompts |
| Writing challenges | 5 | Community events |
| Feature voting | 4 | Crowdsourced roadmap |
| Review system | 5 | Template ratings |

---

#### Sprint 30: AI Agent Expansion (~40 points) ✅ COMPLETED

**Goal**: Add specialized editing agents

| Task | Points | Description | Status |
|------|--------|-------------|--------|
| Sensitivity reader | 8 | Cultural/social review | ✅ Done |
| Fact-checker agent | 6 | Research verification | ✅ Done |
| Plot hole detector | 8 | Logic consistency | ⏳ Partial (continuity editor) |
| Pacing optimizer | 6 | Scene length balancing | ⏳ Partial (dev editor) |
| Dialogue naturalness | 6 | Conversation flow | ✅ Done |
| Genre authenticity | 6 | Trope verification | ⏳ Future |

**Additional specialists implemented:**
- Beta Reader Agent (~$1.00/book)
- Opening Specialist (~$0.04/book, Ch1 only)
- Chapter Hook Specialist (~$0.80/book)

---

#### Sprint 31: Competitor Analysis & Feature Parity (~25 points)

**Goal**: Research competitor AI writing tools and identify feature gaps

| Task | Points | Description |
|------|--------|-------------|
| Sudowrite feature analysis | 5 | Review Sudowrite capabilities |
| NovelCrafter feature analysis | 5 | Review NovelCrafter capabilities |
| Feature gap identification | 8 | Map missing features to our roadmap |
| Detailed recommendations | 7 | Actionable implementation plan |

**Research Sources**:
- https://sudowrite.com/blog/sudowrite-vs-novelcrafter-the-ultimate-ai-showdown-for-novelists/
- https://techdictionary.io/sudowrite-vs-novelcrafter/
- https://expertbeacon.com/novelcrafter-vs-sudowrite-which-ai-writing-tool-is-right-for-your-novel/

**Key Questions to Answer**:
1. What unique features do competitors offer that we lack?
2. How do their pricing models compare to our proposed tiers?
3. What is their AI model approach (Claude vs GPT vs custom)?
4. How do they handle writer control vs AI autonomy?
5. What are their export and publishing integrations?
6. How do they approach world-building and character management?

**Output**: Detailed comparison document with prioritized recommendations

---

#### Sprint 32: Virtual Editorial Board (~55 points) ✅ COMPLETED

**Goal**: Post-manuscript AI review system with actionable feedback

**Overview**: After the draft manuscript is completed, it is submitted to a Virtual Editorial Board (VEB) as a background job. The VEB consists of three distinct AI personas that analyze the manuscript and produce a comprehensive "Editorial Report."

| Task | Points | Description | Status |
|------|--------|-------------|--------|
| VEB architecture design | 8 | Research approaches, design system | ✅ Done |
| Module A: Beta Swarm | 13 | Sentiment/engagement analysis | ✅ Done |
| Module B: Ruthless Editor | 13 | Structural analysis | ✅ Done |
| Module C: Market Analyst | 13 | Commercial viability | ✅ Done |
| Editorial Report UI | 5 | Display findings on dashboard | ✅ Done |
| Feedback submission system | 3 | Submit findings for rewrites | ✅ Done |

**Module A: Beta Swarm (Sentiment Analysis)**
- Input: Raw chapter text
- Persona: "Marcus" - subjective genre fan
- Tasks:
  - Annotate text with emotion tags ([BORED], [HOOKED], [CONFUSED])
  - Provide "Reader Retention Score" (1-10) per chapter
  - Identify DNF (Did Not Finish) risk points
- Output: JSON list of reactions mapped to specific paragraphs

**Module B: Ruthless Editor (Structural Analysis)**
- Input: Chapter summary + raw text
- Persona: Senior Developmental Editor
- Tasks:
  - Value Shift Detection: Identify start/end emotional charge per scene
  - Exposition Audit: Flag "telling" vs "showing" ratio issues
  - Pacing Check: Identify scenes that don't advance plot
  - Scene Purpose Validation: Does each scene earn its place?
- Output: Structured report with line-level annotations

**Module C: Market Analyst (Commercial Viability)**
- Input: Full manuscript summary (or first 3 chapters + synopsis)
- Persona: Literary Agent
- Tasks:
  - Comp Title Generation: Compare to real-world bestsellers (2020-present)
  - Hook Analysis: Grade opening line and paragraph (1-10)
  - Trope Identification: List utilized tropes and rate freshness
  - Market Positioning: Suggest target audience and marketing angle
- Output: Commercial viability report with actionable recommendations

**Implementation Approach**:
1. Research phase: Investigate optimal prompting strategies
2. Testing phase: Run VEB on existing completed novels
3. Planning phase: Design UI/UX for report display
4. Implementation: Build backend jobs and frontend components

**Workflow**:
```
Completed Manuscript → Submit to VEB (Background Job)
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    Module A          Module B          Module C
   (Beta Swarm)    (Ruthless Editor)  (Market Analyst)
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                    Editorial Report
                           │
              ┌────────────┴────────────┐
              │                         │
         Display in UI          Submit for Rewrites
                                (Targeted chapters)
```

**Estimated Cost**: ~$0.50 per full manuscript review

---

#### Sprint 33: Specialist Agent Configuration (~20 points)

**Goal**: Make specialist agents configurable to optimize cost and generation time

**Background**: The current 14-step pipeline may be excessive for initial drafts. Adding configuration options allows users to choose between speed/cost and publication quality.

| Task | Points | Description |
|------|--------|-------------|
| Project-level agent toggle | 5 | Enable/disable specialist agents per project |
| Draft vs Publication mode | 5 | Preset configurations for different use cases |
| Cost estimation display | 5 | Show estimated cost before generation |
| Selective specialist runs | 5 | Run specialists only on specific chapters |

**Configuration Options**:
- **Draft Mode**: Core editing only (8 steps, ~$0.39/chapter)
- **Publication Mode**: Core + all specialists (14 steps, ~$0.65/chapter)
- **Custom**: User selects which specialists to run

**UI Considerations**:
- Toggle on project settings page
- Cost estimate shown on generation confirmation
- Option to run specialists as a separate "polish" pass after initial generation

**Rationale**:
- Current pipeline processes 14 agents per chapter regardless of need
- Specialists add ~65% to generation cost
- Some projects (drafts, experiments) don't need full specialist review
- Running specialists post-generation allows for iterative quality improvement

---

#### Sprint 34: Comprehensive Testing - Backend Unit Tests (~45 points)

**Goal**: Achieve 80%+ unit test coverage on backend services and utilities

**Current State Analysis**:
- 29 backend test files covering ~30% of 96 source files
- 13/40 services tested, 26 services untested
- Core AI and generation services well-tested
- New features (VEB, specialist agents) completely untested

| Task | Points | Description |
|------|--------|-------------|
| VEB service tests | 8 | Test Virtual Editorial Board (Beta Swarm, Ruthless Editor, Market Analyst) |
| Specialist agents tests | 6 | Test all 6 specialist agent implementations |
| Generation pipeline tests | 8 | character-generator, world-generator, story-ideas-generator |
| Analytics service tests | 5 | analyticsService, proseAnalyzer |
| Plagiarism service tests | 5 | plagiarism-checker.service.ts |
| Genre services tests | 5 | genre-conventions, genre-tropes |
| Utility function tests | 5 | schemas, validation, genre-helpers, response-helpers |
| Test data factories | 3 | Create reusable test data builders |

**Test Infrastructure Improvements**:
- Expand mock library in `backend/src/__mocks__/`
- Create test data factories for Projects, Books, Chapters
- Add Anthropic SDK mock for AI response simulation
- Standardize async test patterns

**Coverage Targets**:
| Area | Current | Target |
|------|---------|--------|
| Services | 33% | 85% |
| Utilities | 10% | 80% |
| Overall Backend | 30% | 75% |

---

#### Sprint 35: Comprehensive Testing - Backend API/Route Tests (~40 points)

**Goal**: Achieve comprehensive API endpoint test coverage

**Current State Analysis**:
- Only 4/30 routes have tests (health, concepts, 2 integration)
- No route-level error handling tests
- No authentication/authorization tests for protected routes

| Task | Points | Description |
|------|--------|-------------|
| Generation routes tests | 8 | /generation, /outlines, /chapters endpoints |
| Content CRUD routes tests | 8 | /projects, /books, /chapters CRUD operations |
| Analysis routes tests | 6 | /plagiarism, /analytics endpoints |
| Auth routes tests | 5 | /auth login, register, token refresh |
| Export routes tests | 4 | /export PDF, DOCX, story bible |
| VEB routes tests | 5 | /veb editorial board endpoints |
| Error handling tests | 4 | 4xx/5xx responses, validation errors |

**Test Patterns**:
```typescript
// Example route test structure
describe('POST /api/generation/chapter', () => {
  it('returns 401 without auth token', async () => {...});
  it('returns 400 with invalid project ID', async () => {...});
  it('queues generation job and returns 202', async () => {...});
  it('returns 429 when rate limited', async () => {...});
});
```

**Coverage Targets**:
| Area | Current | Target |
|------|---------|--------|
| Routes | 13% | 90% |
| Middleware | 50% | 90% |
| Error Handling | 0% | 85% |

---

#### Sprint 36: Comprehensive Testing - Frontend Unit Tests (~50 points)

**Goal**: Achieve 70%+ test coverage on frontend components and hooks

**Current State Analysis**:
- Only 4 test files for 100 source files (~4% coverage)
- 6 custom hooks completely untested
- 38 components untested
- All pages untested

| Task | Points | Description |
|------|--------|-------------|
| Custom hooks tests | 10 | useProjects, useProjectProgress, useWorkflowPrerequisites, useNavigationCounts, useOfflineChapter, useStoryIdeas |
| API layer tests | 8 | api.ts, api-hooks.ts, fetch-utils.ts |
| Core component tests | 12 | ChapterEditor, ProseStyleEditor, GenreBlender, TropeSelector, Modal, Toast |
| Form component tests | 8 | All form inputs, validation, submission |
| Navigation tests | 5 | PrimaryNavigationBar, MobileNavigation, breadcrumbs |
| Utility tests | 4 | workflow-utils, plot-recommendations, constants |
| Test utilities setup | 3 | MSW for API mocking, render helpers, query client wrapper |

**Test Infrastructure**:
- Configure MSW (Mock Service Worker) for API mocking
- Create custom render wrapper with QueryClient
- Add accessibility testing with jest-axe
- Setup user-event for realistic interactions

**Coverage Targets**:
| Area | Current | Target |
|------|---------|--------|
| Hooks | 0% | 90% |
| Components | 5% | 70% |
| Utilities | 0% | 80% |
| Overall Frontend | 4% | 65% |

---

#### Sprint 37: Integration & E2E Testing (~55 points)

**Goal**: Establish comprehensive integration and end-to-end test suites

**Current State Analysis**:
- Only 2 integration tests exist (mysteries, trilogy)
- No E2E testing framework configured
- No user journey tests

| Task | Points | Description |
|------|--------|-------------|
| Playwright setup | 5 | Configure Playwright for E2E testing |
| Auth flow E2E | 8 | Login, logout, session management |
| Project creation E2E | 8 | Full project setup workflow |
| Generation pipeline E2E | 10 | Concept → Outline → Chapter generation |
| Export workflow E2E | 5 | PDF/DOCX export validation |
| Backend integration tests | 10 | Cross-service workflows, database transactions |
| CI/CD test integration | 5 | GitHub Actions test runners |
| Visual regression setup | 4 | Screenshot comparison for UI changes |

**E2E Test Scenarios**:
```
1. New User Journey
   - Register → Create Project → Generate Concept → View Dashboard

2. Novel Generation Journey
   - Select Project → Configure Settings → Generate Outline
   → Generate Chapters → View Progress → Export

3. Editing Workflow
   - Open Chapter → Edit Content → Regenerate Section
   → Compare Versions → Save Changes

4. Analytics Journey
   - Complete Novel → Trigger Analysis → View Pacing
   → View Character Tracking → Export Report
```

**Infrastructure**:
- Playwright config with multiple browsers (Chrome, Firefox, Safari)
- Test database seeding scripts
- CI pipeline with parallel test execution
- Artifact storage for failure screenshots

**Coverage Targets**:
| Test Type | Current | Target |
|-----------|---------|--------|
| Integration Tests | 2 | 15+ |
| E2E Scenarios | 0 | 10+ |
| User Journeys | 0 | 5+ |

---

#### Sprint 38: Post-Completion Features (~35 points) ✅ COMPLETED

**Goal**: Auto-trigger analytics and add sequel/series recommendations

**Status**: COMPLETE - All features implemented

**Feature 1: Auto-Analyze on Completion**

| Task | Points | Description |
|------|--------|-------------|
| Completion detection | 5 | Detect when all chapters are written |
| Auto-trigger analytics | 5 | Run "Analyze Book" automatically |
| Save analysis results | 5 | Persist to database |
| Analytics page display | 5 | Show saved results on Analytics page |
| Re-analyze option | 3 | Manual re-trigger capability |

**Workflow**:
```
All Chapters Written → Auto-detect Completion
                           ↓
                    Trigger Analytics Job
                           ↓
                    Save Results to DB
                           ↓
                    Display on Analytics Page
```

**Feature 2: Follow-Up Page (Sequel/Series Recommendations)**

| Task | Points | Description |
|------|--------|-------------|
| Follow-up page UI | 5 | New page at /projects/[id]/follow-up |
| Sequel story generator | 8 | AI-powered sequel recommendations |
| Series arc planner | 5 | Trilogy/series structure suggestions |
| Character continuation | 4 | Character arc extensions |

**Follow-Up Page Content**:
- **Sequel Ideas**: 3-5 story concepts that continue from the ending
- **Unresolved Threads**: Plot threads that could be expanded
- **Character Arcs**: How characters could develop in future books
- **World Expansion**: Unexplored aspects of the world
- **Series Structure**: Trilogy or 5-book series arc suggestions
- **Tone Variations**: Alternative directions (darker sequel, spin-off, etc.)

**AI Prompt Strategy**:
- Analyze completed manuscript's ending, themes, character states
- Identify unresolved subplots and world-building opportunities
- Generate coherent continuation ideas that respect established canon
- Suggest both direct sequels and spin-off possibilities

---

## Bug Backlog

### Remaining Issues

| Bug | Priority | Description |
|-----|----------|-------------|
| BUG-009 | Low | React hook dependency warnings |
| BUG-010 | Medium | SQL injection audit (verify all parameterized) |
| BUG-017 | Low | Magic numbers in codebase |

---

## Infrastructure Debt

### Not Yet Implemented

| Item | Sprint | Priority |
|------|--------|----------|
| Refresh tokens | 16 | High |
| CSRF protection | 16 | High |
| Stripe payments | 20 | High |
| Migration rollback | 18 | Medium |
| Database backups | 18 | Medium |
| Circuit breaker | 18 | Medium |
| Repository layer | 18 | Low |

---

## Quality Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Backend Test Coverage | 30% | 80% |
| Frontend Test Coverage | 4% | 70% |
| Backend Route Coverage | 13% | 90% |
| Integration Tests | 2 | 15+ |
| E2E Test Scenarios | 0 | 10+ |
| TypeScript Strict | ✅ | ✅ |
| Security Score | Medium | High |
| Accessibility | WCAG AA | WCAG AA |
| Performance | Good | Good |

---

## Recommended Execution Order

### Phase 3: Security & Revenue (Next 2-3 months)

1. **Sprint 16**: Security Enhancements - Fix auth gaps
2. **Sprint 20**: Revenue Infrastructure - Enable monetization

### Phase 3B: Testing & Quality (Parallel with Phase 3)

3. **Sprint 34**: Backend Unit Tests - Services and utilities (45 pts)
4. **Sprint 35**: Backend API Tests - Route coverage (40 pts)
5. **Sprint 36**: Frontend Unit Tests - Components and hooks (50 pts)
6. **Sprint 37**: Integration & E2E Tests - User journeys (55 pts)

### Phase 4: Growth Features (3-6 months)

7. **Sprint 31**: Competitor Analysis & Feature Parity
8. **Sprint 25**: Publishing & Marketing Tools
9. **Sprint 28**: Publishing Platform Integration
10. **Sprint 38**: Post-Completion Features - Auto-analytics, Follow-up page (35 pts) *(NEW)*

### Phase 5: Expansion (6-12 months)

11. **Sprint 32**: Virtual Editorial Board ✅ COMPLETED
12. **Sprint 21**: Custom AI Training
13. **Sprint 24**: Visual Enhancements
14. **Sprint 27**: Collaboration Features
15. **Sprint 29**: Community & Marketplace
16. **Sprint 30**: AI Agent Expansion ✅ COMPLETED

---

## Success Criteria

The project will achieve production readiness when:

1. ✅ Generate 80,000+ word novels autonomously
2. ✅ Maintain character/world consistency
3. ✅ Produce publication-quality prose
4. ✅ Handle rate limits automatically
5. ✅ Complete generation within 2-3 days
6. ⏳ Secure authentication (Sprint 16)
7. ⏳ Revenue generation capability (Sprint 20)

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-24 | Initial Phase 2 roadmap |
| 2.0 | 2026-01-25 | Added testing sprints 12-15 |
| 3.0 | 2026-01-26 | Consolidated from multiple docs, updated completion status |
| 4.0 | 2026-01-27 | Added comprehensive testing sprints (34-37), post-completion features (38) |
