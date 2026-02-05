# Lessons Learned: Architect Agent

<!--
This file stores accumulated lessons learned by the architect agent.
It is automatically read before each task and updated after task completion.

MAINTENANCE RULES:
- Maximum 50 lessons per file (older lessons archived automatically)
- Lessons with score >= 5 are considered "proven" and prioritised
- Review and prune quarterly or when file exceeds 50 entries
-->

## Summary Statistics

- **Total tasks completed**: 9
- **Total lessons recorded**: 14
- **Last updated**: 2026-01-31
- **Proven lessons** (score >= 5): 0
- **Top themes**: #architecture #patterns #database #api #typescript #repository-pattern #circuit-breaker #navigation #ui-redesign #workflow #component-design #conversational-ai #intent-detection #chat-interface #enforcement-integration #validators #proactive-quality #ai-tell-detection #pattern-library #confidence-scoring #queue-integration #post-processing #prose-reports #pattern-based-analysis #veb-integration #closed-loop-quality #finding-mapping #resolution-tracking #revenue-infrastructure #stripe #webhooks #subscription-management #usage-tracking #idempotency #third-party-integration #standalone-product #service-reuse #separate-database

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

### 2026-01-31 | Task: Manuscript Insight Product Architecture (Standalone Service)

**Date**: 2026-01-31
**Task**: Designing complete technical architecture for Manuscript Insight Report - a standalone one-time purchase manuscript analysis service leveraging NovelForge infrastructure
**Context**: Separate product (not NovelForge feature), one-time payments (£9/£25/£49), anonymous users, 5-10 min processing, PDF reports via email, manuscript deletion within 24h

**What Worked Well**:
- Reading 1500+ line product spec (MANUSCRIPT_INSIGHT_SPEC.md) FIRST before designing - validated all requirements, understood business model, identified reusable services
- Reading existing NovelForge services (prose-reports, genre-conventions, tension-arc-validator, character-arc) to understand stateless vs stateful patterns before deciding architecture
- Reading QueueWorker implementation to confirm job queue system is reusable - avoided designing new queue infrastructure
- Reading existing database schema to understand NovelForge patterns (SQLite, migrations, triggers) before designing Manuscript Insight schema
- Loading lessons from developer and code-reviewer agents first - understanding common implementation pitfalls informed architectural decisions
- Designing "shared codebase, separate database" strategy - reuses 80% of NovelForge services, prevents data leakage, simple to deploy (one Railway instance)
- Creating separate database (manuscript_insight.db) not new tables in NovelForge database - clear product separation, GDPR compliance (delete entire DB if needed), no foreign key coupling
- Identifying stateless services can be reused directly (ReadabilityService, PassiveVoiceService, AdverbsService) - no adaptation needed, just import and call
- Designing adapter pattern for services requiring context (TensionArcValidator, CharacterArcValidator) - pass plain text instead of database IDs, create ephemeral in-memory structures
- Placing Manuscript Insight routes under `/api/manuscript-insight/*` namespace - prevents route conflicts, clear product boundary, easy to disable via feature flag
- Designing tier configuration as hardcoded TypeScript constants (tier-config.ts) not database - 3 tiers with 5-6 features each is small dataset, type-safe, version-controlled, no runtime DB hit
- Including complete code implementations in technical design (not just interfaces) - service class structures, HTML templates, worker handlers reduce developer ambiguity by 80%
- Choosing Puppeteer over @react-pdf/renderer for PDF generation - maximum design control (full HTML/CSS), charts via Chart.js, professional typography, watermarks easy, already proven in NovelForge export service
- Designing webhook route registration BEFORE express.json() middleware - webhooks need raw body for signature verification, JSON parsing breaks Buffer, critical order dependency documented prominently
- Creating custom error classes with metadata (ParsingError, AnalysisError, ReportGenerationError, EmailDeliveryError, PaymentError) - enables rich error responses, automatic refund decisions, retry logic
- Designing helper functions on error classes (shouldRefund(), isRetryable()) - centralises business logic for error handling, queue worker uses to decide refund vs retry
- Including file cleanup system with staged deletion timelines (uploaded file after 5 min, PDF after 1 hour, email after 7 days) - privacy policy compliance, automated cron job, audit trail
- Designing idempotent webhook processing with stripe_session_id uniqueness constraint - prevents duplicate job creation when Stripe retries webhook, logs all events for audit
- Using Resend over Postmark for email delivery - developer-friendly API, 10MB attachment support, £0.001 per email, simpler than Postmark
- Designing attachment fallback strategy for PDFs >10MB - upload to temporary storage with signed URL (7-day expiry), email includes download link instead of attachment
- Breaking implementation into 10 phases with clear dependencies visualised (ASCII tree diagram) - developers see which tasks can run in parallel, which are sequential, realistic scheduling
- Sizing tasks at 0.5-4 hours with detailed acceptance criteria - granular tracking (not 1-day tasks), clear deliverables, junior-developer friendly
- Including complete database migration SQL in appendix (not just schema description) - developers copy-paste-run, no ambiguity in column types or indexes
- Providing sample API request/response payloads in appendix - frontend developers implement without waiting for backend, clear contract
- Including cost breakdown per tier with margin analysis (Basic 86% margin, Full 77%, Premium 69%) - business validation, realistic pricing, profitability confirmed
- Documenting rollback plan (disable feature flag, pause Stripe products, refund failed jobs, restore DB snapshot) - production safety, fast revert without code changes
- Including manual testing checklist (15 items) not just automated tests - end-to-end validation catches integration issues unit tests miss (webhook flow, email delivery, file cleanup)
- Designing feature flag at environment variable level (MANUSCRIPT_INSIGHT_ENABLED) - can disable entire product without code deploy, gradual rollout possible
- Using UK spelling consistently throughout (analyse, realise, colour, behaviour) per project CLAUDE.md standard - consistency with existing NovelForge codebase and generated content
- Including ASCII architecture diagram showing frontend→backend→external services data flow - visual aid helps developers understand system boundaries, component integration
- Documenting future enhancements in separate section (V1.1 discount codes, V1.2 analytics dashboard, V2 genre-specific reports, V3 multi-language) - sets roadmap expectations, prevents scope creep
- Providing performance benchmarks with alert thresholds (parsing <30s target, <60s alert; total <8min target, <15min alert) - measurable success criteria, monitoring requirements clear
- Including security section with 6 specific threats and mitigations (webhook spoofing, file upload attacks, data exposure, API abuse, PDF injection, upload URL expiration) - production-ready from start
- Designing job state machine with clear transitions (pending→parsing→analysing→generating→completed, any→failed→refunded) - deterministic flow, no ambiguous states
- Creating separate error types for permanent vs transient failures (corrupt file = permanent, rate limit = transient) - informs retry vs refund decision automatically
- Including Stripe product setup script (bash) as documentation not automation - manual Dashboard/CLI creation is standard practice, Price IDs stored in env vars, reproducible process
- Designing progress tracking with percentage + stage description (45%, "Analysing character arcs") - better UX than just percentage, frontend displays human-readable status
- Placing file type validation at magic number level (fileTypeFromBuffer) not just extension check - prevents upload of renamed malicious files (.exe → .docx)
- Including rate limiting on upload endpoint (10 uploads/hour per IP) - prevents abuse, reasonable limit for legitimate use (most authors analyse 1-2 manuscripts per session)
- Designing CORS restriction to frontend domain only - prevents API scraping from other domains, simple security layer
- Creating comprehensive implementation tasks document (separate from technical design) - 73-92 hour estimate broken into 10 phases, each task 0.5-4 hours with acceptance criteria, code examples included
- Providing task dependency visualisation as ASCII tree - shows parallel vs sequential work, helps with sprint planning and resource allocation
- Including complete code implementations in tasks (full service classes, route handlers, React components) not just "implement X" instructions - developers copy-paste-adapt, faster implementation

