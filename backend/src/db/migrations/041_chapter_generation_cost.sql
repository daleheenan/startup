-- Migration 041: Chapter Generation Cost Tracking
-- Adds separate tracking for chapter generation costs vs total project costs

-- Add chapter-specific cost columns to project_metrics
ALTER TABLE project_metrics ADD COLUMN chapter_input_tokens INTEGER DEFAULT 0;
ALTER TABLE project_metrics ADD COLUMN chapter_output_tokens INTEGER DEFAULT 0;
ALTER TABLE project_metrics ADD COLUMN chapter_cost_usd REAL DEFAULT 0;
ALTER TABLE project_metrics ADD COLUMN chapter_cost_gbp REAL DEFAULT 0;
