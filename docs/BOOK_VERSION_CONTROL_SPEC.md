# Book Version Control - Technical Specification

## Overview

This document outlines the implementation plan for book version control in NovelForge. The feature enables users to:

1. **Clone a book** within a project - copying only the foundational elements (idea, concept, characters, world) while leaving plot, outline, and chapters blank for regeneration
2. **Version chapters as a unit** - when a user modifies the plot and regenerates, the new chapters become a new version

Additionally, the Overview page will display Read, Export PDF, and Export DOCX buttons when a book has been generated.

---

## Feature 1: Overview Page Export Buttons

### Current State
- `ExportButtons` component exists at `app/components/ExportButtons.tsx`
- Shows on Overview page only when `project.status !== 'setup'`
- Provides: DOCX export, PDF export, Story Bible export

### Required Changes

#### 1.1 Add "Read Book" Button
Add a button to navigate to chapter reading view when chapters exist.

**File:** `app/components/ExportButtons.tsx`

```typescript
// Add new button before export buttons
<Link
  href={`/projects/${projectId}/read`}
  style={{
    padding: '1rem',
    minHeight: '44px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontSize: '1rem',
    fontWeight: 600,
    textAlign: 'center',
    textDecoration: 'none',
    display: 'block',
  }}
>
  Read Your Book
</Link>
```

#### 1.2 Update Conditional Display
Currently shows when status is not 'setup'. Should show when book has completed chapters.

**File:** `app/projects/[id]/page.tsx`

Change from:
```typescript
{project.status !== 'setup' && (
  <ExportButtons projectId={project.id} />
)}
```

To:
```typescript
{chapters.length > 0 && chapters.some(ch => ch.content) && (
  <ExportButtons projectId={project.id} hasContent={true} />
)}
```

#### 1.3 Create Read Page (if not exists)
Need a `/projects/[id]/read` page for reading the generated book.

---

## Feature 2: Book Cloning

### Concept

Users can clone a book within the same project. A clone copies:
- **Story concept** (logline, synopsis, hook, protagonist hint, conflict type)
- **Characters** (full character data from story_bible)
- **World elements** (locations, factions, systems from story_bible)
- **Story DNA** (genre, subgenre, tone, themes, prose style, timeframe)

A clone does NOT copy:
- **Plot structure** (plot layers, act structure)
- **Outline** (chapter outline, scene cards)
- **Chapters** (all generated content)
- **Chapter edits** (edited versions)
- **Metrics** (token usage, costs)

