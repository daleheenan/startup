-- Migration 021: Store Story Concept on Projects
-- Links projects to their source story concept for better overview display

-- Add story_concept column to projects table
ALTER TABLE projects ADD COLUMN story_concept TEXT;

-- Add source_concept_id to track which saved_concept the project came from
ALTER TABLE projects ADD COLUMN source_concept_id TEXT REFERENCES saved_concepts(id) ON DELETE SET NULL;

-- Create index for concept lookups
CREATE INDEX IF NOT EXISTS idx_projects_source_concept ON projects(source_concept_id);
