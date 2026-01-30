-- Migration 033: Book Versioning Support
-- Enables chapter versioning - when plot changes and book is regenerated,
-- previous chapters are preserved in a version snapshot

-- Track versions of a book's chapters
CREATE TABLE IF NOT EXISTS book_versions (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    version_number INTEGER NOT NULL,    -- Sequential version (1, 2, 3...)
    version_name TEXT,                   -- User-friendly name ("Original", "Darker Ending", etc.)
    plot_snapshot TEXT,                  -- JSON: Copy of plot_structure at time of generation
    outline_snapshot TEXT,               -- JSON: Copy of outline at time of generation
    is_active INTEGER DEFAULT 0,         -- Is this the currently active version?
    word_count INTEGER DEFAULT 0,
    chapter_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,                   -- When generation finished
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_book_versions_book ON book_versions(book_id);

-- Note: SQLite doesn't support partial unique indexes well, so we'll enforce
-- the "one active version per book" constraint in application code

-- Add version reference to chapters
ALTER TABLE chapters ADD COLUMN version_id TEXT REFERENCES book_versions(id);

-- Add version reference to chapter_edits
ALTER TABLE chapter_edits ADD COLUMN version_id TEXT REFERENCES book_versions(id);

-- Create indexes for version queries
CREATE INDEX IF NOT EXISTS idx_chapters_version ON chapters(version_id);
CREATE INDEX IF NOT EXISTS idx_chapter_edits_version ON chapter_edits(version_id);
