# Sprint 16: Interactive Editing Workspace - Technical Design

**Sprint:** 16
**Points:** 45
**Priority:** HIGH
**Status:** In Progress
**Date:** 2026-01-24

---

## Overview

Enable users to edit generated chapter content in-browser with rich text editing capabilities, version tracking, and smart export integration.

---

## Goals

1. Allow in-browser editing of chapter content
2. Track edited vs generated content separately
3. Prevent regeneration of edited chapters (lock mechanism)
4. Export user edits in DOCX/PDF
5. Support version comparison

---

## Database Schema Changes

### New Tables

#### `chapter_edits`
Stores user edits separately from generated content, allowing version comparison.

```sql
CREATE TABLE IF NOT EXISTS chapter_edits (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    user_id TEXT,  -- Future: multi-user support
    edited_content TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT 1,  -- Locked chapters skip regeneration
    edit_notes TEXT,  -- Optional user notes
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chapter_edits_chapter ON chapter_edits(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_edits_locked ON chapter_edits(is_locked);
```

### Schema Updates

Add migration file: `backend/src/db/migrations/006_chapter_edits.sql`

---

## API Endpoints

### GET `/api/chapters/:chapterId/edit`
Get edit data for a chapter.

**Response:**
```json
{
  "chapterId": "ch_123",
  "hasEdit": true,
  "edit": {
    "id": "edit_456",
    "editedContent": "Chapter content with user edits...",
    "isLocked": true,
    "wordCount": 3500,
    "editNotes": "Changed ending, added dialogue",
    "createdAt": "2026-01-24T10:00:00Z",
    "updatedAt": "2026-01-24T11:30:00Z"
  },
  "original": {
    "content": "Original generated content...",
    "wordCount": 3200
  }
}
```

---

### POST `/api/chapters/:chapterId/edit`
Save or update chapter edit.

**Request:**
```json
{
  "editedContent": "Updated chapter content...",
  "isLocked": true,
  "editNotes": "Optional notes"
}
```

**Response:**
```json
{
  "success": true,
  "edit": {
    "id": "edit_456",
    "chapterId": "ch_123",
    "wordCount": 3600,
    "updatedAt": "2026-01-24T12:00:00Z"
  }
}
```

---

### DELETE `/api/chapters/:chapterId/edit`
Delete edit and unlock chapter (revert to generated content).

**Response:**
```json
{
  "success": true,
  "message": "Edit deleted, chapter unlocked"
}
```

---

### POST `/api/chapters/:chapterId/lock`
Lock chapter to prevent regeneration.

**Request:**
```json
{
  "locked": true
}
```

---

### GET `/api/chapters/:chapterId/versions`
Get version comparison data.

**Response:**
```json
{
  "original": {
    "content": "Generated content...",
    "wordCount": 3200,
    "generatedAt": "2026-01-24T09:00:00Z"
  },
  "edited": {
    "content": "Edited content...",
    "wordCount": 3600,
    "lastEditedAt": "2026-01-24T12:00:00Z"
  },
  "diff": {
    "addedWords": 420,
    "removedWords": 20,
    "percentChanged": 13.5
  }
}
```

---

## Backend Services

### New Service: `editing-workspace.service.ts`

```typescript
export class EditingWorkspaceService {
  /**
   * Get chapter edit data or create new edit record
   */
  async getChapterEdit(chapterId: string): Promise<ChapterEditResponse>;

  /**
   * Save or update chapter edit
   */
  async saveChapterEdit(
    chapterId: string,
    editedContent: string,
    isLocked: boolean,
    editNotes?: string
  ): Promise<ChapterEdit>;

  /**
   * Delete edit and unlock chapter
   */
  async deleteChapterEdit(chapterId: string): Promise<void>;

  /**
   * Toggle chapter lock status
   */
  async toggleChapterLock(chapterId: string, locked: boolean): Promise<void>;

  /**
   * Get version comparison data
   */
  async getVersionComparison(chapterId: string): Promise<VersionComparison>;

  /**
   * Calculate word count difference
   */
  private calculateDiff(original: string, edited: string): DiffStats;
}
```

---

## Export Service Integration

Update `backend/src/services/export.service.ts` to check for edits.

### Changes to `exportDocx()` and `exportPDF()`

