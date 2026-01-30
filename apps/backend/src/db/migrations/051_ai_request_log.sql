-- Migration 051: AI Request Log
-- Comprehensive audit trail for all AI requests with token and cost tracking
-- This enables tracking costs for ALL AI operations, not just chapter generation

-- Create the AI request log table
CREATE TABLE IF NOT EXISTS ai_request_log (
    id TEXT PRIMARY KEY,
    request_type TEXT NOT NULL,           -- e.g., 'chapter_generation', 'veb_beta_swarm', 'coherence_check'
    project_id TEXT,                      -- Foreign key to projects (nullable for system-level requests)
    chapter_id TEXT,                      -- Foreign key to chapters (if applicable)
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL NOT NULL DEFAULT 0,
    cost_gbp REAL NOT NULL DEFAULT 0,
    model_used TEXT,                      -- e.g., 'claude-opus-4-5-20251101'
    success INTEGER NOT NULL DEFAULT 1,   -- 1 = success, 0 = failure
    error_message TEXT,                   -- Error details if failed
    context_summary TEXT,                 -- Brief description of what was being done
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_request_log_project ON ai_request_log(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_request_log_type ON ai_request_log(request_type);
CREATE INDEX IF NOT EXISTS idx_ai_request_log_created ON ai_request_log(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_request_log_project_type ON ai_request_log(project_id, request_type);
CREATE INDEX IF NOT EXISTS idx_ai_request_log_project_created ON ai_request_log(project_id, created_at);

-- Add total AI cost columns to project_metrics for quick access
ALTER TABLE project_metrics ADD COLUMN total_ai_cost_usd REAL DEFAULT 0;
ALTER TABLE project_metrics ADD COLUMN total_ai_cost_gbp REAL DEFAULT 0;
ALTER TABLE project_metrics ADD COLUMN total_ai_requests INTEGER DEFAULT 0;

-- Add settings toggle to user_preferences for showing AI Costs menu
ALTER TABLE user_preferences ADD COLUMN show_ai_costs_menu INTEGER DEFAULT 0;
