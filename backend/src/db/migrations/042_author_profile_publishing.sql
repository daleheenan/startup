-- Migration 042: Author Profile and Publishing Fields
-- Adds author profile fields (shared across all books) and per-project publishing settings

-- Author Profile table (shared user-level settings for all books)
CREATE TABLE IF NOT EXISTS author_profile (
    id TEXT PRIMARY KEY DEFAULT 'owner',
    author_bio TEXT,
    author_photo TEXT,              -- base64-encoded image
    author_photo_type TEXT,         -- MIME type (image/jpeg, image/png, etc.)
    author_website TEXT,
    author_social_media TEXT,       -- JSON: { twitter, instagram, facebook, etc. }
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Insert default row for owner
INSERT OR IGNORE INTO author_profile (id) VALUES ('owner');

-- Add publishing fields to projects table
ALTER TABLE projects ADD COLUMN dedication TEXT;
ALTER TABLE projects ADD COLUMN epigraph TEXT;
ALTER TABLE projects ADD COLUMN epigraph_attribution TEXT;
ALTER TABLE projects ADD COLUMN isbn TEXT;
ALTER TABLE projects ADD COLUMN publisher TEXT;
ALTER TABLE projects ADD COLUMN edition TEXT DEFAULT 'First Edition';
ALTER TABLE projects ADD COLUMN copyright_year INTEGER;
ALTER TABLE projects ADD COLUMN include_dramatis_personae INTEGER DEFAULT 1;
ALTER TABLE projects ADD COLUMN include_about_author INTEGER DEFAULT 1;
