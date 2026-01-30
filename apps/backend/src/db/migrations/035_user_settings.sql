-- User Settings - Custom genres, exclusions, and genre recipes
-- Migration 019

-- Custom genres created by users
CREATE TABLE IF NOT EXISTS user_genres (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'owner',
  name TEXT NOT NULL,
  description TEXT,
  parent_genre TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, name)
);

-- Exclusions/blacklists for names, words, themes, and tropes
CREATE TABLE IF NOT EXISTS user_exclusions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'owner',
  type TEXT NOT NULL CHECK (type IN ('name', 'word', 'theme', 'trope')),
  value TEXT NOT NULL,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, type, value)
);

-- Genre recipes (saved genre combinations)
CREATE TABLE IF NOT EXISTS user_genre_recipes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'owner',
  name TEXT NOT NULL,
  description TEXT,
  genres TEXT NOT NULL,
  tones TEXT NOT NULL,
  themes TEXT,
  modifiers TEXT,
  target_length INTEGER DEFAULT 80000,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, name)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_genres_user ON user_genres(user_id);
CREATE INDEX IF NOT EXISTS idx_user_genres_parent ON user_genres(parent_genre);
CREATE INDEX IF NOT EXISTS idx_user_exclusions_user ON user_exclusions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_exclusions_type ON user_exclusions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_user_genre_recipes_user ON user_genre_recipes(user_id);
