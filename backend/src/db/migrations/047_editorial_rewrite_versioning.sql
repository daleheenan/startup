-- Migration 047: Editorial Rewrite Versioning
-- When editorial board actions trigger chapter rewrites, a new book version is created
-- to preserve the original content whilst tracking the revised version.

-- Add version_id to word_count_revisions to track which version was created for this revision
ALTER TABLE word_count_revisions ADD COLUMN target_version_id TEXT REFERENCES book_versions(id);

-- Add source_version_id to track which version the revision was created from
ALTER TABLE word_count_revisions ADD COLUMN source_version_id TEXT REFERENCES book_versions(id);

-- Create index for efficient version lookups
CREATE INDEX IF NOT EXISTS idx_word_count_revisions_target_version ON word_count_revisions(target_version_id);
CREATE INDEX IF NOT EXISTS idx_word_count_revisions_source_version ON word_count_revisions(source_version_id);
