-- Migration: Create images table for AI-generated imagery
-- Sprint 24: Visual Enhancements
-- Stores metadata for character portraits, location images, and cover art

CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('character', 'location', 'cover', 'scene')),
    entity_id TEXT,                    -- ID of character, world element, or NULL for covers
    image_type TEXT NOT NULL CHECK(image_type IN ('portrait', 'landscape', 'cover', 'scene_illustration')),
    prompt TEXT NOT NULL,              -- The prompt used to generate the image
    style_preset TEXT,                 -- Style preset used (realistic, artistic, etc.)
    file_path TEXT NOT NULL,           -- Relative path to image file
    file_size INTEGER,                 -- File size in bytes
    width INTEGER,                     -- Image width in pixels
    height INTEGER,                    -- Image height in pixels
    generation_params TEXT,            -- JSON: Full generation parameters for reproduction
    status TEXT NOT NULL CHECK(status IN ('generating', 'completed', 'failed')) DEFAULT 'generating',
    error_message TEXT,                -- Error message if generation failed
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_images_project ON images(project_id);
CREATE INDEX IF NOT EXISTS idx_images_entity ON images(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_images_status ON images(status);
CREATE INDEX IF NOT EXISTS idx_images_created ON images(created_at);
