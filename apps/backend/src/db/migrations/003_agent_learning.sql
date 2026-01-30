-- Migration 003: Agent Learning System
-- Adds lessons and reflections tables for self-improving agents

-- Lessons table: Stores validated, reusable lessons
CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    agent_type TEXT NOT NULL,        -- 'author', 'dev-editor', 'line-editor', 'continuity-editor', 'copy-editor'
    scope TEXT NOT NULL,              -- 'global', 'genre:{name}', 'project:{id}'
    category TEXT NOT NULL CHECK(category IN ('technique', 'pitfall', 'pattern', 'preference', 'correction')),
    title TEXT NOT NULL,              -- Short description
    content TEXT NOT NULL,            -- The actual lesson
    score INTEGER DEFAULT 1,          -- Success score (incremented when helpful)
    context TEXT,                     -- JSON: Genre, project type, etc.
    tags TEXT,                        -- JSON array: searchable tags
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lessons_agent ON lessons(agent_type);
CREATE INDEX IF NOT EXISTS idx_lessons_scope ON lessons(scope);
CREATE INDEX IF NOT EXISTS idx_lessons_category ON lessons(category);
CREATE INDEX IF NOT EXISTS idx_lessons_score ON lessons(score DESC);

-- Reflections table: Raw agent reflections before becoming lessons
CREATE TABLE IF NOT EXISTS reflections (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    chapter_id TEXT,
    project_id TEXT,
    reflection TEXT NOT NULL,        -- Raw reflection from agent
    lesson_id TEXT,                   -- NULL if not promoted to lesson yet
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reflections_job ON reflections(job_id);
CREATE INDEX IF NOT EXISTS idx_reflections_agent ON reflections(agent_type);
CREATE INDEX IF NOT EXISTS idx_reflections_lesson ON reflections(lesson_id);
