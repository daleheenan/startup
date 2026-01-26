-- NovelForge Database Schema

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('standalone', 'trilogy', 'series')),
    genre TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('setup', 'generating', 'completed')),
    story_dna TEXT,              -- JSON: Genre, tone, themes, prose style
    story_bible TEXT,            -- JSON: Characters, world, timeline
    series_bible TEXT,           -- JSON: Aggregated trilogy/series data
    plot_structure TEXT,         -- JSON: Plot layers and act structure
    story_concept TEXT,          -- JSON: Original story concept from saved concepts
    book_count INTEGER DEFAULT 1,
    universe_id TEXT,            -- Link to shared universe
    is_universe_root INTEGER DEFAULT 0,
    source_concept_id TEXT,      -- Link to saved_concepts table
    time_period_type TEXT DEFAULT 'present',  -- past, present, future, unknown, custom
    specific_year INTEGER,       -- Specific year for custom time periods
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

-- Outlines table (Sprint 4: Story structure and chapter outlines)
CREATE TABLE IF NOT EXISTS outlines (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    structure_type TEXT NOT NULL CHECK(structure_type IN ('three_act', 'save_the_cat', 'heros_journey', 'seven_point', 'freytag')),
    structure TEXT NOT NULL,       -- JSON: Complete StoryStructure with acts and chapters
    total_chapters INTEGER NOT NULL,
    target_word_count INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_outlines_book ON outlines(book_id);

-- Saved Concepts table (story concepts saved for future use)
CREATE TABLE IF NOT EXISTS saved_concepts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    logline TEXT NOT NULL,
    synopsis TEXT NOT NULL,
    hook TEXT,
    protagonist_hint TEXT,
    conflict_type TEXT,
    preferences TEXT NOT NULL,     -- JSON: The preferences used to generate this concept
    notes TEXT,                    -- User's notes about the concept
    status TEXT NOT NULL CHECK(status IN ('saved', 'used', 'archived')) DEFAULT 'saved',
    source_idea_id TEXT,           -- References saved_story_ideas.id if expanded from an idea
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_saved_concepts_status ON saved_concepts(status);
CREATE INDEX IF NOT EXISTS idx_saved_concepts_created ON saved_concepts(created_at);
CREATE INDEX IF NOT EXISTS idx_saved_concepts_source_idea ON saved_concepts(source_idea_id);

-- Saved Story Ideas table (generated story ideas saved for future use)
CREATE TABLE IF NOT EXISTS saved_story_ideas (
    id TEXT PRIMARY KEY,
    story_idea TEXT NOT NULL,              -- The main story idea/premise
    character_concepts TEXT NOT NULL,       -- JSON array of character concepts
    plot_elements TEXT NOT NULL,            -- JSON array of plot elements
    unique_twists TEXT NOT NULL,            -- JSON array of unique twists
    genre TEXT NOT NULL,                    -- Genre the idea was generated for
    subgenre TEXT,                          -- Subgenre if specified
    tone TEXT,                              -- Tone setting
    themes TEXT,                            -- JSON array of themes
    notes TEXT,                             -- User's notes about the idea
    status TEXT NOT NULL CHECK(status IN ('saved', 'used', 'archived')) DEFAULT 'saved',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_saved_story_ideas_status ON saved_story_ideas(status);
CREATE INDEX IF NOT EXISTS idx_saved_story_ideas_genre ON saved_story_ideas(genre);
CREATE INDEX IF NOT EXISTS idx_saved_story_ideas_created ON saved_story_ideas(created_at);

-- Project Metrics table (token usage and cost tracking)
CREATE TABLE IF NOT EXISTS project_metrics (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    total_cost_usd REAL DEFAULT 0,
    total_chapters INTEGER DEFAULT 0,
    total_word_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_metrics_project ON project_metrics(project_id);

-- Chapter Edits table (track edited versions of chapters)
CREATE TABLE IF NOT EXISTS chapter_edits (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    edit_type TEXT NOT NULL CHECK(edit_type IN ('user', 'dev_edit', 'line_edit', 'proofread')),
    content TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chapter_edits_chapter ON chapter_edits(chapter_id);

-- Migration Registry table (track applied migrations)
CREATE TABLE IF NOT EXISTS migration_registry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_name TEXT NOT NULL UNIQUE,
    applied_at TEXT DEFAULT (datetime('now'))
);

-- Agent Lessons table (agent learning system)
CREATE TABLE IF NOT EXISTS agent_lessons (
    id TEXT PRIMARY KEY,
    lesson_type TEXT NOT NULL CHECK(lesson_type IN ('success', 'error', 'user_feedback', 'quality_check', 'prompt_refinement')),
    context TEXT NOT NULL,         -- JSON: What was happening when lesson was learned
    lesson TEXT NOT NULL,          -- The actual lesson/insight
    confidence REAL DEFAULT 0.5,   -- 0-1 confidence score
    applies_to TEXT,               -- Genre, chapter type, or 'all'
    times_applied INTEGER DEFAULT 0,
    times_successful INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_lessons_type ON agent_lessons(lesson_type);
CREATE INDEX IF NOT EXISTS idx_agent_lessons_active ON agent_lessons(is_active);

-- User Preferences table (default settings for new projects)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY DEFAULT 'owner',
  prose_style TEXT,  -- JSON: Default prose style settings for new projects
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create default entry for owner user
INSERT OR IGNORE INTO user_preferences (user_id)
VALUES ('owner');
