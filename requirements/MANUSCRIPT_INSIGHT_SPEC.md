# Manuscript Insight Report - Product Specification

**Version**: 1.0
**Date**: 2026-01-29
**Author**: Emily Rodriguez, Senior Product Manager
**Status**: Draft for Review

---

## Executive Summary

### The Opportunity

Authors spend months or years writing novels but lack accessible, professional-grade analysis tools to identify commercial weaknesses before querying agents or self-publishing. ProWritingAid and AutoCrit exist but require subscriptions (£70-120/year), and many authors only need analysis once per manuscript.

### The Product

**Manuscript Insight Report** is a one-time purchase, automated manuscript analysis service delivering professional editorial insights in a comprehensive PDF report. No account required, no subscription, no ongoing relationship - just upload, pay, wait 5-10 minutes, and receive a 15-20 page analysis.

### Business Model

- **One-time payments** via Stripe Checkout
- **Three pricing tiers**: Basic (£9), Full (£25), Premium (£49)
- **Minimal ongoing costs**: Claude API usage, email delivery, temporary storage
- **Target margin**: 70-80% after AI costs
- **Passive income model**: Automated pipeline, no manual intervention required

### Technical Foundation

Leverages existing NovelForge services:
- Prose quality analysis (readability, passive voice, sentence variety)
- Pacing and tension arc validation
- Genre convention checking
- Character arc analysis
- Opening hook scoring

New infrastructure required:
- Static landing page (Next.js)
- Stripe integration
- File upload/parsing
- PDF generation
- Email delivery

### Success Criteria

- **Launch MVP**: 4 weeks from approval
- **Revenue target**: £500/month within 3 months
- **User satisfaction**: 4.5+ star rating on payment platform
- **Processing reliability**: 95%+ success rate
- **Automation level**: Zero manual intervention for successful reports

---

## User Stories

### Primary User Stories

**US-1: As an author who has finished my first draft**, I want to receive professional-grade analysis of my manuscript's commercial potential without paying for an annual subscription, so that I can identify weaknesses before querying agents or self-publishing.

**Acceptance Criteria:**
- Given I visit the landing page
- When I click "Get Your Report"
- Then I am taken to Stripe Checkout with clear pricing options
- And I can complete payment in under 2 minutes
- And I receive a confirmation email immediately after payment

**US-2: As a paying customer**, I want to upload my manuscript in a standard format and receive my report via email within 10 minutes, so that I don't need to create an account or remember login credentials.

**Acceptance Criteria:**
- Given I have completed Stripe payment
- When I am redirected to the upload page
- Then I can upload a DOCX or PDF file up to 500,000 words
- And I see real-time progress updates during processing
- And I receive the PDF report via email within 10 minutes
- And the report is also available for immediate download on the success page

**US-3: As someone evaluating the service**, I want to see a sample report and clear pricing before purchasing, so that I understand exactly what I'm paying for.

**Acceptance Criteria:**
- Given I visit the landing page
- When I scroll to the "Sample Report" section
- Then I can download a real sample PDF showing all report sections
- And I can see feature comparison between pricing tiers
- And I can read testimonials from previous customers (post-MVP)

### Secondary User Stories

**US-4: As a customer with processing issues**, I want to receive a refund and clear explanation if my report fails to generate, so that I don't lose money due to technical problems.

**Acceptance Criteria:**
- Given report processing has failed after 3 retry attempts
- When the system detects the failure
- Then I receive an email with explanation and apology
- And my payment is automatically refunded via Stripe
- And the failed manuscript is logged for manual review (to improve system)

**US-5: As a repeat customer**, I want to purchase multiple reports with a discount code, so that I can analyse multiple manuscripts affordably.

**Acceptance Criteria:**
- Given I am a previous customer
- When I receive my first report email
- Then it includes a 20% discount code for future reports
- And the code is valid for 6 months
- And it can be applied at Stripe Checkout

---

## Functional Requirements

### FR-1: Landing Page

**Description:** Static marketing page showcasing the service, sample report, pricing, and CTA.

