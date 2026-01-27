-- Fix duplicate chapter cleanup - prefer chapters WITH content over empty ones
-- Previous migration kept most recent (empty) chapters instead of ones with content

-- First, for each (book_id, chapter_number), find the chapter with content
-- If multiple have content, keep the one with highest word_count
-- If none have content, keep the most recent

-- Delete jobs for chapters that will be removed
DELETE FROM jobs WHERE target_id IN (
  SELECT c.id FROM chapters c
  WHERE c.id NOT IN (
    -- Keep chapter with content, preferring highest word_count, then most recent
    SELECT id FROM (
      SELECT id,
        ROW_NUMBER() OVER (
          PARTITION BY book_id, chapter_number
          ORDER BY
            CASE WHEN word_count > 0 THEN 0 ELSE 1 END,  -- Chapters with content first
            word_count DESC,                              -- Highest word count
            created_at DESC                               -- Most recent as tiebreaker
        ) as rn
      FROM chapters
    ) WHERE rn = 1
  )
);

-- Delete duplicate chapters, keeping ones with content
DELETE FROM chapters
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY book_id, chapter_number
        ORDER BY
          CASE WHEN word_count > 0 THEN 0 ELSE 1 END,  -- Chapters with content first
          word_count DESC,                              -- Highest word count
          created_at DESC                               -- Most recent as tiebreaker
      ) as rn
    FROM chapters
  ) WHERE rn = 1
);