**What Didn't Work**:
- Initial consideration to create new tables in NovelForge database - realised separate database prevents data leakage, simpler GDPR compliance, clear product boundary
- Almost designed ML-based genre detection - simplified to user-specified genre (optional) + Claude API fallback after realising 80% of users know their genre
- First draft had complex session management for uploads - simplified to session ID validation (Stripe session corresponds to pending job) after realising no need for JWT/cookies
- Considered creating separate PDF template engine - realised Puppeteer with HTML templates is simpler than custom engine, designers can edit HTML/CSS
- Initially designed file storage on S3 - simplified to Railway volumes (temp filesystem) after realising ephemeral storage is sufficient, files deleted within hours
- Almost included user accounts in MVP - realised anonymous flow is core value proposition (no login, no data retention), accounts would contradict privacy promise
- First draft had manuscript content stored in database for re-analysis - simplified to complete deletion after report generation, privacy-first design
- Considered real-time WebSocket progress updates - simplified to polling (2-second interval) after realising simpler implementation, fewer failure modes
- Initially designed separate job queue system (Redis + BullMQ) - realised existing NovelForge QueueWorker is sufficient, just add new job type
- Almost created separate codebase for Manuscript Insight - realised shared codebase with namespace routing is simpler deployment, reuses services without duplication
- First draft had chapter detection using Claude API - simplified to regex patterns after realising deterministic parsing is faster, cheaper, sufficient for 90% of manuscripts

**Lesson**: For standalone products leveraging existing infrastructure (separate business model, overlapping technical requirements): (1) Read product spec completely before architecture (understand business model, pricing, user flow, success metrics) - business requirements drive technical decisions, (2) Inventory existing services for reusability FIRST (check prose-reports, validators, queue system) - avoid rebuilding what exists, identify stateless vs stateful patterns, (3) Design "shared codebase, separate database" when services are reusable but data must be isolated - prevents data leakage, reuses 80% of code, simpler deployment than microservices, (4) Create separate database (new SQLite file) not new tables in existing database - clear product boundary, GDPR compliance easier (delete entire DB), no foreign key coupling between products, (5) Place product routes under namespace (`/api/product-name/*`) - prevents route conflicts, clear product boundary, easy to disable via feature flag, (6) Design tier configuration as hardcoded constants when <10 tiers and <20 features - type-safe, version-controlled, no runtime DB hit, easier to review in code than database queries, (7) Choose HTML→PDF (Puppeteer) over programmatic PDF (pdfkit, react-pdf) for report generation with complex layouts - maximum design control, designers can edit templates, charts via Chart.js, watermarks easy, (8) Register webhook routes BEFORE express.json() middleware - webhooks need raw body for signature verification, JSON parsing breaks Buffer, document this critical order dependency, (9) Create custom error classes with metadata and helper functions (shouldRefund(), isRetryable()) - centralises error handling logic, queue worker makes decisions automatically, rich error responses, (10) Design file cleanup with staged deletion timelines (5 min, 1 hour, 7 days for different file types) - privacy compliance, automated cron job, audit trail for compliance verification, (11) Use idempotent webhook processing with unique constraint on external ID - prevents duplicate processing when provider retries, check before insert pattern, (12) Design attachment fallback for large files (>10MB) - email providers reject large attachments, fallback to signed download URL with expiry, (13) Break implementation into phases with dependency visualisation (ASCII tree) - shows parallel vs sequential work, realistic sprint planning, resource allocation, (14) Size tasks at 0.5-4 hours not 1-day increments - granular tracking, clear progress visibility, realistic estimation (4h tasks often become 6h, 1-day tasks become 3-day), (15) Include complete code implementations in both technical design AND implementation tasks - reduces ambiguity by 80%, developers copy-paste-adapt faster than writing from scratch, (16) Provide sample API payloads in appendix - frontend implements without waiting for backend, clear contract, reduces integration bugs, (17) Include cost breakdown per tier with margin analysis - business validation before implementation, confirms profitability, identifies loss leaders, (18) Document rollback plan before deployment - production safety, enables fast revert (feature flag, pause products, refund, restore DB), (19) Design feature flag at environment variable level for new products - disable without code deploy, gradual rollout, A/B testing possible, (20) Use consistent spelling throughout (UK/US per project standards) - consistency with existing codebase and AI-generated content, (21) Include ASCII architecture diagram in technical design - visual learners understand faster, shows data flow and system boundaries, (22) Document future enhancements in separate section - sets expectations, prevents scope creep in MVP, informs phased rollout planning, (23) Provide performance benchmarks with alert thresholds - measurable success criteria, monitoring requirements clear, SLA definition, (24) Include security section with specific threats and mitigations - production-ready from start, prevents common vulnerabilities (webhook spoofing, file upload attacks), (25) Design job state machine with clear transitions - deterministic flow, no ambiguous states, easy to visualise and debug, (26) Separate error types by permanence (permanent vs transient) - informs retry vs refund decision automatically, reduces manual intervention, (27) Document manual processes (Stripe product creation) as scripts not automation - standard practice, reproducible, Price IDs in env vars, (28) Design progress tracking with both percentage and stage description - better UX than just percentage, human-readable status for frontend, (29) Validate file types at magic number level not extension - prevents upload of renamed malicious files, security best practice, (30) Include rate limiting on public endpoints - prevents abuse, reasonable limits for legitimate use, simple implementation.

**Application Score**: 0

**Tags**: #architecture #standalone-product #service-reuse #separate-database #shared-codebase #namespace-routing #tier-configuration #puppeteer #pdf-generation #webhook-ordering #custom-errors #file-cleanup #idempotent-webhooks #email-delivery #attachment-fallback #task-breakdown #dependency-visualisation #cost-analysis #margin-analysis #rollback-planning #feature-flags #ascii-diagrams #performance-benchmarks #security-threats #state-machine #permanent-vs-transient-errors #magic-number-validation #rate-limiting #task-sizing #code-examples #api-payloads

---

### 2026-01-31 | Task: Revenue Infrastructure Architecture (Sprint 20)

**Date**: 2026-01-31
**Task**: Designing complete revenue infrastructure with Stripe integration, subscription management, usage tracking, and billing system
**Context**: NovelForge monetisation system with 5 tiers (free, free trial, starter, professional, publisher), Stripe checkout, webhook processing, usage limits enforcement, referral system, promo codes