```typescript
// For each chapter, check if edit exists
const editStmt = db.prepare<[string], { edited_content: string | null }>(`
  SELECT edited_content FROM chapter_edits WHERE chapter_id = ?
`);

const editRow = editStmt.get(chapterId);
const contentToExport = editRow?.edited_content || chapter.content;
```

This ensures exports always include user edits when available.

---

## Queue Worker Integration

Update `backend/src/queue/worker.ts` to respect chapter locks.

### Skip Locked Chapters

```typescript
// In generate_chapter job
const lockStmt = db.prepare<[string], { is_locked: boolean | null }>(`
  SELECT is_locked FROM chapter_edits WHERE chapter_id = ?
`);

const lockRow = lockStmt.get(targetId);
if (lockRow?.is_locked) {
  console.log(`[Worker] Skipping locked chapter ${targetId}`);
  this.markJobCompleted(jobId);
  return;
}
```

---

## Frontend Components

### New Page: `/app/projects/[id]/chapters/[chapterId]/edit`

Rich text editor for chapter editing.

**Features:**
- TipTap rich text editor
- Auto-save draft every 30 seconds
- Word count display
- Lock/unlock toggle
- Save and return button
- Discard edits button

---

### New Component: `ChapterEditor.tsx`

```typescript
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useState, useEffect } from 'react';

interface ChapterEditorProps {
  chapterId: string;
  initialContent: string;
  onSave: (content: string) => void;
}

export default function ChapterEditor({
  chapterId,
  initialContent,
  onSave
}: ChapterEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    onUpdate: ({ editor }) => {
      // Auto-save logic
    }
  });

  // Component implementation
}
```

---

### Updated Component: `ChaptersList.tsx`

Add "Edit" button next to "Regenerate" button.

```typescript
<button
  onClick={() => router.push(`/projects/${projectId}/chapters/${chapter.id}/edit`)}
  style={{
    padding: '0.5rem 1rem',
    background: 'rgba(16, 185, 129, 0.2)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '6px',
    color: '#10b981',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  }}
>
  Edit
</button>

{/* Lock indicator */}
{chapter.hasEdit && chapter.isLocked && (
  <span style={{ color: '#10b981', fontSize: '0.75rem' }}>
    🔒 Locked
  </span>
)}
```

---

### New Component: `VersionCompareView.tsx`

Side-by-side diff view for comparing original and edited content.

```typescript
interface VersionCompareViewProps {
  chapterId: string;
}

export default function VersionCompareView({ chapterId }: VersionCompareViewProps) {
  // Fetch original and edited versions
  // Display side-by-side with highlighting
}
```

---

## TypeScript Types

Update `backend/src/shared/types/index.ts`:

```typescript
export interface ChapterEdit {
  id: string;
  chapter_id: string;
  user_id: string | null;
  edited_content: string;
  word_count: number;
  is_locked: boolean;
  edit_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChapterEditResponse {
  chapterId: string;
  hasEdit: boolean;
  edit: ChapterEdit | null;
  original: {
    content: string;
    wordCount: number;
  };
}

export interface VersionComparison {
  original: {
    content: string;
    wordCount: number;
    generatedAt: string;
  };
  edited: {
    content: string;
    wordCount: number;
    lastEditedAt: string;
  } | null;
  diff: {
    addedWords: number;
    removedWords: number;
    percentChanged: number;
  } | null;
}

export interface DiffStats {
  addedWords: number;
  removedWords: number;
  percentChanged: number;
}
```

Update `Chapter` type:
```typescript
export interface Chapter {
  // ... existing fields
  hasEdit?: boolean;  // Frontend convenience field
  isLocked?: boolean; // Frontend convenience field
}
```

---

## Dependencies

### Frontend
- `@tiptap/react`: ^2.1.0
- `@tiptap/starter-kit`: ^2.1.0
- `@tiptap/extension-placeholder`: ^2.1.0

### Backend
- No new dependencies required

---

## Implementation Tasks

### Task 16.1: Database Migration (3 points)
- Create migration file `006_chapter_edits.sql`
- Add chapter_edits table
- Test migration rollback

**Assigned to:** developer

---

### Task 16.2: Backend Service (8 points)
- Create `editing-workspace.service.ts`
- Implement all CRUD operations for edits
- Add version comparison logic
- Write unit tests

**Assigned to:** developer

---