**Requirements:**
- **FR-1.1** Hero section with clear value proposition: "Professional manuscript analysis in minutes, not months"
- **FR-1.2** Feature highlights (what's included in each tier)
- **FR-1.3** Pricing table with three tiers (Basic, Full, Premium)
- **FR-1.4** Downloadable sample report (PDF, watermarked "SAMPLE")
- **FR-1.5** FAQ section addressing common questions
- **FR-1.6** Privacy statement emphasising manuscript deletion within 24 hours
- **FR-1.7** Trust signals (SSL badge, Stripe badge, GDPR compliant)
- **FR-1.8** Mobile-responsive design
- **FR-1.9** SEO optimised for "manuscript analysis", "novel critique", "book editing report"
- **FR-1.10** Analytics tracking (Vercel Analytics or Plausible)

**Technical Notes:**
- Next.js static export, hosted on Vercel
- TailwindCSS for styling
- No backend required (fully static)

---

### FR-2: Stripe Checkout Integration

**Description:** Secure payment processing via Stripe Checkout for one-time purchases.

**Requirements:**
- **FR-2.1** Three Stripe products (Basic £9, Full £25, Premium £49)
- **FR-2.2** Checkout session created with line items and customer email
- **FR-2.3** Success URL redirects to upload page with session ID
- **FR-2.4** Cancel URL returns to landing page with message "Payment cancelled - no charge made"
- **FR-2.5** Stripe metadata includes pricing tier, timestamp, referral source
- **FR-2.6** Webhook endpoint receives `checkout.session.completed` events
- **FR-2.7** Webhook validates signature and processes payment
- **FR-2.8** Discount codes supported (Stripe Promotion Codes)
- **FR-2.9** VAT/tax handled automatically by Stripe Tax (enable if required)
- **FR-2.10** Email receipt sent by Stripe

**Technical Notes:**
- Use Stripe Checkout (hosted payment page, not embedded)
- Webhook secret stored in environment variable
- Idempotency key used to prevent duplicate processing

---

### FR-3: File Upload

**Description:** Secure, temporary upload of manuscript files (DOCX or PDF).

**Requirements:**
- **FR-3.1** Upload page only accessible with valid Stripe session ID
- **FR-3.2** Accepted file types: .docx, .pdf
- **FR-3.3** Maximum file size: 50MB (approx 500,000 words)
- **FR-3.4** Drag-and-drop upload interface
- **FR-3.5** File validation: type checking, size limits, virus scanning (optional for MVP)
- **FR-3.6** Upload progress bar with percentage
- **FR-3.7** Error messages for invalid files: "Only DOCX and PDF files accepted" / "File too large (max 50MB)"
- **FR-3.8** After upload, immediate processing starts automatically
- **FR-3.9** Upload URL expires after 1 hour (prevent sharing)
- **FR-3.10** Files stored temporarily with unique job ID as filename

**Technical Notes:**
- Use Uploadthing or AWS S3 with presigned URLs
- Files stored in `/temp/{job-id}.{ext}` folder
- CORS configured for domain only

---

### FR-4: Manuscript Parsing

**Description:** Extract plain text from DOCX and PDF files for analysis.

**Requirements:**
- **FR-4.1** DOCX parsing via `mammoth.js` - extract text while preserving paragraph structure
- **FR-4.2** PDF parsing via `pdf-parse` - extract text content
- **FR-4.3** Text normalisation: remove excessive whitespace, standardise line breaks
- **FR-4.4** Dialogue detection: identify quoted text for dialogue analysis
- **FR-4.5** Chapter detection: parse chapter headings (Chapter 1, Chapter One, CHAPTER ONE, etc.)
- **FR-4.6** Word count calculation (accurate count excluding headers/footers)
- **FR-4.7** Error handling: corrupt files logged and trigger refund
- **FR-4.8** Character encoding: support UTF-8, handle smart quotes, em-dashes
- **FR-4.9** Maximum word count: 500,000 words (error if exceeded)
- **FR-4.10** Minimum word count: 10,000 words (error if below threshold)

**Technical Notes:**
- Libraries: `mammoth` for DOCX, `pdf-parse` for PDF
- Fallback to `textract` if primary parsers fail
- Store parsed text in job metadata (not database)

---

### FR-5: Analysis Pipeline

**Description:** Run manuscript through NovelForge analysis services to generate report data.

**Requirements:**

**FR-5.1 Prose Quality Analysis (All Tiers)**
- Flesch-Kincaid readability score
- Flesch Reading Ease
- Gunning Fog Index
- Passive voice percentage and instances
- Sentence length distribution
- Adverb density and flagged instances
- Overall prose quality score (1-10)

**FR-5.2 Pacing Analysis (Full and Premium)**
- Chapter-by-chapter tension scores (1-10 scale)
- Pacing graph (visual representation of tension arc)
- Plateau detection (flagged chapters with flat tension)
- Recommendations for pacing improvements

**FR-5.3 Genre Convention Fit (Full and Premium)**
- Genre identification (if not specified by user)
- Convention checklist (required vs recommended)
- Compliance score (percentage)
- Missing conventions flagged with examples

**FR-5.4 Character and Dialogue (Full and Premium)**
- Protagonist identification
- Want vs Need analysis
- Character arc completeness score
- Dialogue tag analysis (said vs creative tags)
- Show vs Tell ratio

**FR-5.5 Opening Hook (Full and Premium)**
- First line analysis
- Weak opener detection (weather, waking, mirror, info dump)
- Hook score (1-10)
- Specific recommendations for improvement

**FR-5.6 Rewrite Examples (Premium Only)**
- 3 sample passages rewritten with improvements
- Before/after comparisons
- Explanation of changes made
- Focus on highest-impact issues (passive voice, weak hooks, telling vs showing)

**Technical Notes:**
- Leverage existing NovelForge services: `genre-conventions.service`, `tension-arc-validator.service`, `opening-hook-validator.service`, `character-arc-validator.service`
- New service required: `show-tell-analyzer.service` (MVP can use Claude prompt)
- Premium rewrites use Claude API with explicit instructions

---

### FR-6: PDF Report Generation

**Description:** Generate professional, branded PDF report from analysis data.

**Requirements:**
- **FR-6.1** Report cover page: title "Manuscript Insight Report", manuscript title, author name, date, tier purchased
- **FR-6.2** Table of contents with page numbers
- **FR-6.3** Executive Summary (1 page): overall score, key strengths, top 3 issues
- **FR-6.4** Prose Quality section: readability metrics, passive voice instances, adverb flags
- **FR-6.5** Pacing section (Full/Premium): tension graph, plateau analysis, recommendations
- **FR-6.6** Genre Fit section (Full/Premium): convention checklist, compliance score
- **FR-6.7** Character Arc section (Full/Premium): Want/Need, arc completeness
- **FR-6.8** Opening Hook section (Full/Premium): first line analysis, hook score
- **FR-6.9** Rewrite Examples section (Premium only): before/after comparisons
- **FR-6.10** Action Plan (final page): prioritised recommendations, 1-2-3 next steps
- **FR-6.11** Watermark on every page: "Manuscript Insight Report - [Date]"
- **FR-6.12** Professional typography: serif font for body, sans-serif for headings
- **FR-6.13** Graphs and charts: tension arc visualisation, readability gauge
- **FR-6.14** Page numbers and footer: "© 2026 Manuscript Insight - manuscript deleted within 24 hours"

**Technical Notes:**
- Use `@react-pdf/renderer` or `puppeteer` (HTML to PDF)
- Template-based generation with tier-specific sections
- Graphs generated using Chart.js (server-side rendering)
- PDF size target: 2-5MB for Full tier

---

### FR-7: Email Delivery

**Description:** Send completed PDF report to customer's email address.

**Requirements:**
- **FR-7.1** Email sent immediately upon report completion
- **FR-7.2** Subject line: "Your Manuscript Insight Report is Ready!"
- **FR-7.3** Email body includes: thank you message, report summary (1-2 sentences), PDF attached
- **FR-7.4** PDF attachment named: `Manuscript-Insight-Report-{Manuscript-Title}-{Date}.pdf`
- **FR-7.5** Email footer includes: privacy statement, 20% discount code for next report (post-MVP), unsubscribe link (not applicable for one-time)
- **FR-7.6** Fallback: if attachment fails (size limit), include download link (expires in 7 days)
- **FR-7.7** Email sender: `reports@manuscriptinsight.com` (or similar professional address)
- **FR-7.8** Plain text version for email clients without HTML support
- **FR-7.9** Retry logic: 3 attempts with exponential backoff if email fails
- **FR-7.10** Delivery confirmation logged

**Technical Notes:**
- Use Resend or Postmark (both support attachments up to 10MB)
- Transactional email template (not marketing)
- DKIM, SPF, DMARC configured for deliverability

---

### FR-8: Progress Tracking

**Description:** Real-time status updates during processing.

**Requirements:**
- **FR-8.1** Processing stages displayed: "Parsing manuscript", "Analysing prose", "Analysing pacing", "Generating report", "Sending email"
- **FR-8.2** Progress bar (0-100%) updated at each stage
- **FR-8.3** Estimated time remaining displayed (based on word count)
- **FR-8.4** Error state displayed with message if processing fails
- **FR-8.5** Success state displayed with download link and "Check your email" message
- **FR-8.6** Status polling every 2 seconds via API endpoint
- **FR-8.7** Timeout after 15 minutes (trigger refund and error email)
- **FR-8.8** Loading animations for user reassurance
- **FR-8.9** Option to close page and receive email when ready (processing continues server-side)
- **FR-8.10** Estimated processing time shown upfront: "This will take approximately 8-10 minutes for a 80,000-word manuscript"

**Technical Notes:**
- Server-sent events (SSE) or polling API
- Job status stored in database with state machine
- Frontend uses React hooks for polling

---

### FR-9: Job Management

**Description:** Background job processing and queue management.

**Requirements:**
- **FR-9.1** Job created upon successful Stripe payment
- **FR-9.2** Job states: `pending`, `parsing`, `analysing`, `generating`, `completed`, `failed`, `refunded`
- **FR-9.3** Job metadata: job ID, customer email, pricing tier, manuscript filename, word count, timestamps
- **FR-9.4** Queue system: process jobs sequentially to manage Claude API rate limits
- **FR-9.5** Retry logic: 3 automatic retries for failed Claude API calls
- **FR-9.6** Job timeout: 15 minutes max processing time
- **FR-9.7** Completed jobs logged for analytics (no manuscript content stored)
- **FR-9.8** Failed jobs trigger automated refund
- **FR-9.9** Job cleanup: delete associated files after 24 hours
- **FR-9.10** Admin dashboard to monitor job queue (post-MVP)

**Technical Notes:**
- Use BullMQ or Faktory for job queue
- Redis for job state storage
- SQLite for completed job logs (metadata only)

---

### FR-10: Data Deletion and Privacy

**Description:** Ensure manuscripts are permanently deleted within 24 hours.

**Requirements:**
- **FR-10.1** Uploaded files deleted immediately after parsing (within 5 minutes)
- **FR-10.2** Parsed text deleted after report generation (within 15 minutes)
- **FR-10.3** Generated PDF deleted from server after email delivery (within 1 hour)
- **FR-10.4** Customer email stored only for job completion notification (deleted after 7 days)
- **FR-10.5** No manuscript content stored in logs (only metadata: word count, genre, tier)
- **FR-10.6** Stripe customer data retained per Stripe's requirements (payment records)
- **FR-10.7** Privacy policy clearly states deletion timeline
- **FR-10.8** GDPR-compliant data handling (right to be forgotten not applicable after deletion)
- **FR-10.9** Automated deletion job runs every hour to clean up old files
- **FR-10.10** Audit log of deletions for compliance verification

**Technical Notes:**
- Cron job or scheduled task for cleanup
- S3 lifecycle policies for automatic deletion (if using S3)
- Database foreign key cascades to delete related records

---

## Non-Functional Requirements

### NFR-1: Performance

- **NFR-1.1** Landing page loads in < 2 seconds on 3G connection
- **NFR-1.2** File upload supports files up to 50MB without timeout
- **NFR-1.3** Report generation completes in 5-10 minutes for 80,000-word manuscript
- **NFR-1.4** PDF generation completes in < 30 seconds
- **NFR-1.5** Email delivery within 2 minutes of PDF generation
- **NFR-1.6** API endpoints respond in < 500ms (excluding long-running jobs)

### NFR-2: Reliability

- **NFR-2.1** 99% uptime for landing page (Vercel hosting)
- **NFR-2.2** 95% success rate for report generation (excluding user errors)
- **NFR-2.3** Automatic retries for transient failures (Claude API, email delivery)
- **NFR-2.4** Graceful degradation: if one analysis section fails, others still complete
- **NFR-2.5** Error monitoring with Sentry or similar
- **NFR-2.6** Automated refunds for failed jobs (within 1 hour)

### NFR-3: Security

- **NFR-3.1** HTTPS enforced on all pages
- **NFR-3.2** Stripe webhook signature validation
- **NFR-3.3** Upload URLs signed with expiration (1 hour)
- **NFR-3.4** File uploads scanned for malware (optional for MVP, use ClamAV)
- **NFR-3.5** CORS restricted to application domain
- **NFR-3.6** No sensitive data logged (redact emails in logs)
- **NFR-3.7** Environment variables for secrets (Stripe keys, API keys)
- **NFR-3.8** Rate limiting on upload endpoint (10 requests/hour per IP)
- **NFR-3.9** GDPR-compliant privacy policy
- **NFR-3.10** Regular security audits (manual review quarterly)

### NFR-4: Scalability

- **NFR-4.1** Support 100 jobs/day initially (MVP target)
- **NFR-4.2** Scale to 500 jobs/day within 6 months
- **NFR-4.3** Claude API rate limits respected (queue jobs if necessary)
- **NFR-4.4** Serverless backend (auto-scaling)
- **NFR-4.5** CDN for landing page assets (Vercel Edge Network)
- **NFR-4.6** Database: SQLite initially, migrate to PostgreSQL if > 10,000 jobs

### NFR-5: Accessibility

- **NFR-5.1** Landing page WCAG 2.1 AA compliant
- **NFR-5.2** Keyboard navigation supported
- **NFR-5.3** Screen reader compatible
- **NFR-5.4** Colour contrast ratios meet AA standards
- **NFR-5.5** PDF reports accessible (tagged PDF, optional for MVP)

### NFR-6: Maintainability

- **NFR-6.1** Code follows NovelForge architecture standards (see CLAUDE.md)
- **NFR-6.2** TypeScript strict mode enabled
- **NFR-6.3** Automated tests: 70% code coverage target
- **NFR-6.4** Logging: structured logs with correlation IDs
- **NFR-6.5** Documentation: API endpoints, environment variables, deployment process
- **NFR-6.6** Monitoring dashboard: job success rate, processing time, revenue

---

## Edge Cases and Error Scenarios

### EC-1: Invalid or Corrupt Files

**Scenario:** User uploads a corrupt DOCX or password-protected PDF.

**Behaviour:**
- Display error: "Unable to parse file. Please ensure your file is not password-protected or corrupted."
- Trigger automatic refund
- Send email with apology and refund confirmation

**Technical Note:** Catch parser exceptions, log error details for debugging.

---

### EC-2: Manuscript Too Short or Too Long

**Scenario:** User uploads a 5,000-word novella or 600,000-word epic.

**Behaviour:**
- **Too short (< 10,000 words):** Display warning: "Manuscript under 10,000 words. Analysis may be less accurate for shorter works. Continue anyway?"
- **Too long (> 500,000 words):** Display error: "Manuscript exceeds 500,000 words. Please split into multiple volumes or contact support."
- Refund if user cannot proceed

**Technical Note:** Word count validation before processing starts.

---

### EC-3: Claude API Rate Limit Hit

**Scenario:** High traffic causes Claude API rate limit to be exceeded.

**Behaviour:**
- Queue job for retry
- Display message: "High demand detected. Your report is in the queue and will be processed shortly."
- Extend timeout to 30 minutes
- Send email when complete (may take longer than usual)

**Technical Note:** Implement exponential backoff with jitter.

---

### EC-4: Email Delivery Failure

**Scenario:** Customer's email provider rejects the report email.

**Behaviour:**
- Retry 3 times with different strategies (attachment vs link)
- If all fail, store PDF on server (available for 7 days)
- Send SMS notification with download link (post-MVP, requires phone number collection)
- Log failure for manual follow-up

**Technical Note:** Monitor bounce rates, maintain sender reputation.

---

### EC-5: Payment Succeeds but Webhook Fails

**Scenario:** Stripe webhook is not received due to network issue.

**Behaviour:**
- Poll Stripe API every 5 minutes for unclaimed sessions
- Create job retroactively if session found
- No manual intervention required
- Log event for monitoring

**Technical Note:** Webhook retry logic in Stripe dashboard configured.

---

### EC-6: User Closes Browser During Upload

**Scenario:** User closes browser tab while file is uploading.

**Behaviour:**
- Upload continues server-side (if using presigned URLs)
- Processing starts automatically when upload completes
- User receives email when report is ready
- No action required from user

**Technical Note:** Upload should not depend on client-side JavaScript remaining active.

---

### EC-7: Multiple Manuscripts Uploaded Simultaneously

**Scenario:** User opens multiple tabs and uploads different manuscripts.

**Behaviour:**
- Each upload requires separate payment (session ID validated)
- Jobs processed independently
- Each receives separate report

**Technical Note:** Session ID uniqueness enforced.

---

### EC-8: Discount Code Used Incorrectly

**Scenario:** User tries to use expired or invalid discount code.

**Behaviour:**
- Stripe Checkout displays error: "This promotion code is invalid or expired."
- User can proceed without discount
- No refund required

**Technical Note:** Stripe handles discount validation.

---

### EC-9: Manuscript with No Chapters Detected

**Scenario:** Manuscript is single continuous text with no chapter markers.

**Behaviour:**
- Analysis proceeds on full text
- Report notes: "No chapter divisions detected. Analysis performed on complete manuscript."
- Pacing section skipped (requires chapter-level analysis)
- Reduced report for Full tier, offer partial refund option

**Technical Note:** Fallback to full-text analysis mode.

---

### EC-10: Report Generation Fails After Payment

**Scenario:** Unexpected error during PDF generation.

**Behaviour:**
- Automatic refund triggered
- Error email sent: "We're sorry, report generation failed. You have been refunded. We've logged this issue for investigation."
- Job marked as `failed` with error details
- Manual review triggered

**Technical Note:** Sentry alert sent to developer.

---

## Success Metrics and KPIs

### Revenue Metrics
- **Monthly Revenue:** Target £500 in Month 1, £2,000 by Month 6
- **Average Order Value (AOV):** £25 target (mix of all tiers)
- **Conversion Rate:** 5% of landing page visitors → purchasers

### Operational Metrics
- **Processing Success Rate:** 95%+ (jobs completed without refund)
- **Average Processing Time:** 7 minutes for 80,000-word manuscript
- **Email Delivery Rate:** 98%+ (successful delivery to inbox)
- **Uptime:** 99.5%+ for landing page and API

### Customer Satisfaction
- **Net Promoter Score (NPS):** 40+ (from post-delivery survey)
- **Star Rating:** 4.5+ on Trustpilot or similar
- **Refund Rate:** < 5% of total payments

### Usage Metrics
- **Jobs Per Day:** 10 in Month 1, 50 by Month 6
- **Tier Distribution:** 30% Basic, 50% Full, 20% Premium (target)
- **Repeat Customers:** 20% of customers purchase again within 6 months

### Marketing Metrics
- **Landing Page Traffic:** 500 visitors/month initially
- **Bounce Rate:** < 60% on landing page
- **Sample Report Downloads:** 30% of visitors
- **Referral Traffic:** 20% from author communities (post-launch)

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                       FRONTEND (Next.js + Vercel)               │
├─────────────────────────────────────────────────────────────────┤
│  - Landing page (static)                                        │
│  - Upload page (dynamic, session-gated)                         │
│  - Progress page (polling API for status)                       │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express + Railway)                  │
├─────────────────────────────────────────────────────────────────┤
│  API Routes:                                                    │
│  - POST /api/checkout/create-session  (create Stripe session)  │
│  - POST /api/webhooks/stripe          (handle payment)         │
│  - GET  /api/jobs/:id/status          (poll job status)        │
│  - GET  /api/jobs/:id/download        (download PDF)           │
│                                                                 │
│  Services (from NovelForge):                                    │
│  - genre-conventions.service.ts                                 │
│  - tension-arc-validator.service.ts                             │
│  - opening-hook-validator.service.ts                            │
│  - character-arc-validator.service.ts                           │
│  - prose-reports/* (readability, passive voice, adverbs)        │
│                                                                 │
│  New Services:                                                  │
│  - manuscript-parser.service.ts   (DOCX/PDF → plain text)       │
│  - report-generator.service.ts    (data → PDF)                  │
│  - email-delivery.service.ts      (send PDF via Resend)         │
│  - job-queue.service.ts           (BullMQ wrapper)              │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                          │
├─────────────────────────────────────────────────────────────────┤
│  - Stripe (payment processing)                                  │
│  - Uploadthing / S3 (file upload + temp storage)                │
│  - Claude API (AI analysis)                                     │
│  - Resend / Postmark (email delivery)                           │
│  - Redis (job queue state)                                      │
│  - SQLite / PostgreSQL (job logs)                               │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User visits landing page** → Next.js static site (Vercel)
2. **User clicks "Buy Full Report"** → Frontend creates Stripe Checkout session
3. **User completes payment** → Stripe webhook → Backend creates job
4. **User uploads manuscript** → Uploadthing presigned URL → File stored temporarily
5. **Backend processes job:**
   - Parse manuscript (mammoth/pdf-parse)
   - Run NovelForge analysis services
   - Generate PDF report (@react-pdf/renderer)
   - Send email (Resend)
   - Delete files
6. **User receives email** → Downloads PDF → Done

### Database Schema

**Table: `jobs`**

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID |
| stripe_session_id | TEXT | Stripe session ID |
| customer_email | TEXT | Recipient email |
| pricing_tier | TEXT | "basic", "full", "premium" |
| status | TEXT | "pending", "parsing", "analysing", "generating", "completed", "failed", "refunded" |
| manuscript_filename | TEXT | Original filename |
| word_count | INTEGER | Calculated word count |
| processing_started_at | DATETIME | Processing start time |
| processing_completed_at | DATETIME | Processing end time |
| error_message | TEXT | Error details if failed |
| refund_issued | BOOLEAN | Refund status |
| created_at | DATETIME | Job creation time |
| updated_at | DATETIME | Last update time |

**Indices:**
- `idx_jobs_stripe_session` on `stripe_session_id`
- `idx_jobs_status` on `status`
- `idx_jobs_created` on `created_at`

**Table: `job_analytics` (post-MVP)**

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID |
| job_id | TEXT | FK to jobs |
| manuscript_genre | TEXT | Detected genre |
| overall_score | FLOAT | 0-100 commercial viability |
| processing_time_seconds | INTEGER | Total processing time |
| claude_api_cost_usd | FLOAT | AI cost for this job |
| created_at | DATETIME | Record creation time |

---

## API Endpoints

### POST /api/checkout/create-session

**Purpose:** Create Stripe Checkout session for payment.

**Request Body:**
```json
{
  "pricingTier": "full" | "basic" | "premium",
  "email": "customer@example.com",
  "discountCode": "REPEAT20" (optional)
}
```

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

**Error Responses:**
- `400 Bad Request`: Invalid pricing tier
- `500 Internal Server Error`: Stripe API failure

---

### POST /api/webhooks/stripe

**Purpose:** Handle Stripe webhook events (checkout.session.completed).

**Request:** Stripe webhook payload (verified signature)

**Response:** `200 OK` (always, even if processing fails internally)

**Side Effects:**
- Creates job in database
- Sends upload link email (or redirects to upload page)

---

### POST /api/upload

**Purpose:** Handle manuscript upload and start processing.

**Request:** Multipart form data
```
sessionId: "cs_test_..."
file: [DOCX or PDF file]
```

**Response:**
```json
{
  "jobId": "job_abc123",
  "status": "parsing",
  "estimatedTimeMinutes": 8
}
```

**Error Responses:**
- `400 Bad Request`: Invalid session or file type
- `413 Payload Too Large`: File exceeds 50MB
- `401 Unauthorised`: Invalid or expired session

---

### GET /api/jobs/:jobId/status

**Purpose:** Poll job processing status.

**Response:**
```json
{
  "jobId": "job_abc123",
  "status": "analysing",
  "progress": 60,
  "currentStage": "Analysing character arcs",
  "estimatedTimeRemaining": 3
}
```

**Status Values:**
- `pending`: Job queued
- `parsing`: Extracting text from file
- `analysing`: Running analysis services
- `generating`: Creating PDF report
- `completed`: PDF sent via email
- `failed`: Error occurred, refund issued

---

### GET /api/jobs/:jobId/download

**Purpose:** Download completed PDF report.

**Response:** PDF file stream

**Headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="Manuscript-Insight-Report.pdf"
```

**Error Responses:**
- `404 Not Found`: Job not found or not completed
- `410 Gone`: Report expired (7 days after generation)

---

## UI Wireframes (Text-Based)

### Landing Page

```
┌────────────────────────────────────────────────────────────┐
│  [Logo] Manuscript Insight Report                   [FAQ] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│          Professional Manuscript Analysis                  │
│               in Minutes, Not Months                       │
│                                                            │
│  Get detailed editorial insights into your novel's         │
│  commercial potential. No subscription. No account.        │
│                                                            │
│          [Get Your Report - £25] [See Sample]              │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  What's Included:                                          │
│  ✓ Prose Quality Analysis                                 │
│  ✓ Pacing & Tension Arc                                   │
│  ✓ Genre Convention Fit                                   │
│  ✓ Character Arc Assessment                               │
│  ✓ Opening Hook Score                                     │
│  ✓ Actionable Recommendations                             │
├────────────────────────────────────────────────────────────┤
│  Pricing:                                                  │
│  ┌────────────┬────────────┬────────────┐                 │
│  │   Basic    │    Full    │  Premium   │                 │
│  │    £9      │    £25     │    £49     │                 │
│  ├────────────┼────────────┼────────────┤                 │
│  │ Prose only │ All checks │ + Rewrites │                 │
│  │  5 pages   │ 15-20 pages│  20+ pages │                 │
│  │   [Buy]    │   [Buy]    │   [Buy]    │                 │
│  └────────────┴────────────┴────────────┘                 │
├────────────────────────────────────────────────────────────┤
│  How It Works:                                             │
│  1. Choose your tier and pay securely via Stripe          │
│  2. Upload your manuscript (DOCX or PDF)                   │
│  3. Wait 5-10 minutes while AI analyses your work         │
│  4. Receive PDF report via email                          │
│                                                            │
│  Your manuscript is deleted within 24 hours. Private.      │
│  Secure. No account required.                              │
├────────────────────────────────────────────────────────────┤
│  [Download Sample Report]                                  │
│                                                            │
│  FAQ | Privacy Policy | Contact                            │
└────────────────────────────────────────────────────────────┘
```

---

### Upload Page

```
┌────────────────────────────────────────────────────────────┐
│  Manuscript Insight Report                                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Payment Successful! ✓                                     │
│                                                            │
│  Upload your manuscript to receive your Full Analysis      │
│  Report. Accepted formats: DOCX, PDF (max 50MB)           │
│                                                            │
│  ┌──────────────────────────────────────────────────┐     │
│  │                                                  │     │
│  │       Drag & drop your file here                │     │
│  │              or click to browse                  │     │
│  │                                                  │     │
│  │              [Browse Files]                      │     │
│  │                                                  │     │
│  └──────────────────────────────────────────────────┘     │
│                                                            │
│  Processing will begin automatically after upload.         │
│  You can close this page - we'll email your report.        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### Progress Page

```
┌────────────────────────────────────────────────────────────┐
│  Manuscript Insight Report                                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Analysing Your Manuscript...                              │
│                                                            │
│  ████████████████░░░░░░░░░░░░ 60%                          │
│                                                            │
│  Current stage: Analysing character arcs                   │
│  Estimated time remaining: 3 minutes                       │
│                                                            │
│  ✓ Manuscript parsed (87,432 words)                        │
│  ✓ Prose quality analysed                                  │
│  ⏳ Character arc analysis in progress...                  │
│  ⏳ Pacing analysis pending                                │
│  ⏳ Report generation pending                              │
│                                                            │
│  You can close this page safely. Your report will be       │
│  emailed to: customer@example.com                          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### Success Page

```
┌────────────────────────────────────────────────────────────┐
│  Manuscript Insight Report                                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ✓ Your Report is Ready!                                   │
│                                                            │
│  We've sent your Manuscript Insight Report to:             │
│  customer@example.com                                      │
│                                                            │
│  Didn't receive it? Check your spam folder or              │
│  download it directly:                                     │
│                                                            │
│  [Download PDF Report]                                     │
│                                                            │
│  ─────────────────────────────────────────                 │
│                                                            │
│  Analyse another manuscript?                               │
│  Use code REPEAT20 for 20% off your next report.           │
│                                                            │
│  [Get Another Report]                                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Integration with NovelForge Services

### Reusable Services

The following NovelForge services can be imported directly:

1. **`genre-conventions.service.ts`**
   - `validateOutline(genre, text)` → genre fit score
   - Returns: conventions met, warnings, recommendations

2. **`tension-arc-validator.service.ts`**
   - `analyseTensionArc(chapters[])` → pacing analysis
   - Returns: per-chapter tension scores, plateaus, graph data

3. **`opening-hook-validator.service.ts`**
   - `analyseOpeningHook(firstChapter)` → hook score
   - Returns: score, weak openers, recommendations

4. **`character-arc-validator.service.ts`**
   - `analyseCharacterArc(chapters[], characters[])` → arc analysis
   - Returns: Want/Need, Lie/Truth, completeness score

5. **`prose-reports/readability.service.ts`**
   - `generateReport(text, genre)` → readability metrics
   - Returns: Flesch-Kincaid, Gunning Fog, complexity

6. **`prose-reports/passive-voice.service.ts`**
   - `analysePassiveVoice(text)` → passive instances
   - Returns: count, percentage, flagged sentences

7. **`prose-reports/adverbs.service.ts`**
   - `analyseAdverbs(text)` → adverb analysis
   - Returns: instances, density, suggestions

8. **`prose-reports/sentence-variety.service.ts`**
   - `analyseSentenceVariety(text)` → variety metrics
   - Returns: length distribution, structure patterns

### Adaptation Required

These services assume database context (book_id, chapter_id). For Manuscript Insight:
- **Input:** Plain text string + optional metadata (genre, word count)
- **Output:** JSON report data (no database writes)
- **Modification:** Create wrapper functions that:
  1. Accept plain text instead of database IDs
  2. Parse chapters from text using heading detection
  3. Return analysis data without storing in database

**Example Wrapper:**

```typescript
// New file: backend/src/services/manuscript-insight/analysis-wrapper.service.ts

import { genreConventionsService } from '../genre-conventions.service.js';
import { ReadabilityService } from '../prose-reports/readability.service.js';

export class ManuscriptAnalysisService {
  async analyseManuscript(text: string, genre?: string) {
    const chapters = this.parseChapters(text);

    const proseAnalysis = ReadabilityService.generateReport(text, genre);
    const genreAnalysis = genreConventionsService.validateOutline(genre || 'literary', text);

    // ... other analyses

    return {
      prose: proseAnalysis,
      genre: genreAnalysis,
      // ...
    };
  }

  private parseChapters(text: string): string[] {
    // Detect chapter headings and split
    const chapterRegex = /^(Chapter|CHAPTER|Ch\.)?\s*(\d+|One|Two|Three|[IVXLCDM]+)/gm;
    // Implementation details...
  }
}
```

---

## Security Considerations

### SEC-1: Payment Security
- **Threat:** Fraudulent payments or chargebacks
- **Mitigation:**
  - Use Stripe Radar for fraud detection
  - Require email verification before file upload
  - Log IP addresses for fraud investigation
  - Monitor chargeback rate (should be < 1%)

### SEC-2: File Upload Attacks
- **Threat:** Malicious files (viruses, exploits) uploaded
- **Mitigation:**
  - File type validation (magic number check, not just extension)
  - Virus scanning with ClamAV (post-MVP)
  - Sandboxed parsing environment (Docker container)
  - File size limits enforced

### SEC-3: Data Exposure
- **Threat:** Manuscript content leaked or stored insecurely
- **Mitigation:**
  - No manuscript content in logs
  - Files encrypted at rest (S3 encryption)
  - Files deleted within 24 hours (automated cleanup)
  - Access logs for compliance audits

### SEC-4: API Abuse
- **Threat:** Spam uploads, API scraping
- **Mitigation:**
  - Rate limiting: 10 uploads/hour per IP
  - Session ID required (tied to payment)
  - Upload URLs expire after 1 hour
  - Cloudflare for DDoS protection

### SEC-5: Webhook Spoofing
- **Threat:** Fake Stripe webhooks to trigger free reports
- **Mitigation:**
  - Stripe signature validation (mandatory)
  - Webhook endpoint not publicly documented
  - Verify payment status with Stripe API before processing

### SEC-6: PDF Injection
- **Threat:** Malicious content injected into PDF reports
- **Mitigation:**
  - Sanitise all user input (manuscript title, author name)
  - Use parameterised PDF generation (no eval or template injection)
  - Escape special characters in report text

---

## Launch Checklist

### Pre-Launch (Week 1-2)

- [ ] Domain purchased and DNS configured (`manuscriptinsight.com` or similar)
- [ ] SSL certificate configured (Vercel automatic)
- [ ] Stripe account created and test mode configured
- [ ] Create 3 Stripe products (Basic £9, Full £25, Premium £49)
- [ ] Uploadthing/S3 bucket created with CORS policy
- [ ] Redis instance provisioned (Upstash or Railway)
- [ ] Email provider configured (Resend account, DNS records)
- [ ] Environment variables documented and set
- [ ] Privacy policy and terms of service written (legal review)
- [ ] Sample report PDF created (real manuscript example, watermarked)

### Development (Week 3-4)

- [ ] Landing page built and deployed to Vercel
- [ ] Stripe Checkout integration tested
- [ ] File upload component implemented
- [ ] Manuscript parser service tested (DOCX and PDF)
- [ ] NovelForge services adapted for standalone text input
- [ ] PDF report generation tested with template
- [ ] Email delivery tested (test account)
- [ ] Job queue implemented with BullMQ
- [ ] Database schema created and migrated
- [ ] API endpoints tested (Postman collection)

### Testing (Week 4)

- [ ] End-to-end test: payment → upload → report → email
- [ ] Error scenario testing: corrupt files, large files, payment failures
- [ ] Performance testing: 80k word manuscript completes in < 10 minutes
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive testing
- [ ] Email rendering tested (Gmail, Outlook, Apple Mail)
- [ ] Refund process tested
- [ ] Security audit: webhook validation, file upload, rate limiting

### Pre-Production (Week 4)

- [ ] Switch Stripe to live mode
- [ ] Configure production environment variables
- [ ] Set up monitoring (Sentry for errors, Vercel Analytics for traffic)
- [ ] Configure automated backups (database)
- [ ] Set up alerting (email on failed jobs, low success rate)
- [ ] Create internal admin dashboard (job monitoring)
- [ ] Write runbook for common issues (refunds, failed jobs, email problems)

### Launch (Day 1)

- [ ] Deploy to production
- [ ] Smoke test: complete one real purchase with test card
- [ ] Announce on Twitter/X, author communities, writing forums
- [ ] Submit to ProductHunt, IndieHackers
- [ ] Email NovelForge beta users (if applicable)
- [ ] Monitor first 24 hours closely

### Post-Launch (Week 1)

- [ ] Review first 10 job logs for issues
- [ ] Collect customer feedback (survey email 24 hours after report)
- [ ] Fix critical bugs
- [ ] Monitor success rate and refund rate
- [ ] Optimise processing time if > 10 minutes average
- [ ] Add testimonials to landing page (if positive feedback received)

---

## Out of Scope (Explicitly NOT Included)

### V1 MVP Exclusions

The following features are intentionally excluded from the initial launch:

1. **User Accounts and Dashboards**
   - No login system
   - No user profile pages
   - No report history or library
   - **Rationale:** Reduces complexity, aligns with one-time purchase model

2. **Real-Time Chat Support**
   - No live chat widget
   - No instant support
   - **Alternative:** Email support only (support@manuscriptinsight.com)
   - **Rationale:** Passive income model requires minimal manual intervention

3. **Manuscript Storage Beyond 24 Hours**
   - No long-term storage
   - No "view previous reports" feature
   - **Rationale:** Privacy commitment, reduces storage costs

4. **Subscription Billing**
   - No monthly or annual plans
   - No recurring payments
   - **Rationale:** One-time purchase model only

5. **Advanced Editing Tools**
   - No in-browser manuscript editor
   - No tracked changes or commenting
   - **Rationale:** This is analysis only, not a writing tool

6. **Agent Query Letter Generation**
   - No query letter templates
   - No synopsis generation
   - **Rationale:** Focus on manuscript analysis, not publishing workflow

7. **Collaborative Features**
   - No sharing reports with beta readers
   - No collaborative annotations
   - **Rationale:** Individual author focus, privacy concerns

8. **Mobile Apps**
   - No iOS or Android native apps
   - **Alternative:** Mobile-responsive web only
   - **Rationale:** Web-first approach, reduces development cost

9. **API Access**
   - No public API for third-party integrations
   - **Rationale:** Complexity and security concerns

10. **Multi-Language Support**
    - English manuscripts only (V1)
    - **Future:** Spanish, French, German (post-MVP based on demand)
    - **Rationale:** Claude API performs best on English text

11. **Genre-Specific Deep Dives**
    - No romance-specific emotional beat tracking
    - No mystery-specific clue placement analysis
    - **Future:** Premium genre-specific reports (V2)
    - **Rationale:** Initial validation focuses on universal analysis

12. **Before/After Manuscript Comparison**
    - No "re-analyse after revisions" feature
    - **Alternative:** Customer can purchase new report for revised draft
    - **Rationale:** Each analysis is standalone

---

## Open Questions

### Business Questions

**Q1:** Should we offer a money-back guarantee if customer is unsatisfied?
- **Options:**
  - A) 7-day satisfaction guarantee (refund if unhappy)
  - B) No refunds except for technical failures
- **Recommendation:** Option A for MVP to build trust, review after 50 customers

**Q2:** What discount percentage for repeat customers?
- **Options:**
  - A) 20% (£20 for second Full Report)
  - B) 30% (£17.50 for second Full Report)
  - C) Tiered (20% for 2nd, 30% for 3rd+)
- **Recommendation:** Option A (20%) for simplicity

**Q3:** Should we collect phone numbers for SMS notifications?
- **Pros:** Better delivery guarantee, can notify on failures
- **Cons:** Privacy concerns, requires additional compliance (SMS regulations)
- **Recommendation:** No for MVP, email only

### Technical Questions

**Q4:** Which PDF generation library?
- **Options:**
  - A) `@react-pdf/renderer` (React components → PDF)
  - B) `puppeteer` (HTML → PDF via headless Chrome)
  - C) `pdfkit` (programmatic PDF construction)
- **Recommendation:** Option B (puppeteer) for maximum design flexibility

**Q5:** File upload service?
- **Options:**
  - A) Uploadthing (easiest, built for Next.js)
  - B) AWS S3 with presigned URLs (more control)
  - C) Cloudflare R2 (S3-compatible, cheaper)
- **Recommendation:** Option A for MVP, migrate to R2 if costs increase

**Q6:** Job queue infrastructure?
- **Options:**
  - A) BullMQ (Redis-based, battle-tested)
  - B) Faktory (standalone job server)
  - C) Cloud Tasks (GCP) or SQS (AWS)
- **Recommendation:** Option A (BullMQ) for NovelForge consistency

### Product Questions

**Q7:** Should Basic tier include opening hook analysis?
- **Current:** Basic = prose only (readability, passive voice, adverbs)
- **Alternative:** Add opening hook to Basic for better value perception
- **Recommendation:** Keep prose-only for clear differentiation, test with first 50 customers

**Q8:** Should we offer "rush processing" for extra fee?
- **Concept:** £10 extra for priority queue (3-5 minutes instead of 8-10)
- **Pros:** Additional revenue, serves impatient customers
- **Cons:** Complexity in queue management, may not be technically feasible
- **Recommendation:** No for MVP, evaluate if common feature request

**Q9:** How detailed should rewrite examples be (Premium tier)?
- **Options:**
  - A) 3 passages, 100-200 words each, with explanation
  - B) 5 passages, 50-100 words each, brief explanation
  - C) Full chapter rewrite (risky, high AI cost)
- **Recommendation:** Option A (balanced detail and cost)

---

## Appendices

### Appendix A: Sample Report Structure (Full Tier)

**Page 1: Cover**
- Manuscript Insight Report
- Manuscript title: "The Last Lighthouse"
- Author: Jane Doe
- Report date: 29 January 2026
- Tier: Full Analysis

**Page 2: Table of Contents**
1. Executive Summary
2. Prose Quality Analysis
3. Pacing and Tension Arc
4. Genre Convention Fit
5. Character Arc Assessment
6. Opening Hook Analysis
7. Action Plan

**Page 3: Executive Summary**
- Overall commercial viability score: 72/100
- Top 3 strengths: Strong opening hook, excellent pacing in Act 2, genre conventions met
- Top 3 issues: Passive voice in 23% of sentences, weak character Want/Need, slow midpoint

**Pages 4-6: Prose Quality**
- Readability metrics table
- Passive voice instances (top 10 flagged sentences)
- Adverb analysis (density chart)
- Sentence variety graph

**Pages 7-10: Pacing and Tension**
- Tension arc graph (chapter-by-chapter)
- Plateau analysis (2 plateaus detected)
- Recommendations for pacing

**Pages 11-13: Genre Fit**
- Genre: Thriller
- Convention checklist (8/10 met)
- Missing conventions: ticking clock, final twist
- Recommendations

**Pages 14-16: Character Arc**
- Protagonist: Sarah Chen
- Want: Find the killer (met)
- Need: Learn to trust others (weak)
- Lie/Truth: Not clearly established
- Recommendations

**Pages 17-18: Opening Hook**
- First line: "The lighthouse keeper hadn't been seen in three days."
- Hook score: 8/10
- Weak openers: None detected
- Assessment: Strong, raises questions immediately

**Page 19-20: Action Plan**
1. Reduce passive voice (priority: high)
2. Strengthen character Need (priority: high)
3. Add ticking clock element to raise stakes (priority: medium)
4. Consider adding final twist (priority: low)

**Page 20: Footer**
- "Your manuscript has been permanently deleted from our servers."
- "Use code REPEAT20 for 20% off your next report."

---

### Appendix B: Pricing Rationale

**Basic Tier (£9):**
- **Target customer:** Budget-conscious authors, first-time users testing the service
- **Cost structure:**
  - Claude API: ~£1.50 (minimal prompts)
  - Stripe fee: £0.46 (5% + 20p)
  - Infrastructure: £0.20
  - **Total cost:** ~£2.16
  - **Profit margin:** £6.84 (76%)
- **Value proposition:** "Quick prose check for less than a coffee"

**Full Tier (£25):**
- **Target customer:** Serious authors preparing for querying or self-publishing
- **Cost structure:**
  - Claude API: ~£4.50 (comprehensive analysis)
  - Stripe fee: £0.95
  - Infrastructure: £0.50
  - **Total cost:** ~£5.95
  - **Profit margin:** £19.05 (76%)
- **Value proposition:** "Complete editorial analysis for less than 1 hour of professional editing"

**Premium Tier (£49):**
- **Target customer:** Authors seeking actionable rewrite guidance
- **Cost structure:**
  - Claude API: ~£12.00 (including 3 rewrite examples)
  - Stripe fee: £2.05
  - Infrastructure: £0.80
  - **Total cost:** ~£14.85
  - **Profit margin:** £34.15 (70%)
- **Value proposition:** "Professional-grade report with rewrite examples - still 10x cheaper than hiring an editor"

**Competitor Comparison:**
- ProWritingAid: £79/year (but requires subscription)
- AutoCrit: £99/year (subscription)
- Manuscript Academy: £120/year (subscription)
- **Our advantage:** One-time payment, no commitment, complete in 10 minutes

---

### Appendix C: Technology Stack Summary

| Component | Technology | Justification |
|-----------|------------|---------------|
| Frontend | Next.js 14 (App Router) | Static export, fast, SEO-friendly |
| Hosting | Vercel | Automatic deployments, CDN, free tier |
| Backend | Express.js | Existing NovelForge stack, battle-tested |
| Backend Hosting | Railway | Easy deployment, PostgreSQL included |
| Payment | Stripe Checkout | Industry standard, handles VAT/tax |
| File Upload | Uploadthing | Next.js optimised, simple API |
| File Parsing | mammoth (DOCX), pdf-parse (PDF) | Reliable, well-maintained |
| Job Queue | BullMQ + Redis | Production-ready, NovelForge consistency |
| Email | Resend | Developer-friendly, reliable |
| PDF Generation | Puppeteer | Maximum design control |
| AI | Claude API (Sonnet 4.5) | Best prose analysis quality |
| Database | SQLite (MVP) → PostgreSQL | Simple start, scalable future |
| Monitoring | Sentry | Error tracking, performance monitoring |
| Analytics | Vercel Analytics | Privacy-friendly, integrated |

---

### Appendix D: Estimated Development Timeline

**Week 1: Foundation (5 days)**
- Day 1: Project setup, domain, hosting
- Day 2: Landing page design and copy
- Day 3: Stripe integration (test mode)
- Day 4: Database schema and migrations
- Day 5: File upload component

**Week 2: Core Analysis (5 days)**
- Day 6: Manuscript parser (DOCX/PDF)
- Day 7: Adapt NovelForge services for standalone text
- Day 8: Analysis pipeline integration
- Day 9: Job queue implementation
- Day 10: Error handling and retry logic

**Week 3: Report Generation (5 days)**
- Day 11: PDF template design
- Day 12: PDF generation service
- Day 13: Email delivery service
- Day 14: Progress tracking API
- Day 15: End-to-end testing

**Week 4: Polish and Launch (5 days)**
- Day 16: UI polish, mobile testing
- Day 17: Security audit, penetration testing
- Day 18: Performance optimisation
- Day 19: Documentation, runbook
- Day 20: Deploy to production, soft launch

**Total:** 4 weeks (20 working days)

---

### Appendix E: Marketing Copy Examples

**Hero Headline:**
"Professional Manuscript Analysis in Minutes, Not Months"

**Subheadline:**
"Get detailed editorial insights into your novel's commercial potential. No subscription. No account. No waiting."

**Feature Headlines:**
- "Know What Agents See" (credibility)
- "Fix Issues Before Querying" (practical value)
- "Automated, Yet Personal" (technology + quality)

**Call-to-Action Buttons:**
- Primary: "Get Your Report - £25"
- Secondary: "See Sample Report"
- Tertiary: "How It Works"

**Social Proof (post-MVP):**
- "I found 3 critical issues I'd never have spotted myself." - Sarah K., Romance Author
- "Worth every penny. Saved me months of trial and error." - James L., Thriller Writer

**FAQ Highlights:**
- "Is my manuscript private?" → "Yes. Deleted within 24 hours."
- "How long does it take?" → "5-10 minutes for most manuscripts."
- "What if I'm not happy?" → "7-day satisfaction guarantee."

---

## Final Recommendations

### For Immediate Approval

1. **Approve MVP scope** as defined (Basic, Full, Premium tiers)
2. **Allocate 4 weeks** for development (parallel work with NovelForge if needed)
3. **Budget £500** for infrastructure (domain, Stripe fees, testing)
4. **Assign ownership** to technical lead for implementation

### For Discussion

1. **Pricing validation:** Run pricing survey in author communities before launch
2. **Sample report creation:** Select representative manuscript for sample (avoid copyright issues)
3. **Legal review:** Privacy policy and terms of service (consult solicitor if UK/EU customers)
4. **Brand identity:** Decide on brand name (Manuscript Insight Report vs alternative)

### For Post-MVP Roadmap

1. **V1.1 (Month 2):** Add discount codes, testimonials, FAQ expansion
2. **V1.2 (Month 3):** Repeat customer tracking, email follow-up sequence
3. **V2 (Month 6):** Genre-specific deep dives (Romance, Thriller, Mystery)
4. **V3 (Month 12):** Multi-language support (Spanish, French)

---

**End of Specification**

**Next Steps:**
1. Review and approve specification
2. Architect to create technical design document
3. Developer to implement MVP (4-week sprint)
4. QA to test end-to-end flow
5. Launch and iterate based on customer feedback

**Questions or Feedback:**
Contact: Emily Rodriguez (PM) - emily@novelforge.ai
