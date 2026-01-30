# Sprint 20: Revenue Infrastructure - Product Specification

**Sprint Goal**: Enable monetisation with subscription payments
**Story Points**: ~40
**Priority**: High
**Dependencies**: User authentication system (complete)

---

## Executive Summary

This sprint implements the complete revenue infrastructure for NovelForge, enabling subscription-based monetisation through Stripe. The system supports three pricing tiers, usage-based quota tracking, free trials, and a referral program to drive growth.

---

## Pricing Tiers

### Starter - £29/month
- **Limits**:
  - 1 novel project per month
  - 50,000 words total generation
  - Standard generation queue priority
- **Features**:
  - All core writing features
  - Basic export (DOCX, PDF)
  - Email support
- **Target**: Individual authors testing the platform

### Professional - £79/month
- **Limits**:
  - 3 novel projects per month
  - 100,000 words total generation
  - High-priority queue (2x speed)
- **Features**:
  - Everything in Starter
  - Advanced editing tools
  - Series management
  - Priority email support
- **Target**: Serious authors with regular output

### Publisher - £199/month
- **Limits**:
  - Unlimited novel projects
  - Unlimited word generation
  - Highest-priority queue (4x speed)
- **Features**:
  - Everything in Professional
  - White-label export options
  - Dedicated account manager
  - API access
  - Early feature access
- **Target**: Publishing houses, agencies, high-volume authors

---

## Feature 1: Stripe Integration (8 points)

### User Stories

**As a new user**, I want to select a subscription tier and pay with my credit card, so I can access premium features.

**As a subscribed user**, I want my subscription to auto-renew each month, so I don't lose access to my projects.

**As an admin**, I want all payment events logged to the database, so I can track revenue and troubleshoot issues.

### Acceptance Criteria

- [ ] User can click "Upgrade" from settings and see pricing tiers
- [ ] Stripe Checkout session redirects to payment page
- [ ] Successful payment updates user's subscription status immediately
- [ ] Failed payment sends user notification and maintains grace period
- [ ] Webhooks handle: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] All webhook events are idempotent (safe to replay)
- [ ] Webhook signatures are verified for security
- [ ] All payment events logged to audit trail

### Technical Requirements

- Store `stripe_customer_id` and `stripe_subscription_id` in users table
- Use Stripe test mode for development
- Implement webhook endpoint at `/api/billing/webhook`
- Use Stripe API version `2024-12-18.acacia` or latest
- Handle webhook retries gracefully
- Log all Stripe API errors with context

### Security Requirements

- Verify webhook signatures using Stripe signing secret
- Never log full credit card details
- Use HTTPS only for payment flows
- Implement rate limiting on checkout endpoint
- Validate all webhook payloads before processing

### Error Handling

- **Payment declined**: Show user-friendly error, suggest retry
- **Webhook failure**: Retry with exponential backoff
- **Stripe API down**: Queue webhook for later processing
- **Invalid webhook signature**: Log and reject silently

---

## Feature 2: Subscription Tiers (5 points)

### User Stories

**As a free trial user**, I want to see which tier I'm on and when it expires, so I can decide whether to upgrade.

**As a paid user**, I want to upgrade/downgrade my subscription, so I can adjust based on my usage.

**As a Publisher tier user**, I want immediate access to unlimited features, so I can maximise productivity.

### Acceptance Criteria

- [ ] User object includes `subscription_tier` field (free_trial, starter, professional, publisher)
- [ ] User object includes `subscription_status` field (active, past_due, cancelled, trialing)
- [ ] Tier changes apply immediately (pro-rated by Stripe)
- [ ] Downgrade takes effect at end of billing period
- [ ] Upgrade takes effect immediately with pro-rated charge
- [ ] Users can view current tier and renewal date

### Technical Requirements

- Enum for subscription tiers in database
- Service method `getUserTier(userId)` returns tier info
- Service method `canPerformAction(userId, action)` checks permissions
- Cache tier info for 5 minutes to reduce DB queries

### Business Logic

- Free trial automatically converts to paid or reverts to free tier after 7 days
- Cancellation maintains access until end of billing period
- Dunning: 3 retry attempts over 7 days for failed payments
- After dunning fails, downgrade to free tier

---

## Feature 3: Usage Quota Tracking (8 points)

### User Stories

**As a Starter user**, I want to see how many words I've generated this month, so I know when I'm approaching my limit.

