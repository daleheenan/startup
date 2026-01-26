-- Backfill project_metrics table with existing data
-- This ensures metrics exist and are populated even if the trigger hasn't fired

-- Ensure metrics rows exist for all projects
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
