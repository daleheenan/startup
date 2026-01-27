-- Fix ambiguous column name in project_metrics trigger
-- The trigger used unqualified 'word_count' which is ambiguous between chapters and books tables

-- Drop the old trigger
DROP TRIGGER IF EXISTS update_project_metrics_on_chapter_change;

-- Recreate with qualified column names (c.word_count instead of word_count)
CREATE TRIGGER IF NOT EXISTS update_project_metrics_on_chapter_change
AFTER UPDATE ON chapters
WHEN NEW.content IS NOT NULL
BEGIN
    -- Update word count and chapter count
    UPDATE project_metrics
    SET
        total_word_count = (
            SELECT COALESCE(SUM(c.word_count), 0)
            FROM chapters c
            JOIN books b ON c.book_id = b.id
            WHERE b.project_id = (SELECT project_id FROM books WHERE id = NEW.book_id)
        ),
        total_chapters = (
            SELECT COUNT(*)
            FROM chapters c
            JOIN books b ON c.book_id = b.id
            WHERE b.project_id = (SELECT project_id FROM books WHERE id = NEW.book_id)
            AND c.content IS NOT NULL
        ),
        reading_time_minutes = (
            SELECT CAST(COALESCE(SUM(c.word_count), 0) / 250.0 AS INTEGER)
            FROM chapters c
            JOIN books b ON c.book_id = b.id
            WHERE b.project_id = (SELECT project_id FROM books WHERE id = NEW.book_id)
        ),
        updated_at = datetime('now')
    WHERE project_id = (SELECT project_id FROM books WHERE id = NEW.book_id);
END;

-- Ensure metrics exist for all projects (re-run initialization)
INSERT OR IGNORE INTO project_metrics (id, project_id)
SELECT id || '_metrics', id FROM projects;

-- Backfill word counts and chapter counts for existing data
UPDATE project_metrics
SET
    total_word_count = (
        SELECT COALESCE(SUM(c.word_count), 0)
        FROM chapters c
        JOIN books b ON c.book_id = b.id
        WHERE b.project_id = project_metrics.project_id
    ),
    total_chapters = (
        SELECT COUNT(*)
        FROM chapters c
        JOIN books b ON c.book_id = b.id
        WHERE b.project_id = project_metrics.project_id
        AND c.content IS NOT NULL
    ),
    reading_time_minutes = (
        SELECT CAST(COALESCE(SUM(c.word_count), 0) / 250.0 AS INTEGER)
        FROM chapters c
        JOIN books b ON c.book_id = b.id
        WHERE b.project_id = project_metrics.project_id
    ),
    updated_at = datetime('now');
