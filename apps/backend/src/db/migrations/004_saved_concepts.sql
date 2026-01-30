-- Migration 004: Saved Concepts
-- Allows users to save story concepts for later use

CREATE TABLE IF NOT EXISTS saved_concepts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    logline TEXT NOT NULL,
    synopsis TEXT NOT NULL,
    hook TEXT,
    protagonist_hint TEXT,
    conflict_type TEXT,
    preferences TEXT NOT NULL,     -- JSON: The preferences used to generate this concept
    notes TEXT,                    -- User's notes about the concept
    status TEXT NOT NULL CHECK(status IN ('saved', 'used', 'archived')) DEFAULT 'saved',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_saved_concepts_status ON saved_concepts(status);
CREATE INDEX IF NOT EXISTS idx_saved_concepts_created ON saved_concepts(created_at);
