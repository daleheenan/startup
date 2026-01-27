-- Sprint 39: Automatic VEB on Book Completion
-- Adds VEB tracking columns to book_completion table

-- Add VEB status tracking to book_completion
ALTER TABLE book_completion ADD COLUMN veb_status TEXT DEFAULT NULL
  CHECK(veb_status IS NULL OR veb_status IN ('pending', 'processing', 'completed', 'failed'));
ALTER TABLE book_completion ADD COLUMN veb_triggered_at TEXT;
ALTER TABLE book_completion ADD COLUMN veb_report_id TEXT REFERENCES editorial_reports(id);

-- Index for VEB status queries
CREATE INDEX IF NOT EXISTS idx_book_completion_veb_status ON book_completion(veb_status);