**As a Professional user**, I want to track novel projects created this month, so I can plan my work.

**As any user**, I want clear messaging when I hit a limit, so I know why my request was blocked.

### Acceptance Criteria

- [ ] Track words generated per user per billing period
- [ ] Track novel projects created per user per billing period
- [ ] Track API calls per user per billing period (for future API product)
- [ ] Quota enforcement happens before expensive operations
- [ ] Quotas reset at start of billing period
- [ ] Publisher tier marked as unlimited (no quota checks)
- [ ] Usage displayed in dashboard with progress bars

### Technical Requirements

- `usage_tracking` table with fields: `user_id`, `period_start`, `period_end`, `words_generated`, `novels_created`, `api_calls`, `updated_at`
- Service method `checkQuota(userId, action, amount)` returns boolean
- Service method `incrementUsage(userId, action, amount)` updates counters
- Middleware `requireQuota(action)` blocks requests when limit exceeded
- Cron job or scheduled task to reset quotas at billing period start

### Quota Definitions

| Action | Starter | Professional | Publisher |
|--------|---------|--------------|-----------|
| Words/month | 50,000 | 100,000 | Unlimited |
| Novels/month | 1 | 3 | Unlimited |
| API calls/day | N/A | 100 | 1,000 |

### Error Responses

```json
{
  "error": "quota_exceeded",
  "message": "You've reached your monthly word limit of 50,000 words.",
  "current_usage": 50234,
  "quota_limit": 50000,
  "tier": "starter",
  "upgrade_url": "/settings/billing"
}
```

---

## Feature 4: Billing Dashboard (5 points)

### User Stories

**As a user**, I want to see my billing history, so I can track expenses for tax purposes.

**As a user**, I want to update my payment method, so I can avoid service interruption.

**As a user**, I want to download invoices as PDF, so I can submit for reimbursement.

### Acceptance Criteria

- [ ] Dashboard shows current subscription tier and renewal date
- [ ] Dashboard shows payment method (last 4 digits of card)
- [ ] Dashboard lists past invoices with download links
- [ ] Dashboard shows current month usage with progress bars
- [ ] User can upgrade/downgrade from dashboard
- [ ] User can update payment method via Stripe
- [ ] User can cancel subscription (with confirmation modal)

### Technical Requirements

- Route: `GET /api/billing/subscription` - Returns current subscription
- Route: `GET /api/billing/invoices` - Returns list of invoices
- Route: `POST /api/billing/portal` - Creates Stripe Customer Portal session
- Frontend page: `app/settings/billing/page.tsx`
- Frontend components: `BillingDashboard`, `UsageMeters`, `InvoiceList`

### UI Components

- **Tier Card**: Shows current tier with features and limits
- **Usage Meters**: Progress bars for words, novels, API calls
- **Invoice Table**: Date, amount, status, download link
- **Payment Method**: Card brand and last 4 digits
- **Action Buttons**: Upgrade, Downgrade, Update Payment, Cancel

---

## Feature 5: Free Trial System (5 points)

### User Stories

**As a new user**, I want a 7-day free trial of Professional tier, so I can evaluate the platform.

**As a trial user**, I want to see days remaining, so I know when to subscribe.

**As a trial user**, I want seamless conversion to paid, so I don't lose my work.

### Acceptance Criteria

- [ ] New users automatically get 7-day Professional trial
- [ ] Trial users have full Professional tier access
- [ ] Dashboard shows "X days remaining in trial"
- [ ] Email sent 2 days before trial ends
- [ ] Email sent on day trial ends
- [ ] After trial, user either converts to paid or downgrades to free tier
- [ ] Trial can only be used once per email address

### Technical Requirements

- `trial_ends_at` field in users table
- `has_had_trial` boolean field to prevent re-activation
- Service method `isInTrial(userId)` checks trial status
- Service method `startTrial(userId)` initiates trial
- Cron job checks for expiring trials daily
- Email service sends trial reminder notifications

### Trial Limits (Free Tier after trial ends)

| Feature | Trial (Professional) | Free Tier |
|---------|---------------------|-----------|
| Novels/month | 3 | 0 (read-only) |
| Words/month | 100,000 | 0 (read-only) |
| Export | Yes | View only |

---

## Feature 6: Usage Alerts (3 points)

### User Stories

**As a user**, I want a notification at 80% quota usage, so I can upgrade before hitting limits.

**As a user**, I want a notification at 100% quota, so I understand why generation stopped.

