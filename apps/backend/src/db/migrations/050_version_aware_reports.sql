-- Migration 050: Version-Aware Editorial Reports
-- Links outline editorial reports and coherence checks to specific book versions
-- This enables showing the correct report for the currently active version

-- Add book_id and version_id to outline_editorial_reports
-- book_id allows direct lookup without joining through outlines
-- version_id tracks which version the report was created for
ALTER TABLE outline_editorial_reports ADD COLUMN book_id TEXT REFERENCES books(id) ON DELETE CASCADE;
ALTER TABLE outline_editorial_reports ADD COLUMN version_id TEXT REFERENCES book_versions(id) ON DELETE SET NULL;

-- Add version_id to coherence_checks
-- Coherence checks should also be version-specific
ALTER TABLE coherence_checks ADD COLUMN book_id TEXT REFERENCES books(id) ON DELETE CASCADE;
ALTER TABLE coherence_checks ADD COLUMN version_id TEXT REFERENCES book_versions(id) ON DELETE SET NULL;

-- Create indexes for efficient version-based queries
CREATE INDEX IF NOT EXISTS idx_outline_editorial_reports_book ON outline_editorial_reports(book_id);
CREATE INDEX IF NOT EXISTS idx_outline_editorial_reports_version ON outline_editorial_reports(version_id);
CREATE INDEX IF NOT EXISTS idx_coherence_checks_book ON coherence_checks(book_id);
CREATE INDEX IF NOT EXISTS idx_coherence_checks_version ON coherence_checks(version_id);

-- Backfill existing reports with book_id from their outlines
-- This ensures existing data continues to work
UPDATE outline_editorial_reports
SET book_id = (
    SELECT b.id FROM books b
    JOIN outlines o ON o.book_id = b.id
    WHERE o.id = outline_editorial_reports.outline_id
)
WHERE book_id IS NULL AND outline_id IS NOT NULL;

-- For reports without outline_id, get book from project
UPDATE outline_editorial_reports
SET book_id = (
    SELECT b.id FROM books b
    WHERE b.project_id = outline_editorial_reports.project_id
    ORDER BY b.book_number
    LIMIT 1
)
WHERE book_id IS NULL;

-- Backfill coherence_checks with book_id from project
UPDATE coherence_checks
SET book_id = (
    SELECT b.id FROM books b
    WHERE b.project_id = coherence_checks.project_id
    ORDER BY b.book_number
    LIMIT 1
)
WHERE book_id IS NULL;
