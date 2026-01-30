-- Migration 040: Cover Image Support
-- Adds cover_image field to projects table for storing book cover images

-- Add cover_image column to store the base64-encoded image or path
ALTER TABLE projects ADD COLUMN cover_image TEXT;

-- Add cover_image_type column to store mime type (e.g., 'image/jpeg', 'image/png')
ALTER TABLE projects ADD COLUMN cover_image_type TEXT;