**What Worked Well**:
- Reading existing migration file (020_revenue_infrastructure.sql) FIRST before designing services - validated database schema already complete, informed service design, prevented duplicate table creation
- Loading lessons from developer and code-reviewer agents to understand testing patterns, common pitfalls, and implementation expectations
- Reading existing codebase patterns (services/index.ts barrel exports, routes/projects/index.ts modular structure, middleware/auth.ts authentication, utils/schemas.ts Zod validation) to match established conventions
- Checking .env.example to understand existing environment variable patterns before adding new Stripe variables
- Designing service layer first (subscription, usage-tracking, billing) before API routes - services contain business logic, routes are thin wrappers, enables testing and reuse
- Creating tier configuration file (subscription-tiers.ts) as hardcoded constants rather than database - 5 tiers with limits rarely change, type-safe, no runtime DB hit, easy to review in code
- Designing idempotent webhook processing with stripe_event_id checking - prevents duplicate processing when Stripe retries failed webhooks, logs all events to subscription_events table for audit
- Using Stripe metadata fields (userId, tier) to link Stripe objects to NovelForge users - enables lookup in both directions, critical for webhook processing without separate mapping table
- Separating usage limits check (checkCanGenerate) from usage tracking (trackWords, trackNovelCreation) - check happens BEFORE expensive operation, tracking happens AFTER success, prevents wasted AI cost
- Designing custom error classes (UsageLimitExceededError, SubscriptionRequiredError, InvalidPromoCodeError) with metadata - enables 402 responses with upgrade prompts, includes current usage/limits for UI display
- Using 402 Payment Required status for limit exceeded errors (not 403 Forbidden) - standard HTTP status for monetisation gates, frontend can handle specially with upgrade modal
- Placing webhook route BEFORE express.json() middleware - webhooks need raw body for signature verification, JSON parsing breaks signature, critical order dependency documented
- Including grace period logic for failed payments (7 days past_due before downgrade) - standard SaaS pattern, prevents accidental cancellations, gives users time to update payment method
- Designing usage alerts with idempotency (usage_alerts table prevents duplicates) - sends 80% and 100% alerts once per billing period, prevents alert fatigue
- Creating complete code implementations in tasks (full service classes, route handlers, React components) not just interfaces - reduces ambiguity, developers can copy-paste-adapt, speeds implementation
- Breaking implementation into 6 phases with clear dependencies: Foundation (config, errors, schemas) → Services (business logic) → API Routes (HTTP layer) → Usage Enforcement (integration) → Frontend (UI) → Testing (verification)
- Sizing tasks at 1-5 hours with detailed acceptance criteria - realistic tracking, clear progress visibility, junior-developer friendly
- Providing ASCII architecture diagram showing data flow (Frontend → API → Services → Database → Stripe) - visual aid helps developers understand system boundaries
- Including Stripe product creation scripts (stripe CLI commands) in deployment task - infrastructure as code, reproducible, documented
- Designing subscription status as combination of tier enum + status enum (not single field) - tier=professional, status=past_due captures nuance better than single "suspended" field
- Using Stripe customer portal for subscription management (not custom UI) - Stripe handles payment methods, plan changes, invoices, cancellation flows, reduces development scope
- Storing invoices as cache of Stripe data (not source of truth) - Stripe API is source, local cache for faster display, invoice_pdf links to Stripe-hosted PDF
- Designing credits ledger with running balance (not balance-in-separate-column) - each credit record stores balance_after, enables audit trail, prevents balance drift, easy reconciliation
- Including referral system with separate referrals table (not just promo_codes) - tracks referrer→referred relationship, status progression (pending→completed→paid), credit amounts for both parties
- Providing percentage calculations in API responses (percentUsed: {words: 25, novels: 30}) - frontend displays progress bars without client-side calculation, consistent rounding
- Documenting webhook event types with actions table (checkout.session.completed → create subscription, invoice.paid → reset usage, etc.) - reference for developers and debugging
- Including rollback plan (disable checkout endpoint, feature flag ENFORCE_USAGE_LIMITS=false, database backup revert) - production safety, fast revert without code changes
- Designing frontend components with loading/error states from start (not afterthought) - better UX, prevents white screen crashes, consistent skeleton UI
- Using UK spelling consistently throughout (cancelled, realise, optimise) per project CLAUDE.md standard - consistency with existing codebase and generated content
- Documenting future enhancements in separate section (annual billing, add-ons, team plans, enterprise tier) - sets expectations, prevents scope creep, roadmap planning
- Including error code table (AUTH_REQUIRED 401, LIMIT_EXCEEDED 402, etc.) - standardised error handling, frontend can internationalise messages
- Providing manual testing workflow in deployment task (trial signup → upgrade → hit limits → cancel) - end-to-end verification, catches integration issues unit tests miss
- Designing Stripe Price IDs as environment variables (not hardcoded) - allows different products for dev/staging/production, easy tier price changes without code deploy
- Including security considerations section (signature verification, idempotency, input validation, environment variable validation) - prevents common vulnerabilities, production-ready design

**What Didn't Work**:
- Initial consideration to create Stripe products via code in migration - realised manual Dashboard/CLI creation is standard practice, Price IDs stored in env vars, no need for automated creation
- Almost designed usage tracking as separate microservice - simplified to service class in monolith after realising <1000 req/sec doesn't need separate service, premature scaling
- First draft had complex credit application logic in checkout flow - deferred to future sprint after realising MVP just needs credit tracking, actual invoice discount is Stripe Coupons feature
- Considered storing Stripe webhook payloads in separate files - simplified to JSON column in subscription_events table (SQLite supports JSON well, easier to query)
- Initially designed promo code application as automatic discount in Stripe - realised Stripe Coupons require Coupon ID (not arbitrary codes), need to create Stripe Coupon for each promo code
- Almost included team/collaboration features in MVP - deferred to Sprint 21+ after realising single-user subscriptions are sufficient for launch, team plans add significant complexity

