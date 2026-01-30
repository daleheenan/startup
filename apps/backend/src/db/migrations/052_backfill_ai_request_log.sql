-- Migration 052: Backfill AI Request Log
-- Creates historical entries from existing project_metrics chapter costs
-- This ensures continuity of cost tracking data

-- Backfill existing chapter generation costs as log entries
-- Uses a synthetic ID based on project_id for uniqueness
INSERT INTO ai_request_log (
    id,
    request_type,
    project_id,
    input_tokens,
    output_tokens,
    cost_usd,
    cost_gbp,
    model_used,
    success,
    context_summary,
    created_at
)
SELECT
    lower(hex(randomblob(16))),
    'chapter_generation_historical',
    project_id,
    chapter_input_tokens,
    chapter_output_tokens,
    chapter_cost_usd,
    chapter_cost_gbp,
    'claude-opus-4-5-20251101',
    1,
    'Historical chapter generation costs (backfilled from project_metrics)',
    created_at
FROM project_metrics
WHERE (chapter_input_tokens > 0 OR chapter_output_tokens > 0)
  AND project_id IS NOT NULL;

-- Update total_ai_cost columns from existing chapter costs
-- This ensures the new columns reflect current state
UPDATE project_metrics
SET
    total_ai_cost_usd = COALESCE(chapter_cost_usd, 0) + COALESCE(total_cost_usd, 0),
    total_ai_cost_gbp = COALESCE(chapter_cost_gbp, 0) + COALESCE(total_cost_gbp, 0),
    total_ai_requests = CASE
        WHEN chapter_input_tokens > 0 OR chapter_output_tokens > 0 THEN 1
        ELSE 0
    END
WHERE total_ai_cost_usd IS NULL OR total_ai_cost_usd = 0;