**As a user**, I want alerts via in-app notification and email, so I don't miss them.

### Acceptance Criteria

- [ ] Alert at 80% of word quota
- [ ] Alert at 100% of word quota
- [ ] Alert at 80% of novel quota
- [ ] Alert at 100% of novel quota
- [ ] Alerts shown in-app with notification badge
- [ ] Alerts sent via email (configurable in settings)
- [ ] Alerts include current usage, limit, and upgrade link
- [ ] Alerts are not sent more than once per threshold per period

### Technical Requirements

- `usage_alerts` table tracks sent alerts
- Service method `checkAndSendAlerts(userId)` called after usage increment
- Alert thresholds: 80%, 90%, 100%
- Email templates for each alert type
- In-app notification component

### Alert Message Examples

**80% Word Quota**:
> You've used 40,000 of your 50,000 monthly words (80%). Consider upgrading to Professional for 100,000 words/month.

**100% Word Quota**:
> You've reached your monthly limit of 50,000 words. Upgrade now to continue writing, or your quota resets on Dec 1st.

---

## Feature 7: Referral Program (5 points)

### User Stories

**As a user**, I want to refer friends and get credits, so I can reduce my subscription cost.

**As a referred user**, I want to get a discount on my first month, so I'm incentivised to try the platform.

**As a referrer**, I want to track my referrals and earned credits, so I know how much I've saved.

### Acceptance Criteria

- [ ] Each user gets unique referral code (e.g., `JOHN-A3F9`)
- [ ] Referral link: `novelforge.com/signup?ref=JOHN-A3F9`
- [ ] Referred user gets 20% off first month
- [ ] Referrer gets £10 credit after referred user pays first invoice
- [ ] Credits automatically apply to next invoice
- [ ] Dashboard shows: referral code, referrals count, total credits earned
- [ ] Referral tracking survives cookie deletion (stored server-side)

### Technical Requirements

- `referral_codes` table: `id`, `user_id`, `code`, `created_at`
- `referrals` table: `id`, `referrer_id`, `referred_user_id`, `status` (pending, completed, paid), `credit_amount`, `created_at`
- Route: `GET /api/billing/referral` - Returns user's referral info
- Route: `POST /api/billing/apply-referral` - Applies referral code during signup
- Service method `generateReferralCode(userId)` creates unique code
- Service method `trackReferral(referralCode, newUserId)` records referral
- Service method `completeReferral(referralId)` grants credit after payment

### Business Rules

- Referral code must be applied before checkout
- Credits expire after 12 months
- Maximum £100 credits per user
- Referrer must be active paid subscriber to earn credits
- Self-referrals are detected and blocked

---

## Data Models

### Users Table (Extended)

```sql
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free_trial' CHECK(subscription_tier IN ('free', 'free_trial', 'starter', 'professional', 'publisher'));
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'trialing' CHECK(subscription_status IN ('active', 'trialing', 'past_due', 'cancelled', 'unpaid'));
ALTER TABLE users ADD COLUMN trial_ends_at TEXT;
ALTER TABLE users ADD COLUMN has_had_trial INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN billing_period_start TEXT;
ALTER TABLE users ADD COLUMN billing_period_end TEXT;
```

### New Tables

```sql
-- Subscription events audit log
CREATE TABLE subscription_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
  payload TEXT NOT NULL, -- JSON
  processed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Usage tracking
CREATE TABLE usage_tracking (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  words_generated INTEGER DEFAULT 0,
  novels_created INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, period_start)
);

-- Usage alerts
CREATE TABLE usage_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- 'word_80', 'word_100', 'novel_80', 'novel_100'
  period_start TEXT NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, alert_type, period_start)
);

-- Referral codes
CREATE TABLE referral_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Referrals
CREATE TABLE referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  referred_user_id TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'paid')),
  credit_amount REAL DEFAULT 10.00,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (referrer_id) REFERENCES users(id),
  FOREIGN KEY (referred_user_id) REFERENCES users(id)
);

-- Credits ledger
CREATE TABLE credits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  referral_id TEXT,
  expires_at TEXT,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (referral_id) REFERENCES referrals(id)
);
```

---

## API Endpoints

