-- Migration 032: Book Cloning Support
-- Enables users to clone books within a project, preserving concept/characters/world
-- but starting fresh with plot/outline/chapters

-- Track clone relationships between books
CREATE TABLE IF NOT EXISTS book_clones (
    id TEXT PRIMARY KEY,
    source_book_id TEXT NOT NULL,      -- Original book that was cloned
    cloned_book_id TEXT NOT NULL,      -- New book created from clone
    clone_number INTEGER NOT NULL,      -- Sequential clone number (1, 2, 3...)
    clone_reason TEXT,                  -- User's reason for cloning (optional)
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (source_book_id) REFERENCES books(id) ON DELETE SET NULL,
    FOREIGN KEY (cloned_book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_book_clones_source ON book_clones(source_book_id);
CREATE INDEX IF NOT EXISTS idx_book_clones_cloned ON book_clones(cloned_book_id);

-- Add clone tracking columns to books table
ALTER TABLE books ADD COLUMN is_clone INTEGER DEFAULT 0;
ALTER TABLE books ADD COLUMN clone_source_id TEXT;
