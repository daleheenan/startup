# NovelForge - Project Roadmap

**Last Updated**: 2026-01-29
**Document Version**: 4.0

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
| **Phase 2D: Bestseller Features** (Sprints 39-44) | ~255 | ❌ Not Started |
| **Phase 3B: Testing & Quality** (Sprints 34-37) | 190 | ❌ Not Started |
| **Sprint 38: Post-Completion Features** | 35 | ❌ Not Started |
| **Sprint 30: AI Agent Expansion** | 40 | ✅ Complete |
| **Sprint 32: Virtual Editorial Board** | 55 | ✅ Complete |

**Total Completed**: ~840 points | **Remaining**: ~812 points

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

### Phase 2D: Bestseller Features (NEW)

Based on competitive research (Sudowrite, NovelAI, ProWritingAid) and traditional publishing requirements, these sprints add features essential for producing bestselling books.

---

#### Sprint 39: Traditional Publishing Support (~45 points)

**Goal**: Provide complete support for authors pursuing traditional publishing

**Why Needed**: Literary agents require specific submission formats. Authors need query letters, synopses, and properly formatted manuscripts. Currently, authors must use separate tools.

**Competitive Gap**: No AI writing tool provides complete agent submission packages.

| Task | Points | Description |
|------|--------|-------------|
| Query letter generator | 8 | 3-paragraph format with hook, synopsis, bio |
| Query letter templates | 3 | Genre-specific templates (romance, thriller, fantasy, etc.) |
| 1-2 page synopsis generator | 8 | Beat-by-beat plot summary for agents |
| Agent submission package export | 5 | Bundle: query + synopsis + first 3 chapters |
| Manuscript formatting options | 8 | Standard submission format (12pt TNR, 1" margins, .docx) |
| Title page generator | 3 | Professional title page with contact info, word count |
| Submission tracker | 5 | Track agent queries, responses, rejections |
| Comp titles suggester | 5 | Find comparable published titles for query letters |

**Query Letter Structure**:
```
Paragraph 1: Hook + premise (2-3 sentences)
Paragraph 2: Main conflict + stakes (3-4 sentences)
Paragraph 3: Bio + why this agent (2-3 sentences)
```

**Synopsis Requirements**:
- 1-2 pages single-spaced
- Present tense, third person
- All major plot points including ending
- Character motivations clear

**Submission Format Compliance**:
- 12pt Times New Roman
- 1-inch margins all sides
- Double-spaced body text
- Header: Author surname / TITLE / Page #
- .docx format (not PDF)

---

#### Sprint 40: ProWritingAid-Style Reports (~50 points)

**Goal**: Provide comprehensive prose analysis reports matching industry-standard tools

**Why Needed**: Authors expect 20+ analysis reports from editing software. ProWritingAid dominates fiction editing because of its pacing, echoes, and dialogue tag reports. NovelForge already has AI analysis but doesn't present it as actionable reports.

**Competitive Gap**: ProWritingAid offers 25+ reports; NovelForge has analytics but not report-style presentation.

| Task | Points | Description |
|------|--------|-------------|
| Pacing report | 8 | Visualise slow (narrative) vs fast (dialogue/action) sections |
| Echoes report | 5 | Highlight repeated words/phrases within proximity |
| Sentence variety report | 5 | Sentence length distribution, structure patterns |
| Dialogue tags report | 5 | Identify overused tags, "said" alternatives |
| Sticky sentences report | 5 | Flag sentences with too many glue words |
| Readability report | 5 | Grade level, Flesch-Kincaid, complex word percentage |
| Overused words report | 5 | Personal word frequency vs average |
| Adverb report | 3 | Flag -ly adverbs, suggest stronger verbs |
| Passive voice report | 3 | Identify passive constructions |
| Report dashboard UI | 6 | Unified view with drill-down to specific issues |

**Pacing Report Features**:
```
Chapter 1: ████░░████░░░████████░░ (62% fast)
Chapter 2: ░░░░████░░░░░████░░░░░░ (35% fast) ⚠️ Slow
Chapter 3: ████████████░░████████ (85% fast) ✓ Action

Legend: █ = dialogue/action, ░ = narrative/description
```

**Echoes Detection**:
- Flag same word used within 200 words
- Exclude common words (the, and, but)
- Show frequency heatmap
- One-click navigation to occurrences

**Integration with Existing Analytics**:
- Extend current Analytics page
- Add "Reports" tab alongside existing metrics
- Link to specific paragraphs/sentences for each issue
- "Fix with AI" option for flagged issues

---

#### Sprint 41: KDP/Publishing-Ready Export (~40 points)

**Goal**: Export publication-ready files for all major platforms

**Why Needed**: Authors currently export DOCX then use Atticus/Vellum for formatting. Direct KDP-ready export removes this friction and positions NovelForge as a complete solution.

**Competitive Gap**: Atticus and Vellum dominate because they produce publication-ready files.

| Task | Points | Description |
|------|--------|-------------|
| EPUB export (KDP-compliant) | 8 | Validated against KDP requirements |
| MOBI export | 5 | Kindle legacy format |
| Print-ready PDF | 8 | Proper margins, trim sizes, bleed |
| Front matter templates | 5 | Title page, copyright, dedication, TOC |
| Back matter templates | 5 | Author bio, also by, preview chapter |
| ISBN/metadata embedding | 3 | Embed ISBN, author, categories |
| Multiple trim sizes | 3 | 5x8, 5.5x8.5, 6x9 |
| Style presets | 3 | Chapter heading styles, fonts, spacing |

**KDP EPUB Requirements**:
- Valid EPUB 3.0
- Embedded fonts (subset)
- Proper TOC with NCX
- Cover image embedded
- Metadata complete

**Print PDF Requirements**:
```
Trim Size: 6" x 9" (most common)
Margins:
  - Inside (gutter): 0.75"
  - Outside: 0.5"
  - Top: 0.75"
  - Bottom: 0.75"
Bleed: 0.125" (for images)
```

**Front Matter Order**:
1. Half title page
2. Title page
3. Copyright page
4. Dedication (optional)
5. Table of contents
6. Epigraph (optional)

**Back Matter Order**:
1. Acknowledgements
2. Author's note
3. Also by [Author]
4. About the author
5. Preview chapter (optional)

---

#### Sprint 42: Genre Convention Validator (~35 points)

**Goal**: Validate manuscripts meet reader expectations for their genre

**Why Needed**: Genre conventions are non-negotiable. A romance without HEA (Happily Ever After) gets 1-star reviews. A thriller without a ticking clock loses tension. Currently, NovelForge doesn't enforce genre-specific requirements.

**Competitive Gap**: No AI tool validates genre conventions before publication.

| Task | Points | Description |
|------|--------|-------------|
| Genre convention database | 8 | Required elements per genre (50+ genres) |
| Convention validator service | 10 | AI-powered validation against requirements |
| Validation report UI | 5 | Checklist with pass/fail for each convention |
| Convention gap warnings | 5 | Alert when required elements missing |
| Trope library | 4 | 200+ tropes with descriptions |
| Trope tagging | 3 | Auto-detect tropes in manuscript |

**Genre Conventions Database**:

| Genre | Mandatory Conventions |
|-------|----------------------|
| **Romance** | HEA/HFN ending, meet-cute, emotional journey, relationship focus |
| **Thriller** | Ticking clock, escalating stakes, protagonist in danger, twist/reveal |
| **Mystery** | Fair clues planted, satisfying reveal, detective figure, crime to solve |
| **Fantasy** | Magic system, world-building, clear rules, chosen one/quest optional |
| **Horror** | Atmosphere of dread, monster/threat, isolation, survival stakes |
| **Sci-Fi** | Technology/science premise, world logic, exploration theme |
| **Literary** | Character focus, prose quality, thematic depth, ambiguous ending OK |

**Validation Workflow**:
```
Manuscript Complete → Run Convention Validator
                           ↓
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   Check Required     Check Tropes      Check Taboos
    Conventions        Present          Avoided
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ↓
              Convention Report
              ✓ HEA ending present
              ✓ Meet-cute in Chapter 2
              ⚠️ Low romantic tension in Act 2
              ✓ No cheating between leads
```

**Reader Expectation Warnings**:
- Romance: "Warning: Leads don't meet until Chapter 5 (typical: Ch 1-2)"
- Thriller: "Warning: No ticking clock element detected"
- Mystery: "Warning: Solution involves information not available to reader"

---

#### Sprint 43: Bestseller Formula Integration (~40 points)

**Goal**: Integrate bestseller craft elements into the generation pipeline

**Why Needed**: Research shows bestsellers follow specific patterns. Opening hooks, tension arcs, and character arcs are predictable. Enforcing these patterns increases commercial success likelihood.

**Competitive Gap**: No tool validates against bestseller formulas.

| Task | Points | Description |
|------|--------|-------------|
| Opening hook validator | 8 | Score first line/paragraph (1-10) |
| Weak opener detection | 5 | Flag weather, waking up, mirror descriptions |
| Tension arc validator | 8 | Score tension per scene, validate escalation |
| Plateau scene detection | 5 | Flag scenes with flat tension |
| Character arc validator | 8 | Track want vs need, lie to truth journey |
| Inciting incident timing | 3 | Ensure inciting incident by Chapter 3 |
| Bestseller checklist UI | 3 | Interactive checklist before generation |

**Opening Hook Scoring**:
```
Score 1-3: Weak - Static description, no character agency
Score 4-6: Average - Some interest, but passive
Score 7-8: Good - Immediate engagement, question raised
Score 9-10: Excellent - Compelling, impossible to stop

Weak Openers to Flag:
- Weather descriptions ("It was a dark and stormy night...")
- Character waking up ("John's alarm blared at 6am...")
- Mirror descriptions ("She studied her reflection...")
- Information dumps ("In the year 2045, the world had changed...")
- Passive voice ("The door was opened...")
```

**Tension Arc Requirements**:
```
Act 1: Tension rises from 3 → 5
Act 2A: Tension peaks at 6-7 (midpoint)
Act 2B: Tension rises to 7-8 (all is lost)
Act 3: Climax at 9-10, resolution at 4-5

Plateau Warning: 2+ consecutive scenes at same tension level
```

**Character Arc Validation**:
```
Protagonist Requirements:
□ Has WANT (external goal)
□ Has NEED (internal growth)
□ Believes a LIE at start
□ Discovers TRUTH by end
□ Transformation visible in final act
```

---

#### Sprint 44: Bestseller Mode (~45 points)

**Goal**: Premium mode that enforces all bestseller criteria for commercial success

**Why Needed**: Combines all bestseller features into a single, premium workflow that maximises commercial success likelihood.

**Business Model**: Premium feature at +$20/book on top of base subscription

| Task | Points | Description |
|------|--------|-------------|
| Bestseller mode toggle | 5 | Enable/disable in project settings |
| Pre-generation checklist | 8 | Mandatory validation before generation |
| Bestseller generation prompts | 10 | Enhanced prompts optimised for commercial fiction |
| Real-time validation during generation | 8 | Validate as chapters complete |
| Commercial viability scoring | 5 | Predict market success (1-100) |
| Marketing package generation | 5 | Auto-generate blurb, tagline, keywords |
| Bestseller report | 4 | Post-generation comprehensive analysis |

**Bestseller Mode Checklist**:
```
PRE-WRITING VALIDATION
━━━━━━━━━━━━━━━━━━━━━
□ Strong premise with clear hook
□ Genre conventions identified
□ Target tropes selected (min 3)
□ Comp titles identified (min 2)
□ Word count target set per genre

STRUCTURE VALIDATION
━━━━━━━━━━━━━━━━━━━
□ Save the Cat beats mapped
□ Inciting incident by Chapter 3
□ Midpoint reversal present
□ All is Lost moment placed
□ Satisfying resolution planned

CHARACTER VALIDATION
━━━━━━━━━━━━━━━━━━━━
□ Protagonist has WANT and NEED
□ Protagonist believes a LIE
□ Character arc complete by end
□ Voice samples distinct

GENERATION BLOCKED UNTIL ALL ✓
```

**Bestseller Mode Enhanced Generation**:
- All 14 agents enabled (no Draft mode)
- Opening hook optimisation pass
- Tension arc enforcement
- Genre convention compliance
- Commercial beat validation
- Post-generation VEB analysis

**Commercial Viability Score**:
```
Score Components:
- Opening Hook Strength: 20%
- Genre Convention Compliance: 20%
- Tension Arc Quality: 15%
- Character Arc Completeness: 15%
- Trope Effectiveness: 10%
- Prose Quality (VEB): 10%
- Market Positioning: 10%

Score 80+: High commercial potential
Score 60-79: Good with revisions
Score 40-59: Needs significant work
Score <40: Major revision required
```

**Auto-Generated Marketing Package**:
```
1. Book Blurb (150-200 words)
   - Hook line
   - Setup paragraph
   - Stakes paragraph
   - Tagline

2. Amazon Keywords (7)
   - Genre + subgenre
   - Tropes
   - Comp title variants

3. Category Recommendations
   - Primary BISAC
   - Secondary BISAC
   - Amazon browse categories

4. Series Positioning (if applicable)
   - Series tagline
   - Book-specific hooks
```

**Pricing Integration**:
```
Base Generation: Included in subscription
Bestseller Mode: +$20 per book
  - Includes all validation
  - Includes marketing package
  - Includes comprehensive report
  - Priority queue
```

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
2. **Sprint 20**: Revenue Infrastructure - Enable monetisation

### Phase 3B: Testing & Quality (Parallel with Phase 3)

3. **Sprint 34**: Backend Unit Tests - Services and utilities (45 pts)
4. **Sprint 35**: Backend API Tests - Route coverage (40 pts)
5. **Sprint 36**: Frontend Unit Tests - Components and hooks (50 pts)
6. **Sprint 37**: Integration & E2E Tests - User journeys (55 pts)

### Phase 4: Bestseller Features (HIGH PRIORITY - 3-6 months)

Based on competitive research, these features are critical for market positioning:

7. **Sprint 42**: Genre Convention Validator - Ensure reader expectations met (35 pts)
8. **Sprint 43**: Bestseller Formula Integration - Opening hooks, tension arcs (40 pts)
9. **Sprint 40**: ProWritingAid-Style Reports - 10 analysis reports (50 pts)
10. **Sprint 39**: Traditional Publishing Support - Query letters, synopses (45 pts)
11. **Sprint 41**: KDP/Publishing-Ready Export - EPUB, print PDF (40 pts)
12. **Sprint 44**: Bestseller Mode - Premium commercial validation (45 pts)

### Phase 5: Growth Features (6-9 months)

13. **Sprint 31**: Competitor Analysis & Feature Parity
14. **Sprint 25**: Publishing & Marketing Tools
15. **Sprint 28**: Publishing Platform Integration
16. **Sprint 38**: Post-Completion Features - Auto-analytics, Follow-up page (35 pts)

### Phase 6: Expansion (9-12 months)

17. **Sprint 32**: Virtual Editorial Board ✅ COMPLETED
18. **Sprint 21**: Custom AI Training
19. **Sprint 24**: Visual Enhancements
20. **Sprint 27**: Collaboration Features
21. **Sprint 29**: Community & Marketplace
22. **Sprint 30**: AI Agent Expansion ✅ COMPLETED

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
| 5.0 | 2026-01-29 | Added Bestseller Features phase (Sprints 39-44): Traditional Publishing Support, ProWritingAid-Style Reports, KDP Export, Genre Convention Validator, Bestseller Formula, Bestseller Mode. Based on competitive research vs Sudowrite, NovelAI, ProWritingAid. |