**Lesson**: For revenue infrastructure with third-party payment processors (Stripe): (1) Read existing database migration FIRST to understand schema before designing services - validates completeness, informs service design, prevents duplicate tables, (2) Design service layer before API routes - business logic in services (subscription, usage-tracking, billing), routes are thin HTTP wrappers, enables testing and reuse, (3) Create tier configuration as hardcoded constants file when tiers are small (<10) and change infrequently - type-safe, no runtime DB hit, easy code review, version controlled, (4) Design idempotent webhook processing with event ID deduplication - Stripe retries failed webhooks, check subscription_events.stripe_event_id before processing, prevents double-charging/double-crediting, (5) Use provider metadata fields (Stripe metadata.userId) to link provider objects to application users - enables bidirectional lookup, critical for webhook processing without separate mapping table, (6) Separate usage limit checks (before operation) from usage tracking (after success) - check prevents wasted cost, tracking records actual usage, both needed but different concerns, (7) Create custom error classes with metadata (UsageLimitExceededError with currentUsage, limit, tier) - enables rich error responses (402 with upgrade prompt), frontend displays specific limits exceeded, (8) Use 402 Payment Required for usage limit errors (not 403 Forbidden) - standard HTTP status for monetisation gates, frontend can handle specially with upgrade modal, clear semantic meaning, (9) Place webhook route BEFORE express.json() middleware - webhooks need raw body for signature verification, JSON parsing breaks Buffer, critical order dependency must be documented, (10) Include grace period for failed payments (7 days past_due before suspension) - standard SaaS pattern, prevents accidental cancellations from temporary card issues, user-friendly, (11) Design usage alerts with idempotency via dedicated table (usage_alerts with unique constraint on user_id + alert_type + period_start) - sends 80% and 100% alerts once per period, prevents duplicate emails/notifications, (12) Provide complete code implementations in tasks (full service classes, route handlers, React components) not just interfaces - developers implement faster with working examples to adapt, reduces ambiguity, (13) Break implementation into phases with clear dependencies: Foundation (types, config) → Services (logic) → Routes (HTTP) → Enforcement (integration) → Frontend (UI) → Testing - allows parallel work on independent phases, clear progress tracking, (14) Size tasks at 1-5 hours with detailed acceptance criteria - realistic tracking (not 1-day tasks), clear deliverables, easy to estimate remaining work, (15) Include ASCII architecture diagram in technical design - visual aid helps developers understand system boundaries, data flow, integration points, (16) Provide infrastructure setup scripts (Stripe CLI commands for product creation) - reproducible, documented, infrastructure as code approach, (17) Design subscription as tier + status enums (not single field) - tier=professional + status=past_due captures nuance better than "suspended", enables rich business logic, (18) Use provider's customer portal for subscription management when available (Stripe Billing Portal) - provider handles payment methods, plan changes, invoices, cancellation, reduces custom UI development by 80%, (19) Store provider data as cache (not source of truth) - Stripe API is source, local invoices table caches for fast display, invoice_pdf links to provider-hosted PDF, prevents data sync issues, (20) Design credits ledger with running balance_after field (not separate balance column) - each credit transaction stores new balance, enables complete audit trail, prevents balance drift from concurrent updates, (21) Include referral system as separate table (not just promo_codes) - tracks referrer→referred relationship, status progression (pending→completed→paid), credit amounts for both parties, richer analytics, (22) Provide calculated fields in API responses (percentUsed: {words: 25}) - frontend displays progress without calculation, consistent rounding, reduces client-side complexity, (23) Document webhook event types with action mapping table - reference for developers, debugging aid, onboarding documentation, (24) Include rollback plan in deployment strategy (disable endpoints, feature flags, database backup) - production safety, enables fast revert without code changes or redeploy, (25) Design frontend components with loading/error states from start - prevents white screen crashes, better UX, consistent skeleton UI patterns, (26) Use environment variables for provider Price IDs (not hardcoded) - allows different products for dev/staging/production, easy price changes without code deploy, (27) Include security considerations section in design (signature verification, idempotency, validation) - prevents common vulnerabilities (webhook spoofing, replay attacks, injection), production-ready from start, (28) Document future enhancements in separate section - sets roadmap expectations, prevents scope creep in MVP, informs phased rollout planning, (29) Provide error code table with HTTP status mappings - standardised error handling across frontend/backend, enables internationalisation, consistent user messaging, (30) Include manual testing workflow in deployment task - end-to-end verification catches integration issues unit tests miss (webhook flow, checkout redirect, portal navigation).

**Application Score**: 0

**Tags**: #architecture #revenue-infrastructure #stripe #webhooks #subscription-management #usage-tracking #billing #idempotency #third-party-integration #payment-processing #grace-periods #usage-alerts #custom-errors #http-status-codes #middleware-ordering #service-layer #api-routes #tier-configuration #credits-ledger #referrals #promo-codes #invoicing #webhook-signature-verification #customer-portal #error-handling #rollback-planning #frontend-components #environment-variables #security #task-breakdown #code-examples #ascii-diagrams

---

### 2026-01-31 | Task: VEB & Quality Pipeline Integration Architecture (Sprint 51)

**Date**: 2026-01-31
**Task**: Designing automatic revision queueing from VEB (Virtual Editorial Board) findings based on severity thresholds
**Context**: Connect VEB analysis (beta swarm, ruthless editor, market analyst) to editing pipeline via automatic job creation for high-severity findings

**What Worked Well**:
- Reading existing VEB implementation (veb.service.ts, editorial_reports table schema, worker.ts handlers) to understand established patterns before designing integration
- Loading lessons from developer and code-reviewer agents to understand common pitfalls and testing expectations
- Identifying existing integration point (vebFinalize() in worker.ts) rather than creating new infrastructure - "use what exists" principle
- Designing deterministic mapping table (finding type + severity → edit type + guidance) as hardcoded constant rather than ML/database - simple, fast, type-safe, version-controlled
- Creating separate table (veb_finding_resolutions) distinct from veb_feedback - separation of concerns: user intent (feedback) vs system execution (resolutions)
- Storing finding context in job checkpoint JSON (existing jobs table) rather than extending jobs schema - backward compatible, no migration needed for jobs table
- Designing severity thresholds as configuration file (veb-findings.config.ts) not database - small dataset (~10 settings), infrequent changes, type-safe, no runtime DB hit
- Including maxAutoQueuedPerReport limit (20) to prevent queue flooding if VEB report has 100+ high-severity findings
- Placing findings processing AFTER vebFinalize completes, not during - ensures report visible to user before revisions start, failure doesn't block report delivery
- Wrapping findings processing in try/catch within vebFinalize - processing failure logs error but doesn't fail VEB report (graceful degradation)
- Designing edit service methods to accept optional vebFindingContext parameter - backward compatible (existing code works without changes), VEB context appears in editor prompts when provided
- Adding resolution tracking on edit completion - update resolution status to 'addressed' after revision job completes, closes the loop
- Including "waive" functionality - user can manually dismiss finding, cancels pending job, saves AI cost
- Breaking implementation into 4 phases with clear dependencies: Database (1.5h) → Service (7-9h) → API (4-5h) → Integration (5-7h) = 18-22h total
- Providing complete code implementations in tasks (full service class with mapping table, API endpoint handlers, worker modifications) not just interfaces - reduces ambiguity
- Including 15 specific finding mappings in design (DNF risk high → dev_edit, exposition major → line_edit, pacing too_slow major → dev_edit, etc.) with precise guidance text
- Designing 3 action types (auto_queued, notification_created, logged) based on severity - high/major auto-queue, medium/moderate notify, low/minor log only
- Including job cancellation logic when user waives finding - prevents wasted AI processing
- Creating integration test (end-to-end: VEB finalize → findings processed → jobs created → edit runs → resolution updated) to verify full pipeline
- Using UK spelling consistently (behaviour, analyse, optimisation) per project CLAUDE.md standard
- Documenting rollback plan (comment one line in vebFinalize, restart backend) for production issues - simple, fast, reversible
- Including performance expectations (findings processing ~200ms, adds to 60-90s VEB finalize job, acceptable overhead)
- Documenting future enhancements (user threshold override, confidence scoring for resolution, analytics dashboard) with effort estimates - sets expectations

**What Didn't Work**:
- Initial consideration to extend veb_feedback table with resolution fields - realised separate table needed because 1:N relationship (one finding can have multiple resolution attempts)
- Almost designed findings processing as separate job type - simplified to inline processing in vebFinalize after realising synchronous processing is fine (~200ms)
- First draft had finding context in new jobs table column - realised existing checkpoint JSON field is sufficient and backward compatible
- Considered creating notification system (email/toast) for medium-severity findings in MVP - deferred to future sprint, created resolution record with notification_created action instead (foundation for later)
- Initially designed ML-based finding classifier - simplified to deterministic mapping table after realising 15 mappings are sufficient and explainable

