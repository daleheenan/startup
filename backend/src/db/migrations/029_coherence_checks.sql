-- Migration: 029_coherence_checks
-- Adds table for storing coherence check results (triggered automatically when plot layers are saved)

-- Coherence checks table
CREATE TABLE IF NOT EXISTS coherence_checks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    checked_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'completed', 'failed')),
    is_coherent INTEGER NOT NULL DEFAULT 0,  -- Boolean: 1 = coherent, 0 = not coherent
    warnings TEXT NOT NULL DEFAULT '[]',      -- JSON: Array of warning strings
    suggestions TEXT NOT NULL DEFAULT '[]',   -- JSON: Array of suggestion strings
    plot_analysis TEXT NOT NULL DEFAULT '[]', -- JSON: Array of plot analysis objects
    error TEXT,                               -- Error message if check failed
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_coherence_checks_project ON coherence_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_coherence_checks_status ON coherence_checks(status);
CREATE INDEX IF NOT EXISTS idx_coherence_checks_checked_at ON coherence_checks(checked_at);
