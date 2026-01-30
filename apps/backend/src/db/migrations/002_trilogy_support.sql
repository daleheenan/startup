-- Migration 002: Trilogy Support
-- Sprint 8: Add cross-book continuity tracking

-- Check if columns already exist before adding
-- SQLite doesn't have IF NOT EXISTS for ALTER TABLE, so we'll use conditional logic

-- Add fields to books table for cross-book state tracking
ALTER TABLE books ADD COLUMN ending_state TEXT;
ALTER TABLE books ADD COLUMN book_summary TEXT;
ALTER TABLE books ADD COLUMN timeline_end TEXT;

-- Add series-level data to projects table
ALTER TABLE projects ADD COLUMN series_bible TEXT;
ALTER TABLE projects ADD COLUMN book_count INTEGER DEFAULT 1;

-- Create book transitions table for gap summaries between books
CREATE TABLE book_transitions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    from_book_id TEXT NOT NULL,
    to_book_id TEXT NOT NULL,
    time_gap TEXT,
    gap_summary TEXT,
    character_changes TEXT,
    world_changes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (from_book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (to_book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX idx_transitions_project ON book_transitions(project_id);
CREATE INDEX idx_transitions_from_book ON book_transitions(from_book_id);
CREATE INDEX idx_transitions_to_book ON book_transitions(to_book_id);