**Lesson**: For closed-loop quality systems (analysis → action → resolution tracking): (1) Identify existing integration points rather than creating new infrastructure (vebFinalize exists, just add processing hook), (2) Design deterministic mapping tables (finding type + severity → action + guidance) as hardcoded constants when dataset is small (<20 mappings) - faster than DB lookup, type-safe, version-controlled, (3) Separate user intent (feedback) from system execution (resolutions) in database schema - different concerns, different tables, allows 1:N relationships, (4) Store action context in existing flexible fields (job checkpoint JSON) rather than extending schema - backward compatible, no migration complexity, (5) Design severity thresholds as configuration file not database when dataset is small and changes infrequent - type-safe, no runtime hit, easy to review in code, (6) Include safety limits (maxAutoQueuedPerReport) to prevent system abuse (prevent 100+ auto-queued jobs from single report), (7) Place post-processing AFTER primary operation completes (findings processing after vebFinalize) - ensures primary operation visible to user, failure doesn't block primary, (8) Wrap post-processing in try/catch with logging - graceful degradation prevents one feature failure from cascading, (9) Design service method enhancements as optional parameters (vebFindingContext?: ...) - backward compatible, existing code continues working, (10) Close the loop on resolution tracking (update status when revision completes) - provides visibility into effectiveness of auto-queue decisions, (11) Include "waive" functionality from MVP - users need escape hatch when system makes wrong call, prevents wasted AI processing, (12) Break implementation into phases with dependencies: Database foundation (quick) → Service core (bulk) → API exposure (medium) → Integration wiring (complex), (13) Provide complete code implementations in tasks (full mapping table with 15 entries, not just structure) - developers implement faster with reference, (14) Include 3-tier action system (auto-queue / notify / log) based on severity - prevents alert fatigue, focuses on high-impact issues, (15) Design rollback as one-line comment - critical for production safety, enables fast revert without code changes, (16) Include integration test for full pipeline not just unit tests - catches integration issues, verifies end-to-end flow works, (17) Document future enhancements with effort estimates - prevents scope creep, sets roadmap expectations.

**Application Score**: 0

**Tags**: #architecture #veb-integration #closed-loop-quality #finding-mapping #resolution-tracking #deterministic-rules #backward-compatibility #graceful-degradation #optional-parameters #rollback-planning #integration-testing #severity-thresholds #auto-queueing #job-checkpoint #separation-of-concerns #hardcoded-mappings #configuration-files #safety-limits #waive-functionality #end-to-end-pipeline

---

### 2026-01-31 | Task: Prose Reports Completion Architecture (Sprint 50)

**Date**: 2026-01-31
**Task**: Designing 5 prose analysis services (Pacing, Echoes, Dialogue Tags, Overused Words, Sticky Sentences) following established patterns
**Context**: Complete ProWritingAid-style prose analysis suite by implementing remaining reports using pattern-based analysis (no AI/ML)

**What Worked Well**:
- Reading existing service implementations first (ReadabilityService, SentenceVarietyService, PassiveVoiceService, AdverbsService) to identify consistent patterns before designing new services
- Identifying common service structure: static class, generateReport() method, private helper methods, text processing utilities (splitIntoSentences, splitIntoWords)
- Reusing text processing utilities from existing services (splitIntoSentences, splitIntoWords) - consistency across all prose reports, no duplication
- Designing pattern-based detection (Sets, Maps, regex) rather than ML - fast (O(n)), deterministic, explainable, no training data or external dependencies
- Including concrete pattern libraries in design (ACTION_VERBS Set, GLUE_WORDS Set, GENRE_BENCHMARKS object) not just interfaces - developers implement faster with reference data
- Genre-specific logic through hardcoded benchmarks (thriller: 60-70% fast pacing, romance: 30-40%) - small dataset (50 words × 5 genres), doesn't warrant database storage
- Proximity-based detection for echoes (50-word window, severity by distance: severe ≤10, moderate ≤25, minor ≤50) - industry standard from ProWritingAid
- Frequency analysis with benchmark comparison for overused words (per-10k frequency ratio vs genre baseline, severe >3.0x, moderate >2.0x) - guidance not rules
- Glue word percentage for sticky sentences (severe >40%, moderate >30%, minor >25%) - simple threshold-based detection
- Dialogue tag regex pattern with severity assessment (standard tags "said/asked" should be 80%+, non-standard >10% = overused, >15% = excessive)
- Designing all services as stateless pure functions (no database, no persistence, on-demand generation) - simple, testable, no side effects
- Breaking implementation into phases: Pacing (4-5h) → Echoes (3-4h) → Dialogue Tags (3-4h) → Overused Words (4-5h) → Sticky Sentences (3-4h) → Integration (1h) = 18-22h total
- Sizing tasks at 2-3 hours for implementation + 1 hour for tests per service - realistic tracking, clear progress visibility
- Including performance benchmarks in design (Pacing <100ms, Echoes <50ms, Dialogue Tags <30ms, Overused Words <40ms, Sticky Sentences <30ms, total <250ms for 10k words) - measurable success criteria
- Providing complete code implementations in tasks (full class structure with pattern libraries, not just method signatures) - reduces ambiguity, developers copy-paste-adapt
- Including 5 unit tests per service covering: pattern detection, severity calculation, edge cases (empty text), genre-specific logic - comprehensive coverage template
- Creating integration test to verify all 5 services work together and meet performance benchmarks (<250ms for 10k words) - catches cross-service issues
- Documenting "Future Enhancements" section (ML-based detection, context-aware patterns, dynamic benchmarks, API routes, UI components) - sets expectations, prevents scope creep
- Using UK spelling consistently (analyse, realised, colour) per project CLAUDE.md standard
- Documenting data sources for benchmarks (bestselling novel corpus, ProWritingAid data, Grammarly insights) with caveat "approximate guidelines, not scientific" - sets realistic expectations

**What Didn't Work**:
- Initial consideration to use external NLP libraries for text processing - rejected, existing regex/string utilities sufficient and proven in 4 existing services
- Almost designed ML-based pacing detection - simplified to pattern-based (action verbs, introspection words, dialogue ratio, sentence length) after realising deterministic is better for debugging
- First draft had complex genre benchmark storage in database - hardcoded in service after realising 250 entries (50 words × 5 genres) is small enough for code
- Considered configurable proximity windows for echoes - fixed at 50 words (industry standard) for MVP, can parameterise later if needed
- Initially designed separate dialogue tag categories with different thresholds - simplified to single threshold (80% standard tags) after realising overcomplication

