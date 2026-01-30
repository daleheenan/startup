-- Migration 057: Commercial Genre Enhancements
-- Adds romance heat levels, emotional beats tracking, and thriller pacing mechanics
-- Designed to maximise commercial viability for Romance, Thriller, and Sci-Fi genres

-- ============================================================================
-- ROMANCE: Heat Level Classification System
-- ============================================================================

-- Heat level definitions for romance projects
CREATE TABLE IF NOT EXISTS romance_heat_levels (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL UNIQUE,
    heat_level INTEGER NOT NULL CHECK(heat_level BETWEEN 1 AND 5),
    -- 1 = Sweet (closed door, no explicit content)
    -- 2 = Warm (fade to black, implied intimacy)
    -- 3 = Steamy (some explicit scenes, tasteful)
    -- 4 = Hot (detailed intimate scenes)
    -- 5 = Scorching (very explicit, erotica-adjacent)
    content_warnings TEXT,              -- JSON array of content warnings
    fade_to_black BOOLEAN DEFAULT 0,    -- Whether to use fade-to-black technique
    on_page_intimacy BOOLEAN DEFAULT 1, -- Whether intimacy happens on page
    sensuality_focus TEXT CHECK(sensuality_focus IN ('emotional', 'physical', 'balanced')) DEFAULT 'balanced',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_romance_heat_project ON romance_heat_levels(project_id);
CREATE INDEX IF NOT EXISTS idx_romance_heat_level ON romance_heat_levels(heat_level);

-- ============================================================================
-- ROMANCE: Emotional Beats Tracking
-- ============================================================================

-- Romance emotional beats that must appear in the story
CREATE TABLE IF NOT EXISTS romance_beats (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    beat_type TEXT NOT NULL CHECK(beat_type IN (
        'meet_cute',           -- First meeting with chemistry/spark
        'first_attraction',    -- Initial physical/emotional attraction acknowledged
        'first_conflict',      -- First major disagreement or obstacle
        'first_touch',         -- First significant physical contact
        'first_kiss',          -- First romantic kiss
        'first_intimacy',      -- First intimate scene (level depends on heat)
        'black_moment',        -- All is lost, relationship seems doomed
        'grand_gesture',       -- Big romantic gesture to win back love
        'declaration',         -- Declaration of love
        'commitment',          -- Commitment to relationship
        'hea_hfn'             -- Happily Ever After / Happy For Now ending
    )),
    chapter_number INTEGER,             -- Which chapter this beat appears in
    scene_description TEXT,             -- Brief description of the scene
    emotional_intensity INTEGER CHECK(emotional_intensity BETWEEN 1 AND 10),
    completed BOOLEAN DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, beat_type)
);

CREATE INDEX IF NOT EXISTS idx_romance_beats_project ON romance_beats(project_id);
CREATE INDEX IF NOT EXISTS idx_romance_beats_type ON romance_beats(beat_type);
CREATE INDEX IF NOT EXISTS idx_romance_beats_chapter ON romance_beats(chapter_number);

-- ============================================================================
-- THRILLER: Pacing and Tension System
-- ============================================================================

