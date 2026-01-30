-- Migration 054: Bestseller Mode
-- Adds premium features for commercial fiction best practices
-- Includes pre-generation checklist, real-time validation, and commercial viability scoring

-- Add bestseller_mode column to projects table
ALTER TABLE projects ADD COLUMN bestseller_mode INTEGER DEFAULT 0;

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bestseller_criteria_project ON bestseller_criteria(project_id);
CREATE INDEX IF NOT EXISTS idx_bestseller_reports_project ON bestseller_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_bestseller_reports_book ON bestseller_reports(book_id);
CREATE INDEX IF NOT EXISTS idx_bestseller_reports_score ON bestseller_reports(overall_score);
CREATE INDEX IF NOT EXISTS idx_bestseller_chapter_validations_chapter ON bestseller_chapter_validations(chapter_id);
CREATE INDEX IF NOT EXISTS idx_bestseller_chapter_validations_valid ON bestseller_chapter_validations(is_valid);
