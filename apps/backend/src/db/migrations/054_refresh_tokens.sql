-- Refresh token storage for secure token rotation
-- Sprint 16: Security Enhancements
-- Task: Refresh token system (8 pts)

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,              -- 'owner' for now, extensible for multi-user
    token_hash TEXT NOT NULL UNIQUE,    -- bcrypt hash of refresh token
    expires_at TEXT NOT NULL,           -- ISO 8601 timestamp
    created_at TEXT DEFAULT (datetime('now')),
    last_used_at TEXT DEFAULT (datetime('now')),
    revoked INTEGER DEFAULT 0,          -- 1 if manually revoked
    revoked_at TEXT,
    user_agent TEXT,                    -- Browser/client identifier
    ip_address TEXT                     -- Request IP for security audit
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked);

-- Note: Cleanup of expired tokens handled by token.service.ts
-- DELETE FROM refresh_tokens WHERE expires_at < datetime('now') OR revoked = 1;
