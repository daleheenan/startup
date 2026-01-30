# Sprint 27: Collaboration Features - Technical Design

## Overview

Transform NovelForge from single-user to multi-user collaborative novel writing platform enabling teams and beta readers to work together.

**Story Points**: 40
**Status**: In Progress
**Author**: Dale Heenan (Project Director)
**Created**: 2026-01-29

---

## Requirements Summary

| Feature | Points | Description |
|---------|--------|-------------|
| Multi-user sharing | 8 | Project access control, invite system |
| Role permissions | 5 | Owner/Editor/Viewer with capability checks |
| Comment threads | 8 | Chapter-level threaded comments with @mentions |
| Suggestion mode | 10 | Track changes interface (Google Docs style) |
| Activity log | 5 | Audit trail for all project actions |
| Real-time collaboration | 4 | WebSocket sync for simultaneous editing |

---

## Architecture Design

### 1. Database Schema (Migration 054)

#### Users Table (NEW)
```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);
```

#### Project Collaborators Table
```sql
CREATE TABLE IF NOT EXISTS project_collaborators (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner', 'editor', 'viewer')),
    invited_by TEXT NOT NULL,  -- user_id who sent invite
    invited_at TEXT DEFAULT (datetime('now')),
    accepted_at TEXT,
    status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'revoked')) DEFAULT 'active',
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id),
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_collaborators_project ON project_collaborators(project_id);
CREATE INDEX idx_collaborators_user ON project_collaborators(user_id);
CREATE INDEX idx_collaborators_status ON project_collaborators(status);
```

#### Comments Table
```sql
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

CREATE INDEX idx_comments_project ON comments(project_id);
CREATE INDEX idx_comments_chapter ON comments(chapter_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_resolved ON comments(is_resolved);
```

#### Suggestions Table (Track Changes)
```sql
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

CREATE INDEX idx_suggestions_chapter ON suggestions(chapter_id);
CREATE INDEX idx_suggestions_user ON suggestions(user_id);
CREATE INDEX idx_suggestions_status ON suggestions(status);
```

#### Activity Log Table
```sql
CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL,  -- 'created', 'updated', 'deleted', 'commented', 'suggested', 'invited', 'generated'
    entity_type TEXT NOT NULL,  -- 'project', 'book', 'chapter', 'comment', 'collaborator'
    entity_id TEXT NOT NULL,
    details TEXT,  -- JSON with action-specific details
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_activity_project ON activity_log(project_id);
CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_created ON activity_log(created_at);
CREATE INDEX idx_activity_type ON activity_log(action_type);
```

---

### 2. Role-Based Access Control (RBAC)

#### Permission Matrix

| Action | Owner | Editor | Viewer |
|--------|-------|--------|--------|
| View project | ✅ | ✅ | ✅ |
| Edit metadata | ✅ | ✅ | ❌ |
| Edit content | ✅ | ✅ | ❌ |
| Run generation | ✅ | ✅ | ❌ |
| Add comments | ✅ | ✅ | ✅ |
| Resolve comments | ✅ | ✅ | ❌ |
| Make suggestions | ✅ | ✅ | ✅ |
| Accept/Reject suggestions | ✅ | ✅ | ❌ |
| Invite collaborators | ✅ | ❌ | ❌ |
| Remove collaborators | ✅ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ |
| Delete project | ✅ | ❌ | ❌ |
| Export | ✅ | ✅ | ✅ |

#### Middleware Implementation

```typescript
// backend/src/middleware/rbac.ts
export const requireRole = (allowedRoles: Role[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const projectId = req.params.id;
    const userId = req.user.id;

    const collaborator = await db.get(
      'SELECT role FROM project_collaborators WHERE project_id = ? AND user_id = ? AND status = ?',
      [projectId, userId, 'active']
    );

    if (!collaborator || !allowedRoles.includes(collaborator.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    req.userRole = collaborator.role;
    next();
  };
};
```

---

### 3. Backend Services

#### CollaborationService

