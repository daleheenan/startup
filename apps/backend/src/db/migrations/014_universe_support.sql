-- Migration 014: Universe Support
-- Add universe system for shared world-building across multiple projects/series

-- Add universe linking to projects table
ALTER TABLE projects ADD COLUMN universe_id TEXT;
ALTER TABLE projects ADD COLUMN is_universe_root INTEGER DEFAULT 0;

-- Create universe metadata table
CREATE TABLE IF NOT EXISTS universes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    root_project_id TEXT,
    story_dna_template TEXT,  -- Shared genre/tone/themes (JSON)
    world_template TEXT,       -- Shared world elements (JSON)
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (root_project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Create indexes for efficient querying
CREATE INDEX idx_projects_universe ON projects(universe_id);
CREATE INDEX idx_universes_root ON universes(root_project_id);
