-- Sprint 33: Specialist Agent Configuration
-- Migration 054
--
-- Add agent configuration columns to projects table to enable cost optimisation
-- through selective specialist agent execution.
--
-- Generation Modes:
-- • draft: Core editing only (8 agents, ~$0.39/chapter)
--   - Developmental editor, Line editor, Continuity editor, Copy editor
--   - Proofread, Opening specialist, Dialogue coach, Hook specialist
--
-- • publication: Core + all specialists (14 agents, ~$0.65/chapter)
--   - All draft mode agents PLUS:
--   - Sensitivity reader, Research review, Beta reader, Fact-checker
--
-- • custom: User-selected agents (variable cost)
--   - Stored as JSON array in selected_agents column

-- Add generation_mode column (defaults to publication for existing projects)
ALTER TABLE projects ADD COLUMN generation_mode TEXT DEFAULT 'publication'
  CHECK(generation_mode IN ('draft', 'publication', 'custom'));

-- Add selected_agents column for custom mode (JSON array of agent names)
-- Example: ["dev_edit", "line_edit", "copy_edit", "proofread"]
ALTER TABLE projects ADD COLUMN selected_agents TEXT;
