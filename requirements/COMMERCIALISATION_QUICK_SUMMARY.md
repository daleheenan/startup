# NovelForge Commercialisation - Executive Quick Summary

**Date:** January 2026
**Scope:** Scale from 1 to 5 users (now), then 250 users
**Current Stack:** Next.js 14 + Express + SQLite (single-user architecture)

---

## 1. Quick Wins (Do First - Low Effort)

### Week 1-2: Foundation
| Item | Effort | Impact |
|------|--------|--------|
| Add basic user authentication (NextAuth.js) | 2 days | Essential for multi-user |
| Environment-based configuration | 1 day | Deploy flexibility |
| Add user_id column to all tables | 1 day | Data isolation |
| Basic rate limiting per user | 1 day | Fair usage |
| Add Google Analytics / Plausible | 0.5 days | Usage insights |

### Week 2-3: Quick SEO Wins
| Item | Effort | Impact |
|------|--------|--------|
| Meta tags and Open Graph | 0.5 days | Social sharing |
| Sitemap.xml generation | 0.5 days | Search indexing |
| Landing page with writer-focused copy | 2 days | Conversion |
| Blog section (Markdown-based) | 1 day | Content marketing |

**Estimated Total: 2-3 weeks for a 5-user pilot**

---

## 2. Core Infrastructure Changes (Must Do for Multi-User)

### Database Migration (SQLite to PostgreSQL)
**Why:** SQLite is single-writer, not suitable for concurrent multi-user access.

**Action Plan:**
1. Use Drizzle ORM or Prisma for database abstraction (enables easy switching)
2. Migrate to PostgreSQL (recommended: Railway, Supabase, or Neon)
3. Add connection pooling (PgBouncer built into managed services)

**Effort:** 3-5 days migration + testing

### Session & Job Queue Architecture
**Current:** In-process job queue tied to single server instance

**Required Changes:**
| Component | Current | Target |
|-----------|---------|--------|
| Job Queue | In-memory SQLite | Redis + BullMQ |
| Sessions | File-based | Redis/Database sessions |
| File Storage | Local filesystem | S3-compatible (Cloudflare R2, AWS S3) |
| Real-time | SSE per connection | Redis pub/sub + SSE |

**Effort:** 1-2 weeks

### Multi-Tenant Data Isolation
```sql
-- Add to all tables
ALTER TABLE projects ADD COLUMN user_id TEXT NOT NULL;
ALTER TABLE books ADD COLUMN user_id TEXT NOT NULL;
ALTER TABLE chapters ADD COLUMN user_id TEXT NOT NULL;
ALTER TABLE jobs ADD COLUMN user_id TEXT NOT NULL;

-- Row-level security enforcement in queries
```

**Effort:** 2-3 days

### Scaling Architecture for 250 Users

```
                    ┌─────────────────┐
                    │   Cloudflare    │
                    │   (CDN + WAF)   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼────────┐    │    ┌────────▼────────┐
     │   Frontend      │    │    │   Frontend      │
     │   (Vercel)      │    │    │   (Vercel)      │
     └─────────────────┘    │    └─────────────────┘
                            │
                   ┌────────▼────────┐
                   │   Load Balancer │
                   └────────┬────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
   ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
   │  Backend  │     │  Backend  │     │  Worker   │
   │  API (1)  │     │  API (2)  │     │  (Jobs)   │
   └─────┬─────┘     └─────┬─────┘     └─────┬─────┘
         │                 │                 │
         └────────────┬────┴─────────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
   ┌─────▼─────┐ ┌────▼────┐ ┌────▼────┐
   │PostgreSQL │ │  Redis  │ │   S3    │
   │           │ │(Queue)  │ │(Exports)│
   └───────────┘ └─────────┘ └─────────┘
```

---

## 3. Payment Recommendation (Clear Path)

### Recommended: Stripe
**Why Stripe:**
- Industry standard, excellent documentation
- Built-in subscription management
- Usage-based billing support (essential for AI costs)
- Stripe Checkout = minimal frontend work
- UK/EU compliant (SCA, VAT handling)

