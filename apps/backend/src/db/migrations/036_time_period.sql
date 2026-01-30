-- Migration 019: Time Period Support
-- Add explicit time period columns to projects for structured time setting
-- The time period helps generate era-appropriate content during story generation

-- Add time period type column with preset values
-- Values: 'past', 'present', 'future', 'unknown', 'custom'
ALTER TABLE projects ADD COLUMN time_period_type TEXT DEFAULT 'present';

-- Add specific year column for custom time periods
-- NULL for non-custom types, stores actual year for custom selections
ALTER TABLE projects ADD COLUMN specific_year INTEGER;

-- Create an index for querying projects by time period
CREATE INDEX IF NOT EXISTS idx_projects_time_period ON projects(time_period_type);
