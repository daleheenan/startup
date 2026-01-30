# NovelForge Commercial Business Model
## Complete Analysis with API Costs

**Date:** January 2026
**Version:** 1.0

---

## Executive Summary

You have built a **complete AI novel production system** (NovelForge) that gives you two synergistic income streams:

1. **Novel Publishing** - Write books at near-zero marginal cost
2. **Manuscript Report Service** - Productise the same analysis tools

Both streams use the **same underlying Claude API infrastructure**, making your cost structure your competitive moat.

---

## Part 1: NovelForge Service Mapping to Report Features

### Existing Services → Report Features

| NovelForge Service | Location | Report Feature | Build Effort |
|-------------------|----------|----------------|--------------|
| **ProseAnalyzer** | `services/proseAnalyzer.ts` | Prose quality scoring, readability | ✅ Ready |
| **Readability Service** | `services/prose-reports/readability.service.ts` | Flesch-Kincaid, Gunning Fog | ✅ Ready |
| **Passive Voice Service** | `services/prose-reports/passive-voice.service.ts` | Passive voice detection | ✅ Ready |
| **Adverbs Service** | `services/prose-reports/adverbs.service.ts` | Adverb density analysis | ✅ Ready |
| **Sentence Variety Service** | `services/prose-reports/sentence-variety.service.ts` | Sentence structure analysis | ✅ Ready |
| **Genre Conventions Service** | `services/genre-conventions.service.ts` | Genre fit scoring (romance, thriller, mystery, etc.) | ✅ Ready |
| **Tension Arc Validator** | `services/tension-arc-validator.service.ts` | Pacing analysis, plateau detection | ✅ Ready |
| **Character Arc Validator** | `services/character-arc-validator.service.ts` | Want/Need, Lie/Truth analysis | ✅ Ready |
| **Opening Hook Validator** | `services/opening-hook-validator.service.ts` | First line scoring, weak opener detection | ✅ Ready |
| **Commercial Beat Validator** | `services/commercial-beat-validator.ts` | Bestseller pattern matching | ✅ Ready |
| **Genre Tropes Service** | `services/genre-tropes.service.ts` | Trope detection and analysis | ✅ Ready |
| **Genre Inference Service** | `services/genre-inference.service.ts` | Auto-detect genre from content | ✅ Ready |

### Services Requiring Adaptation

| Feature Needed | Current Service | Adaptation Required |
|----------------|-----------------|---------------------|
| Chapter parsing from plain text | Tension Arc Validator | Remove DB dependency, accept raw text |
| Genre detection from raw text | Genre Inference Service | Already text-based ✅ |
| Show vs Tell detection | None | New Claude prompt (~2 hours) |
| Dialogue quality scoring | None | New Claude prompt (~2 hours) |
| Before/after rewrites | Claude Service | Prompt template (~1 hour) |

### New Services Required (Minimal)

| New Service | Purpose | Build Effort |
|-------------|---------|--------------|
| `manuscript-parser.service.ts` | DOCX/PDF → plain text + chapters | 1 day |
| `report-generator.service.ts` | Analysis data → PDF | 2 days |
| `manuscript-analysis-wrapper.service.ts` | Orchestrates all validators | 1 day |

**Total new code: ~4 days**
**Existing code reused: ~90%**

---

## Part 2: API Cost Analysis

### Current Claude API Pricing (Jan 2026)

From your `metrics.service.ts`:

```typescript
const PRICING = {
  INPUT_PER_MILLION: 15.0,   // $15 per 1M input tokens
  OUTPUT_PER_MILLION: 75.0,  // $75 per 1M output tokens
  USD_TO_GBP: 0.79,
};
```

### Cost Per Novel (Your Production Cost)

| Stage | API Calls | Avg Input | Avg Output | Cost (USD) | Cost (GBP) |
|-------|-----------|-----------|------------|------------|------------|
| **Concept/Outline** | 10 | 50k | 30k | $3.00 | £2.37 |
| **Chapter Generation** (40 ch) | 40 | 200k | 400k | $33.00 | £26.07 |
| **Author Agent Rewrites** | 40 | 150k | 200k | $17.25 | £13.63 |
| **4 Editor Agents** (per ch) | 160 | 300k | 150k | $15.75 | £12.44 |
| **Final Polish** | 20 | 80k | 100k | $8.70 | £6.87 |
| **TOTAL per novel** | ~270 | ~780k | ~880k | **$77.70** | **£61.38** |

**Note:** This assumes full AI generation. If you guide/edit, costs are lower.

### Cost Per Manuscript Report

| Report Tier | Analysis Steps | Input Tokens | Output Tokens | Cost (USD) | Cost (GBP) |
|-------------|----------------|--------------|---------------|------------|------------|
| **Basic** (prose only) | 4 services | 50k | 20k | $2.25 | £1.78 |
| **Full** (all analysis) | 10 services | 150k | 80k | $8.25 | £6.52 |
| **Premium** (+ rewrites) | 13 services | 250k | 150k | $15.00 | £11.85 |

