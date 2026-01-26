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
| **Phase 2C: Remaining** (Sprints 20-21, 24-25, 27-30) | ~332 | ❌ Not Started |

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

#### Sprint 30: AI Agent Expansion (~40 points)

**Goal**: Add specialized editing agents

| Task | Points | Description |
|------|--------|-------------|
| Sensitivity reader | 8 | Cultural/social review |
| Fact-checker agent | 6 | Research verification |
| Plot hole detector | 8 | Logic consistency |
| Pacing optimizer | 6 | Scene length balancing |
| Dialogue naturalness | 6 | Conversation flow |
| Genre authenticity | 6 | Trope verification |

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

3. **Sprint 25**: Publishing & Marketing Tools
4. **Sprint 28**: Publishing Platform Integration

### Phase 5: Expansion (6-12 months)

5. **Sprint 21**: Custom AI Training
6. **Sprint 24**: Visual Enhancements
7. **Sprint 27**: Collaboration Features
8. **Sprint 29**: Community & Marketplace
9. **Sprint 30**: AI Agent Expansion

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
