-- Pen Names table for multiple author identities
CREATE TABLE IF NOT EXISTS pen_names (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    pen_name TEXT NOT NULL,
    display_name TEXT,
    bio TEXT,
    bio_short TEXT,
    photo TEXT,
    photo_type TEXT,
    website TEXT,
    social_media TEXT,           -- JSON: { twitter, instagram, facebook, etc. }
    genres TEXT,                 -- JSON array of genre strings
    is_public BOOLEAN DEFAULT 1,
    is_default BOOLEAN DEFAULT 0,
    deleted_at TEXT,             -- Soft delete timestamp
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, pen_name)
);

-- Indexes for pen_names
CREATE INDEX IF NOT EXISTS idx_pen_names_user ON pen_names(user_id);
CREATE INDEX IF NOT EXISTS idx_pen_names_default ON pen_names(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_pen_names_deleted ON pen_names(deleted_at);

-- Add pen_name_id to projects table
ALTER TABLE projects ADD COLUMN pen_name_id TEXT REFERENCES pen_names(id);
CREATE INDEX IF NOT EXISTS idx_projects_pen_name ON projects(pen_name_id);

-- Add pen_name_id to series table
ALTER TABLE series ADD COLUMN pen_name_id TEXT REFERENCES pen_names(id);
CREATE INDEX IF NOT EXISTS idx_series_pen_name ON series(pen_name_id);