```typescript
// backend/src/services/collaboration.service.ts

class CollaborationService {
  // Collaborator management
  async inviteCollaborator(projectId: string, email: string, role: Role, invitedBy: string): Promise<Invite>
  async acceptInvite(inviteId: string, userId: string): Promise<void>
  async revokeCollaborator(projectId: string, userId: string, revokedBy: string): Promise<void>
  async updateRole(projectId: string, userId: string, newRole: Role, updatedBy: string): Promise<void>
  async getCollaborators(projectId: string): Promise<Collaborator[]>

  // Permission checks
  async checkPermission(projectId: string, userId: string, action: Action): Promise<boolean>
  async getUserRole(projectId: string, userId: string): Promise<Role | null>

  // Activity logging
  async logActivity(projectId: string, userId: string, action: ActivityAction): Promise<void>
  async getActivityLog(projectId: string, filters?: ActivityFilters): Promise<Activity[]>
}
```

#### CommentService

```typescript
// backend/src/services/comment.service.ts

class CommentService {
  async createComment(data: CreateCommentData): Promise<Comment>
  async replyToComment(commentId: string, data: ReplyData): Promise<Comment>
  async updateComment(commentId: string, content: string, userId: string): Promise<Comment>
  async deleteComment(commentId: string, userId: string): Promise<void>
  async resolveComment(commentId: string, userId: string): Promise<void>
  async unresolveComment(commentId: string, userId: string): Promise<void>
  async getComments(filters: CommentFilters): Promise<Comment[]>
  async getCommentThread(commentId: string): Promise<Comment[]>

  // @mention handling
  async extractMentions(content: string): Promise<string[]>
  async notifyMentionedUsers(comment: Comment): Promise<void>
}
```

#### SuggestionService

```typescript
// backend/src/services/suggestion.service.ts

class SuggestionService {
  async createSuggestion(data: CreateSuggestionData): Promise<Suggestion>
  async acceptSuggestion(suggestionId: string, userId: string): Promise<void>
  async rejectSuggestion(suggestionId: string, userId: string): Promise<void>
  async getSuggestions(chapterId: string, status?: SuggestionStatus): Promise<Suggestion[]>
  async applySuggestionToChapter(suggestionId: string): Promise<void>

  // Batch operations
  async acceptAllSuggestions(chapterId: string, userId: string): Promise<number>
  async rejectAllSuggestions(chapterId: string, userId: string): Promise<number>
}
```

---

### 4. API Routes

#### Collaboration Routes Module

Following CLAUDE.md pattern (modular structure):

```
backend/src/routes/collaboration/
├── index.ts              # Router composition
├── collaborators.ts      # Invite, manage, list collaborators
├── comments.ts           # CRUD for comments, threading
├── suggestions.ts        # Track changes operations
└── activity.ts           # Activity log retrieval
```

#### Endpoint Specifications

**Collaborators** (`/api/projects/:id/collaborators`)
- `GET /` - List all collaborators
- `POST /invite` - Invite new collaborator
- `PUT /:collaboratorId/role` - Change role
- `DELETE /:collaboratorId` - Remove collaborator
- `POST /:inviteId/accept` - Accept pending invite

**Comments** (`/api/projects/:id/comments`)
- `GET /` - List comments (filtered)
- `POST /` - Create comment
- `GET /:commentId/thread` - Get comment thread
- `PUT /:commentId` - Update comment
- `DELETE /:commentId` - Delete comment
- `POST /:commentId/resolve` - Resolve comment
- `POST /:commentId/unresolve` - Unresolve comment

**Suggestions** (`/api/chapters/:chapterId/suggestions`)
- `GET /` - List suggestions
- `POST /` - Create suggestion
- `PUT /:suggestionId/accept` - Accept suggestion
- `PUT /:suggestionId/reject` - Reject suggestion
- `POST /batch-accept` - Accept all pending
- `POST /batch-reject` - Reject all pending

**Activity** (`/api/projects/:id/activity`)
- `GET /` - Get activity log with filters

---

### 5. WebSocket Real-Time Collaboration

