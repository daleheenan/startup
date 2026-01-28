-- Migration 044: Series Refactor
-- Creates a proper series table where series are parents of books/projects

-- Create the series table
CREATE TABLE IF NOT EXISTS series (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    series_bible TEXT,           -- JSON: Aggregated series data (characters, timeline, etc.)
    status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'on_hold')) DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_series_status ON series(status);
CREATE INDEX IF NOT EXISTS idx_series_created ON series(created_at);

-- Add series_id to projects table (nullable - standalone books won't have a series)
ALTER TABLE projects ADD COLUMN series_id TEXT REFERENCES series(id) ON DELETE SET NULL;

-- Add book_number to projects table (for ordering within a series)
ALTER TABLE projects ADD COLUMN series_book_number INTEGER;

-- Create index for series lookup on projects
CREATE INDEX IF NOT EXISTS idx_projects_series ON projects(series_id);

-- Update the type check constraint to remove 'trilogy' and 'series' since series is now separate
-- Note: SQLite doesn't support ALTER CONSTRAINT, so existing data will keep working
-- but new logic will treat 'standalone' as the only meaningful type
