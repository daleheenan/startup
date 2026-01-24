-- NovelForge Database Schema

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('standalone', 'trilogy')),
    genre TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('setup', 'generating', 'completed')),
    story_dna TEXT,              -- JSON: Genre, tone, themes, prose style
    story_bible TEXT,            -- JSON: Characters, world, timeline
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Books table (for trilogy support)
CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    book_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('setup', 'generating', 'completed')),
    word_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_books_project ON books(project_id);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    chapter_number INTEGER NOT NULL,
    title TEXT,
    scene_cards TEXT,            -- JSON: Array of scene specifications
    content TEXT,                -- Generated chapter text
    summary TEXT,                -- Summary for context in next chapter
    status TEXT NOT NULL CHECK(status IN ('pending', 'writing', 'editing', 'completed')),
    word_count INTEGER DEFAULT 0,
    flags TEXT,                  -- JSON: Issues flagged by editors
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_chapters_status ON chapters(status);

-- Jobs table (queue system)
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,          -- generate_chapter, dev_edit, line_edit, etc.
    target_id TEXT NOT NULL,     -- Chapter ID or other target
    status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'completed', 'paused', 'failed')),
    checkpoint TEXT,             -- JSON: Recovery checkpoint
    error TEXT,                  -- Error message if failed
    attempts INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);

-- Session tracking table (Claude Max rate limit management)
CREATE TABLE IF NOT EXISTS session_tracking (
    id INTEGER PRIMARY KEY CHECK(id = 1),  -- Singleton table
    session_started_at TEXT,
    session_resets_at TEXT,
    is_active INTEGER DEFAULT 0,
    requests_this_session INTEGER DEFAULT 0
);

-- Insert initial session tracking row
INSERT OR IGNORE INTO session_tracking (id, is_active, requests_this_session)
VALUES (1, 0, 0);