#### Architecture

```typescript
// backend/src/websocket/collaboration-socket.ts

interface CollaborationEvent {
  type: 'cursor' | 'selection' | 'edit' | 'comment' | 'suggestion' | 'presence';
  projectId: string;
  userId: string;
  data: any;
}

class CollaborationWebSocket {
  private io: SocketIO.Server;
  private rooms: Map<string, Set<string>>; // projectId -> Set<userId>

  async handleConnection(socket: Socket): Promise<void>
  async handleJoinProject(socket: Socket, projectId: string): Promise<void>
  async handleLeaveProject(socket: Socket, projectId: string): Promise<void>
  async broadcastToProject(projectId: string, event: CollaborationEvent): Promise<void>
  async handleCursorUpdate(socket: Socket, data: CursorData): Promise<void>
  async handleContentEdit(socket: Socket, data: EditData): Promise<void>
}
```

#### Event Types

1. **Presence Events**: User joined/left, online status
2. **Cursor Events**: Real-time cursor position sharing
3. **Selection Events**: Text selection sharing
4. **Edit Events**: Content change notifications
5. **Comment Events**: New comment, reply, resolve
6. **Suggestion Events**: New suggestion, accept/reject

---

### 6. Frontend Components

#### Collaborators Management

**`app/projects/[id]/collaborators/page.tsx`**
- List all collaborators with avatars and roles
- Invite new collaborators form
- Role management dropdown
- Remove collaborator confirmation

**`app/components/collaboration/InviteCollaboratorDialog.tsx`**
- Email input with validation
- Role selector (owner/editor/viewer)
- Send invite button
- Copy invite link option

#### Comment System

**`app/components/collaboration/CommentThread.tsx`**
- Threaded comment display
- Reply functionality
- @mention autocomplete
- Resolve/unresolve button
- Edit/delete own comments

**`app/components/collaboration/CommentsSidebar.tsx`**
- Filterable comments list
- Filter by: chapter, user, status (open/resolved)
- Jump to commented section
- Unread comment indicators

#### Suggestion Mode

**`app/components/collaboration/SuggestionModeEditor.tsx`**
- Track changes UI overlay on ChapterEditor
- Highlighted insertions (green)
- Highlighted deletions (red strikethrough)
- Highlighted replacements (yellow)
- Accept/Reject buttons inline
- Show suggestion author and timestamp

**`app/components/collaboration/SuggestionsReviewPanel.tsx`**
- List all pending suggestions
- Accept/Reject individually
- Batch accept/reject all
- Filter by suggestion type
- Preview changes

#### Activity Log

**`app/components/collaboration/ActivityLogViewer.tsx`**
- Chronological activity feed
- Filter by: user, action type, date range
- Pagination/infinite scroll
- User avatars and timestamps
- Action-specific icons

#### Real-Time Indicators

**`app/components/collaboration/OnlinePresence.tsx`**
- Show who's currently viewing/editing
- Colour-coded user cursors
- Real-time typing indicators
- "User is editing..." notifications

---

### 7. Security Considerations

#### Authentication & Authorization
1. ✅ JWT validation on all authenticated routes
2. ✅ WebSocket auth via JWT in connection handshake
3. ✅ RBAC checks on every permission-sensitive action
4. ✅ Owner-only restrictions for destructive operations

#### Input Validation
1. ✅ Sanitise all user input (comments, suggestions)
2. ✅ Validate @mentions against actual collaborators
3. ✅ Rate limiting on invite endpoints
4. ✅ Max comment/suggestion length limits

#### Data Protection
1. ✅ Prevent SQL injection (parameterised queries)
2. ✅ XSS prevention (escape user content)
3. ✅ CSRF tokens for state-changing operations
4. ✅ Encrypt invite tokens

#### Privacy
1. ✅ Users only see projects they're invited to
2. ✅ Activity log doesn't expose sensitive data
3. ✅ Email addresses only visible to owners
4. ✅ Revoked collaborators lose all access immediately

---

