-- Performance Optimization - Additional indexes for frequently queried columns
-- Migration 013

-- Note: Many indexes already exist from base schema and previous migrations
-- This migration adds any missing indexes and composite indexes for complex queries

-- Composite index for job queries (common pattern: filter by status AND order by created_at)
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at);

-- Index on book_transitions foreign keys (not covered in migration 002)
CREATE INDEX IF NOT EXISTS idx_transitions_project ON book_transitions(project_id);
CREATE INDEX IF NOT EXISTS idx_transitions_from_book ON book_transitions(from_book_id);
CREATE INDEX IF NOT EXISTS idx_transitions_to_book ON book_transitions(to_book_id);

-- Composite index for character lookups (if characters table exists)
-- CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
-- Note: Characters are stored in JSON in projects.story_bible, no separate table

-- Index for book_style_presets queries
CREATE INDEX IF NOT EXISTS idx_presets_default ON book_style_presets(is_default);

-- Existing indexes verification (these should already exist, but adding IF NOT EXISTS for safety):
-- idx_books_project (books.project_id) - line 29 schema.sql
-- idx_chapters_book (chapters.book_id) - line 48 schema.sql
-- idx_chapters_status (chapters.status) - line 49 schema.sql
-- idx_outlines_book (outlines.book_id) - line 94 schema.sql
-- idx_mysteries_series (series_mysteries.series_id) - migration 012 line 32
-- idx_mysteries_status (series_mysteries.status) - migration 012 line 33
-- idx_mysteries_raised (series_mysteries.raised_book, raised_chapter) - migration 012 line 34
-- idx_mysteries_answered (series_mysteries.answered_book, answered_chapter) - migration 012 line 35

-- Summary: This migration adds composite and missing indexes to improve query performance
-- All foreign key columns now have indexes
-- Common query patterns (status + created_at) have composite indexes
