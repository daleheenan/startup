-- Migration 048: Commercial Beat Validation and Chapter Briefs
-- Adds support for proactive quality controls and chapter brief generation

-- Chapter briefs table for storing detailed generation/revision guidance
CREATE TABLE IF NOT EXISTS chapter_briefs (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    version_id TEXT REFERENCES book_versions(id) ON DELETE SET NULL,
    brief_data TEXT NOT NULL, -- JSON containing the full DetailedChapterBrief
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(book_id, chapter_number)
);

-- Commercial validation reports for outline review
CREATE TABLE IF NOT EXISTS commercial_validation_reports (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    outline_id TEXT REFERENCES outlines(id) ON DELETE SET NULL,
    validation_data TEXT NOT NULL, -- JSON containing CommercialValidationReport
    overall_score INTEGER NOT NULL DEFAULT 0,
    is_valid INTEGER NOT NULL DEFAULT 0,
    ready_for_generation INTEGER NOT NULL DEFAULT 0,
    critical_issues_count INTEGER NOT NULL DEFAULT 0,
    important_issues_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Editorial lessons learned (for accumulating insights across projects)
CREATE TABLE IF NOT EXISTS editorial_lessons (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    book_id TEXT REFERENCES books(id) ON DELETE SET NULL,
    lesson_type TEXT NOT NULL, -- 'pacing', 'exposition', 'dialogue', 'character', 'structure', 'general'
    lesson_text TEXT NOT NULL,
    source TEXT, -- 'veb', 'outline_editorial', 'manual', 'chapter_review'
    severity TEXT, -- 'minor', 'moderate', 'major'
    applies_to TEXT, -- 'all', 'genre_specific', 'project_specific'
    genre TEXT,
    times_applied INTEGER DEFAULT 0,
    effectiveness_score INTEGER, -- 0-100, tracked over time
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Word count budgets per chapter (extends outline data)
CREATE TABLE IF NOT EXISTS chapter_word_budgets (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    target_word_count INTEGER NOT NULL,
    min_word_count INTEGER NOT NULL,
    max_word_count INTEGER NOT NULL,
    tolerance_percent REAL NOT NULL DEFAULT 10.0,
    commercial_beats TEXT, -- JSON array of beat names this chapter should hit
    pacing_guidance TEXT, -- 'slow', 'medium', 'fast'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(book_id, chapter_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chapter_briefs_book ON chapter_briefs(book_id);
CREATE INDEX IF NOT EXISTS idx_chapter_briefs_chapter ON chapter_briefs(book_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_commercial_validation_book ON commercial_validation_reports(book_id);
CREATE INDEX IF NOT EXISTS idx_commercial_validation_valid ON commercial_validation_reports(is_valid);
CREATE INDEX IF NOT EXISTS idx_editorial_lessons_type ON editorial_lessons(lesson_type);
CREATE INDEX IF NOT EXISTS idx_editorial_lessons_project ON editorial_lessons(project_id);
CREATE INDEX IF NOT EXISTS idx_editorial_lessons_genre ON editorial_lessons(genre);
CREATE INDEX IF NOT EXISTS idx_chapter_word_budgets_book ON chapter_word_budgets(book_id);
