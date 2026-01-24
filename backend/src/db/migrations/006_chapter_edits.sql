-- Sprint 16: Interactive Editing Workspace
-- Migration 006: Chapter Edits Table

-- Stores user edits separately from generated content
-- Allows version tracking and regeneration prevention
CREATE TABLE IF NOT EXISTS chapter_edits (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    user_id TEXT,  -- Future: multi-user support
    edited_content TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    is_locked INTEGER DEFAULT 1,  -- SQLite uses INTEGER for BOOLEAN (1 = true, 0 = false)
    edit_notes TEXT,  -- Optional user notes about changes
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- Index for fast chapter lookups
CREATE INDEX IF NOT EXISTS idx_chapter_edits_chapter ON chapter_edits(chapter_id);

-- Index for filtering locked chapters
CREATE INDEX IF NOT EXISTS idx_chapter_edits_locked ON chapter_edits(is_locked);

-- Ensure only one edit per chapter (for now - future: version history)
CREATE UNIQUE INDEX IF NOT EXISTS idx_chapter_edits_unique_chapter ON chapter_edits(chapter_id);
