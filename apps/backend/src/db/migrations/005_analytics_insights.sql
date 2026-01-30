-- Sprint 19: Analytics & Insights
-- Stores calculated analytics and metrics for chapters and books

-- Chapter analytics table
CREATE TABLE IF NOT EXISTS chapter_analytics (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL UNIQUE,

    -- Pacing metrics
    pacing_score REAL,               -- 0-100 score for pacing quality
    pacing_data TEXT,                -- JSON: {scene_pacing: [{scene: string, pace: 'slow'|'medium'|'fast'}]}

    -- Character metrics
    character_screen_time TEXT,      -- JSON: {character_name: {appearances: number, word_count: number, pov_time: number}}

    -- Dialogue metrics
    dialogue_percentage REAL,        -- Percentage of dialogue vs narrative (0-100)
    dialogue_word_count INTEGER,
    narrative_word_count INTEGER,

    -- Readability metrics
    readability_score REAL,          -- Flesch-Kincaid or similar (0-100)
    avg_sentence_length REAL,
    complex_word_percentage REAL,

    -- Tension metrics
    tension_score REAL,              -- 0-100 score for tension level
    tension_arc TEXT,                -- JSON: {points: [{position: number, tension: number}]}

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chapter_analytics_chapter ON chapter_analytics(chapter_id);

-- Book analytics table (aggregate metrics)
CREATE TABLE IF NOT EXISTS book_analytics (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL UNIQUE,

    -- Overall pacing
    avg_pacing_score REAL,
    pacing_consistency REAL,        -- How consistent pacing is across chapters

    -- Character distribution
    character_balance TEXT,          -- JSON: Analysis of character distribution

    -- Dialogue ratio
    avg_dialogue_percentage REAL,

    -- Readability
    avg_readability_score REAL,

    -- Tension arc
    overall_tension_arc TEXT,        -- JSON: Overall book tension progression

    -- Genre benchmarking
    genre_comparison TEXT,           -- JSON: How this book compares to genre norms

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_book_analytics_book ON book_analytics(book_id);

-- Genre benchmarks table (reference data)
CREATE TABLE IF NOT EXISTS genre_benchmarks (
    id TEXT PRIMARY KEY,
    genre TEXT NOT NULL UNIQUE,

    -- Benchmark metrics
    typical_pacing_score REAL,
    typical_dialogue_percentage REAL,
    typical_readability_score REAL,
    typical_tension_pattern TEXT,    -- JSON: Expected tension arc for genre

    -- Character expectations
    typical_character_count INTEGER,
    typical_pov_structure TEXT,      -- JSON: Common POV patterns

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Insert default genre benchmarks
INSERT OR IGNORE INTO genre_benchmarks (id, genre, typical_pacing_score, typical_dialogue_percentage, typical_readability_score, typical_tension_pattern, typical_character_count, typical_pov_structure)
VALUES
    ('fantasy', 'fantasy', 65.0, 35.0, 70.0, '{"pattern": "gradual_rise"}', 5, '{"common": "third_person_multiple"}'),
    ('sci-fi', 'sci-fi', 70.0, 30.0, 65.0, '{"pattern": "episodic"}', 4, '{"common": "third_person_limited"}'),
    ('romance', 'romance', 60.0, 50.0, 75.0, '{"pattern": "relationship_arc"}', 2, '{"common": "dual_pov"}'),
    ('thriller', 'thriller', 80.0, 40.0, 75.0, '{"pattern": "escalating"}', 3, '{"common": "third_person_limited"}'),
    ('mystery', 'mystery', 70.0, 45.0, 72.0, '{"pattern": "clue_driven"}', 4, '{"common": "first_person"}'),
    ('horror', 'horror', 75.0, 35.0, 70.0, '{"pattern": "mounting_dread"}', 3, '{"common": "first_person"}'),
    ('literary', 'literary', 55.0, 40.0, 60.0, '{"pattern": "character_driven"}', 3, '{"common": "varied"}'),
    ('historical', 'historical', 60.0, 38.0, 68.0, '{"pattern": "period_authentic"}', 4, '{"common": "third_person"}');
