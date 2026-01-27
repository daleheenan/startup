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
| **Phase 2C: Remaining** (Sprints 20-21, 24-25, 27-29, 31-32) | ~372 | ❌ Not Started |
| **Sprint 30: AI Agent Expansion** | 40 | ✅ Complete |

**Total Completed**: ~785 points | **Remaining**: ~332 points

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

#### Sprint 32: Virtual Editorial Board (~55 points)

**Goal**: Post-manuscript AI review system with actionable feedback

**Overview**: After the draft manuscript is completed, it is submitted to a Virtual Editorial Board (VEB) as a background job. The VEB consists of three distinct AI personas that analyze the manuscript and produce a comprehensive "Editorial Report."

| Task | Points | Description |
|------|--------|-------------|
| VEB architecture design | 8 | Research approaches, design system |
| Module A: Beta Swarm | 13 | Sentiment/engagement analysis |
| Module B: Ruthless Editor | 13 | Structural analysis |
| Module C: Market Analyst | 13 | Commercial viability |
| Editorial Report UI | 5 | Display findings on dashboard |
| Feedback submission system | 3 | Submit findings for rewrites |

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
| Test Coverage | 70%+ | 80% |
| TypeScript Strict | ✅ | ✅ |
| Security Score | Medium | High |
| Accessibility | WCAG AA | WCAG AA |
| Performance | Good | Good |

---

## Recommended Execution Order

### Phase 3: Security & Revenue (Next 2-3 months)

1. **Sprint 16**: Security Enhancements - Fix auth gaps
2. **Sprint 20**: Revenue Infrastructure - Enable monetization

### Phase 4: Growth Features (3-6 months)

3. **Sprint 31**: Competitor Analysis & Feature Parity *(NEW)*
4. **Sprint 25**: Publishing & Marketing Tools
5. **Sprint 28**: Publishing Platform Integration

### Phase 5: Expansion (6-12 months)

6. **Sprint 32**: Virtual Editorial Board *(NEW)*
7. **Sprint 21**: Custom AI Training
8. **Sprint 24**: Visual Enhancements
9. **Sprint 27**: Collaboration Features
10. **Sprint 29**: Community & Marketplace
11. **Sprint 30**: AI Agent Expansion ✅ COMPLETED

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
