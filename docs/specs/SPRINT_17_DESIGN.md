# Sprint 17: Regeneration & Variation Tools - Technical Design

**Sprint Points**: 38
**Status**: In Progress
**Created**: 2026-01-24

## Overview

Enable users to regenerate specific text selections without regenerating entire chapters. Support multiple variation generation, targeted modes (dialogue/description), and regeneration history tracking.

## Architecture

### Database Schema

**New Table: `regeneration_variations`**
```sql
CREATE TABLE IF NOT EXISTS regeneration_variations (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    selection_start INTEGER NOT NULL,  -- Character offset in content
    selection_end INTEGER NOT NULL,    -- Character offset in content
    original_text TEXT NOT NULL,
    variation_1 TEXT NOT NULL,
    variation_2 TEXT NOT NULL,
    variation_3 TEXT NOT NULL,
    selected_variation INTEGER,        -- 0=original, 1-3=variation
    regeneration_mode TEXT NOT NULL CHECK(regeneration_mode IN ('general', 'dialogue', 'description', 'scene')),
    context_before TEXT,                -- Context for regeneration
    context_after TEXT,                 -- Context for regeneration
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_regeneration_variations_chapter ON regeneration_variations(chapter_id);
CREATE INDEX IF NOT EXISTS idx_regeneration_variations_created ON regeneration_variations(created_at);
```

**New Table: `regeneration_history`**
```sql
CREATE TABLE IF NOT EXISTS regeneration_history (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    variation_id TEXT,  -- NULL for simple regenerations, FK to regeneration_variations
    action_type TEXT NOT NULL CHECK(action_type IN ('generate_variations', 'apply_variation', 'scene_regen')),
    selection_start INTEGER,
    selection_end INTEGER,
    original_text TEXT,
    final_text TEXT,
    regeneration_mode TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
    FOREIGN KEY (variation_id) REFERENCES regeneration_variations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_regeneration_history_chapter ON regeneration_history(chapter_id);
CREATE INDEX IF NOT EXISTS idx_regeneration_history_created ON regeneration_history(created_at);
```

### Backend API Endpoints

#### 1. POST `/api/editing/chapters/:chapterId/regenerate-selection`
Generate 3 variations for a selected text range.

**Request Body**:
```typescript
{
  selectionStart: number;  // Character offset
  selectionEnd: number;    // Character offset
  mode: 'general' | 'dialogue' | 'description' | 'scene';
  contextTokens?: number;  // Default: 500
}
```

**Response**:
```typescript
{
  variationId: string;
  originalText: string;
  variations: [string, string, string];
  contextBefore: string;
  contextAfter: string;
}
```

#### 2. POST `/api/editing/chapters/:chapterId/apply-variation`
Apply a selected variation to the chapter edit.

**Request Body**:
```typescript
{
  variationId: string;
  selectedVariation: number;  // 0=original, 1-3
}
```

**Response**:
```typescript
{
  success: boolean;
  updatedContent: string;
  wordCount: number;
}
```

#### 3. POST `/api/editing/chapters/:chapterId/regenerate-scene`
Regenerate an entire scene within a chapter.

**Request Body**:
```typescript
{
  sceneIndex: number;  // Which scene card to regenerate
}
```

**Response**:
```typescript
{
  success: boolean;
  sceneContent: string;
  fullContent: string;
}
```

#### 4. GET `/api/editing/chapters/:chapterId/regeneration-history`
Get regeneration history for a chapter.

**Query Params**:
- `limit`: number (default: 20)
- `offset`: number (default: 0)

**Response**:
```typescript
{
  history: Array<{
    id: string;
    actionType: string;
    originalText: string;
    finalText: string;
    mode: string;
    createdAt: string;
  }>;
  total: number;
}
```

### Backend Service Layer

**New Service: `RegenerationService`**

Location: `backend/src/services/regeneration.service.ts`

```typescript
class RegenerationService {
  // Generate 3 variations of selected text
  async generateVariations(
    chapterId: string,
    selectionStart: number,
    selectionEnd: number,
    mode: RegenerationMode,
    contextTokens: number = 500
  ): Promise<VariationResult>

  // Apply selected variation to chapter
  async applyVariation(
    chapterId: string,
    variationId: string,
    selectedVariation: number
  ): Promise<ApplyResult>

  // Regenerate entire scene
  async regenerateScene(
    chapterId: string,
    sceneIndex: number
  ): Promise<SceneRegenerationResult>

  // Get regeneration history
  getHistory(
    chapterId: string,
    limit: number,
    offset: number
  ): Promise<HistoryResult>

  // Helper: Extract context around selection
  private extractContext(
    content: string,
    start: number,
    end: number,
    tokens: number
  ): { before: string; after: string; selected: string }

  // Helper: Build regeneration prompt based on mode
  private buildRegenerationPrompt(
    mode: RegenerationMode,
    selectedText: string,
    contextBefore: string,
    contextAfter: string,
    storyDNA: StoryDNA
  ): { system: string; user: string }
}
```

### Frontend Components

#### 1. `RegenerationToolbar` Component
Location: `app/components/RegenerationToolbar.tsx`

- Appears when text is selected in ChapterEditor
- Buttons: "Regenerate", "Dialogue Mode", "Description Mode"
- Shows selection range and word count

