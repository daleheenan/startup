-- Migration 022: Saved Story Ideas
-- Allows users to save generated story ideas for future use

CREATE TABLE IF NOT EXISTS saved_story_ideas (
    id TEXT PRIMARY KEY,
    story_idea TEXT NOT NULL,              -- The main story idea/premise
    character_concepts TEXT NOT NULL,       -- JSON array of character concepts
    plot_elements TEXT NOT NULL,            -- JSON array of plot elements
    unique_twists TEXT NOT NULL,            -- JSON array of unique twists
    genre TEXT NOT NULL,                    -- Genre the idea was generated for
    subgenre TEXT,                          -- Subgenre if specified
    tone TEXT,                              -- Tone setting
    themes TEXT,                            -- JSON array of themes
    notes TEXT,                             -- User's notes about the idea
    status TEXT NOT NULL CHECK(status IN ('saved', 'used', 'archived')) DEFAULT 'saved',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_saved_story_ideas_status ON saved_story_ideas(status);
CREATE INDEX IF NOT EXISTS idx_saved_story_ideas_genre ON saved_story_ideas(genre);
CREATE INDEX IF NOT EXISTS idx_saved_story_ideas_created ON saved_story_ideas(created_at);