### Pricing Model Suggestion

| Tier | Price/Month | Included | Overage |
|------|-------------|----------|---------|
| **Hobby** | Free | 1 project, 3 chapters | - |
| **Writer** | GBP 15 | 5 projects, unlimited chapters | - |
| **Pro** | GBP 35 | Unlimited projects, priority queue | - |
| **Enterprise** | Custom | Volume, API access | Negotiated |

### Implementation Path
1. **Phase 1 (Week 1):** Stripe account, test mode integration
2. **Phase 2 (Week 2):** Stripe Checkout for subscriptions
3. **Phase 3 (Week 3):** Webhook handlers for subscription events
4. **Phase 4 (Week 4):** Usage tracking + entitlement enforcement

**Effort:** 2-3 weeks for full implementation

### Key Stripe Features to Use
- `stripe checkout sessions` - Hosted payment page
- `stripe billing portal` - Customer self-service
- `stripe webhooks` - Subscription lifecycle events
- `stripe metered billing` - For usage-based (if needed later)

---

## 4. Author Analytics Service (Brief Concept Validation)

### Service Concept: "Manuscript Insight Report"

**Value Proposition:** Authors upload a manuscript (draft or complete) and receive an AI-powered analysis report covering:

1. **Prose Quality Score** - Readability, sentence variety, passive voice ratio
2. **Pacing Analysis** - Chapter-by-chapter tension/action graph
3. **Character Voice Consistency** - Dialogue attribution accuracy
4. **Genre Fit Assessment** - How well it matches genre conventions
5. **Commercial Potential Estimate** - Based on market trends
6. **Detailed Recommendations** - Actionable improvement suggestions

### Market Validation Indicators
| Signal | Status |
|--------|--------|
| Existing demand (editors, beta readers) | Strong - GBP 200-500 per manuscript edit |
| Self-pub market size | 1M+ self-published books/year |
| AI writing tool adoption | Growing rapidly |
| Competition | Limited AI-specific manuscript analysis |

### Technical Feasibility
**Already Built:**
- `proseAnalyzer.ts` - Sentence analysis, readability
- `analyticsService.ts` - Basic analytics
- `genre-conventions.service.ts` - Genre pattern matching
- AI agent infrastructure

**Needs Building:**
- Manuscript upload/parsing (DOCX, PDF)
- Report generation pipeline
- PDF report export
- Separate pricing/billing

### Monetisation Options
| Model | Price Point | Notes |
|-------|-------------|-------|
| Per-report | GBP 15-25 | One-off, low commitment |
| Bundle (5 reports) | GBP 50 | Discount for volume |
| Included in Pro tier | - | Upsell driver |
| API access | Per-word pricing | B2B publishers |

### Build vs Wait Recommendation
**Recommendation:** Build a minimal viable version (MVP) as an upsell feature for Pro tier users first. If traction is strong, spin out as a standalone service.

**MVP Effort:** 2-3 weeks (leveraging existing analysis services)

---

## 5. Estimated Costs (Ballpark Monthly at 250 Users)

### Infrastructure Costs

| Service | Provider | Est. Monthly Cost |
|---------|----------|-------------------|
| **Hosting (Frontend)** | Vercel Pro | GBP 20 |
| **Hosting (Backend)** | Railway (2 instances) | GBP 40 |
| **Database** | Railway PostgreSQL | GBP 20 |
| **Redis** | Railway/Upstash | GBP 10 |
| **Object Storage** | Cloudflare R2 | GBP 5 (egress free) |
| **CDN** | Cloudflare Free | GBP 0 |
| **Monitoring** | Sentry (Team) | GBP 25 |
| **Email** | Resend/Postmark | GBP 10 |
| **Domain + SSL** | Cloudflare | GBP 10/year |
| **Subtotal (Infrastructure)** | | **~GBP 130/month** |

### AI Costs (Variable - Depends on Usage Model)

**Assumptions:**
- 250 active users
- Average 2 novel projects per user per month
- 40 chapters per novel
- ~5 AI calls per chapter (author + 4 editors)

