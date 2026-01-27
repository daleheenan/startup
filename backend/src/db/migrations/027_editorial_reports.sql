-- Virtual Editorial Board (VEB) tables
-- Sprint 32: Post-manuscript AI review system

-- Table: editorial_reports
-- Stores the overall VEB report and module results
CREATE TABLE IF NOT EXISTS editorial_reports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),

  -- Module A: Beta Swarm results
  beta_swarm_status TEXT DEFAULT 'pending' CHECK(beta_swarm_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  beta_swarm_results TEXT, -- JSON: chapter reactions, retention scores, DNF risks
  beta_swarm_completed_at TEXT,

  -- Module B: Ruthless Editor results
  ruthless_editor_status TEXT DEFAULT 'pending' CHECK(ruthless_editor_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  ruthless_editor_results TEXT, -- JSON: value shifts, exposition audit, pacing issues
  ruthless_editor_completed_at TEXT,

  -- Module C: Market Analyst results
  market_analyst_status TEXT DEFAULT 'pending' CHECK(market_analyst_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  market_analyst_results TEXT, -- JSON: comp titles, hook analysis, trope analysis
  market_analyst_completed_at TEXT,

  -- Aggregated report
  overall_score INTEGER, -- 1-100 composite score
  summary TEXT, -- Executive summary of all findings
  recommendations TEXT, -- JSON: prioritized list of recommended changes

  -- Token tracking
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,

  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  error TEXT
);

-- Table: veb_feedback
-- Tracks user responses to VEB findings
CREATE TABLE IF NOT EXISTS veb_feedback (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES editorial_reports(id) ON DELETE CASCADE,
  chapter_id TEXT REFERENCES chapters(id),
  module TEXT NOT NULL CHECK(module IN ('beta_swarm', 'ruthless_editor', 'market_analyst')),
  finding_index INTEGER, -- Index of the finding within the module results
  feedback_type TEXT NOT NULL CHECK(feedback_type IN ('accept', 'reject', 'rewrite_queued', 'rewrite_completed')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_editorial_reports_project ON editorial_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_editorial_reports_status ON editorial_reports(status);
CREATE INDEX IF NOT EXISTS idx_veb_feedback_report ON veb_feedback(report_id);
CREATE INDEX IF NOT EXISTS idx_veb_feedback_chapter ON veb_feedback(chapter_id);
