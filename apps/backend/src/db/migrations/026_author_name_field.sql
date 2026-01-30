-- Add author_name field to projects table
-- This stores the pen name/author name for the book export

ALTER TABLE projects ADD COLUMN author_name TEXT;
