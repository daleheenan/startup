-- Migration: 063_plot_change_history
-- Purpose: Track plot structure changes for undo capability
-- This allows users to revert AI-made changes to plot structure

-- Plot change history table
CREATE TABLE IF NOT EXISTS plot_change_history (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    changed_at TEXT NOT NULL DEFAULT (datetime('now')),
    change_type TEXT NOT NULL CHECK (change_type IN ('coherence_fix', 'suggestion_impl', 'manual', 'regenerate', 'extract')),
    change_description TEXT,
    previous_plot_structure TEXT NOT NULL,  -- JSON snapshot before change
    new_plot_structure TEXT NOT NULL,       -- JSON snapshot after change
    plots_before INTEGER NOT NULL DEFAULT 0,
    plots_after INTEGER NOT NULL DEFAULT 0,
    rejected_new_plots TEXT,                -- JSON array of rejected AI-created plots
    can_undo INTEGER NOT NULL DEFAULT 1,    -- Whether this change can be undone
    undone_at TEXT,                         -- When the change was undone (NULL if not undone)
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_plot_change_history_project ON plot_change_history(project_id);
CREATE INDEX IF NOT EXISTS idx_plot_change_history_changed_at ON plot_change_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_plot_change_history_can_undo ON plot_change_history(project_id, can_undo, undone_at);
