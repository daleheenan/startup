-- Add source_report_id to track which editorial report each lesson came from
-- This prevents duplicate imports and allows showing import status per report

-- Add source_report_id column (nullable for backward compatibility with existing lessons)
ALTER TABLE editorial_lessons ADD COLUMN source_report_id TEXT;

-- Add index for efficient lookup by source report
CREATE INDEX IF NOT EXISTS idx_editorial_lessons_source_report ON editorial_lessons(source_report_id);
