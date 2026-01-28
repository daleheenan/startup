-- Editorial Lessons Learned
-- Captures insights from editorial reviews for future book generations

-- Table to store editorial lessons learned
CREATE TABLE IF NOT EXISTS editorial_lessons (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  book_id TEXT REFERENCES books(id) ON DELETE SET NULL,

  -- Lesson categorisation
  category TEXT NOT NULL CHECK(category IN (
    'pacing', 'exposition', 'dialogue', 'character', 'plot',
    'scene_structure', 'word_economy', 'style', 'market', 'other'
  )),

  -- Lesson content
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Context
  source_module TEXT CHECK(source_module IN ('beta_swarm', 'ruthless_editor', 'market_analyst', 'word_count_revision')),
  original_issue TEXT,  -- The original VEB finding
  resolution TEXT,      -- How it was resolved

  -- Metrics
  word_count_impact INTEGER DEFAULT 0,  -- Positive = words added, negative = words cut
  severity_level TEXT CHECK(severity_level IN ('minor', 'moderate', 'major')),

  -- Applicability
  applies_to_genre TEXT,  -- NULL means applies to all
  applies_to_tone TEXT,   -- NULL means applies to all

  -- Status
  is_active INTEGER DEFAULT 1,  -- Whether to apply in future generations
  times_applied INTEGER DEFAULT 0,  -- How many times this lesson was used
  effectiveness_score REAL DEFAULT 0,  -- 0-1, updated based on feedback

  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient lookup by project
CREATE INDEX IF NOT EXISTS idx_editorial_lessons_project ON editorial_lessons(project_id);

-- Index for active lessons by category
CREATE INDEX IF NOT EXISTS idx_editorial_lessons_active_category ON editorial_lessons(is_active, category);

-- Index for genre/tone filtering
CREATE INDEX IF NOT EXISTS idx_editorial_lessons_genre ON editorial_lessons(applies_to_genre);
CREATE INDEX IF NOT EXISTS idx_editorial_lessons_tone ON editorial_lessons(applies_to_tone);

-- Table to track lesson application history
CREATE TABLE IF NOT EXISTS editorial_lesson_applications (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES editorial_lessons(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,

  -- Application details
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
  was_effective INTEGER,  -- 1 = helped, 0 = no impact, -1 = made worse (user feedback)
  notes TEXT,

  UNIQUE(lesson_id, book_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_applications_lesson ON editorial_lesson_applications(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_applications_book ON editorial_lesson_applications(book_id);

-- Trigger to update lesson effectiveness when application feedback is received
CREATE TRIGGER IF NOT EXISTS update_lesson_effectiveness
AFTER UPDATE OF was_effective ON editorial_lesson_applications
WHEN NEW.was_effective IS NOT NULL
BEGIN
  UPDATE editorial_lessons
  SET
    times_applied = times_applied + 1,
    effectiveness_score = (
      SELECT COALESCE(AVG(CASE
        WHEN was_effective = 1 THEN 1.0
        WHEN was_effective = 0 THEN 0.5
        WHEN was_effective = -1 THEN 0.0
      END), 0)
      FROM editorial_lesson_applications
      WHERE lesson_id = NEW.lesson_id AND was_effective IS NOT NULL
    ),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.lesson_id;
END;