-- Thriller chapter pacing configuration
CREATE TABLE IF NOT EXISTS thriller_pacing (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL UNIQUE,
    pacing_style TEXT NOT NULL CHECK(pacing_style IN (
        'relentless',    -- Non-stop action, minimal breathers
        'escalating',    -- Builds steadily to climax
        'rollercoaster', -- Alternates high/low tension
        'slow_burn'      -- Gradual build with explosive payoff
    )) DEFAULT 'escalating',
    chapter_hook_required BOOLEAN DEFAULT 1,      -- Every chapter must end on hook
    cliffhanger_frequency TEXT CHECK(cliffhanger_frequency IN ('every', 'most', 'some')) DEFAULT 'most',
    action_scene_ratio INTEGER CHECK(action_scene_ratio BETWEEN 10 AND 90) DEFAULT 40, -- % of scenes with action
    average_chapter_tension INTEGER CHECK(average_chapter_tension BETWEEN 1 AND 10) DEFAULT 7,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_thriller_pacing_project ON thriller_pacing(project_id);

-- Thriller chapter endings (hooks and cliffhangers)
CREATE TABLE IF NOT EXISTS thriller_chapter_hooks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    chapter_number INTEGER NOT NULL,
    hook_type TEXT NOT NULL CHECK(hook_type IN (
        'cliffhanger',          -- Direct danger, mid-action cut
        'revelation',           -- Shocking information revealed
        'question',             -- Compelling question raised
        'threat',               -- New threat introduced
        'betrayal',             -- Trust broken, loyalty questioned
        'countdown',            -- Time pressure established
        'mystery_deepens',      -- Mystery becomes more complex
        'reversal',             -- Situation completely changes
        'emotional_gut_punch',  -- Emotional shock
        'foreshadowing'         -- Ominous hint of what's coming
    )),
    hook_description TEXT,
    tension_level INTEGER CHECK(tension_level BETWEEN 1 AND 10),
    resolved_in_chapter INTEGER,  -- Which chapter resolves this hook
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_thriller_hooks_project ON thriller_chapter_hooks(project_id);
CREATE INDEX IF NOT EXISTS idx_thriller_hooks_chapter ON thriller_chapter_hooks(chapter_number);
CREATE INDEX IF NOT EXISTS idx_thriller_hooks_type ON thriller_chapter_hooks(hook_type);

-- ============================================================================
-- THRILLER: Twist and Reveal Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS thriller_twists (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    twist_type TEXT NOT NULL CHECK(twist_type IN (
        'major_reveal',      -- Game-changing revelation
        'minor_reveal',      -- Important but not earth-shattering
        'red_herring',       -- Deliberate misdirection
        'false_victory',     -- Apparent success that fails
        'betrayal',          -- Trusted character turns
        'hidden_identity',   -- Character's true identity revealed
        'plot_reversal',     -- Complete 180 of situation
        'unreliable_info',   -- Information proven false
        'connection_reveal', -- Hidden connection between elements
        'stakes_escalation'  -- Stakes suddenly much higher
    )),
    chapter_number INTEGER,
    setup_chapters TEXT,              -- JSON array of chapters that set this up
    description TEXT NOT NULL,
    impact_level TEXT CHECK(impact_level IN ('low', 'medium', 'high', 'extreme')) DEFAULT 'medium',
    foreshadowed BOOLEAN DEFAULT 1,   -- Was this properly set up?
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_thriller_twists_project ON thriller_twists(project_id);
CREATE INDEX IF NOT EXISTS idx_thriller_twists_chapter ON thriller_twists(chapter_number);
CREATE INDEX IF NOT EXISTS idx_thriller_twists_type ON thriller_twists(twist_type);

-- ============================================================================
-- THRILLER: Ticking Clock Mechanics
-- ============================================================================

CREATE TABLE IF NOT EXISTS thriller_time_pressure (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    clock_type TEXT NOT NULL CHECK(clock_type IN (
        'deadline',          -- Specific time limit
        'countdown',         -- Visible countdown to disaster
        'racing',            -- Competing against antagonist
        'decay',             -- Situation getting worse over time
        'opportunity',       -- Window closing
        'survival'           -- Time running out for victim
    )),
    description TEXT NOT NULL,
    start_chapter INTEGER,
    resolution_chapter INTEGER,
    stakes TEXT,                      -- What happens if time runs out
    time_remaining TEXT,              -- In-story time remaining (e.g., "48 hours")
    reminder_frequency TEXT CHECK(reminder_frequency IN ('constant', 'regular', 'occasional')) DEFAULT 'regular',
    active BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_thriller_time_project ON thriller_time_pressure(project_id);
CREATE INDEX IF NOT EXISTS idx_thriller_time_active ON thriller_time_pressure(active);

-- ============================================================================
-- SCI-FI: Hard vs Soft Classification
-- ============================================================================

CREATE TABLE IF NOT EXISTS scifi_classification (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL UNIQUE,
    hardness_level TEXT NOT NULL CHECK(hardness_level IN (
        'hard',           -- Rigorous scientific accuracy
        'firm',           -- Generally plausible, some handwaving
        'medium',         -- Balance of science and speculation
        'soft',           -- Science as backdrop, focus elsewhere
        'science_fantasy' -- Science-flavoured fantasy
    )) DEFAULT 'medium',
    tech_explanation_depth TEXT CHECK(tech_explanation_depth IN ('detailed', 'moderate', 'minimal', 'none')) DEFAULT 'moderate',
    scientific_accuracy_priority INTEGER CHECK(scientific_accuracy_priority BETWEEN 1 AND 10) DEFAULT 5,
    speculative_elements TEXT,        -- JSON array of key speculative tech/concepts
    real_science_basis TEXT,          -- JSON array of real science being extrapolated
    handwave_allowed TEXT,            -- JSON array of areas where accuracy is relaxed
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scifi_class_project ON scifi_classification(project_id);
CREATE INDEX IF NOT EXISTS idx_scifi_class_hardness ON scifi_classification(hardness_level);

-- ============================================================================
-- ADDITIONAL ROMANCE TROPES (expanding from 11 to 30+)
-- ============================================================================

INSERT OR IGNORE INTO genre_tropes (id, trope_name, description, genre, trope_type, usage_frequency, compatibility_tags, examples, subversions) VALUES
-- Core romance tropes (adding to existing 11)
('trope_romance_secret_identity', 'Secret Identity', 'One character hides their true identity (royalty, celebrity, wealth) from the love interest.', 'romance', 'plot', 'common', '["contemporary", "historical", "romantasy"]', '["Notting Hill", "Roman Holiday", "The Prince & Me"]', '["Identity is boring", "Both have secrets", "Secret makes them less appealing"]'),
('trope_romance_love_triangle', 'Love Triangle', 'Protagonist torn between two romantic options, each offering something different.', 'romance', 'relationship', 'common', '["young-adult", "contemporary", "paranormal"]', '["Twilight", "The Hunger Games", "Bridget Jones"]', '["Triangle resolves peacefully", "Protagonist chooses neither", "Triangle is imaginary"]'),
('trope_romance_one_bed', 'Only One Bed', 'Circumstances force two characters to share sleeping arrangements, increasing tension.', 'romance', 'plot', 'common', '["contemporary", "forced-proximity", "romantic-comedy"]', '["Countless romance novels", "Hallmark movies", "Road trip romances"]', '["They sleep separately", "One takes floor happily", "Multiple beds appear"]'),
('trope_romance_bodyguard', 'Bodyguard Romance', 'A protector falls for the person they are sworn to protect.', 'romance', 'relationship', 'moderate', '["romantic-suspense", "contemporary", "historical"]', '["The Bodyguard", "Protected series", "Countless romance novels"]', '["Bodyguard is terrible at job", "Protected person does the saving", "Professional boundaries hold"]'),
('trope_romance_best_friend_sibling', 'Best Friend''s Sibling', 'Falling for your best friend''s brother or sister, risking the friendship.', 'romance', 'relationship', 'common', '["contemporary", "new-adult", "small-town"]', '["Many contemporary romances", "To All the Boys sequels"]', '["Friend encourages it", "Sibling is awful", "Friendship matters more"]'),
('trope_romance_age_gap', 'Significant Age Gap', 'Romantic partners with notable age difference navigate societal expectations.', 'romance', 'relationship', 'moderate', '["contemporary", "historical", "taboo"]', '["The Idea of You", "An Education"]', '["Gap is irrelevant", "Younger person is more mature", "Gap causes real problems"]'),
('trope_romance_secret_baby', 'Secret Baby/Pregnancy', 'One partner discovers they''re pregnant or that they have a child from past relationship.', 'romance', 'plot', 'moderate', '["contemporary", "small-town", "second-chance"]', '["Many Harlequin romances", "Contemporary series romances"]', '["Baby isn''t the focus", "No baby, false alarm", "Both knew about baby"]'),
('trope_romance_amnesia', 'Amnesia Romance', 'One character loses memory, leading to rediscovering love or a fresh start.', 'romance', 'plot', 'moderate', '["contemporary", "romantic-suspense", "soap-opera"]', '["The Vow", "While You Were Sleeping (sort of)"]', '["Memory loss is minor", "They fall for someone new", "Memory returns too quickly"]'),
('trope_romance_unrequited', 'Unrequited to Requited', 'Long-held one-sided feelings finally become mutual.', 'romance', 'relationship', 'common', '["contemporary", "friends-to-lovers", "slow-burn"]', '["Many slow-burn romances", "Jane Austen variations"]', '["Feelings stay unrequited", "Requited but too late", "Was mutual all along"]'),
('trope_romance_makeover', 'Transformation/Makeover', 'Physical or personal transformation captures love interest''s attention.', 'romance', 'plot', 'moderate', '["contemporary", "romantic-comedy", "young-adult"]', '["She''s All That", "My Fair Lady", "Pretty Woman"]', '["No makeover needed", "Makeover is reversed", "Love before transformation"]'),
('trope_romance_opposites', 'Opposites Attract', 'Characters with contrasting personalities, lifestyles, or values fall in love.', 'romance', 'relationship', 'common', '["contemporary", "romantic-comedy", "workplace"]', '["You''ve Got Mail", "The Proposal", "Leap Year"]', '["They''re actually similar", "Differences are deal-breakers", "They meet in the middle"]'),
('trope_romance_class_difference', 'Rich/Poor Divide', 'Romance across significant wealth or class divide.', 'romance', 'theme', 'common', '["contemporary", "historical", "regency"]', '["Pretty Woman", "Cinderella", "Pride and Prejudice"]', '["Wealth doesn''t matter", "Poor partner is secretly rich", "Rich partner becomes poor"]'),
('trope_romance_stuck_together', 'Snowed In/Stranded', 'External circumstances (weather, transport failure) force characters together.', 'romance', 'plot', 'common', '["contemporary", "holiday", "forced-proximity"]', '["Holiday romances", "Disaster movies with romance"]', '["They escape easily", "Being stuck is terrible", "Rescue comes too soon"]'),
('trope_romance_matchmaker', 'Matchmaker Backfire', 'Character sets others up but ends up falling for someone themselves.', 'romance', 'plot', 'moderate', '["romantic-comedy", "contemporary", "friends-to-lovers"]', '["Emma", "The Wedding Planner", "Hitch"]', '["Matchmaking works perfectly", "Everyone pairs up wrong", "Matchmaker stays single"]'),
('trope_romance_reunited', 'Childhood Sweethearts', 'First loves reunite as adults with unfinished business.', 'romance', 'relationship', 'common', '["contemporary", "small-town", "second-chance"]', '["Sweet Magnolias", "Many small-town romances"]', '["They''ve both changed too much", "First love wasn''t real", "One doesn''t remember"]'),
('trope_romance_arranged', 'Arranged Marriage to Love', 'A marriage arranged for practical reasons develops into genuine love.', 'romance', 'plot', 'moderate', '["historical", "regency", "multicultural"]', '["Historical romances", "Cultural romances"]', '["Love never develops", "Marriage is cancelled", "Was love match all along"]'),
('trope_romance_neighbors', 'Neighbors to Lovers', 'People living next door or nearby develop romantic feelings despite initial friction.', 'romance', 'setting', 'moderate', '["contemporary", "romantic-comedy", "small-town"]', '["The Hating Game (office version)", "Many rom-coms"]', '["One moves away", "They never interact", "Already knew each other"]'),
('trope_romance_single_parent', 'Single Parent Romance', 'A single parent finds love, often with the child playing matchmaker.', 'romance', 'character', 'common', '["contemporary", "small-town", "family"]', '["Sleepless in Seattle", "Jerry Maguire"]', '["Child disapproves", "No children involved", "Both are single parents"]'),
('trope_romance_boss_employee', 'Boss/Employee', 'Romance develops in a hierarchical workplace relationship.', 'romance', 'relationship', 'common', '["contemporary", "workplace", "power-dynamic"]', '["The Proposal", "Many Harlequin romances"]', '["They quit to date", "HR intervenes", "No actual power imbalance"]'),
('trope_romance_holiday', 'Holiday Romance', 'Romance blossoms during a holiday or vacation, often seemingly temporary.', 'romance', 'setting', 'common', '["contemporary", "beach-read", "seasonal"]', '["The Holiday", "Mamma Mia", "Letters to Juliet"]', '["Holiday ends, so does romance", "They live nearby", "Never a holiday"]');

-- ============================================================================
-- ADDITIONAL THRILLER TROPES
-- ============================================================================

INSERT OR IGNORE INTO genre_tropes (id, trope_name, description, genre, trope_type, usage_frequency, compatibility_tags, examples, subversions) VALUES
('trope_thriller_unreliable', 'Unreliable Narrator', 'The story is told by someone whose perception or honesty cannot be trusted.', 'thriller', 'device', 'common', '["psychological", "mystery", "noir"]', '["Gone Girl", "The Girl on the Train", "Shutter Island"]', '["Narrator is reliable", "Unreliability is obvious", "Multiple unreliable narrators"]'),
('trope_thriller_conspiracy', 'Deep State Conspiracy', 'A shadowy organisation controls events from behind the scenes.', 'thriller', 'plot', 'common', '["political", "spy", "action"]', '["The Bourne series", "Three Days of the Condor", "The Firm"]', '["Conspiracy is paranoia", "Conspiracy is benevolent", "Protagonist joins conspiracy"]'),
('trope_thriller_woman_in_peril', 'Woman in Jeopardy', 'A female protagonist faces escalating threats to her safety.', 'thriller', 'character', 'common', '["psychological", "domestic", "suspense"]', '["Sleeping with the Enemy", "Gerald''s Game", "The Woman in the Window"]', '["Woman is the threat", "Peril is imagined", "Woman saves herself easily"]'),
('trope_thriller_cat_mouse', 'Cat and Mouse', 'Extended pursuit between hunter and hunted with role reversals.', 'thriller', 'plot', 'common', '["action", "psychological", "spy"]', '["The Silence of the Lambs", "Catch Me If You Can", "No Country for Old Men"]', '["Roles never reverse", "Both are hunters", "Mouse catches cat"]'),
('trope_thriller_locked_in', 'Contained Thriller', 'Action confined to a single location (building, plane, submarine).', 'thriller', 'setting', 'moderate', '["action", "psychological", "horror"]', '["Die Hard", "Speed", "Phone Booth"]', '["Location keeps changing", "Escape is easy", "Location expands dramatically"]'),
('trope_thriller_hidden_past', 'Dark Secret in the Past', 'A character''s hidden history resurfaces to threaten the present.', 'thriller', 'plot', 'common', '["psychological", "domestic", "mystery"]', '["The Talented Mr. Ripley", "Before I Go to Sleep"]', '["Past was ordinary", "Secret is known", "Past was actually heroic"]'),
('trope_thriller_innocent_accused', 'Wrong Man', 'An innocent person must prove their innocence while evading capture.', 'thriller', 'plot', 'common', '["action", "conspiracy", "legal"]', '["The Fugitive", "North by Northwest", "The 39 Steps"]', '["They''re actually guilty", "They''re never accused", "They give themselves up"]'),
('trope_thriller_inside_job', 'Inside Man', 'The threat comes from within the organisation meant to protect.', 'thriller', 'plot', 'common', '["spy", "police", "political"]', '["L.A. Confidential", "The Departed", "Tinker Tailor Soldier Spy"]', '["Everyone is loyal", "Outside threat only", "Protagonist is the insider"]'),
('trope_thriller_final_twist', 'Final Page Revelation', 'A twist in the last pages recontextualises everything that came before.', 'thriller', 'device', 'common', '["psychological", "mystery", "literary"]', '["Gone Girl", "The Murder of Roger Ackroyd", "Shutter Island"]', '["Ending confirms expectations", "Twist is too early", "Multiple twists cancel out"]'),
('trope_thriller_countdown', 'Ticking Clock', 'A deadline creates urgency and raises stakes throughout.', 'thriller', 'device', 'common', '["action", "spy", "disaster"]', '["24", "Speed", "Source Code"]', '["Deadline is fake", "Time runs out", "Protagonist ignores deadline"]');

-- ============================================================================
-- ADDITIONAL SCI-FI TROPES
-- ============================================================================

INSERT OR IGNORE INTO genre_tropes (id, trope_name, description, genre, trope_type, usage_frequency, compatibility_tags, examples, subversions) VALUES
('trope_sf_colony_horror', 'Colony Gone Wrong', 'A space colony experiences catastrophic failure or horror.', 'science-fiction', 'plot', 'moderate', '["horror", "survival", "dystopian"]', '["Aliens", "Dead Space", "The Expanse"]', '["Colony thrives", "Horror was planned", "Earth is worse"]'),
('trope_sf_human_experiment', 'Unethical Experimentation', 'Characters discover they or others are subjects of secret experiments.', 'science-fiction', 'plot', 'common', '["thriller", "horror", "dystopian"]', '["Stranger Things", "Dark City", "The Island"]', '["Experiments are ethical", "Subjects volunteer", "Experiments fail"]'),
('trope_sf_last_human', 'Last of Their Kind', 'A character believes they are the last human or last of their species.', 'science-fiction', 'character', 'moderate', '["post-apocalyptic", "space-opera", "literary"]', '["I Am Legend", "Wall-E", "The Last of Us"]', '["Others are found", "They''re not the last", "They prefer solitude"]'),
('trope_sf_memory_manipulation', 'False Memories', 'Characters'' memories have been altered, implanted, or erased.', 'science-fiction', 'plot', 'moderate', '["psychological", "thriller", "cyberpunk"]', '["Total Recall", "Blade Runner", "Eternal Sunshine"]', '["Memories are real", "Everyone''s affected", "Characters prefer false memories"]'),
('trope_sf_bio_plague', 'Engineered Pandemic', 'A disease, either natural or weaponised, threatens humanity.', 'science-fiction', 'plot', 'moderate', '["thriller", "post-apocalyptic", "horror"]', '["The Stand", "12 Monkeys", "Contagion"]', '["Disease is natural", "Cure is easy", "Disease improves humanity"]'),
('trope_sf_robot_rights', 'Sentient AI Rights', 'Artificial beings fight for recognition as persons with rights.', 'science-fiction', 'theme', 'moderate', '["literary", "cyberpunk", "philosophical"]', '["Westworld", "Ex Machina", "Detroit: Become Human"]', '["AI doesn''t want rights", "Humans accept easily", "AI transcends the question"]'),
('trope_sf_space_horror', 'Terror in the Void', 'The isolation and hostility of space creates horror scenarios.', 'science-fiction', 'tone', 'moderate', '["horror", "survival", "thriller"]', '["Alien", "Event Horizon", "Sunshine"]', '["Space is safe", "Horror is mundane", "Characters thrive in space"]'),
('trope_sf_megacorp', 'Corporate Dystopia', 'Corporations have replaced or surpassed governments in power.', 'science-fiction', 'setting', 'common', '["cyberpunk", "dystopian", "noir"]', '["Blade Runner", "Robocop", "The Expanse"]', '["Corporations are benevolent", "Government is worse", "No corporations exist"]'),
('trope_sf_hive_mind', 'Collective Consciousness', 'A group shares a single mind or consciousness.', 'science-fiction', 'device', 'moderate', '["space-opera", "horror", "philosophical"]', '["The Borg", "Invasion of the Body Snatchers", "Arrival (sort of)"]', '["Hive mind is peaceful", "Individuality preserved", "Protagonist joins willingly"]'),
('trope_sf_primitive_earth', 'Earth as Backwater', 'Earth is primitive or forgotten in a galaxy of advanced civilisations.', 'science-fiction', 'setting', 'moderate', '["space-opera", "first-contact", "comedy"]', '["Hitchhiker''s Guide", "Men in Black"]', '["Earth is advanced", "Earth is unique", "Galaxy envies Earth"]');