| Scenario | Monthly AI Calls | Est. Cost |
|----------|-----------------|-----------|
| **Light usage** (20% active) | 40,000 | GBP 400-800 |
| **Medium usage** (50% active) | 100,000 | GBP 1,000-2,000 |
| **Heavy usage** (80% active) | 160,000 | GBP 1,600-3,200 |

**Note:** Costs depend heavily on Claude API pricing and whether users are on Claude Max subscriptions (which offload costs to users).

### Total Monthly Cost Estimate (250 Users)

| Category | Low | Medium | High |
|----------|-----|--------|------|
| Infrastructure | GBP 130 | GBP 130 | GBP 130 |
| AI Costs | GBP 400 | GBP 1,200 | GBP 2,500 |
| Payment Processing (3%) | GBP 110 | GBP 180 | GBP 260 |
| **Total** | **GBP 640** | **GBP 1,510** | **GBP 2,890** |

### Revenue Projection (250 Users)

| Scenario | Mix | Monthly Revenue |
|----------|-----|-----------------|
| Conservative | 60% Hobby, 30% Writer, 10% Pro | GBP 2,000 |
| Balanced | 40% Hobby, 40% Writer, 20% Pro | GBP 3,250 |
| Optimistic | 20% Hobby, 50% Writer, 30% Pro | GBP 4,875 |

**Break-even:** Achievable with ~40-60 paying users at GBP 15-35/month

---

## 6. Priority Order (Implementation Roadmap)

### Phase 1: Pilot Ready (Weeks 1-4)
**Goal:** Support 5 beta users

1. **Add user authentication** (NextAuth.js with email/password)
2. **Add user_id to database schema** (multi-tenant prep)
3. **Basic usage limits** (projects per user)
4. **Landing page** with beta signup
5. **Manual onboarding** (no payments yet)

### Phase 2: Payment & Scale Prep (Weeks 5-8)
**Goal:** Ready for 50 paying users

6. **Migrate to PostgreSQL** (Railway or Supabase)
7. **Integrate Stripe** (subscriptions + Checkout)
8. **Add Redis for job queue** (BullMQ)
9. **File storage migration** (S3/R2 for exports)
10. **Basic SEO** (meta tags, sitemap, blog)

### Phase 3: Growth Ready (Weeks 9-12)
**Goal:** Scale to 250 users

11. **Horizontal scaling** (multiple backend instances)
12. **CDN + caching** (Cloudflare)
13. **Monitoring + alerting** (Sentry, uptime)
14. **Author Analytics MVP** (Pro tier feature)
15. **Content marketing** (writing tips blog, SEO)

### Phase 4: Optimisation (Ongoing)
**Goal:** Profitability + retention

16. **Usage analytics** (identify power users, churn risk)
17. **A/B testing** (pricing, features)
18. **Referral programme**
19. **API access** (B2B opportunity)
20. **Mobile-friendly improvements**

---

## Key Decisions Required

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Database | PostgreSQL (Railway), Supabase, PlanetScale | Railway PostgreSQL (simplicity) |
| Auth | NextAuth, Clerk, Auth0 | NextAuth (cost, control) |
| Payments | Stripe, Paddle, LemonSqueezy | Stripe (UK compliance, features) |
| Hosting | Vercel+Railway, Render, Fly.io | Vercel (FE) + Railway (BE) |
| AI Billing | Per-user, per-project, unlimited | Per-tier limits (predictable costs) |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI costs spiral | Implement hard limits per tier; cache common operations |
| Claude API changes | Abstract AI calls behind service layer; evaluate alternatives |
| Low conversion | Generous free tier to build word-of-mouth; focus on writer communities |
| Data loss | Automated backups; export-your-data feature |
| Competition | Focus on novel-specific features; build community |

---

## Next Steps

1. **Immediate:** Set up NextAuth.js and add user_id columns
2. **This Week:** Create landing page with beta signup form
3. **Next Week:** Contact 5 beta users from writer communities
4. **Week 3:** Begin PostgreSQL migration planning
5. **Week 4:** Set up Stripe test account

---

*Document Version: 1.0*
*Last Updated: January 2026*