### Billing Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/billing/subscription` | Get current subscription | Required |
| GET | `/api/billing/invoices` | List invoices | Required |
| GET | `/api/billing/usage` | Get current usage stats | Required |
| POST | `/api/billing/checkout` | Create Stripe checkout session | Required |
| POST | `/api/billing/portal` | Create customer portal session | Required |
| POST | `/api/billing/webhook` | Stripe webhook handler | Webhook signature |
| GET | `/api/billing/referral` | Get referral info | Required |
| POST | `/api/billing/apply-referral` | Apply referral code | Required |

---

## Testing Strategy

### Unit Tests

- Service methods for quota checking
- Service methods for tier permissions
- Referral code generation
- Credit calculation
- Usage increment logic

### Integration Tests

- Stripe webhook processing (mock Stripe events)
- Subscription creation flow
- Usage tracking across billing periods
- Referral completion flow
- Alert triggering

### E2E Tests

- Complete checkout flow (Stripe test mode)
- Upgrade/downgrade scenarios
- Trial expiration
- Quota enforcement on generation
- Billing dashboard interactions

### Security Tests

- Webhook signature verification
- Rate limiting on endpoints
- SQL injection on billing queries
- XSS in billing dashboard
- CSRF on payment actions

---

## Success Metrics

### Business Metrics

- Conversion rate: Trial → Paid (target: 25%)
- Churn rate (target: <5% monthly)
- Average revenue per user (ARPU)
- Referral conversion rate (target: 10%)
- Credit redemption rate

### Technical Metrics

- Webhook processing success rate (target: >99.9%)
- Quota check latency (target: <50ms)
- Payment page load time (target: <2s)
- Stripe API error rate (target: <0.1%)

### User Satisfaction

- Payment flow completion rate (target: >90%)
- Support tickets related to billing (target: <5% of total)
- Net Promoter Score (NPS) after payment

---

## Rollout Plan

### Phase 1: Backend Infrastructure (Week 1)
- Database migrations
- Stripe service integration
- Subscription management service
- Usage tracking service

### Phase 2: Core Features (Week 2)
- Webhook handling
- Billing routes
- Quota enforcement middleware
- Alert system

### Phase 3: Frontend & UX (Week 3)
- Billing dashboard UI
- Usage meters
- Upgrade/downgrade flows
- Referral dashboard

### Phase 4: Testing & Launch (Week 4)
- Comprehensive testing
- Security audit
- Load testing
- Soft launch with early adopters
- Monitor metrics and iterate

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stripe webhook failures | High | Implement retry queue and monitoring |
| Double-charging users | High | Make all operations idempotent |
| Quota bypass exploits | Medium | Validate on server, log all checks |
| Trial abuse | Medium | Track by email, IP, payment method |
| Revenue leakage | High | Comprehensive audit logging |
| PCI compliance issues | Critical | Use Stripe hosted checkout only |

---

## Documentation Requirements

- [ ] API documentation for billing endpoints
- [ ] Webhook handling guide
- [ ] User guide for billing dashboard
- [ ] Admin guide for managing subscriptions
- [ ] Troubleshooting guide for common payment issues
- [ ] Stripe test cards reference

---

## Compliance & Legal

### GDPR Considerations

- User can request billing data export
- User can delete payment methods
- Billing data retained for 7 years (UK tax law)
- Stripe stores card data (PCI compliant)

### Terms of Service Updates

- Add subscription terms and conditions
- Add refund policy (pro-rated refunds within 7 days)
- Add cancellation policy
- Add referral program terms

### VAT Handling

- Stripe Tax integration for UK VAT (20%)
- Detect user location for tax purposes
- Show prices inclusive of VAT for UK users
- Invoices include VAT breakdown

---

## Support Considerations

### Common User Issues

1. Payment declined → Check with bank, try different card
2. Can't cancel subscription → Direct to customer portal
3. Quota confusion → Show usage in multiple places
4. Referral not working → Check code validity, ensure applied before checkout
5. Invoice download fails → Provide Stripe-hosted invoice link

### Admin Tools Needed

- View user subscription status
- Manually adjust quotas (edge cases)
- Issue refunds
- Apply manual credits
- Disable/enable accounts

---

## Future Enhancements (Post-Launch)

- Annual billing with discount (2 months free)
- Add-on packages (extra word packs)
- Team/agency plans
- Custom enterprise pricing
- Gift subscriptions
- Affiliate program (separate from referrals)
- Revenue sharing for marketplace authors

---

**Document Version**: 1.0
**Author**: Project Director
**Last Updated**: 2026-01-29
**Status**: Ready for Technical Design
