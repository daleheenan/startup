-- Author Management System
-- Migration 020: User author profiles and favorites

-- User author profiles (custom authors)
CREATE TABLE IF NOT EXISTS user_author_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'owner',
  name TEXT NOT NULL,
  genres TEXT NOT NULL, -- JSON array
  writing_style TEXT NOT NULL,
  notable_works TEXT, -- JSON array
  style_keywords TEXT, -- JSON array for prompts
  source TEXT DEFAULT 'user', -- 'user', 'lookup', 'predefined'
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, name)
);

-- User favorite authors (from predefined list or custom)
CREATE TABLE IF NOT EXISTS user_favorite_authors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'owner',
  author_id TEXT NOT NULL, -- References AUTHOR_STYLES id or user_author_profiles.id
  author_type TEXT NOT NULL DEFAULT 'predefined', -- 'predefined' or 'custom'
  added_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, author_id)
);

CREATE INDEX IF NOT EXISTS idx_user_author_profiles_user ON user_author_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_authors_user ON user_favorite_authors(user_id);
