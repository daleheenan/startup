-- Migration 017: Migration Registry Table
-- Creates enhanced migration tracking with rollback support
-- This migration is idempotent - safe to run multiple times

-- Create the enhanced migration registry table
CREATE TABLE IF NOT EXISTS migration_registry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    checksum TEXT NOT NULL,
    can_rollback INTEGER NOT NULL DEFAULT 0,
    rolled_back_at TEXT,
    execution_time_ms INTEGER NOT NULL DEFAULT 0
);

-- Create index for version lookups
CREATE INDEX IF NOT EXISTS idx_migration_registry_version
ON migration_registry(version);

-- Create index for finding active (non-rolled-back) migrations
CREATE INDEX IF NOT EXISTS idx_migration_registry_active
ON migration_registry(version) WHERE rolled_back_at IS NULL;

-- Migrate existing data from schema_migrations if not already migrated
-- This preserves the history of previously applied migrations
INSERT OR IGNORE INTO migration_registry (version, name, applied_at, checksum, can_rollback, execution_time_ms)
SELECT
    version,
    'migration_' || printf('%03d', version) as name,
    COALESCE(applied_at, datetime('now')) as applied_at,
    'legacy' as checksum,
    0 as can_rollback,
    0 as execution_time_ms
FROM schema_migrations
WHERE version NOT IN (SELECT version FROM migration_registry);