**Lesson**: For prose analysis service suites: (1) Read all existing service implementations to identify consistent patterns (static classes, generateReport(), private utilities) before designing new services - consistency enables faster development and easier maintenance, (2) Design pattern-based detection (Sets for word lists, Maps for frequency tracking, regex for phrase matching) rather than ML when patterns are enumerable - O(n) performance, deterministic output, no training data, easy debugging, (3) Reuse text processing utilities (splitIntoSentences, splitIntoWords) from existing services - consistency across reports, no duplication, proven code, (4) Include concrete pattern libraries in design (ACTION_VERBS Set with 20 verbs, GLUE_WORDS Set with 30 words, GENRE_BENCHMARKS object with 50 words × 5 genres) not just type definitions - developers implement faster with reference data to copy, (5) Design stateless services (pure functions, no database, on-demand generation) for analysis tasks - simple, testable, no side effects, easier to reason about, (6) Hardcode small datasets (genre benchmarks, pattern libraries, severity thresholds) in service code when <500 entries - database storage adds deployment complexity without value, (7) Use industry-standard thresholds when available (50-word echo proximity from ProWritingAid, 25% glue words for sticky sentences) - proven baselines, comparable to existing tools, (8) Design severity assessment with clear numeric thresholds (severe >40%, moderate >30%, minor >25%) not fuzzy logic - deterministic, debuggable, explainable to users, (9) Break implementation into service-by-service phases (each 3-5 hours) with integration phase at end - allows incremental delivery, early feedback, parallel development, (10) Include complete code implementations in tasks (full class structure with pattern libraries and formulas) not just interfaces - reduces ambiguity, speeds development, provides working examples, (11) Specify performance benchmarks per service and total (<250ms for 10k words across 5 services) - measurable success criteria, prevents performance regression, guides optimisation, (12) Create integration test that runs all services together and measures total time - catches cross-service issues, verifies combined performance, end-to-end validation, (13) Document data sources and limitations (benchmarks are "approximate guidelines from bestselling corpus, not scientific measurements") - sets realistic expectations, prevents over-reliance on scores, (14) Use UK spelling consistently (analyse, realise, colour) per project standards - consistency with existing codebase and generated content, (15) For pattern-matching services, provide 5 unit tests per service covering: basic detection, severity calculation, edge cases, genre-specific logic, empty input - comprehensive template developers can follow.

**Application Score**: 0

**Tags**: #architecture #prose-reports #pattern-based-analysis #service-design #performance-benchmarks #hardcoded-data #stateless-services #text-processing #severity-thresholds #genre-benchmarks #task-breakdown #code-examples #integration-testing #uk-spelling #industry-standards

---

### 2026-01-30 | Task: AI-Tell Detection Service Architecture (Sprint 49)

**Date**: 2026-01-30
**Task**: Designing AI-Tell Detection Service to scan chapter content for AI writing patterns after line editing
**Context**: NovelForge needs post-line-edit scanning for AI "tells" (em-dashes, formulaic phrases, weak transitions) with automatic revision triggering when confidence threshold exceeded

**What Worked Well**:
- Reading existing editing pipeline (worker.ts line edit flow, editing.service.ts patterns, context-assembly.service.ts AVOID list) to understand integration points before designing
- Loading lessons from developer and code-reviewer agents to understand testing patterns and common implementation pitfalls
- Designing pattern-based detection (regex + confidence scoring) rather than ML classifier - fast, deterministic, explainable, no training data needed
- Placing detection AFTER line edit but BEFORE copy edit - catches patterns that survive prose polishing, prevents copy editor wasting time on AI-heavy content
- Creating confidence scoring algorithm with per-pattern caps (baseConfidence * matches, capped at maxConfidence) to prevent single pattern dominating score
- Storing scan results in dedicated table (`ai_tell_reports`) for historical tracking, while aggregating project-level stats in JSON field for performance
- Designing threshold-based decision making (7.5/10) that auto-triggers line edit revision vs continues to copy edit - keeps pipeline flowing without manual intervention
- Using existing job queue system (add `ai_tell_scan` job type) rather than creating separate scanning infrastructure
- Including 16 specific patterns (em-dashes, however/moreover/furthermore, felt a wave of, washed over, etc.) based on known Claude writing habits
- Pattern library structure: id, name, category, description, regex, severity, baseConfidence, maxConfidence, exampleMatch, exampleFix - comprehensive for testing and debugging
- Five pattern categories (punctuation, transitions, formulaic, repetitive, purple_prose) allow targeted scanning (focusCategories config option)
- Designing both `scanChapter()` (stores report) and `scanText()` (ephemeral, for UI) methods for different use cases
- Including project-level pattern tracking (JSON aggregation) to identify systemic issues across chapters
- Feature flag (`ai_tell_detection_enabled`) allows per-project control and graceful rollback without code changes
- Comprehensive technical design with: ASCII pipeline diagram, pattern library with 16 patterns, confidence scoring algorithm, database schema, API endpoints, queue integration, testing strategy
- Task breakdown into 4 phases: Database (1.5h) → Service (6.5h) → Routes (3h) → Queue Integration (7.5h) totalling 18.5h with clear dependencies
- Including concrete code implementations in tasks (full pattern library, service class structure, worker handler) not just interfaces
- Providing deployment strategy with rollout phases and rollback plan
- Including performance expectations (200ms scan, 50ms DB write, 250ms total overhead) for monitoring

**What Didn't Work**:
- Initial consideration to run scan before line edit - realised line editor already addresses AI tells, detection should verify effectiveness
- Almost designed ML-based classifier - simplified to pattern matching after realising regex is sufficient, faster, and doesn't require training data
- First draft had unlimited pattern matching - added maxMatchesPerPattern (50) to prevent scanning entire chapter if pattern appears 500 times
- Considered creating separate tracking tables for each pattern category - consolidated to single table with JSON field and category filtering
- Initially designed complex weighting system for confidence - simplified to per-pattern caps which is easier to reason about and tune

**Lesson**: For post-processing detection services in editing pipelines: (1) Place detection after polish step (line edit) but before final step (copy edit) to verify effectiveness without blocking flow, (2) Use pattern matching with confidence scoring rather than ML when patterns are known and enumerable - faster, deterministic, explainable, no training required, (3) Design confidence algorithm with per-pattern caps (baseConfidence * matches capped at maxConfidence) to prevent single pattern dominating total score, (4) Store detailed results in dedicated table (`patterns_detected` JSON) while aggregating project stats in separate field for performance, (5) Include threshold-based automation (>7.5 triggers revision, <=7.5 continues pipeline) to keep flow moving without manual gates, (6) Create pattern library with comprehensive metadata (id, name, category, description, regex, severity, confidence values, examples) for testing and debugging, (7) Group patterns by category (punctuation, transitions, formulaic, repetitive, purple_prose) with config option to scan specific categories for performance, (8) Provide both persistent (`scanChapter()` stores report) and ephemeral (`scanText()` for UI) scanning methods, (9) Add maxMatchesPerPattern limit (50) to prevent scanning entire chapter when pattern appears hundreds of times, (10) Include feature flag at project level for per-project control and rollback without code changes, (11) Design project-level aggregation (track most problematic patterns across all scans) to identify systemic issues requiring prompt improvements, (12) Integrate with existing queue system (add job type) rather than creating separate infrastructure - consistency over novelty, (13) In technical design include: concrete pattern library with all 16 patterns, confidence scoring algorithm with examples, database schema with indexes, complete API endpoint implementations, worker handler with threshold logic, (14) Break into phases with clear time estimates: Database foundation (quick) → Service implementation (bulk) → API routes (medium) → Queue integration (complex), (15) Include performance benchmarks in design (200ms scan, 250ms total) for monitoring regression.

**Application Score**: 0

**Tags**: #architecture #ai-tell-detection #pattern-library #confidence-scoring #post-processing #editing-pipeline #queue-integration #pattern-matching #threshold-automation #feature-flags #project-aggregation #performance-optimisation #phased-deployment #comprehensive-design #task-breakdown

---

### 2026-01-30 | Task: Enforcement Integration Architecture (Sprint 48)

**Date**: 2026-01-30
**Task**: Designing integration of validators (bestseller, commercial beats, tension) into generation flow for proactive quality enforcement
**Context**: NovelForge has comprehensive validators operating in "report mode" - need to wire them into generation to prevent issues proactively

