-- Sprint 39: Outline Editorial Board
-- Pre-chapter editorial review for story outlines
-- Allows users to get AI feedback on their outline before committing to chapter generation

-- Table: outline_editorial_reports
-- Stores editorial feedback on project outlines (pre-manuscript review)
CREATE TABLE IF NOT EXISTS outline_editorial_reports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  outline_id TEXT REFERENCES outlines(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),

  -- Module A: Story Structure Analyst
  structure_analyst_status TEXT DEFAULT 'pending' CHECK(structure_analyst_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  structure_analyst_results TEXT, -- JSON: plot structure, pacing plan, story arc analysis
  structure_analyst_completed_at TEXT,

  -- Module B: Character Arc Reviewer
  character_arc_status TEXT DEFAULT 'pending' CHECK(character_arc_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  character_arc_results TEXT, -- JSON: character development assessment across outline
  character_arc_completed_at TEXT,

  -- Module C: Market Fit Analyst
  market_fit_status TEXT DEFAULT 'pending' CHECK(market_fit_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  market_fit_results TEXT, -- JSON: commercial viability based on outline/concept
  market_fit_completed_at TEXT,

  -- Aggregated report
  overall_score INTEGER, -- 1-100 composite score
  summary TEXT, -- Executive summary of all findings
  recommendations TEXT, -- JSON: prioritised list of recommended changes
  ready_for_generation INTEGER DEFAULT 0, -- 1 if outline is approved for chapter generation

  -- Token tracking
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,

  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  error TEXT
);

-- Table: outline_editorial_feedback
-- Tracks user responses to outline editorial findings
CREATE TABLE IF NOT EXISTS outline_editorial_feedback (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES outline_editorial_reports(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK(module IN ('structure_analyst', 'character_arc', 'market_fit')),
  finding_index INTEGER, -- Index of the finding within the module results
  feedback_type TEXT NOT NULL CHECK(feedback_type IN ('accept', 'reject', 'revision_planned', 'revision_completed')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Add outline review status to projects (tracks if user has reviewed/skipped)
ALTER TABLE projects ADD COLUMN outline_review_status TEXT DEFAULT NULL
  CHECK(outline_review_status IS NULL OR outline_review_status IN ('pending', 'in_review', 'approved', 'skipped'));
ALTER TABLE projects ADD COLUMN outline_review_completed_at TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_outline_editorial_reports_project ON outline_editorial_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_outline_editorial_reports_status ON outline_editorial_reports(status);
CREATE INDEX IF NOT EXISTS idx_outline_editorial_feedback_report ON outline_editorial_feedback(report_id);
CREATE INDEX IF NOT EXISTS idx_projects_outline_review_status ON projects(outline_review_status);
