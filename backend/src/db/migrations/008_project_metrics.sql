-- Sprint: Project Metrics Display
-- Tracks token usage, costs, and content metrics for each project

-- Project metrics table
CREATE TABLE IF NOT EXISTS project_metrics (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL UNIQUE,

    -- Token usage tracking
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,

    -- Cost metrics (calculated from tokens)
    total_cost_usd REAL DEFAULT 0,
    total_cost_gbp REAL DEFAULT 0,

    -- Content metrics (derived from chapters/books)
    total_chapters INTEGER DEFAULT 0,
    total_word_count INTEGER DEFAULT 0,

    -- Reading time (minutes)
    reading_time_minutes INTEGER DEFAULT 0,

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_metrics_project ON project_metrics(project_id);

-- Note: Column additions may fail if columns already exist - this is expected and safe to ignore

-- Create trigger to update project metrics when chapters change
CREATE TRIGGER IF NOT EXISTS update_project_metrics_on_chapter_change
AFTER UPDATE ON chapters
WHEN NEW.content IS NOT NULL
BEGIN
    -- Update word count and chapter count
    UPDATE project_metrics
    SET
        total_word_count = (
            SELECT COALESCE(SUM(word_count), 0)
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
            SELECT CAST(COALESCE(SUM(word_count), 0) / 250.0 AS INTEGER)
            FROM chapters c
            JOIN books b ON c.book_id = b.id
            WHERE b.project_id = (SELECT project_id FROM books WHERE id = NEW.book_id)
        ),
        updated_at = datetime('now')
    WHERE project_id = (SELECT project_id FROM books WHERE id = NEW.book_id);
END;

-- Create trigger to initialize metrics when project is created
CREATE TRIGGER IF NOT EXISTS init_project_metrics
AFTER INSERT ON projects
BEGIN
    INSERT INTO project_metrics (id, project_id)
    VALUES (NEW.id || '_metrics', NEW.id);
END;

-- Initialize metrics for existing projects
INSERT OR IGNORE INTO project_metrics (id, project_id)
SELECT id || '_metrics', id FROM projects;
