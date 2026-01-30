-- Word Count Revision Feature
-- Enables hybrid AI-assisted word count reduction with user approval workflow

-- Table: word_count_revisions
-- Tracks the overall revision session and targets
CREATE TABLE IF NOT EXISTS word_count_revisions (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  editorial_report_id TEXT REFERENCES editorial_reports(id),

  -- Targets
  current_word_count INTEGER NOT NULL,
  target_word_count INTEGER NOT NULL,
  tolerance_percent INTEGER DEFAULT 5,

  -- Calculated fields (stored for quick access)
  min_acceptable INTEGER NOT NULL,  -- target - tolerance %
  max_acceptable INTEGER NOT NULL,  -- target + tolerance %
  words_to_cut INTEGER NOT NULL,

  -- Progress tracking
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'calculating', 'ready', 'in_progress', 'completed', 'abandoned')),
  chapters_reviewed INTEGER DEFAULT 0,
  chapters_total INTEGER NOT NULL,
  words_cut_so_far INTEGER DEFAULT 0,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

-- Table: chapter_reduction_proposals
-- Stores AI-generated reduction proposals for each chapter
CREATE TABLE IF NOT EXISTS chapter_reduction_proposals (
  id TEXT PRIMARY KEY,
  revision_id TEXT NOT NULL REFERENCES word_count_revisions(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,

  -- Targets
  original_word_count INTEGER NOT NULL,
  target_word_count INTEGER NOT NULL,
  reduction_percent REAL NOT NULL,
  priority_score INTEGER NOT NULL,  -- Higher = more cuttable (from VEB)

  -- VEB context (JSON)
  veb_issues TEXT,  -- JSON: exposition issues, pacing issues, scene purpose from Ruthless Editor

  -- Generated proposal
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'generating', 'ready', 'approved', 'rejected', 'applied', 'error')),
  condensed_content TEXT,  -- AI-generated shorter version
  condensed_word_count INTEGER,
  actual_reduction INTEGER,

  -- Explanation
  cuts_explanation TEXT,  -- JSON array: what was cut and why
  preserved_elements TEXT,  -- JSON array: what was deliberately preserved

  -- User decision
  user_decision TEXT DEFAULT 'pending' CHECK(user_decision IN ('pending', 'approved', 'rejected', 'modified')),
  user_notes TEXT,
  decision_at TEXT,

  -- Error tracking
  error_message TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  generated_at TEXT,

  -- Token tracking
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_word_count_revisions_book ON word_count_revisions(book_id);
CREATE INDEX IF NOT EXISTS idx_word_count_revisions_status ON word_count_revisions(status);

CREATE INDEX IF NOT EXISTS idx_chapter_reduction_proposals_revision ON chapter_reduction_proposals(revision_id);
CREATE INDEX IF NOT EXISTS idx_chapter_reduction_proposals_chapter ON chapter_reduction_proposals(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_reduction_proposals_status ON chapter_reduction_proposals(status);
CREATE INDEX IF NOT EXISTS idx_chapter_reduction_proposals_priority ON chapter_reduction_proposals(priority_score DESC);
