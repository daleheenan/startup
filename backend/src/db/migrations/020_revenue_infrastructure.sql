-- Migration 020: Revenue Infrastructure
-- Sprint 20: Subscription payments, usage tracking, referrals

-- Extend users table with subscription fields
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free_trial'
  CHECK(subscription_tier IN ('free', 'free_trial', 'starter', 'professional', 'publisher'));
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'trialing'
  CHECK(subscription_status IN ('active', 'trialing', 'past_due', 'cancelled', 'unpaid'));
ALTER TABLE users ADD COLUMN trial_ends_at TEXT;
ALTER TABLE users ADD COLUMN has_had_trial INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN billing_period_start TEXT;
ALTER TABLE users ADD COLUMN billing_period_end TEXT;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- Subscription events audit log (for Stripe webhooks)
CREATE TABLE IF NOT EXISTS subscription_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- checkout.session.completed, invoice.paid, etc.
  stripe_event_id TEXT UNIQUE, -- Idempotency: prevent duplicate processing
  payload TEXT NOT NULL, -- JSON: Full Stripe event for debugging
  processed INTEGER DEFAULT 0,
  error TEXT, -- Processing error if any
  created_at TEXT DEFAULT (datetime('now')),
  processed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_processed ON subscription_events(processed);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_id ON subscription_events(stripe_event_id);

-- Usage tracking per billing period
CREATE TABLE IF NOT EXISTS usage_tracking (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  words_generated INTEGER DEFAULT 0,
  novels_created INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  chapters_generated INTEGER DEFAULT 0,
  exports_count INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, period_start) -- One record per user per billing period
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(period_start, period_end);

-- Usage alerts (prevent duplicate notifications)
CREATE TABLE IF NOT EXISTS usage_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- 'word_80', 'word_100', 'novel_80', 'novel_100'
  period_start TEXT NOT NULL,
  threshold_value INTEGER NOT NULL, -- The threshold that triggered alert
  current_value INTEGER NOT NULL, -- Current usage when alert sent
  sent_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, alert_type, period_start) -- One alert per type per period
);

CREATE INDEX IF NOT EXISTS idx_usage_alerts_user ON usage_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_sent ON usage_alerts(sent_at);

-- Referral codes (one per user)
CREATE TABLE IF NOT EXISTS referral_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE, -- e.g., JOHN-A3F9
  clicks INTEGER DEFAULT 0, -- Track referral link clicks
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

-- Referrals (track referred users)
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL, -- User who sent referral
  referred_user_id TEXT NOT NULL UNIQUE, -- New user who signed up
  referral_code TEXT NOT NULL, -- Code that was used
  status TEXT DEFAULT 'pending'
    CHECK(status IN ('pending', 'completed', 'paid')),
  credit_amount REAL DEFAULT 10.00, -- £10 credit for referrer
  discount_amount REAL DEFAULT 0.20, -- 20% discount for referred user
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT, -- When referred user made first payment
  paid_at TEXT, -- When credit was issued to referrer
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- Credits ledger (track account credits)
CREATE TABLE IF NOT EXISTS credits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL, -- Positive for credit, negative for debit
  balance_after REAL NOT NULL, -- Running balance
  description TEXT NOT NULL, -- e.g., "Referral credit from John Doe"
  referral_id TEXT, -- Link to referral if applicable
  stripe_invoice_id TEXT, -- Link to invoice if credit applied to payment
  expires_at TEXT, -- Credits expire after 12 months
  used INTEGER DEFAULT 0, -- 1 if credit has been applied
  created_at TEXT DEFAULT (datetime('now')),
  used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_credits_user ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_used ON credits(used);
CREATE INDEX IF NOT EXISTS idx_credits_expires ON credits(expires_at);

-- Invoices cache (optional: cache Stripe invoice data for faster display)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY, -- Stripe invoice ID
  user_id TEXT NOT NULL,
  amount_due INTEGER NOT NULL, -- Amount in pence
  amount_paid INTEGER NOT NULL,
  currency TEXT DEFAULT 'gbp',
  status TEXT NOT NULL, -- draft, open, paid, void, uncollectible
  invoice_pdf TEXT, -- Stripe-hosted PDF URL
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  paid_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_at ON invoices(paid_at);

-- Promotional codes (admin-created promo codes)
CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE, -- e.g., LAUNCH2026
  discount_type TEXT NOT NULL CHECK(discount_type IN ('percentage', 'fixed')),
  discount_value REAL NOT NULL, -- 0.20 for 20%, or 10.00 for £10
  max_uses INTEGER, -- NULL for unlimited
  uses INTEGER DEFAULT 0,
  expires_at TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(active);

-- Promo code usage tracking
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id TEXT PRIMARY KEY,
  promo_code_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  discount_applied REAL NOT NULL,
  stripe_checkout_session_id TEXT,
  used_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(promo_code_id, user_id) -- One use per user per code
);

CREATE INDEX IF NOT EXISTS idx_promo_code_usage_user ON promo_code_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_promo ON promo_code_usage(promo_code_id);
