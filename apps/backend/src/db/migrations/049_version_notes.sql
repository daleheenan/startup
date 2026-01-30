-- Migration 049: Version Notes
-- Adds a notes/description field to book versions for user annotations

-- Add notes column to book_versions table
ALTER TABLE book_versions ADD COLUMN notes TEXT;

-- Create index for efficient notes searching (optional, for future use)
CREATE INDEX IF NOT EXISTS idx_book_versions_notes ON book_versions(notes) WHERE notes IS NOT NULL;
