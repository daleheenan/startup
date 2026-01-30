-- Migration 016: Timeframe/Era Support
-- Add timeframe/era setting to story DNA for temporal context in world-building

-- Note: The timeframe is stored within the story_dna JSON field in the projects table
-- This migration creates a reference table for common era presets and ensures the field is available

-- Create timeframe presets table for quick selection
CREATE TABLE IF NOT EXISTS timeframe_presets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'historical', 'modern', 'future', 'fantasy'
    sort_order INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Populate common timeframe presets
INSERT INTO timeframe_presets (id, name, description, category, sort_order) VALUES
    ('ancient', 'Ancient Era', 'Ancient civilizations (before 500 CE)', 'historical', 1),
    ('medieval', 'Medieval Era', 'Middle Ages (500-1500 CE)', 'historical', 2),
    ('renaissance', 'Renaissance', 'Renaissance period (1400-1600)', 'historical', 3),
    ('victorian', 'Victorian Era', 'Victorian period (1837-1901)', 'historical', 4),
    ('early-1900s', 'Early 1900s', 'Turn of the century (1900-1920)', 'historical', 5),
    ('roaring-twenties', 'Roaring Twenties', '1920s jazz age', 'historical', 6),
    ('wwii-era', 'WWII Era', '1940s wartime period', 'historical', 7),
    ('fifties', '1950s', 'Post-war era', 'historical', 8),
    ('sixties', '1960s', 'Counterculture era', 'historical', 9),
    ('seventies', '1970s', 'Disco and social change', 'historical', 10),
    ('eighties', '1980s', 'Reagan era', 'historical', 11),
    ('nineties', '1990s', 'End of millennium', 'historical', 12),
    ('contemporary', 'Contemporary', 'Present day (2020s)', 'modern', 13),
    ('near-future', 'Near Future', 'Next 20-50 years', 'future', 14),
    ('far-future', 'Far Future', '100+ years from now', 'future', 15),
    ('distant-future', 'Distant Future', 'Centuries or millennia ahead', 'future', 16),
    ('timeless-fantasy', 'Timeless Fantasy', 'No specific historical period', 'fantasy', 17),
    ('alternate-timeline', 'Alternate Timeline', 'Divergent history', 'fantasy', 18);

-- Create index for efficient category queries
CREATE INDEX idx_timeframe_category ON timeframe_presets(category, sort_order);
