-- Migration 025: Add source_idea_id to saved_concepts
-- Tracks which story idea a concept was expanded from

-- Add source_idea_id column to saved_concepts table
ALTER TABLE saved_concepts ADD COLUMN source_idea_id TEXT REFERENCES saved_story_ideas(id) ON DELETE SET NULL;

-- Create index for efficient lookups by source idea
CREATE INDEX IF NOT EXISTS idx_saved_concepts_source_idea ON saved_concepts(source_idea_id);
