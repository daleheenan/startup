-- Add curation fields to editorial_lessons table
-- Supports AI-assisted lesson curation: duplicate detection, book-specific flagging, generalisation

-- Add curation status field
-- Values: 'pending_review', 'approved', 'archived', 'duplicate', 'needs_generalisation'
ALTER TABLE editorial_lessons ADD COLUMN curation_status TEXT DEFAULT 'pending_review';

-- Flag for whether the lesson is book-specific (contains chapter numbers, character names, etc.)
ALTER TABLE editorial_lessons ADD COLUMN is_book_specific INTEGER DEFAULT 0;

-- The generalised version of a book-specific lesson (AI-generated)
ALTER TABLE editorial_lessons ADD COLUMN generalised_title TEXT;
ALTER TABLE editorial_lessons ADD COLUMN generalised_description TEXT;

-- ID of the lesson this is a duplicate of (if marked as duplicate)
ALTER TABLE editorial_lessons ADD COLUMN duplicate_of_lesson_id TEXT REFERENCES editorial_lessons(id);

-- Similarity score when detected as duplicate (0-1)
ALTER TABLE editorial_lessons ADD COLUMN duplicate_similarity_score REAL;

-- Timestamp of last curation review
ALTER TABLE editorial_lessons ADD COLUMN last_curated_at TEXT;

-- Notes from AI analysis explaining why the lesson was flagged
ALTER TABLE editorial_lessons ADD COLUMN curation_notes TEXT;

-- Create indexes for efficient curation queries
CREATE INDEX IF NOT EXISTS idx_editorial_lessons_curation_status ON editorial_lessons(curation_status);
CREATE INDEX IF NOT EXISTS idx_editorial_lessons_is_book_specific ON editorial_lessons(is_book_specific);
CREATE INDEX IF NOT EXISTS idx_editorial_lessons_duplicate_of ON editorial_lessons(duplicate_of_lesson_id);