### Profit Margins

| Product | Price | API Cost | Stripe Fee | Net Profit | Margin |
|---------|-------|----------|------------|------------|--------|
| Basic Report (£9) | £9.00 | £1.78 | £0.46 | **£6.76** | 75% |
| Full Report (£25) | £25.00 | £6.52 | £0.93 | **£17.55** | 70% |
| Premium Report (£49) | £49.00 | £11.85 | £1.62 | **£35.53** | 73% |
| Novel (break-even) | ~£80 | £61.38 | - | £18.62 | 23% |

**Key Insight:** Reports have 70-75% margins. Novels break even at ~30-40 sales, then pure profit.

---

## Part 3: Complete Business Model (With Accurate Costs)

### Year 1 Projections

#### Manuscript Report Service

| Month | Reports Sold | Mix (B/F/P) | Gross Revenue | API Costs | Net Revenue |
|-------|--------------|-------------|---------------|-----------|-------------|
| 1-3 | 50 total | 20/25/5 | £875 | £175 | £700 |
| 4-6 | 150 total | 50/80/20 | £2,875 | £575 | £2,300 |
| 7-9 | 300 total | 100/150/50 | £5,625 | £1,125 | £4,500 |
| 10-12 | 500 total | 150/275/75 | £9,375 | £1,875 | £7,500 |
| **Year 1 Total** | **1,000** | | **£18,750** | **£3,750** | **£15,000** |

#### Novel Publishing (Multiple Pen Names)

| Quarter | Books Published | API Cost | Cover Cost | Total Cost | Royalties | Net |
|---------|-----------------|----------|------------|------------|-----------|-----|
| Q1 | 2 | £123 | £100 | £223 | £200 | -£23 |
| Q2 | 2 (4 total) | £123 | £100 | £223 | £600 | £377 |
| Q3 | 2 (6 total) | £123 | £100 | £223 | £1,200 | £977 |
| Q4 | 2 (8 total) | £123 | £100 | £223 | £2,000 | £1,777 |
| **Year 1 Total** | **8 books** | **£492** | **£400** | **£892** | **£4,000** | **£3,108** |

#### Year 1 Combined

| Stream | Gross | Costs | Net |
|--------|-------|-------|-----|
| Reports | £18,750 | £3,750 | £15,000 |
| Novels | £4,000 | £892 | £3,108 |
| Infrastructure | - | £600 | -£600 |
| **TOTAL** | **£22,750** | **£5,242** | **£17,508** |

### Year 2 Projections (Growth Phase)

#### Reports (2,400/year = 200/month average)

| Tier | Qty | Revenue | API Cost | Net |
|------|-----|---------|----------|-----|
| Basic | 720 | £6,480 | £1,282 | £5,198 |
| Full | 1,200 | £30,000 | £7,824 | £22,176 |
| Premium | 480 | £23,520 | £5,688 | £17,832 |
| **Total** | **2,400** | **£60,000** | **£14,794** | **£45,206** |

#### Novels (12 books total, 20 backlist)

| Item | Revenue | Cost | Net |
|------|---------|------|-----|
| New books (4) | £600 | £368 | £232 |
| Backlist (12 books) | £14,400 | £0 | £14,400 |
| KU page reads | £3,600 | £0 | £3,600 |
| **Total** | **£18,600** | **£368** | **£18,232** |

#### Year 2 Combined

| Stream | Net Revenue |
|--------|-------------|
| Reports | £45,206 |
| Novels + KU | £18,232 |
| Infrastructure | -£1,200 |
| **TOTAL** | **£62,238** |

### Year 3+ Projections (Established)

| Stream | Year 3 | Year 4 | Year 5 |
|--------|--------|--------|--------|
| Reports (growing 50%/yr) | £67,800 | £100,000 | £125,000 |
| Novels (catalogue effect) | £30,000 | £45,000 | £60,000 |
| Audiobooks | £5,000 | £10,000 | £15,000 |
| Infrastructure | -£2,400 | -£3,600 | -£4,800 |
| **NET TOTAL** | **£100,400** | **£151,400** | **£195,200** |

---

## Part 4: Infrastructure Costs

### Current (Single User)

| Item | Monthly | Annual |
|------|---------|--------|
| Railway (backend) | £5 | £60 |
| Vercel (frontend) | £0 | £0 |
| Domain | £1 | £12 |
| **Total** | **£6** | **£72** |

### Report Service Launch (Year 1)

| Item | Monthly | Annual | Notes |
|------|---------|--------|-------|
| Railway (2 instances) | £20 | £240 | Handles report queue |
| Vercel Pro | £20 | £240 | Analytics, better limits |
| Redis (Upstash) | £10 | £120 | Job queue |
| Stripe fees | ~3% of revenue | ~£560 | Payment processing |
| Email (Resend) | £10 | £120 | Report delivery |
| Domain (report service) | £1 | £12 | New domain |
| **Total** | **~£61** | **~£1,292** |

