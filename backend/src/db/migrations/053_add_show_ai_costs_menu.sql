-- Add show_ai_costs_menu column to user_preferences table
-- Migration 053

-- Add the column if it doesn't already exist
-- SQLite doesn't support ALTER TABLE IF NOT EXISTS, so we use a safe approach
ALTER TABLE user_preferences ADD COLUMN show_ai_costs_menu INTEGER DEFAULT 0;

-- Update the default owner record to ensure it has a value
UPDATE user_preferences SET show_ai_costs_menu = 0 WHERE user_id = 'owner' AND show_ai_costs_menu IS NULL;