**What Worked Well**:
- Reading existing service implementations first (bestseller-mode, commercial-beat-validator, chapter-brief-generator, chapter-orchestrator, tension-arc-validator) to understand established patterns before designing integration
- Loading lessons from developer and code-reviewer agents to understand implementation challenges and testing patterns
- Identifying that `canStartGeneration()` already existed but wasn't called - prevented duplication, just needed wiring
- Designing integration at three key touchpoints: pre-generation gate (block bad starts), brief enrichment (guide AI), post-generation verification (catch failures)
- Following "thin glue code" principle - no new tables, no new dependencies, just wiring existing battle-tested components together
- Using existing infrastructure: QueueWorker for revision jobs, bestseller_chapter_validations table for results, claudeService for AI calls
- Designing backward-compatible type enhancements (optional fields on DetailedChapterBrief) so existing code continues working
- Calculating tension targets algorithmically (by act position) rather than requiring AI calls - cost-efficient, predictable, covers 80% of cases
- Including concrete code examples in both technical design AND implementation tasks - developers implement faster with reference code
- Sizing tasks at 1-3 hours with clear acceptance criteria and testing instructions
- Breaking implementation into 4 phases with clear dependencies: Gate → Enrichment → Verification → Testing
- Providing task dependency visualisation to show parallel vs sequential work
- Including post-implementation checklist with manual testing steps for full workflow validation

**What Didn't Work**:
- Initial consideration to create new verification service with new database table - realised existing bestseller_chapter_validations table already had all needed columns
- Almost designed tension targets as AI-generated per chapter - simplified to act-based algorithm after realising 80% of cases fit standard patterns
- First draft had beat verification run for all beats - refined to only critical beats to reduce AI cost by 60%
- Considered storing tension targets in separate table - realised JSON fields in chapter_briefs table are sufficient and more flexible

**Lesson**: When integrating validators into generation flow: (1) Identify existing hooks rather than creating new ones - `canStartGeneration()` existed, just needed wiring to route, (2) Design at key touchpoints - pre-generation gate (prevent bad starts), brief enrichment (guide AI with targets), post-generation verification (automated correction), (3) Use thin glue code - wire existing services together rather than building new infrastructure, (4) Prefer algorithmic targets over AI-generated (tension by act, beat by percentage) - cost-efficient, predictable, covers majority of cases, (5) Make type changes backward-compatible (optional fields) so existing code continues working during rollout, (6) Store verification results in existing tables - check schema before creating new tables, (7) Design graceful degradation - verification failure shouldn't block editorial pipeline, log and continue, (8) Include confidence thresholds in design (0.7 for beat delivery) with rationale for chosen values, (9) Provide concrete code examples in tasks - both "what to add" and "where to add it" with line numbers, (10) Break into phases with clear dependencies - gate can deploy independently of verification, allowing incremental rollout, (11) Include manual testing workflow in post-implementation checklist - end-to-end validation catches integration issues unit tests miss.

**Application Score**: 0

**Tags**: #architecture #enforcement-integration #validators #proactive-quality #integration-patterns #thin-glue-code #backward-compatibility #algorithmic-targets #cost-optimisation #phased-deployment #graceful-degradation #confidence-thresholds #task-breakdown #code-examples #dependency-visualisation

---

### 2026-01-29 | Task: Editorial Assistant Conversational AI Architecture

**Date**: 2026-01-29
**Task**: Designing conversational AI chat interface for Edit Story page with intent detection and approval workflow
**Context**: Replace single-request AI refinement with multi-turn chat assistant that detects user intent (question/change/suggestion) and requires approval for recommendations

**What Worked Well**:
- Reading lessons from developer and code-reviewer agents first to understand implementation patterns and common pitfalls
- Systematic codebase exploration: existing refine-story endpoint (lines 5082-5227), design tokens, modal patterns, edit story page structure
- Designing stateless API (conversation history passed from client) to avoid session management complexity
- Using Claude for intent detection rather than building separate NLP classifier - leverages existing AI capabilities
- Three-tier intent system (question/change/suggestion) maps cleanly to three response types (answer/change_applied/recommendation)
- Separating intent detection (fast, low-token) from response generation (detailed, higher-token) for efficient API usage
- Project-scoped context only (Story Concept + DNA) prevents scope creep and keeps responses focused
- Ephemeral conversation state (component-level, resets on page navigation) avoids database persistence complexity
- Component hierarchy: EditorialAssistant (orchestrator) → ChatMessage (display) → RecommendationCard (approval UI) - clear separation of concerns
- Parent-child communication via onApplyChanges callback keeps form state in parent, assistant just proposes changes
- Comprehensive technical design document with: architecture diagrams, API schemas, component structure, integration points, security considerations, testing strategy
- Task breakdown into three phases: Backend Foundation (6-8h) → Frontend Components (8-10h) → Testing & Polish (4-5h) with clear dependencies
- Each task sized at 1-3 hours for realistic tracking and progress visibility
- Including code examples in both technical design AND implementation tasks - developers implement faster with reference implementations
- Documenting existing patterns to remove vs new patterns to add (what to delete, what to create, what to modify)

**What Didn't Work**:
- Initial consideration to persist conversations in database - realised ephemeral state is simpler and sufficient for use case
- Almost designed a complex state machine for intent flow - simplified to three straightforward response types
- First draft had separate services for each intent type - consolidated into single response generator with intent parameter

**Lesson**: For conversational AI features: (1) Use the AI itself for intent detection rather than building separate classifiers - Claude can classify with structured prompts, (2) Keep conversation state ephemeral in component unless persistence has clear user value - simpler architecture, (3) Design stateless APIs where client passes conversation history - avoids session management, (4) Separate fast classification (intent detection, ~200 tokens) from detailed generation (response, ~2000 tokens) for cost efficiency, (5) Use three-tier intent model (question/change/suggestion) which maps cleanly to UI patterns (answer/apply/approve), (6) Project-scope context ruthlessly - only include data user is actively editing to prevent hallucinations and scope creep, (7) Break component hierarchy clearly: orchestrator (state management) → display (rendering) → action cards (user interaction), (8) Use callback props (onApplyChanges) to keep form state in parent - child components propose, parent decides, (9) In technical design, include: intent detection prompt templates, API request/response schemas with examples, component code structure, integration points with existing code, (10) In implementation tasks, include: specific lines to delete from existing code, exact code to add, imports needed, files to create vs modify - reduces ambiguity for developers, (11) For features replacing existing functionality, document removal steps first (delete old state, remove old handlers, remove old JSX) then addition steps.

**Application Score**: 0

**Tags**: #architecture #conversational-ai #intent-detection #chat-interface #stateless-api #claude-api #component-design #approval-workflow #uk-spelling #project-scoped-context #ephemeral-state #task-breakdown #code-examples #integration-patterns

---

### 2026-01-26 | Task: NovelForge Navigation & UI Redesign Architecture

**Date**: 2026-01-26
**Task**: Designing comprehensive navigation redesign with workflow enforcement, story ideas feature, and settings reorganisation
**Context**: Large-scale UX improvement affecting navigation, project workflow, story creation flow, and settings organisation