### 8. Testing Requirements

#### Unit Tests
- CollaborationService methods
- CommentService methods
- SuggestionService methods
- RBAC middleware
- Permission checks

#### Integration Tests
- Invite flow (send → accept → access granted)
- Comment thread creation
- Suggestion accept/reject workflow
- Role change propagation
- Activity log recording

#### E2E Tests (Playwright)
- Multi-user invite and collaboration
- Real-time comment synchronisation
- Suggestion mode workflow
- Permission denial scenarios
- Activity log accuracy

#### Security Tests
- Unauthorised access attempts
- Permission escalation attempts
- SQL injection vectors
- XSS in comments/suggestions
- Rate limit enforcement

---

### 9. Edge Cases & Error Handling

#### Edge Cases
1. User invited twice → Show "already invited" error
2. Last owner tries to leave → Prevent or force transfer
3. User deleted while collaborating → Cascade delete or anonymise
4. Suggestion conflicts with other edits → Mark as stale
5. Comment on deleted chapter → Orphan or cascade delete
6. WebSocket disconnect during edit → Queue edits, retry on reconnect
7. Simultaneous suggestion acceptance → Last-write-wins with conflict detection

#### Error Messages (UK Spelling)
```typescript
const ERRORS = {
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',
  USER_NOT_FOUND: 'User not found',
  ALREADY_COLLABORATOR: 'User is already a collaborator on this project',
  CANNOT_REMOVE_OWNER: 'Cannot remove the project owner',
  INVALID_ROLE: 'Invalid role specified',
  COMMENT_NOT_FOUND: 'Comment not found',
  SUGGESTION_ALREADY_REVIEWED: 'This suggestion has already been reviewed',
  CHAPTER_LOCKED: 'This chapter is currently being edited by another user'
};
```

---

### 10. Migration Strategy

#### Backward Compatibility
1. Existing projects get 'owner' user as default collaborator
2. User table seeded with 'owner' account
3. All existing activity attributed to 'owner'
4. Graceful degradation if WebSocket unavailable

#### Data Migration
```sql
-- Backfill owner as collaborator for all projects
INSERT INTO project_collaborators (id, project_id, user_id, role, invited_by, status)
SELECT
    lower(hex(randomblob(16))),
    id,
    'owner',
    'owner',
    'owner',
    'active'
FROM projects;
```

---

### 11. Performance Optimisations

1. **Database Indexes**: Added on all foreign keys and filter columns
2. **Comment Pagination**: Load 50 comments at a time
3. **Activity Log Pagination**: Load 100 entries at a time
4. **WebSocket Throttling**: Cursor updates max 10/sec
5. **Suggestion Batching**: Bulk operations via transactions
6. **Caching**: Cache user roles for 5 minutes

---

### 12. UK British Spelling Compliance

All text, documentation, and UI must use UK spelling:
- Synchronise (not synchronize)
- Organise (not organize)
- Colour (not color)
- Behaviour (not behavior)
- Realise (not realize)
- Favour (not favor)

---

## Implementation Phases

1. ✅ Technical Design (This document)
2. ⏳ Database Migration (054_collaboration_features.sql)
3. ⏳ Backend Services (collaboration, comment, suggestion)
4. ⏳ API Routes Module (collaboration/)
5. ⏳ RBAC Middleware
6. ⏳ WebSocket Infrastructure
7. ⏳ Frontend UI Components
8. ⏳ Integration & Testing
9. ⏳ Security Review
10. ⏳ Deployment

---

## Success Criteria

- [ ] Users can invite collaborators via email
- [ ] All three roles work correctly (owner/editor/viewer)
- [ ] Comments are threaded and support @mentions
- [ ] Suggestions show inline with accept/reject
- [ ] Activity log captures all actions
- [ ] Real-time cursor/edit sync works
- [ ] All tests pass (unit, integration, E2E)
- [ ] Security review completes with no critical issues
- [ ] Performance benchmarks met (10+ users per project)

---

**Status**: Ready for implementation
**Next**: Create database migration
