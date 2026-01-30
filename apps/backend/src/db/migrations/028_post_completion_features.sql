-- Sprint 38: Post-Completion Features
-- Auto-analysis on completion and follow-up page (sequel/series recommendations)

-- Table: book_completion
-- Tracks when a book is completed and stores the auto-triggered analysis
CREATE TABLE IF NOT EXISTS book_completion (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL UNIQUE REFERENCES books(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Completion tracking
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  total_chapters INTEGER NOT NULL,
  total_word_count INTEGER NOT NULL,

  -- Auto-analysis results (persisted for quick access)
  analytics_status TEXT DEFAULT 'pending' CHECK(analytics_status IN ('pending', 'processing', 'completed', 'failed')),
  analytics_triggered_at TEXT,
  analytics_completed_at TEXT,

  -- Cached analytics summary (denormalised for fast display)
  cached_analytics TEXT, -- JSON: summary of book_analytics

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_book_completion_book ON book_completion(book_id);
CREATE INDEX IF NOT EXISTS idx_book_completion_project ON book_completion(project_id);
CREATE INDEX IF NOT EXISTS idx_book_completion_status ON book_completion(analytics_status);

-- Table: follow_up_recommendations
-- Stores AI-generated sequel/series recommendations
CREATE TABLE IF NOT EXISTS follow_up_recommendations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,

  -- Generation status
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'generating', 'completed', 'failed')),
  generated_at TEXT,

  -- Sequel Ideas (3-5 story concepts)
  sequel_ideas TEXT, -- JSON array of sequel concepts

  -- Unresolved Threads
  unresolved_threads TEXT, -- JSON array of plot threads to expand

  -- Character Arcs
  character_continuations TEXT, -- JSON array of character arc extensions

  -- World Expansion
  world_expansion TEXT, -- JSON array of unexplored world aspects

  -- Series Structure
  series_structure TEXT, -- JSON: trilogy/5-book arc suggestions

  -- Tone Variations
  tone_variations TEXT, -- JSON array of alternative directions

  -- Token tracking
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_follow_up_project ON follow_up_recommendations(project_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_book ON follow_up_recommendations(book_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_status ON follow_up_recommendations(status);

-- Add completion_status to books table to track if book is complete
-- (All chapters written with content)
ALTER TABLE books ADD COLUMN is_complete INTEGER DEFAULT 0;
ALTER TABLE books ADD COLUMN completed_at TEXT;
