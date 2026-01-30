-- Migration 055: Author Styles (Sprint 21 - Custom AI Training)
-- Allows users to upload manuscript samples and extract writing style profiles
-- for use in AI-generated content

CREATE TABLE IF NOT EXISTS author_styles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    name TEXT NOT NULL,                    -- User-friendly name for the style (e.g., "My Fantasy Style")
    description TEXT,                      -- Optional description

    -- Analysis data
    style_data TEXT NOT NULL,              -- JSON: Extracted style patterns
    manuscript_sample TEXT,                -- Sample text used for analysis (truncated to ~10k chars)
    source_text_hash TEXT,                 -- SHA-256 hash of full source text for deduplication
    word_count INTEGER DEFAULT 0,          -- Word count of analyzed sample

    -- Metadata
    is_active INTEGER DEFAULT 1,           -- Can be disabled without deletion
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (user_id) REFERENCES user_preferences(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_author_styles_user ON author_styles(user_id);
CREATE INDEX IF NOT EXISTS idx_author_styles_active ON author_styles(is_active);
CREATE INDEX IF NOT EXISTS idx_author_styles_hash ON author_styles(source_text_hash);

-- Add optional author_style_id to projects to apply a style profile
ALTER TABLE projects ADD COLUMN author_style_id TEXT REFERENCES author_styles(id);
CREATE INDEX IF NOT EXISTS idx_projects_author_style ON projects(author_style_id);
