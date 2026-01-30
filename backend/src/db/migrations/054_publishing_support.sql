-- Migration 054: Traditional Publishing Support
-- Adds tables and fields for query letters, submissions tracking, and manuscript formatting

-- Extend author_profile table with contact information and credentials
ALTER TABLE author_profile ADD COLUMN author_name TEXT;
ALTER TABLE author_profile ADD COLUMN pen_name TEXT;
ALTER TABLE author_profile ADD COLUMN author_bio_short TEXT;
ALTER TABLE author_profile ADD COLUMN contact_email TEXT;
ALTER TABLE author_profile ADD COLUMN contact_phone TEXT;
ALTER TABLE author_profile ADD COLUMN contact_address TEXT;
ALTER TABLE author_profile ADD COLUMN contact_city TEXT;
ALTER TABLE author_profile ADD COLUMN contact_postcode TEXT;
ALTER TABLE author_profile ADD COLUMN contact_country TEXT;
ALTER TABLE author_profile ADD COLUMN writing_credentials TEXT;
ALTER TABLE author_profile ADD COLUMN preferred_pronouns TEXT;

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
