-- Sprint 18: Advanced Prose Control
-- Database schema for prose style management, voice samples, and style templates

-- Prose style configurations
CREATE TABLE IF NOT EXISTS prose_styles (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,

    -- Sentence structure preferences
    sentence_length_preference TEXT DEFAULT 'varied', -- 'short', 'medium', 'long', 'varied'
    sentence_complexity TEXT DEFAULT 'moderate', -- 'simple', 'moderate', 'complex', 'varied'
    sentence_variety_score REAL DEFAULT 0.7, -- 0-1 scale for sentence structure variety

    -- Readability targets
    target_reading_level TEXT DEFAULT 'general', -- '8th_grade', 'high_school', 'general', 'literary'
    flesch_kincaid_target REAL DEFAULT 70.0, -- Target Flesch Reading Ease score (0-100)

    -- Prose formality and voice
    formality_level TEXT DEFAULT 'moderate', -- 'casual', 'moderate', 'formal', 'literary'
    voice_tone TEXT DEFAULT 'neutral', -- 'neutral', 'intimate', 'distant', 'conversational'
    narrative_distance TEXT DEFAULT 'close', -- 'close', 'moderate', 'distant'

    -- Vocabulary preferences
    vocabulary_complexity TEXT DEFAULT 'moderate', -- 'simple', 'moderate', 'sophisticated', 'mixed'
    use_metaphors INTEGER DEFAULT 1,
    use_similes INTEGER DEFAULT 1,

    -- Pacing preferences
    default_pacing TEXT DEFAULT 'moderate', -- 'slow', 'moderate', 'fast', 'varied'
    scene_transition_style TEXT DEFAULT 'smooth', -- 'abrupt', 'smooth', 'cinematic'

    -- Paragraph structure
    paragraph_length_preference TEXT DEFAULT 'varied', -- 'short', 'medium', 'long', 'varied'

    -- Advanced settings (JSON)
    custom_preferences TEXT, -- JSON object for additional custom settings

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prose_styles_project ON prose_styles(project_id);

-- Voice samples for style learning
CREATE TABLE IF NOT EXISTS voice_samples (
    id TEXT PRIMARY KEY,
    prose_style_id TEXT NOT NULL,
    sample_text TEXT NOT NULL,
    sample_source TEXT, -- Description of where sample came from

    -- Extracted metrics
    avg_sentence_length REAL,
    sentence_length_variance REAL,
    flesch_kincaid_score REAL,
    complex_word_ratio REAL,

    -- Stylistic patterns (JSON)
    extracted_patterns TEXT, -- JSON: sentence structures, word patterns, rhythm

    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (prose_style_id) REFERENCES prose_styles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_voice_samples_style ON voice_samples(prose_style_id);

-- Genre-specific style presets
CREATE TABLE IF NOT EXISTS style_presets (
    id TEXT PRIMARY KEY,
    genre TEXT NOT NULL,
    subgenre TEXT,
    preset_name TEXT NOT NULL,
    description TEXT,

    -- All the same fields as prose_styles
    sentence_length_preference TEXT DEFAULT 'varied',
    sentence_complexity TEXT DEFAULT 'moderate',
    sentence_variety_score REAL DEFAULT 0.7,
    target_reading_level TEXT DEFAULT 'general',
    flesch_kincaid_target REAL DEFAULT 70.0,
    formality_level TEXT DEFAULT 'moderate',
    voice_tone TEXT DEFAULT 'neutral',
    narrative_distance TEXT DEFAULT 'close',
    vocabulary_complexity TEXT DEFAULT 'moderate',
    use_metaphors INTEGER DEFAULT 1,
    use_similes INTEGER DEFAULT 1,
    default_pacing TEXT DEFAULT 'moderate',
    scene_transition_style TEXT DEFAULT 'smooth',
    paragraph_length_preference TEXT DEFAULT 'varied',
    custom_preferences TEXT,

    is_system_preset INTEGER DEFAULT 1, -- 1 for built-in, 0 for user-created
    usage_count INTEGER DEFAULT 0,

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_style_presets_genre ON style_presets(genre, subgenre);

-- Custom style templates (user saved)
CREATE TABLE IF NOT EXISTS style_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT, -- For future multi-user support
    template_name TEXT NOT NULL,
    description TEXT,
    tags TEXT, -- Comma-separated tags

    -- Configuration (copy of prose_style)
    configuration TEXT NOT NULL, -- JSON: complete prose style config

    -- Metadata
    is_public INTEGER DEFAULT 0,
    times_used INTEGER DEFAULT 0,

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_style_templates_user ON style_templates(user_id);

-- Style consistency checks
CREATE TABLE IF NOT EXISTS style_checks (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    prose_style_id TEXT NOT NULL,

    -- Consistency scores
    overall_consistency_score REAL, -- 0-100
    sentence_consistency REAL,
    vocabulary_consistency REAL,
    pacing_consistency REAL,

    -- Deviations (JSON)
    deviations TEXT, -- [{type: string, severity: string, location: string, description: string}]

    -- Recommendations
    recommendations TEXT, -- JSON array of suggested improvements

    checked_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
    FOREIGN KEY (prose_style_id) REFERENCES prose_styles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_style_checks_chapter ON style_checks(chapter_id);
CREATE INDEX IF NOT EXISTS idx_style_checks_style ON style_checks(prose_style_id);

-- Insert default style presets for popular subgenres
INSERT OR IGNORE INTO style_presets (id, genre, subgenre, preset_name, description, sentence_length_preference, sentence_complexity, flesch_kincaid_target, formality_level, voice_tone, narrative_distance, vocabulary_complexity, default_pacing)
VALUES
    -- Fantasy
    ('epic-fantasy', 'fantasy', 'epic-fantasy', 'Epic Fantasy', 'Grand, sweeping prose with complex sentences and rich vocabulary', 'long', 'complex', 65.0, 'formal', 'distant', 'moderate', 'sophisticated', 'moderate'),
    ('urban-fantasy', 'fantasy', 'urban-fantasy', 'Urban Fantasy', 'Contemporary, fast-paced with punchy dialogue', 'medium', 'moderate', 75.0, 'casual', 'conversational', 'close', 'moderate', 'fast'),
    ('cozy-fantasy', 'fantasy', 'cozy-fantasy', 'Cozy Fantasy', 'Warm, accessible prose with gentle pacing', 'medium', 'simple', 80.0, 'casual', 'intimate', 'close', 'simple', 'slow'),

    -- Science Fiction
    ('hard-scifi', 'sci-fi', 'hard-sci-fi', 'Hard Sci-Fi', 'Technical, precise prose with clear explanations', 'medium', 'complex', 70.0, 'formal', 'neutral', 'moderate', 'sophisticated', 'moderate'),
    ('space-opera', 'sci-fi', 'space-opera', 'Space Opera', 'Cinematic, action-oriented with varied pacing', 'varied', 'moderate', 72.0, 'moderate', 'neutral', 'moderate', 'moderate', 'fast'),
    ('cyberpunk', 'sci-fi', 'cyberpunk', 'Cyberpunk', 'Gritty, fast-paced with technical jargon', 'short', 'moderate', 73.0, 'casual', 'conversational', 'close', 'sophisticated', 'fast'),

    -- Romance
    ('contemporary-romance', 'romance', 'contemporary', 'Contemporary Romance', 'Emotional, intimate prose with strong voice', 'medium', 'moderate', 78.0, 'casual', 'intimate', 'close', 'moderate', 'moderate'),
    ('historical-romance', 'romance', 'historical', 'Historical Romance', 'Period-appropriate, elegant prose', 'long', 'complex', 68.0, 'formal', 'intimate', 'close', 'sophisticated', 'slow'),
    ('romantasy', 'romance', 'romantasy', 'Romantasy', 'Lyrical, emotional with fantasy elements', 'medium', 'moderate', 72.0, 'moderate', 'intimate', 'close', 'moderate', 'moderate'),

    -- Thriller
    ('psychological-thriller', 'thriller', 'psychological', 'Psychological Thriller', 'Tense, introspective with unreliable narration', 'varied', 'complex', 71.0, 'moderate', 'intimate', 'close', 'sophisticated', 'varied'),
    ('action-thriller', 'thriller', 'action', 'Action Thriller', 'Fast-paced, punchy sentences with high energy', 'short', 'simple', 78.0, 'casual', 'neutral', 'moderate', 'moderate', 'fast'),

    -- Mystery
    ('cozy-mystery', 'mystery', 'cozy', 'Cozy Mystery', 'Friendly, accessible prose with clear clues', 'medium', 'simple', 80.0, 'casual', 'conversational', 'close', 'simple', 'moderate'),
    ('noir', 'mystery', 'noir', 'Noir', 'Atmospheric, cynical first-person narrative', 'medium', 'moderate', 73.0, 'moderate', 'intimate', 'close', 'sophisticated', 'moderate'),

    -- Horror
    ('gothic-horror', 'horror', 'gothic', 'Gothic Horror', 'Atmospheric, ornate prose with dread building', 'long', 'complex', 65.0, 'formal', 'distant', 'moderate', 'sophisticated', 'slow'),
    ('cosmic-horror', 'horror', 'cosmic', 'Cosmic Horror', 'Alienating, complex prose emphasizing incomprehensibility', 'long', 'complex', 62.0, 'formal', 'distant', 'distant', 'sophisticated', 'slow'),

    -- Literary Fiction
    ('literary', 'literary', 'general', 'Literary Fiction', 'Artful, varied prose with complex themes', 'varied', 'complex', 60.0, 'literary', 'neutral', 'varied', 'sophisticated', 'varied'),
    ('minimalist', 'literary', 'minimalist', 'Minimalist', 'Sparse, precise prose with economy of language', 'short', 'simple', 75.0, 'moderate', 'distant', 'distant', 'simple', 'slow'),

    -- Historical Fiction
    ('historical-epic', 'historical', 'epic', 'Historical Epic', 'Period-authentic, sweeping narrative', 'long', 'complex', 66.0, 'formal', 'distant', 'moderate', 'sophisticated', 'moderate'),

    -- Young Adult
    ('ya-contemporary', 'young-adult', 'contemporary', 'YA Contemporary', 'Accessible, emotional first-person voice', 'medium', 'simple', 82.0, 'casual', 'intimate', 'close', 'moderate', 'fast'),
    ('ya-fantasy', 'young-adult', 'fantasy', 'YA Fantasy', 'Engaging, fast-paced with clear prose', 'medium', 'moderate', 78.0, 'casual', 'conversational', 'close', 'moderate', 'fast'),

    -- General presets
    ('general-accessible', 'general', NULL, 'Accessible', 'Clear, easy-to-read prose for broad audiences', 'medium', 'simple', 80.0, 'casual', 'conversational', 'close', 'simple', 'moderate'),
    ('general-literary', 'general', NULL, 'Literary', 'Sophisticated prose for literary audiences', 'varied', 'complex', 62.0, 'literary', 'neutral', 'moderate', 'sophisticated', 'varied');
