-- User Preferences - Store default prose style and other user-level settings
-- Migration 024

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY DEFAULT 'owner',
  prose_style TEXT,  -- JSON: Default prose style settings for new projects
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create default entry for owner user
INSERT OR IGNORE INTO user_preferences (user_id)
VALUES ('owner');
