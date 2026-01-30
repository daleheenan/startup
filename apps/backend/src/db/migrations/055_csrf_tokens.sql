-- CSRF token storage for form protection
-- Sprint 16: Security Enhancements
-- Task: CSRF protection (5 pts)

CREATE TABLE IF NOT EXISTS csrf_tokens (
    token TEXT PRIMARY KEY,
    expires_at TEXT NOT NULL,           -- ISO 8601 timestamp
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires ON csrf_tokens(expires_at);

-- Note: Cleanup of expired tokens handled by token.service.ts
-- DELETE FROM csrf_tokens WHERE expires_at < datetime('now');
