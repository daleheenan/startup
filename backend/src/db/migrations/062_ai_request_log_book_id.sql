-- Migration 062: Add book_id to ai_request_log
-- Enables tracking AI costs at the book level in addition to project/chapter
-- This supports filtering by book and calculating per-book AI costs

-- Add book_id column to ai_request_log
ALTER TABLE ai_request_log ADD COLUMN book_id TEXT REFERENCES books(id) ON DELETE SET NULL;

-- Create index for efficient book-level queries
CREATE INDEX IF NOT EXISTS idx_ai_request_log_book ON ai_request_log(book_id);
CREATE INDEX IF NOT EXISTS idx_ai_request_log_book_type ON ai_request_log(book_id, request_type);
CREATE INDEX IF NOT EXISTS idx_ai_request_log_book_created ON ai_request_log(book_id, created_at);
