-- Mystery Tracking - Track plot mysteries and their resolution across book series
-- Migration 012

CREATE TABLE IF NOT EXISTS series_mysteries (
  id TEXT PRIMARY KEY,
  series_id TEXT NOT NULL, -- project_id for series/trilogy
  question TEXT NOT NULL, -- The mystery or question raised

  -- Where the mystery was raised
  raised_book INTEGER NOT NULL,
  raised_chapter INTEGER NOT NULL,
  context TEXT NOT NULL, -- Excerpt or description where mystery appears

  -- Where the mystery was answered (if resolved)
  answered_book INTEGER,
  answered_chapter INTEGER,
  answer TEXT,

  -- Mystery metadata
  status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'resolved' | 'red_herring'
  importance TEXT NOT NULL DEFAULT 'minor', -- 'major' | 'minor' | 'subplot'

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (series_id) REFERENCES projects(id) ON DELETE CASCADE,
  CHECK (status IN ('open', 'resolved', 'red_herring')),
  CHECK (importance IN ('major', 'minor', 'subplot'))
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_mysteries_series ON series_mysteries(series_id);
CREATE INDEX IF NOT EXISTS idx_mysteries_status ON series_mysteries(status);
CREATE INDEX IF NOT EXISTS idx_mysteries_raised ON series_mysteries(raised_book, raised_chapter);
CREATE INDEX IF NOT EXISTS idx_mysteries_answered ON series_mysteries(answered_book, answered_chapter);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_series_mysteries_timestamp
AFTER UPDATE ON series_mysteries
FOR EACH ROW
BEGIN
  UPDATE series_mysteries SET updated_at = datetime('now') WHERE id = NEW.id;
END;
