-- Migration 018: Concept Summaries Storage
-- Allows users to save concept summaries (title + logline only) for later expansion

-- Table to store saved concept summaries
CREATE TABLE IF NOT EXISTS saved_concept_summaries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  logline TEXT NOT NULL,
  preferences TEXT NOT NULL,  -- JSON string of generation preferences
  notes TEXT,
  status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'expanded', 'archived')),
  expanded_concept_id TEXT,  -- References saved_concepts.id if expanded
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (expanded_concept_id) REFERENCES saved_concepts(id) ON DELETE SET NULL
);

-- Index for quick status filtering
CREATE INDEX IF NOT EXISTS idx_concept_summaries_status ON saved_concept_summaries(status);

-- Index for finding which summaries were expanded to which concepts
CREATE INDEX IF NOT EXISTS idx_concept_summaries_expanded ON saved_concept_summaries(expanded_concept_id);

-- Trigger to update updated_at on changes
CREATE TRIGGER IF NOT EXISTS update_concept_summaries_timestamp
AFTER UPDATE ON saved_concept_summaries
BEGIN
  UPDATE saved_concept_summaries SET updated_at = datetime('now') WHERE id = NEW.id;
END;
