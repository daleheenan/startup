-- Sprint 17: Regeneration & Variation Tools
-- Migration 007: Regeneration Variations and History

-- Stores generated variations for selected text
CREATE TABLE IF NOT EXISTS regeneration_variations (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    selection_start INTEGER NOT NULL,  -- Character offset in content
    selection_end INTEGER NOT NULL,    -- Character offset in content
    original_text TEXT NOT NULL,
    variation_1 TEXT NOT NULL,
    variation_2 TEXT NOT NULL,
    variation_3 TEXT NOT NULL,
    selected_variation INTEGER,        -- 0=original, 1-3=variation, NULL=not yet selected
    regeneration_mode TEXT NOT NULL CHECK(regeneration_mode IN ('general', 'dialogue', 'description', 'scene')),
    context_before TEXT,                -- Context for regeneration
    context_after TEXT,                 -- Context for regeneration
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- Index for fast chapter lookups
CREATE INDEX IF NOT EXISTS idx_regeneration_variations_chapter ON regeneration_variations(chapter_id);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_regeneration_variations_created ON regeneration_variations(created_at);

-- Tracks all regeneration actions for audit and history
CREATE TABLE IF NOT EXISTS regeneration_history (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    variation_id TEXT,  -- NULL for scene regenerations, FK to regeneration_variations for selections
    action_type TEXT NOT NULL CHECK(action_type IN ('generate_variations', 'apply_variation', 'scene_regen')),
    selection_start INTEGER,  -- NULL for scene regenerations
    selection_end INTEGER,    -- NULL for scene regenerations
    original_text TEXT,
    final_text TEXT,
    regeneration_mode TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
    FOREIGN KEY (variation_id) REFERENCES regeneration_variations(id) ON DELETE SET NULL
);

-- Index for fast chapter history lookups
CREATE INDEX IF NOT EXISTS idx_regeneration_history_chapter ON regeneration_history(chapter_id);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_regeneration_history_created ON regeneration_history(created_at);

-- Index for filtering by action type
CREATE INDEX IF NOT EXISTS idx_regeneration_history_action ON regeneration_history(action_type);
