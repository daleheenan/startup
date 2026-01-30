-- Migration: 023_plagiarism_checks
-- Adds table for storing plagiarism/originality check results

-- Plagiarism checks table
CREATE TABLE IF NOT EXISTS plagiarism_checks (
    id TEXT PRIMARY KEY,
    content_type TEXT NOT NULL CHECK(content_type IN ('concept', 'summary', 'chapter', 'story_idea')),
    content_id TEXT NOT NULL,
    checked_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'checking', 'passed', 'flagged', 'requires_review', 'error')),
    originality_score TEXT NOT NULL,    -- JSON: OriginalityScore object
    similar_works TEXT NOT NULL,         -- JSON: Array of SimilarWork objects
    flags TEXT NOT NULL,                 -- JSON: Array of PlagiarismFlag objects
    recommendations TEXT NOT NULL,       -- JSON: Array of recommendation strings
    analysis_details TEXT NOT NULL       -- JSON: Tropes, archetypes, unique elements, etc.
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_plagiarism_checks_content ON plagiarism_checks(content_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_checks_type ON plagiarism_checks(content_type);
CREATE INDEX IF NOT EXISTS idx_plagiarism_checks_status ON plagiarism_checks(status);
CREATE INDEX IF NOT EXISTS idx_plagiarism_checks_checked_at ON plagiarism_checks(checked_at);