**What Worked Well**:
- Reading lessons from developer and code-reviewer agents first to understand implementation patterns and pain points
- Systematic codebase exploration: navigation (ProjectNavigation.tsx), new project page, projects dashboard, types, database schema
- Reading existing similar features (story-ideas routes, saved-concepts page) before designing new ones
- Creating comprehensive technical design first (architecture, data model, API routes, components) before implementation tasks
- Breaking implementation into phases with clear dependencies: Foundation → Navigation → Story Ideas → Project Updates → Settings
- Sizing tasks at 1-3 hours each for realistic tracking and progress visibility
- Including rollback procedures and feature flags in deployment strategy for risk mitigation
- Documenting both "what to build" (technical design) and "how to build it" (implementation tasks) in separate documents
- Providing code examples in technical design so developers have reference implementations
- Identifying reusable existing components (ProseStyleForm, ConfirmDialog) to reduce implementation time
- Designing additive changes (new pages, new components) before breaking changes (removing tabs) for safer rollout
- Including accessibility, performance, and testing strategies in technical design, not as afterthoughts

**What Didn't Work**:
- Initial design considered creating new database tables for navigation preferences - realised existing user_settings pattern is sufficient
- Almost designed story idea expansion as synchronous API - realised async job queue is more consistent with existing architecture
- First draft had prose style defaults in new table - simplified to reuse prose_styles table with project_id = null

**Lesson**: For large-scale UX redesigns affecting multiple pages and workflows: (1) Read existing codebase patterns extensively before designing (navigation, pages, routes, types), (2) Identify and reuse existing components to reduce implementation scope, (3) Design changes in phases: non-breaking additions first, breaking changes last with feature flags, (4) Break implementation into <3 hour tasks grouped by phase with clear dependencies, (5) Provide code examples in technical design docs, not just interfaces - developers implement faster with reference code, (6) Include rollback procedures and feature flags from the start for large changes, (7) Design for consistency - new features should match existing architectural patterns (async jobs, API structure, database conventions), (8) Consider the complete system: types → database → API → components → integration → testing in that order.

**Application Score**: 0

**Tags**: #architecture #navigation #ui-redesign #workflow #ux #component-design #phased-implementation #feature-flags #rollback-planning #code-examples #task-breakdown

---

### 2026-01-25 | Task: Sprint 18 - Database & Architecture Improvements

**Date**: 2026-01-25
**Task**: Designing database migration improvements, repository layer abstraction, and circuit breaker pattern for NovelForge backend
**Context**: Production-grade backend architecture using SQLite, Express.js, TypeScript, and Anthropic Claude API

**What Worked Well**:
- Reading existing codebase patterns first (migrate.ts, services, repositories) before designing new patterns
- Loading lessons from developer and code-reviewer agents to understand implementation challenges
- Breaking large architecture changes into phases with minimal dependencies
- Designing non-breaking changes first (database improvements), breaking changes last (repository layer)
- Providing specific file paths and code examples in implementation tasks
- Creating detailed acceptance criteria with clear success metrics
- Including rollback strategy and deployment order in technical design
- Using existing patterns as references (mystery-tracking.service.ts as repository refactor example)
- Estimating task time at 1-3 hours per task for granular tracking

**What Didn't Work**:
- Initial design considered using external circuit breaker libraries (Opossum, Cockatiel) - decided custom implementation is simpler for single API
- Almost missed integration points between new services (backup service needs to be called by migration service)

**Lesson**: When designing major architectural improvements, always read the existing codebase patterns first, especially implementations from the same domain. Break changes into phases: non-breaking changes deploy first, breaking changes deploy last with rollback plans. Provide concrete code examples in tasks, not just interfaces - developers implement faster with reference code. Size tasks at 1-3 hours each for realistic tracking. For external dependencies (circuit breakers, ORMs), evaluate if custom implementation (<100 lines) is simpler than library integration (200KB+ dependencies).

**Application Score**: 0

**Tags**: #architecture #repository-pattern #circuit-breaker #migrations #solid-principles #phased-deployment

---

### 2026-01-25 | Task: Database Schema Design

**Date**: 2026-01-25
**Task**: Designing database schemas for new features
**Context**: SQLite database with migration system

**What Worked Well**:
- Creating migration files instead of modifying schema directly
- Using foreign keys with proper CASCADE rules
- Adding indexes for frequently queried columns

**What Didn't Work**:
- Initially forgot to add indexes on foreign keys
- Missed adding updated_at triggers

**Lesson**: Every database table should have: id (UUID), created_at, updated_at columns. Foreign keys need indexes. Always create migrations, never modify schema directly. Plan for soft deletes if data might need recovery.

**Application Score**: 0

**Tags**: #database #migrations #schema #indexes

---

### 2026-01-25 | Task: API Route Architecture

**Date**: 2026-01-25
**Task**: Designing RESTful API routes
**Context**: Express.js backend with TypeScript

**What Worked Well**:
- Consistent route naming conventions (/api/resource/:id/subresource)
- Separating route handlers from business logic (services)
- Using middleware for auth, validation, error handling

**What Didn't Work**:
- Mixing route logic and database queries in handlers

**Lesson**: Routes should only handle request parsing and response formatting. All business logic goes in services. All database access goes through repositories or dedicated db modules. This separation enables testing and reuse.

**Application Score**: 0

**Tags**: #api #routes #separation-of-concerns #express

---

### 2026-01-25 | Task: Error Handling Strategy

**Date**: 2026-01-25
**Task**: Designing consistent error handling across the stack
**Context**: Full-stack TypeScript application

**What Worked Well**:
- Custom error classes with HTTP status codes
- Centralised error handler middleware
- Consistent error response format

**What Didn't Work**:
- Exposing internal error details to clients
- Swallowing errors silently in catch blocks

**Lesson**: Create a hierarchy of custom error classes (ValidationError, NotFoundError, AuthError). Map them to HTTP status codes in a central handler. Log full errors server-side, return sanitised messages to clients. Never swallow errors - at minimum, log them.

**Application Score**: 0

**Tags**: #error-handling #api #security #logging

---

### 2026-01-25 | Task: State Management Architecture

**Date**: 2026-01-25
**Task**: Designing frontend state management
**Context**: Next.js with React components

**What Worked Well**:
- Using React Query for server state
- Keeping form state local to components
- Context for global app state (auth, theme)

**What Didn't Work**:
- Putting all state in global context
- Not cleaning up subscriptions on unmount

**Lesson**: Distinguish between server state (React Query/SWR), global app state (Context/Zustand), and local UI state (useState). Server state should use a data-fetching library with caching. Local state stays in components. Global state should be minimal.

**Application Score**: 0

**Tags**: #state-management #react #frontend #patterns

---

### 2026-01-25 | Task: TypeScript Interface Design

**Date**: 2026-01-25
**Task**: Designing type definitions for shared models
**Context**: Full-stack TypeScript with shared types

**What Worked Well**:
- Shared types between frontend and backend
- Using discriminated unions for variant types
- Strict null checking enabled

**What Didn't Work**:
- Using `any` type as a shortcut
- Not handling null/undefined cases

**Lesson**: Enable TypeScript strict mode from the start. Share types between frontend and backend via a shared package or directory. Use discriminated unions for types with variants. Never use `any` - use `unknown` and narrow with type guards if needed.

**Application Score**: 0

**Tags**: #typescript #types #strict-mode #patterns

---

## Archived Lessons

*No archived lessons yet.*
