-- Book Style Presets - Save genre selections as named personal preferences
-- Migration 011

CREATE TABLE IF NOT EXISTS book_style_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  genres TEXT NOT NULL, -- JSON array of genre values
  subgenres TEXT NOT NULL, -- JSON array of subgenre values
  modifiers TEXT, -- JSON array of modifier values
  tones TEXT, -- JSON array of tone values
  themes TEXT, -- JSON array of theme values
  custom_theme TEXT,
  target_length INTEGER DEFAULT 80000,
  is_default INTEGER DEFAULT 0, -- 1 if this is a system default preset
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_presets_name ON book_style_presets(name);
CREATE INDEX IF NOT EXISTS idx_presets_default ON book_style_presets(is_default);

-- Insert some default presets for users to start with
INSERT OR IGNORE INTO book_style_presets (id, name, description, genres, subgenres, modifiers, tones, themes, target_length, is_default, created_at, updated_at)
VALUES
  ('preset-epic-fantasy', 'Epic Fantasy Adventure', 'Classic epic fantasy with sweeping scope and heroic themes', '["fantasy"]', '["Epic Fantasy"]', '["epic", "adventure"]', '["Epic and Grand"]', '["Good vs Evil", "Power and Corruption", "Identity and Self-Discovery"]', 120000, 1, datetime('now'), datetime('now')),
  ('preset-cozy-mystery', 'Cozy Mystery', 'Charming amateur sleuth mysteries with warm community settings', '["mystery"]', '["Cozy Mystery"]', '[]', '["Light and Humorous", "Mysterious and Suspenseful"]', '["Secrets and Lies", "Family and Loyalty"]', 70000, 1, datetime('now'), datetime('now')),
  ('preset-dark-romance', 'Dark Romance', 'Intense romance with darker themes and morally complex characters', '["romance", "fantasy"]', '["Paranormal Romance", "Dark Fantasy"]', '["dark", "romantic"]', '["Dark and Gritty", "Romantic and Passionate"]', '["Forbidden Love", "Obsession", "Redemption"]', 90000, 1, datetime('now'), datetime('now')),
  ('preset-scifi-thriller', 'Sci-Fi Thriller', 'High-stakes science fiction with pulse-pounding tension', '["science-fiction", "thriller"]', '["Cyberpunk", "Psychological Thriller"]', '["action", "psychological"]', '["Tense and Fast-Paced", "Dark and Gritty"]', '["Survival", "Power and Corruption", "Nature vs Technology"]', 85000, 1, datetime('now'), datetime('now')),
  ('preset-romantasy', 'Romantasy', 'Fantasy romance with fae courts and magical love stories', '["romantasy"]', '["Fae Romance", "Court Intrigue Romance"]', '["romantic", "political"]', '["Romantic and Passionate", "Whimsical and Fantastical"]', '["Forbidden Love", "Power and Corruption", "Identity and Self-Discovery"]', 100000, 1, datetime('now'), datetime('now'));
