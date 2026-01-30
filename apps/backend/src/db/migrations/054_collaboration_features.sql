-- Migration 054: Collaboration Features (Sprint 27)
-- Adds multi-user collaboration support with roles, comments, suggestions, and activity logging

-- Users table (authentication and user profiles)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert default 'owner' user for backward compatibility
INSERT OR IGNORE INTO users (id, email, password_hash, name)
VALUES ('owner', 'owner@novelforge.local', '$2b$10$placeholder', 'Project Owner');

-- Project Collaborators table (project access control and roles)
CREATE TABLE IF NOT EXISTS project_collaborators (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner', 'editor', 'viewer')),
    invited_by TEXT NOT NULL,
    invited_at TEXT DEFAULT (datetime('now')),
    accepted_at TEXT,
    status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'revoked')) DEFAULT 'active',
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id),
    UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collaborators_project ON project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user ON project_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_status ON project_collaborators(status);
CREATE INDEX IF NOT EXISTS idx_collaborators_role ON project_collaborators(role);

-- Backfill owner as collaborator for all existing projects
INSERT INTO project_collaborators (id, project_id, user_id, role, invited_by, status, invited_at, accepted_at)
SELECT
    lower(hex(randomblob(16))),
    id,
    'owner',
    'owner',
    'owner',
    'active',
    datetime('now'),
    datetime('now')
FROM projects;

-- Comments table (threaded comments on chapters)
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    chapter_id TEXT,  -- NULL for project-level comments
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    parent_id TEXT,  -- For threaded replies
    mentions TEXT,  -- JSON array of mentioned user_ids
    is_resolved INTEGER DEFAULT 0,
    resolved_by TEXT,
    resolved_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_comments_project ON comments(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_chapter ON comments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_resolved ON comments(is_resolved);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at);

-- Suggestions table (track changes / suggestion mode)
CREATE TABLE IF NOT EXISTS suggestions (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    suggestion_type TEXT NOT NULL CHECK(suggestion_type IN ('insertion', 'deletion', 'replacement')),
    original_text TEXT,  -- For deletion/replacement
    suggested_text TEXT,  -- For insertion/replacement
    position_start INTEGER NOT NULL,  -- Character offset
    position_end INTEGER NOT NULL,
    comment TEXT,  -- Optional explanation
    status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    reviewed_by TEXT,
    reviewed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_suggestions_chapter ON suggestions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_user ON suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_created ON suggestions(created_at);

-- Activity Log table (audit trail for all project actions)
CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL,  -- 'created', 'updated', 'deleted', 'commented', 'suggested', 'invited', 'generated', 'shared'
    entity_type TEXT NOT NULL,  -- 'project', 'book', 'chapter', 'comment', 'suggestion', 'collaborator'
    entity_id TEXT NOT NULL,
    details TEXT,  -- JSON with action-specific details
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);

-- Invite Tokens table (secure invite links)
CREATE TABLE IF NOT EXISTS invite_tokens (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('editor', 'viewer')),
    token TEXT NOT NULL UNIQUE,
    invited_by TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    used_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id),
    FOREIGN KEY (used_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_project ON invite_tokens(project_id);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires ON invite_tokens(expires_at);

-- User Sessions table (real-time presence tracking)
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT,  -- NULL if not in a project
    chapter_id TEXT,  -- NULL if not viewing a chapter
    socket_id TEXT UNIQUE,
    last_active_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON user_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_chapter ON user_sessions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON user_sessions(last_active_at);
CREATE INDEX IF NOT EXISTS idx_sessions_socket ON user_sessions(socket_id);
