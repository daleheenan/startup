-- Add show_ai_costs_menu column to user_preferences table
-- Migration 053

-- Add the column if it doesn't already exist
-- SQLite doesn't support ALTER TABLE IF NOT EXISTS, so we use a safe approach
ALTER TABLE user_preferences ADD COLUMN show_ai_costs_menu INTEGER DEFAULT 0;