### Why This Approach?
- The foundational creative decisions (who are the characters, what world they live in, what's the core concept) are preserved
- The execution (how the story unfolds) can be completely reimagined
- Users can explore "what if I took the story in a different direction?" without losing their original

### Database Schema Changes

#### 2.1 New Table: `book_clones`

```sql
-- Track clone relationships between books
CREATE TABLE IF NOT EXISTS book_clones (
    id TEXT PRIMARY KEY,
    source_book_id TEXT NOT NULL,      -- Original book that was cloned
    cloned_book_id TEXT NOT NULL,      -- New book created from clone
    clone_number INTEGER NOT NULL,      -- Sequential clone number (1, 2, 3...)
    clone_reason TEXT,                  -- User's reason for cloning (optional)
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (source_book_id) REFERENCES books(id) ON DELETE SET NULL,
    FOREIGN KEY (cloned_book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_book_clones_source ON book_clones(source_book_id);
CREATE INDEX IF NOT EXISTS idx_book_clones_cloned ON book_clones(cloned_book_id);
```

#### 2.2 Add Columns to `books` Table

```sql
-- Add to books table
ALTER TABLE books ADD COLUMN is_clone INTEGER DEFAULT 0;
ALTER TABLE books ADD COLUMN clone_source_id TEXT;  -- Source book if this is a clone
```

### API Endpoints

#### 2.3 Clone Book Endpoint

**POST** `/api/books/:bookId/clone`

**Request Body:**
```json
{
  "title": "My Story - Alternative Version",  // Optional, defaults to "Original Title (Clone)"
  "reason": "Exploring darker ending"          // Optional
}
```

**Response:**
```json
{
  "success": true,
  "clonedBook": {
    "id": "uuid",
    "title": "My Story - Alternative Version",
    "book_number": 2,
    "status": "setup",
    "is_clone": true,
    "clone_source_id": "original-book-id"
  }
}
```

**Process:**
1. Validate source book exists
2. Create new book record with incremented `book_number`
3. Copy story_concept, story_dna, story_bible from project to new book's context
4. Create book_clones record linking source and clone
5. Set new book status to 'setup' (no plot/outline/chapters)
6. Return new book details

### Service Implementation

#### 2.4 BookCloningService

**File:** `backend/src/services/book-cloning.service.ts`

```typescript
export class BookCloningService {
  /**
   * Clone a book within its project
   * Copies: concept, characters, world, story DNA
   * Does NOT copy: plot, outline, chapters
   */
  async cloneBook(
    bookId: string,
    options: {
      title?: string;
      reason?: string;
    }
  ): Promise<ClonedBookResult> {
    // Implementation
  }
}
```

### Frontend Implementation

#### 2.5 Clone Button on Book Card/Overview

Add "Clone Book" button to the book management UI:
- On Overview page for single-book projects
- On Series Management page for trilogy/series projects
- In book selector dropdown

**Location:** `app/projects/[id]/page.tsx` and `app/projects/[id]/series/page.tsx`

```typescript
<button onClick={() => handleCloneBook(bookId)}>
  Clone Book (Fresh Start)
</button>
```

#### 2.6 Clone Dialog Component

**File:** `app/components/CloneBookDialog.tsx`

- Input for new title (optional, with default)
- Input for clone reason (optional)
- Explanation of what gets copied vs. what starts fresh
- Confirm/Cancel buttons

---

## Feature 3: Chapter Versioning

### Concept

When a user:
1. Has a completed book (chapters exist)
2. Modifies the plot structure
3. Regenerates the book

The system creates a new "version" of the chapters rather than overwriting. Users can:
- View different versions of their book
- Compare versions
- Restore a previous version

### Why This Approach?
- Protects user investment in generated content
- Enables experimentation without fear of losing work
- Provides audit trail of creative decisions

### Database Schema Changes

#### 3.1 New Table: `book_versions`

```sql
-- Track versions of a book's chapters
CREATE TABLE IF NOT EXISTS book_versions (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    version_number INTEGER NOT NULL,    -- Sequential version (1, 2, 3...)
    version_name TEXT,                   -- User-friendly name ("Original", "Darker Ending", etc.)
    plot_snapshot TEXT,                  -- JSON: Copy of plot_structure at time of generation
    outline_snapshot TEXT,               -- JSON: Copy of outline at time of generation
    is_active INTEGER DEFAULT 0,         -- Is this the currently active version?
    word_count INTEGER DEFAULT 0,
    chapter_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,                   -- When generation finished
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_book_versions_book ON book_versions(book_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_book_versions_active ON book_versions(book_id, is_active) WHERE is_active = 1;
```

#### 3.2 Add Column to `chapters` Table

```sql
-- Add version reference to chapters
ALTER TABLE chapters ADD COLUMN version_id TEXT REFERENCES book_versions(id);
```

#### 3.3 Add Column to `chapter_edits` Table

```sql
-- Ensure edits are tied to specific chapter versions
ALTER TABLE chapter_edits ADD COLUMN version_id TEXT REFERENCES book_versions(id);
```

### Versioning Flow

#### 3.4 When User Starts Fresh Generation

1. **Check for existing chapters:**
   - If no chapters exist, create version 1 and proceed normally
   - If chapters exist, prompt user about versioning

2. **Create new version:**
   - Create `book_versions` record with incremented version_number
   - Snapshot current plot_structure and outline
   - Mark new version as active, deactivate previous

3. **Generate chapters:**
   - All new chapters reference the new version_id
   - Previous version's chapters remain intact

#### 3.5 Automatic Versioning Trigger

**When to create a new version automatically:**
- Plot structure is modified (any plot layer added/removed/modified)
- Outline is regenerated
- User explicitly requests "Start New Version"

**When NOT to version:**
- Individual chapter regeneration
- Editing existing content
- Adding new chapters to existing structure

### API Endpoints

#### 3.6 Version Management Endpoints

**GET** `/api/books/:bookId/versions`
- List all versions for a book

**POST** `/api/books/:bookId/versions`
- Create a new version (snapshot current state)

**PUT** `/api/books/:bookId/versions/:versionId/activate`
- Switch active version

**GET** `/api/books/:bookId/versions/:versionId/chapters`
- Get chapters for a specific version

**DELETE** `/api/books/:bookId/versions/:versionId`
- Delete a version and its chapters (requires confirmation)

### Service Implementation

#### 3.7 BookVersioningService

**File:** `backend/src/services/book-versioning.service.ts`

```typescript
export class BookVersioningService {
  /**
   * Create a new version before regeneration
   */
  async createVersion(
    bookId: string,
    options: {
      name?: string;
      autoCreated?: boolean;
    }
  ): Promise<BookVersion> {
    // Implementation
  }

  /**
   * Get all versions for a book
   */
  async getVersions(bookId: string): Promise<BookVersion[]> {
    // Implementation
  }

  /**
   * Switch active version
   */
  async activateVersion(bookId: string, versionId: string): Promise<void> {
    // Implementation
  }

  /**
   * Check if versioning is needed before generation
   */
  async requiresVersioning(bookId: string): Promise<boolean> {
    // Implementation
  }
}
```

### Frontend Implementation

#### 3.8 Version Selector Component

**File:** `app/components/BookVersionSelector.tsx`

```typescript
// Dropdown/tabs showing available versions
// Visual indicator for active version
// Option to create new version
// Option to compare versions (future enhancement)
```

#### 3.9 Version Confirmation Dialog

When user tries to regenerate chapters on a book with existing content:

```typescript
<Dialog>
  <h3>Existing Content Detected</h3>
  <p>This book has {chapterCount} chapters with {wordCount} words.</p>
  <p>How would you like to proceed?</p>

  <Button onClick={createNewVersion}>
    Create New Version (Keep existing)
  </Button>

  <Button onClick={overwrite} variant="danger">
    Overwrite Existing Content
  </Button>

  <Button onClick={cancel}>
    Cancel
  </Button>
</Dialog>
```

#### 3.10 Version History View

**Page:** `app/projects/[id]/versions/page.tsx`

- Timeline view of all versions
- For each version: name, date, chapter count, word count
- Actions: View, Activate, Delete, Compare
- Visual indicator for active version

---

## Types Updates

### 4.1 Shared Types

**File:** `shared/types/index.ts`

```typescript
// Book Cloning Types
export interface BookClone {
  id: string;
  source_book_id: string;
  cloned_book_id: string;
  clone_number: number;
  clone_reason: string | null;
  created_at: string;
}

export interface ClonedBookResult {
  success: boolean;
  clonedBook: Book;
  cloneRecord: BookClone;
}

// Book Versioning Types
export interface BookVersion {
  id: string;
  book_id: string;
  version_number: number;
  version_name: string | null;
  plot_snapshot: PlotStructure | null;
  outline_snapshot: Outline | null;
  is_active: boolean;
  word_count: number;
  chapter_count: number;
  created_at: string;
  completed_at: string | null;
}

export interface VersionCompareResult {
  version1: BookVersion;
  version2: BookVersion;
  differences: {
    plotChanges: string[];
    outlineChanges: string[];
    chapterCountDiff: number;
    wordCountDiff: number;
  };
}

// Extended Book type with clone/version info
export interface BookWithMetadata extends Book {
  is_clone: boolean;
  clone_source_id: string | null;
  versions: BookVersion[];
  active_version: BookVersion | null;
  clone_history?: BookClone[];
}
```

---

## Migration Plan

### Phase 1: Database Migrations

**Migration 032:** `032_book_cloning.sql`
```sql
-- Book cloning support
CREATE TABLE IF NOT EXISTS book_clones (...);
ALTER TABLE books ADD COLUMN is_clone INTEGER DEFAULT 0;
ALTER TABLE books ADD COLUMN clone_source_id TEXT;
```

**Migration 033:** `033_book_versions.sql`
```sql
-- Book versioning support
CREATE TABLE IF NOT EXISTS book_versions (...);
ALTER TABLE chapters ADD COLUMN version_id TEXT;
ALTER TABLE chapter_edits ADD COLUMN version_id TEXT;
```

### Phase 2: Backend Services

1. Create `BookCloningService`
2. Create `BookVersioningService`
3. Create repositories for new tables
4. Add routes to `books.ts` or create dedicated route files

### Phase 3: Frontend Components

1. Update `ExportButtons` with Read button
2. Create `CloneBookDialog`
3. Create `BookVersionSelector`
4. Create `VersionHistoryPage`
5. Update Overview page with conditional rendering
6. Update generation flow with version prompts

### Phase 4: Integration

1. Hook versioning into chapter generation flow
2. Hook cloning into book management
3. Update export to respect versions
4. Update reading view to show active version

---

## Implementation Order

### Sprint A: Overview Page Buttons (Quick Win)
- [ ] Add "Read Book" button to ExportButtons
- [ ] Update conditional display logic
- [ ] Create/verify `/projects/[id]/read` page exists

### Sprint B: Book Cloning Foundation
- [ ] Migration 032
- [ ] BookCloningService
- [ ] Clone API endpoint
- [ ] CloneBookDialog component
- [ ] Integration with Overview/Series pages

### Sprint C: Chapter Versioning Foundation
- [ ] Migration 033
- [ ] BookVersioningService
- [ ] Version API endpoints
- [ ] BookVersionSelector component
- [ ] VersionHistoryPage

### Sprint D: Integration & Polish
- [ ] Version prompts in generation flow
- [ ] Export respects versions
- [ ] Reading view respects versions
- [ ] Testing and edge cases

---

## Edge Cases & Considerations

### Cloning
- What if source book is deleted? (Clone remains, source reference nullified)
- Maximum clones per project? (No limit, but UI should handle gracefully)
- Cloning a clone? (Allowed, creates chain)

### Versioning
- Maximum versions per book? (Recommend soft limit of 10 with warning)
- Storage implications of many versions? (Consider purge option for old versions)
- Version during active generation? (Prevent version changes while generation in progress)
- Export which version? (Always export active version, with option to choose)

### UI/UX
- Clear indication of clone vs. original
- Clear indication of active version
- Warning when deleting versions with content
- Explanation of what cloning preserves vs. clears

---

## Success Criteria

1. **Clone Book:**
   - User can clone a book with one click
   - Clone preserves characters, world, concept
   - Clone starts fresh with no plot/outline/chapters
   - Clone relationship is tracked and visible

2. **Chapter Versioning:**
   - System prompts for versioning when regenerating with existing content
   - Previous versions preserved and accessible
   - User can switch between versions
   - Export uses active version by default

3. **Overview Buttons:**
   - Read, PDF, DOCX buttons visible when content exists
   - Read button navigates to reading view
   - Buttons hidden when no generated content

---

## Appendix: File Reference

| Purpose | File Path |
|---------|-----------|
| Export buttons | `app/components/ExportButtons.tsx` |
| Overview page | `app/projects/[id]/page.tsx` |
| Series page | `app/projects/[id]/series/page.tsx` |
| Export service | `backend/src/services/export.service.ts` |
| Books routes | `backend/src/routes/books.ts` |
| Projects routes | `backend/src/routes/projects.ts` |
| Shared types | `shared/types/index.ts` |
| Schema | `backend/src/db/schema.sql` |
| Migrations | `backend/src/db/migrations/` |
