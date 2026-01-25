-- Migration 019: Enhanced Migration Tracking and Query Performance Monitoring
-- Adds additional columns to schema_migrations and creates query_performance table

-- Enhanced schema_migrations table
-- Add name column if not exists (check done by SQLite's ADD COLUMN behavior)
ALTER TABLE schema_migrations ADD COLUMN name TEXT;

-- Add checksum column for integrity verification
ALTER TABLE schema_migrations ADD COLUMN checksum TEXT;

-- Add rolled_back_at for rollback tracking
ALTER TABLE schema_migrations ADD COLUMN rolled_back_at TEXT;

-- Create index for faster version lookups
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);

-- Query performance monitoring table
-- Captures slow queries for analysis and optimization
CREATE TABLE IF NOT EXISTS query_performance (
  id TEXT PRIMARY KEY,
  sql TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  timestamp TEXT DEFAULT (datetime('now')),
  params TEXT,
  context TEXT,
  affected_rows INTEGER
);

-- Index for finding slow queries
CREATE INDEX IF NOT EXISTS idx_query_performance_duration ON query_performance(duration_ms DESC);

-- Index for time-based analysis
CREATE INDEX IF NOT EXISTS idx_query_performance_timestamp ON query_performance(timestamp);

-- Index for finding queries by context (e.g., which service called them)
CREATE INDEX IF NOT EXISTS idx_query_performance_context ON query_performance(context);