### Scale Phase (Year 2+)

| Item | Monthly | Annual |
|------|---------|--------|
| Railway (scaled) | £40 | £480 |
| PostgreSQL | £20 | £240 |
| Redis | £20 | £240 |
| Cloudflare R2 | £10 | £120 |
| Monitoring (Sentry) | £25 | £300 |
| Email (higher volume) | £20 | £240 |
| **Total** | **~£135** | **~£1,620** |

---

## Part 5: Competitive Positioning

### Your Unique Advantages

| Advantage | Competitors | You |
|-----------|-------------|-----|
| **Production cost** | Authors pay £1,000+/book | You pay ~£60/book |
| **Analysis accuracy** | Generic AI | Trained on bestseller patterns |
| **Speed** | Days to weeks | Minutes |
| **Integration** | Standalone tools | Report + Writing = same platform |
| **Credibility** | "AI tool" | "Built by publishing author" |

### Positioning Options

| Position | Tagline | Target Audience |
|----------|---------|-----------------|
| **"The Author's Edge"** | "Professional analysis at indie prices" | Self-pub authors |
| **"Query Ready"** | "See what agents see before you submit" | Querying authors |
| **"Genre Benchmark"** | "How does your romance compare to bestsellers?" | Genre authors |
| **"Craft First"** | "Real editorial insights, not marketing fluff" | Serious writers |

### Recommended Positioning

**"Professional manuscript analysis by a published author who uses AI to write bestsellers."**

This positions you as:
- Credible (published author)
- Expert (uses the same tools)
- Affordable (AI-powered efficiency)
- Differentiated (not just another SaaS)

---

## Part 6: Risk Analysis

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Claude API price increase | Medium | High | Budget 50% margin buffer |
| API rate limits | Low | Medium | Queue system already planned |
| Parsing failures | Medium | Low | Refund policy, error handling |

### Market Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Competitor entry | Medium | Medium | First-mover, niche focus |
| Author AI scepticism | Low-Medium | Medium | "Published author" credibility |
| Market saturation | Low | Low | Multiple niches available |

### Financial Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Slow report adoption | Medium | Medium | Novel income as backup |
| High refund rate | Low | Low | Quality focus, satisfaction guarantee |
| Chargeback abuse | Low | Low | Stripe fraud protection |

---

## Part 7: Action Plan

### Immediate (Weeks 1-2)

| Task | Effort | Priority |
|------|--------|----------|
| Create `manuscript-parser.service.ts` | 1 day | High |
| Create `manuscript-analysis-wrapper.service.ts` | 1 day | High |
| Adapt validators for standalone text | 1 day | High |
| Set up report PDF template | 2 days | High |
| Register domain | 1 hour | High |

### Launch Phase (Weeks 3-4)

| Task | Effort | Priority |
|------|--------|----------|
| Build landing page | 2 days | High |
| Stripe integration | 1 day | High |
| File upload + processing | 2 days | High |
| Email delivery | 1 day | High |
| End-to-end testing | 2 days | High |

### Parallel: Novel Production

| Task | Timeline | Notes |
|------|----------|-------|
| Set up pen name #1 | Week 1 | Romance or thriller |
| Generate novel #1 | Weeks 2-4 | Using NovelForge |
| Publish to KDP | Week 5 | Start earning |
| Begin novel #2 | Week 5 | Pipeline |

---

## Part 8: Key Metrics to Track

### Report Service

| Metric | Target (Month 1) | Target (Month 6) |
|--------|------------------|------------------|
| Reports sold | 20 | 100 |
| Conversion rate | 3% | 5% |
| Average order value | £22 | £25 |
| Refund rate | <5% | <3% |
| NPS score | 40+ | 50+ |

### Novel Publishing

| Metric | Target (Year 1) | Target (Year 2) |
|--------|-----------------|-----------------|
| Books published | 8 | 16 |
| Monthly royalties | £300 | £1,500 |
| Email list size | 500 | 2,000 |
| Reviews per book | 20+ | 50+ |

### Financial

| Metric | Target (Year 1) | Target (Year 2) |
|--------|-----------------|-----------------|
| Total revenue | £22,750 | £78,600 |
| Total costs | £5,242 | £16,362 |
| Net profit | £17,508 | £62,238 |
| Profit margin | 77% | 79% |

---

## Conclusion

Your unique position:

1. **You've already built 90% of the report service** - existing validators just need wrappers
2. **Your API cost structure is your moat** - 75% margins vs competitors at 50%
3. **Novels + Reports create a flywheel** - each validates and funds the other
4. **Near-zero marginal cost** - every additional book/report is almost pure profit

**Recommended priority:**
1. Launch report service (4 weeks) - immediate revenue
2. Publish 2 novels (parallel) - build catalogue
3. Scale both based on traction

**Year 1 realistic target: £17,500 net profit**
**Year 3 realistic target: £100,000 net profit**

---

*Document generated: January 2026*
