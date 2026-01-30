-- Single-use tokens for SSE authentication
-- Sprint 16: Security Enhancements
-- Task: SSE authentication (5 pts)

CREATE TABLE IF NOT EXISTS sse_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    used INTEGER DEFAULT 0,             -- 1 if token has been consumed
    expires_at TEXT NOT NULL,           -- ISO 8601 timestamp
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sse_tokens_expires ON sse_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_sse_tokens_user ON sse_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_sse_tokens_used ON sse_tokens(used);

-- Note: Cleanup of used/expired tokens handled by token.service.ts
-- DELETE FROM sse_tokens WHERE used = 1 OR expires_at < datetime('now');
