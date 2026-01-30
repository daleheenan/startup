-- Migration 043: Backfill Book Versions for Legacy Data
-- Automatically creates version 1 for all books that don't have any versions
-- This fixes the "Too many requests" issue with the migration button

-- Create version 1 for all books that don't have any versions yet
INSERT INTO book_versions (id, book_id, version_number, version_name, is_active, word_count, chapter_count, created_at)
SELECT
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))) as id,
    b.id as book_id,
    1 as version_number,
    'Original' as version_name,
    1 as is_active,
    COALESCE((SELECT SUM(c.word_count) FROM chapters c WHERE c.book_id = b.id), 0) as word_count,
    COALESCE((SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id), 0) as chapter_count,
    datetime('now') as created_at
FROM books b
WHERE NOT EXISTS (SELECT 1 FROM book_versions bv WHERE bv.book_id = b.id);

-- Update all chapters that don't have a version_id to point to their book's version 1
UPDATE chapters
SET version_id = (
    SELECT bv.id FROM book_versions bv
    WHERE bv.book_id = chapters.book_id AND bv.version_number = 1
)
WHERE version_id IS NULL;

-- Update all chapter_edits that don't have a version_id
UPDATE chapter_edits
SET version_id = (
    SELECT c.version_id FROM chapters c WHERE c.id = chapter_edits.chapter_id
)
WHERE version_id IS NULL
AND chapter_id IS NOT NULL;
