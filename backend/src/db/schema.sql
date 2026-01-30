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
    -- Publishing fields
    dedication TEXT,             -- Optional dedication text
    epigraph TEXT,               -- Optional epigraph quote
    epigraph_attribution TEXT,   -- Attribution for epigraph (e.g., "— William Shakespeare")
    isbn TEXT,                   -- ISBN number
    publisher TEXT,              -- Publisher name
    edition TEXT DEFAULT 'First Edition',
    copyright_year INTEGER,      -- Copyright year (defaults to current year)
    include_dramatis_personae INTEGER DEFAULT 1,  -- Include character list in back matter
    include_about_author INTEGER DEFAULT 1,       -- Include about author in back matter
    bestseller_mode INTEGER DEFAULT 0,            -- Premium mode: enforce bestseller criteria
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
  show_ai_costs_menu INTEGER DEFAULT 0,  -- Toggle for displaying AI Costs menu item
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create default entry for owner user
INSERT OR IGNORE INTO user_preferences (user_id)
VALUES ('owner');

-- Author Profile table (shared user-level settings for all books)
CREATE TABLE IF NOT EXISTS author_profile (
    id TEXT PRIMARY KEY DEFAULT 'owner',
    author_name TEXT,               -- Full name for title pages
    pen_name TEXT,                  -- Pen name if different from legal name
    author_bio TEXT,
    author_bio_short TEXT,          -- Short bio for query letters (50-100 words)
    author_photo TEXT,              -- base64-encoded image
    author_photo_type TEXT,         -- MIME type (image/jpeg, image/png, etc.)
    author_website TEXT,
    author_social_media TEXT,       -- JSON: { twitter, instagram, facebook, etc. }
    -- Contact information for title pages and submissions
    contact_email TEXT,
    contact_phone TEXT,
    contact_address TEXT,           -- Mailing address
    contact_city TEXT,
    contact_postcode TEXT,
    contact_country TEXT,
    -- Writing credentials for query letters
    writing_credentials TEXT,       -- JSON: Array of publications, awards, etc.
    -- Preferences
    preferred_pronouns TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Insert default row for owner
INSERT OR IGNORE INTO author_profile (id) VALUES ('owner');

-- Agent Submissions table (track query letters sent to literary agents)
CREATE TABLE IF NOT EXISTS agent_submissions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    agency_name TEXT,
    agent_email TEXT,
    agent_website TEXT,
    query_letter TEXT,              -- Generated query letter text
    synopsis TEXT,                  -- Generated synopsis text
    submission_date TEXT DEFAULT (datetime('now')),
    status TEXT NOT NULL CHECK(status IN ('pending', 'sent', 'responded', 'rejected', 'requested_partial', 'requested_full', 'offer')) DEFAULT 'pending',
    response_date TEXT,
    response_notes TEXT,
    materials_sent TEXT,            -- JSON: Array of materials sent (query, synopsis, first_3_chapters, full_manuscript)
    personalisation_notes TEXT,     -- Notes for personalising the query letter
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_submissions_project ON agent_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_submissions_status ON agent_submissions(status);
CREATE INDEX IF NOT EXISTS idx_agent_submissions_date ON agent_submissions(submission_date);

-- Comp Titles table (comparable published titles for query letters)
CREATE TABLE IF NOT EXISTS comp_titles (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    publication_year INTEGER,
    publisher TEXT,
    why_comparable TEXT,            -- Why this title is comparable to the project
    target_audience TEXT,
    genre TEXT,
    is_active INTEGER DEFAULT 1,    -- Can be deactivated without deleting
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comp_titles_project ON comp_titles(project_id);
CREATE INDEX IF NOT EXISTS idx_comp_titles_active ON comp_titles(is_active);

-- Query Letter Templates table (genre-specific query letter templates)
CREATE TABLE IF NOT EXISTS query_letter_templates (
    id TEXT PRIMARY KEY,
    genre TEXT NOT NULL,
    template_name TEXT NOT NULL,
    structure TEXT NOT NULL,        -- JSON: Template structure with placeholders
    example_text TEXT,              -- Example query letter for this genre
    tips TEXT,                      -- JSON: Array of genre-specific tips
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_query_templates_genre ON query_letter_templates(genre);

-- Bestseller Mode tables (Sprint 44: Premium commercial fiction features)
-- Bestseller criteria table (pre-generation checklist)
CREATE TABLE IF NOT EXISTS bestseller_criteria (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,

    -- Pre-writing checklist
    has_strong_premise INTEGER DEFAULT 0,
    premise_hook TEXT,
    genre_conventions_identified INTEGER DEFAULT 0,
    genre_conventions TEXT,  -- JSON array of identified conventions
    target_tropes TEXT,  -- JSON array of tropes (min 3 required)
    comp_titles TEXT,  -- JSON array of comparable titles (min 2 required)
    word_count_target INTEGER,

    -- Structure checklist (Save the Cat beats)
    save_the_cat_beats_mapped INTEGER DEFAULT 0,
    beats_data TEXT,  -- JSON: beat placements with chapter numbers
    inciting_incident_chapter INTEGER,
    midpoint_chapter INTEGER,
    all_is_lost_chapter INTEGER,
    resolution_planned INTEGER DEFAULT 0,
    resolution_notes TEXT,

    -- Character checklist
    protagonist_want TEXT,
    protagonist_need TEXT,
    protagonist_lie TEXT,
    character_arc_complete INTEGER DEFAULT 0,
    voice_samples TEXT,  -- JSON array of character voice examples

    -- Checklist validation status
    checklist_complete INTEGER DEFAULT 0,
    checklist_passed INTEGER DEFAULT 0,
    validation_errors TEXT,  -- JSON array of validation error messages

    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bestseller_criteria_project ON bestseller_criteria(project_id);

-- Bestseller reports table (post-generation analysis)
CREATE TABLE IF NOT EXISTS bestseller_reports (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    book_id TEXT,
    generated_at TEXT DEFAULT (datetime('now')),

    -- Commercial viability scoring (1-100 scale)
    overall_score REAL,
    opening_hook_score REAL,  -- 20% weight
    genre_compliance_score REAL,  -- 20% weight
    tension_arc_score REAL,  -- 15% weight
    character_arc_score REAL,  -- 15% weight
    trope_effectiveness_score REAL,  -- 10% weight
    prose_quality_score REAL,  -- 10% weight (VEB-based)
    market_positioning_score REAL,  -- 10% weight

    -- Detailed analysis
    strengths TEXT,  -- JSON array of identified strengths
    weaknesses TEXT,  -- JSON array of identified weaknesses
    recommendations TEXT,  -- JSON array of improvement suggestions

    -- Marketing package
    blurb TEXT,  -- Auto-generated back cover blurb
    tagline TEXT,  -- Catchy one-liner for marketing
    amazon_keywords TEXT,  -- JSON array of SEO-optimised keywords
    target_audience TEXT,  -- Identified primary readership
    comp_titles_analysis TEXT,  -- JSON: comparative title analysis

    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bestseller_reports_project ON bestseller_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_bestseller_reports_book ON bestseller_reports(book_id);
CREATE INDEX IF NOT EXISTS idx_bestseller_reports_score ON bestseller_reports(overall_score);

-- Chapter validation results (real-time validation during generation)
CREATE TABLE IF NOT EXISTS bestseller_chapter_validations (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    validated_at TEXT DEFAULT (datetime('now')),

    -- Validation results
    is_valid INTEGER DEFAULT 0,
    word_count INTEGER,
    target_word_count INTEGER,
    word_count_deviation REAL,  -- Percentage deviation

    -- Beat tracking
    commercial_beats_hit TEXT,  -- JSON array of beats successfully hit
    commercial_beats_missed TEXT,  -- JSON array of expected but missing beats

    -- Issues and warnings
    warnings TEXT,  -- JSON array of ChapterDeviationWarning objects
    critical_issues_count INTEGER DEFAULT 0,

    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bestseller_chapter_validations_chapter ON bestseller_chapter_validations(chapter_id);
CREATE INDEX IF NOT EXISTS idx_bestseller_chapter_validations_valid ON bestseller_chapter_validations(is_valid);