#### 2. `VariationPicker` Component
Location: `app/components/VariationPicker.tsx`

- Modal/drawer showing 3 variations side-by-side
- Radio buttons to select variation
- Preview of how variation fits in context
- Apply/Cancel buttons
- Shows word count for each variation

#### 3. `RegenerationHistory` Component
Location: `app/components/RegenerationHistory.tsx`

- Collapsible panel showing recent regenerations
- Timeline view of changes
- Click to revert to previous version
- Filter by mode

### Integration with ChapterEditor

Modify `app/components/ChapterEditor.tsx`:
1. Add text selection tracking
2. Show RegenerationToolbar on selection
3. Integrate VariationPicker modal
4. Add RegenerationHistory panel toggle

### Regeneration Modes

#### General Mode
- Regenerates selected text maintaining overall style
- Preserves plot and character actions
- Improves prose quality

#### Dialogue Mode
- Focuses on dialogue within selection
- Maintains character voice
- Improves dialogue tags and beats
- Preserves non-dialogue text

#### Description Mode
- Focuses on sensory descriptions
- Adds/enhances imagery
- Improves setting details
- Preserves dialogue and action

#### Scene Mode
- Regenerates entire scene from scene card
- Uses scene goals, conflict, outcome
- Maintains chapter continuity

## Implementation Tasks

### Task 1: Database Migration (1 hour)
**File**: `backend/src/db/migrations/007_regeneration_variations.sql`
- Create `regeneration_variations` table
- Create `regeneration_history` table
- Add indexes

### Task 2: Regeneration Service (3 hours)
**File**: `backend/src/services/regeneration.service.ts`
- Implement `generateVariations()` method
- Implement prompt building for each mode
- Implement context extraction
- Implement `applyVariation()` method
- Implement `regenerateScene()` method
- Implement `getHistory()` method

### Task 3: API Routes (2 hours)
**File**: `backend/src/routes/regeneration.ts`
- POST `/regenerate-selection`
- POST `/apply-variation`
- POST `/regenerate-scene`
- GET `/regeneration-history`
- Register routes in `server.ts`

### Task 4: TypeScript Types (30 min)
**File**: `backend/src/shared/types/index.ts`
- Add `RegenerationMode` type
- Add `RegenerationVariation` interface
- Add `RegenerationHistory` interface
- Add request/response types

### Task 5: VariationPicker Component (3 hours)
**File**: `app/components/VariationPicker.tsx`
- Create modal UI
- Side-by-side variation display
- Selection radio buttons
- Apply/Cancel handlers
- Integration with API

### Task 6: RegenerationToolbar Component (2 hours)
**File**: `app/components/RegenerationToolbar.tsx`
- Floating toolbar on text selection
- Mode selection buttons
- Trigger variation generation
- Show loading state

### Task 7: RegenerationHistory Component (2 hours)
**File**: `app/components/RegenerationHistory.tsx`
- Timeline view of history
- Fetch from API
- Filter by mode
- Click to view details

### Task 8: ChapterEditor Integration (2 hours)
**File**: `app/components/ChapterEditor.tsx`
- Add text selection tracking
- Show/hide RegenerationToolbar
- Integrate VariationPicker modal
- Add RegenerationHistory toggle
- Handle variation application

### Task 9: Testing & Bug Fixes (2 hours)
- Test all regeneration modes
- Test variation selection and application
- Test scene regeneration
- Test history tracking
- Fix edge cases

## Design Decisions

### Why Character Offsets?
- Simpler than line/paragraph numbers
- Works with any text structure
- Easy to calculate from textarea selection

### Why 3 Variations?
- Provides choice without overwhelming
- Standard UX pattern (Goldilocks: too much, too little, just right)
- Manageable for UI layout

### Why Store Variations?
- Enables history/undo
- User can compare later
- Audit trail for regenerations

### Why Separate Modes?
- Different modes require different prompts
- User intent affects quality
- Provides focused regeneration

## Security Considerations

- Validate selection ranges (must be within content bounds)
- Sanitize user input in edit notes
- Rate limit regeneration requests (max 10/minute per user)
- Ensure user owns chapter before allowing regeneration

## Performance Considerations

- Regeneration is async (may take 10-30 seconds)
- Use loading states in UI
- Context extraction should be fast (<100ms)
- History queries are paginated
- Index on `created_at` for efficient history fetching

## Testing Strategy

### Unit Tests
- RegenerationService.extractContext()
- RegenerationService.buildRegenerationPrompt()
- Selection range validation

### Integration Tests
- POST /regenerate-selection creates variations
- POST /apply-variation updates chapter edit
- GET /regeneration-history returns correct data

### E2E Tests
- Select text, generate variations, apply
- Switch between modes
- View regeneration history
- Regenerate entire scene

## Success Criteria

- ✅ User can select text and generate 3 variations
- ✅ User can choose and apply variation
- ✅ Dialogue mode focuses on dialogue
- ✅ Description mode focuses on descriptions
- ✅ Scene regeneration works for full scenes
- ✅ History tracks all regenerations
- ✅ All tests pass
- ✅ Performance: Variation generation <30s
- ✅ UI responsive and intuitive
