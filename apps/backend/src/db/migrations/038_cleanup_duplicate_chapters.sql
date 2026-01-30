-- Cleanup duplicate chapters caused by multiple generation starts
-- For each book, keep only the most recently created set of chapters

-- First, delete jobs for chapters that will be removed
DELETE FROM jobs WHERE target_id IN (
  SELECT c.id FROM chapters c
  WHERE c.id NOT IN (
    -- Keep only the most recent chapter for each (book_id, chapter_number) combination
    SELECT id FROM (
      SELECT id,
        ROW_NUMBER() OVER (PARTITION BY book_id, chapter_number ORDER BY created_at DESC) as rn
      FROM chapters
    ) WHERE rn = 1
  )
);

-- Then delete the duplicate chapters themselves
DELETE FROM chapters
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY book_id, chapter_number ORDER BY created_at DESC) as rn
    FROM chapters
  ) WHERE rn = 1
);