### Task 16.3: API Routes (5 points)
- Create `/api/chapters/:id/edit` endpoints
- Add lock/unlock endpoints
- Add version comparison endpoint
- Error handling and validation

**Assigned to:** developer

---

### Task 16.4: Export Integration (3 points)
- Update `export.service.ts` to use edits
- Ensure DOCX export includes edits
- Ensure PDF export includes edits
- Test with locked and unlocked chapters

**Assigned to:** developer

---

### Task 16.5: Queue Worker Integration (3 points)
- Update worker to check lock status
- Skip locked chapters in generation
- Add logging for skipped chapters

**Assigned to:** developer

---

### Task 16.6: TipTap Integration (8 points)
- Install TipTap dependencies
- Create `ChapterEditor.tsx` component
- Implement auto-save functionality
- Add word count display
- Add toolbar with formatting options

**Assigned to:** developer

---

### Task 16.7: Edit Page (5 points)
- Create `/app/projects/[id]/chapters/[chapterId]/edit/page.tsx`
- Implement editor page layout
- Add save/discard buttons
- Add lock toggle
- Add navigation back to chapter list

**Assigned to:** developer

---

### Task 16.8: ChaptersList Updates (3 points)
- Add "Edit" button to chapter items
- Add lock indicator
- Add edit status badge
- Update styling

**Assigned to:** developer

---

### Task 16.9: Version Compare View (5 points)
- Create `VersionCompareView.tsx` component
- Implement side-by-side layout
- Add diff highlighting
- Add stats display (word count changes)

**Assigned to:** developer

---

### Task 16.10: Testing & QA (2 points)
- Test full edit workflow
- Test export with edits
- Test regeneration blocking
- Test version comparison
- Fix any bugs found

**Assigned to:** qa-tester

---

## Success Criteria

- [ ] Can edit any chapter in rich text editor
- [ ] Edits persist across browser sessions
- [ ] Locked chapters skip regeneration workflow
- [ ] DOCX export includes user edits
- [ ] PDF export includes user edits
- [ ] Version comparison shows differences
- [ ] Auto-save works reliably
- [ ] Word count updates in real-time
- [ ] No data loss on browser refresh
- [ ] Can revert to original by deleting edit

---

## Testing Checklist

### Backend
- [ ] Create edit for chapter
- [ ] Update existing edit
- [ ] Delete edit
- [ ] Lock/unlock chapter
- [ ] Get version comparison
- [ ] Export with edits
- [ ] Regeneration skips locked chapter

### Frontend
- [ ] Editor loads with chapter content
- [ ] Can format text (bold, italic, headings)
- [ ] Auto-save triggers every 30 seconds
- [ ] Manual save works
- [ ] Word count updates
- [ ] Lock toggle works
- [ ] Version compare shows differences
- [ ] Navigation works correctly

---

## Implementation Order

1. **Phase 1: Database & Backend (Day 1-2)**
   - Migration
   - Service layer
   - API routes
   - Export integration
   - Queue integration

2. **Phase 2: Frontend Components (Day 3-4)**
   - TipTap setup
   - ChapterEditor component
   - Edit page
   - ChaptersList updates

3. **Phase 3: Advanced Features (Day 5)**
   - Version comparison
   - Auto-save refinement
   - Testing and bug fixes

4. **Phase 4: QA & Polish (Day 6)**
   - Full workflow testing
   - UI polish
   - Documentation

---

## Risk Mitigation

**Risk:** TipTap editor performance with long chapters (10k+ words)
**Mitigation:** Test with large content, consider lazy loading or pagination

**Risk:** Data loss from browser crashes
**Mitigation:** Auto-save every 30 seconds, localStorage backup

**Risk:** Conflicts between edited and regenerated content
**Mitigation:** Lock mechanism prevents regeneration, clear UI indicators

**Risk:** Export formatting issues
**Mitigation:** Test export with various edit scenarios, validate output

---

## Future Enhancements (Post-Sprint 16)

- Collaborative editing (multi-user)
- Inline comments and annotations
- Track changes mode
- Revision history with timestamps
- Undo/redo beyond browser cache
- Custom formatting styles
- Spell check integration
- Grammar check integration

---

**Status:** ✅ Design Complete - Ready for Implementation
**Next Step:** Begin Task 16.1 (Database Migration)
**Estimated Completion:** 6 days with single developer + Claude Code assistance
