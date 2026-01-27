# Phase 4: Content Tools Implementation Plan

**Duration:** 2 weeks (Sprints 7-8)
**Focus:** Chapter and Content Management
**Priority:** MEDIUM
**Prerequisites:** Phases 1-3 complete

---

## Overview

Phase 4 enhances the chapter editing and content management experience. Users will be able to navigate between chapters efficiently, see previews of content, perform bulk operations, and have better regeneration tools.

---

## Task 4.1: Enhance Chapter List with Previews

**Priority:** MEDIUM
**Estimated Effort:** 8 hours
**File:** `app/components/ChaptersList.tsx`

### Current State
- Lines 157-276: Chapter list shows number, title, status only
- No content preview visible
- Large lists require scrolling without context
- Users must click into chapters to see content

### Implementation Steps

### 4.1.1 Update Chapter Card Component

```typescript
interface EnhancedChapterCardProps {
  chapter: Chapter
  index: number
  onEdit: (id: string) => void
  onRegenerate: (id: string) => void
  isSelected?: boolean
  onSelect?: (id: string) => void
}

function EnhancedChapterCard({
  chapter,
  index,
  onEdit,
  onRegenerate,
  isSelected,
  onSelect
}: EnhancedChapterCardProps) {
  // Extract first meaningful line for preview
  const getPreview = (content: string): string => {
    if (!content) return 'No content yet'
    const firstLine = content
      .split('\n')
      .find(line => line.trim().length > 20)
    return firstLine
      ? firstLine.slice(0, 100) + (firstLine.length > 100 ? '...' : '')
      : 'Content too short for preview'
  }

  // Calculate word progress
  const targetWords = 3500 // or from chapter metadata
  const currentWords = chapter.wordCount || 0
  const progressPercent = Math.min(100, (currentWords / targetWords) * 100)

  return (
    <div
      style={{
        border: `1px solid ${isSelected ? colors.brand.primary : colors.border.default}`,
        borderRadius: borderRadius.lg,
        padding: spacing[4],
        marginBottom: spacing[3],
        backgroundColor: isSelected ? colors.background.brandLight : colors.background.surface,
        transition: 'all 0.2s',
      }}
    >
      {/* Header with checkbox for multi-select */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing[3],
      }}>
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(chapter.id)}
            aria-label={`Select chapter ${index + 1}`}
            style={{ marginTop: spacing[1] }}
          />
        )}

        <div style={{ flex: 1 }}>
          {/* Chapter header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing[2],
          }}>
            <div>
              <span style={{
                fontSize: '0.75rem',
                color: colors.text.tertiary,
                marginRight: spacing[2],
              }}>
                Chapter {index + 1}
              </span>
              <span style={{
                fontWeight: 600,
                color: colors.text.primary,
              }}>
                {chapter.title || `Untitled`}
              </span>
            </div>

            {/* Status badge */}
            <span style={{
              fontSize: '0.75rem',
              padding: `${spacing[1]} ${spacing[2]}`,
              borderRadius: borderRadius.full,
              backgroundColor: chapter.status === 'completed'
                ? colors.status.successLight
                : chapter.status === 'in_progress'
                  ? colors.status.warningLight
                  : colors.background.muted,
              color: chapter.status === 'completed'
                ? colors.status.success
                : chapter.status === 'in_progress'
                  ? colors.status.warning
                  : colors.text.tertiary,
            }}>
              {chapter.status === 'completed' ? '✓ Complete' :
               chapter.status === 'in_progress' ? '⏳ In Progress' :
               'Pending'}
            </span>
          </div>

          {/* Content preview */}
          <p style={{
            fontSize: '0.875rem',
            color: colors.text.secondary,
            lineHeight: 1.5,
            marginBottom: spacing[3],
            fontStyle: 'italic',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            "{getPreview(chapter.content)}"
          </p>

          {/* Word count progress bar */}
          <div style={{ marginBottom: spacing[3] }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              marginBottom: spacing[1],
            }}>
              <span style={{ color: colors.text.tertiary }}>
                {currentWords.toLocaleString()} words
              </span>
              <span style={{ color: colors.text.tertiary }}>
                Target: {targetWords.toLocaleString()}
              </span>
            </div>
            <div style={{
              height: '4px',
              backgroundColor: colors.background.muted,
              borderRadius: borderRadius.full,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                backgroundColor: progressPercent >= 100
                  ? colors.status.success
                  : progressPercent >= 50
                    ? colors.brand.primary
                    : colors.status.warning,
                transition: 'width 0.3s',
              }} />
            </div>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: spacing[2],
          }}>
            <button
              onClick={() => onEdit(chapter.id)}
              style={{
                padding: `${spacing[2]} ${spacing[4]}`,
                backgroundColor: colors.brand.primary,
                color: colors.text.inverse,
                border: 'none',
                borderRadius: borderRadius.md,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Edit
            </button>
            <button
              onClick={() => onRegenerate(chapter.id)}
              style={{
                padding: `${spacing[2]} ${spacing[4]}`,
                backgroundColor: 'transparent',
                color: colors.brand.primary,
                border: `1px solid ${colors.brand.primary}`,
                borderRadius: borderRadius.md,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Regenerate
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 4.1.2 Add Chapter Search

```typescript
function ChapterSearch({ onSearch }: { onSearch: (term: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('')

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    onSearch(value)
  }

  return (
    <div style={{
      marginBottom: spacing[4],
      position: 'relative',
    }}>
      <input
        type="search"
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search chapters by title or content..."
        aria-label="Search chapters"
        style={{
          width: '100%',
          padding: `${spacing[3]} ${spacing[4]}`,
          paddingLeft: spacing[10],
          border: `1px solid ${colors.border.default}`,
          borderRadius: borderRadius.md,
          fontSize: '1rem',
        }}
      />
      <span style={{
        position: 'absolute',
        left: spacing[4],
        top: '50%',
        transform: 'translateY(-50%)',
        color: colors.text.tertiary,
      }}>
        🔍
      </span>
    </div>
  )
}
```

### 4.1.3 Update Chapter List Container

```typescript
function ChaptersList({ chapters, projectId }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])

  // Filter chapters based on search
  const filteredChapters = useMemo(() => {
    if (!searchTerm) return chapters

    const term = searchTerm.toLowerCase()
    return chapters.filter(chapter =>
      chapter.title?.toLowerCase().includes(term) ||
      chapter.content?.toLowerCase().includes(term)
    )
  }, [chapters, searchTerm])

  return (
    <div>
      <ChapterSearch onSearch={setSearchTerm} />

      {searchTerm && (
        <p style={{
          fontSize: '0.875rem',
          color: colors.text.tertiary,
          marginBottom: spacing[3],
        }}>
          {filteredChapters.length} of {chapters.length} chapters match "{searchTerm}"
        </p>
      )}

      {filteredChapters.map((chapter, index) => (
        <EnhancedChapterCard
          key={chapter.id}
          chapter={chapter}
          index={index}
          onEdit={handleEdit}
          onRegenerate={handleRegenerate}
          isSelected={selectedChapters.includes(chapter.id)}
          onSelect={handleSelectChapter}
        />
      ))}
    </div>
  )
}
```

### Acceptance Criteria
- [ ] Each chapter shows first line preview
- [ ] Word count with progress bar visible
- [ ] Search filters chapters by title/content
- [ ] Checkbox for multi-select available
- [ ] Status badge clearly visible
- [ ] Target word count shown

### Testing
- View chapter list - see previews
- Search "dragon" - filters to matching chapters
- Select multiple chapters - checkboxes work
- Empty content - shows "No content yet"

---

## Task 4.2: Add Chapter Navigation in Editor

**Priority:** HIGH
**Estimated Effort:** 4 hours
**File:** `app/components/ChapterEditor.tsx`

### Current State
- No prev/next navigation
- Users must return to list to switch chapters
- Breaking editing flow

### Implementation Steps

### 4.2.1 Add Navigation Props and State

```typescript
interface ChapterEditorProps {
  chapterId: string
  projectId: string
  // New navigation props
  prevChapterId?: string
  nextChapterId?: string
  currentIndex: number
  totalChapters: number
}

function ChapterEditor({
  chapterId,
  projectId,
  prevChapterId,
  nextChapterId,
  currentIndex,
  totalChapters
}: ChapterEditorProps) {
  const router = useRouter()

  const navigateToChapter = (targetId: string) => {
    // Warn if unsaved changes
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Do you want to leave without saving?'
      )
      if (!confirmed) return
    }

    router.push(`/projects/${projectId}/chapters/${targetId}`)
  }

  // ... existing code
}
```

### 4.2.2 Add Navigation UI

```typescript
// Add at top of editor, after toolbar
<div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${spacing[3]} ${spacing[4]}`,
  backgroundColor: colors.background.muted,
  borderRadius: borderRadius.md,
  marginBottom: spacing[4],
}}>
  {/* Previous button */}
  <button
    onClick={() => prevChapterId && navigateToChapter(prevChapterId)}
    disabled={!prevChapterId}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
      padding: `${spacing[2]} ${spacing[3]}`,
      backgroundColor: prevChapterId ? colors.background.surface : 'transparent',
      border: prevChapterId ? `1px solid ${colors.border.default}` : 'none',
      borderRadius: borderRadius.md,
      cursor: prevChapterId ? 'pointer' : 'default',
      color: prevChapterId ? colors.text.primary : colors.text.tertiary,
      minHeight: '44px',
    }}
    aria-label="Previous chapter"
  >
    <span>←</span>
    <span>Previous</span>
  </button>

  {/* Chapter indicator */}
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  }}>
    <span style={{
      fontSize: '0.875rem',
      color: colors.text.secondary,
    }}>
      Chapter {currentIndex + 1} of {totalChapters}
    </span>

    {/* Quick jump dropdown */}
    <select
      value={chapterId}
      onChange={(e) => navigateToChapter(e.target.value)}
      style={{
        padding: `${spacing[1]} ${spacing[2]}`,
        borderRadius: borderRadius.sm,
        border: `1px solid ${colors.border.default}`,
        fontSize: '0.875rem',
      }}
      aria-label="Jump to chapter"
    >
      {allChapters.map((ch, i) => (
        <option key={ch.id} value={ch.id}>
          {i + 1}. {ch.title || `Chapter ${i + 1}`}
        </option>
      ))}
    </select>
  </div>

  {/* Next button */}
  <button
    onClick={() => nextChapterId && navigateToChapter(nextChapterId)}
    disabled={!nextChapterId}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
      padding: `${spacing[2]} ${spacing[3]}`,
      backgroundColor: nextChapterId ? colors.background.surface : 'transparent',
      border: nextChapterId ? `1px solid ${colors.border.default}` : 'none',
      borderRadius: borderRadius.md,
      cursor: nextChapterId ? 'pointer' : 'default',
      color: nextChapterId ? colors.text.primary : colors.text.tertiary,
      minHeight: '44px',
    }}
    aria-label="Next chapter"
  >
    <span>Next</span>
    <span>→</span>
  </button>
</div>

{/* Also add at bottom of editor */}
<div style={{
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: spacing[6],
  paddingTop: spacing[4],
  borderTop: `1px solid ${colors.border.default}`,
}}>
  {prevChapterId ? (
    <button onClick={() => navigateToChapter(prevChapterId)}>
      ← Previous: {prevChapterTitle}
    </button>
  ) : <div />}

  {nextChapterId && (
    <button onClick={() => navigateToChapter(nextChapterId)}>
      Next: {nextChapterTitle} →
    </button>
  )}
</div>
```

### 4.2.3 Add Keyboard Navigation

```typescript
// Add to useKeyboardShortcuts
useKeyboardShortcuts([
  // ... existing shortcuts
  {
    key: 'ArrowLeft',
    ctrlKey: true,
    action: () => prevChapterId && navigateToChapter(prevChapterId),
    description: 'Previous chapter'
  },
  {
    key: 'ArrowRight',
    ctrlKey: true,
    action: () => nextChapterId && navigateToChapter(nextChapterId),
    description: 'Next chapter'
  },
])
```

### Acceptance Criteria
- [ ] Prev/Next buttons at top and bottom
- [ ] Chapter indicator shows "X of Y"
- [ ] Quick jump dropdown to any chapter
- [ ] Keyboard shortcuts (Ctrl+Arrow)
- [ ] Warn before navigating with unsaved changes
- [ ] Disabled states when at start/end

### Testing
- First chapter - Previous disabled
- Last chapter - Next disabled
- Click Next - navigates to next chapter
- Unsaved changes + Next - shows warning
- Ctrl+Right - goes to next chapter

---

## Task 4.3: Improve Selection-Based Regeneration

**Priority:** MEDIUM
**Estimated Effort:** 8 hours
**File:** `app/components/ChapterEditor.tsx`

### Current State
- Lines 196-219: Handle text selection
- Lines 209-211: Fixed toolbar position (top: 200, left: 50)
- Minimum 10 character selection required
- Toolbar not floating near selection

### Implementation Steps

### 4.3.1 Create Floating Regeneration Toolbar

```typescript
interface FloatingToolbarProps {
  position: { x: number; y: number }
  selectedText: string
  onRegenerate: (type: 'improve' | 'expand' | 'rewrite' | 'simplify') => void
  onCancel: () => void
}

function FloatingRegenerationToolbar({
  position,
  selectedText,
  onRegenerate,
  onCancel
}: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Position toolbar above selection, centered
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  useEffect(() => {
    if (toolbarRef.current) {
      const toolbar = toolbarRef.current
      const rect = toolbar.getBoundingClientRect()

      // Adjust if toolbar would go off screen
      let x = position.x - rect.width / 2
      let y = position.y - rect.height - 10

      // Keep within viewport
      x = Math.max(10, Math.min(x, window.innerWidth - rect.width - 10))
      y = Math.max(10, y)

      setAdjustedPosition({ x, y })
    }
  }, [position])

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Text regeneration options"
      style={{
        position: 'fixed',
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        backgroundColor: colors.background.surface,
        borderRadius: borderRadius.lg,
        boxShadow: shadows.lg,
        padding: spacing[2],
        display: 'flex',
        gap: spacing[1],
        zIndex: 1000,
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <button
        onClick={() => onRegenerate('improve')}
        title="Improve writing quality"
        style={toolbarButtonStyle}
      >
        ✨ Improve
      </button>
      <button
        onClick={() => onRegenerate('expand')}
        title="Expand with more detail"
        style={toolbarButtonStyle}
      >
        📝 Expand
      </button>
      <button
        onClick={() => onRegenerate('rewrite')}
        title="Rewrite differently"
        style={toolbarButtonStyle}
      >
        🔄 Rewrite
      </button>
      <button
        onClick={() => onRegenerate('simplify')}
        title="Simplify language"
        style={toolbarButtonStyle}
      >
        📖 Simplify
      </button>

      <div style={{
        width: '1px',
        backgroundColor: colors.border.default,
        margin: `0 ${spacing[1]}`,
      }} />

      <button
        onClick={onCancel}
        title="Cancel"
        style={{
          ...toolbarButtonStyle,
          color: colors.text.tertiary,
        }}
        aria-label="Cancel selection"
      >
        ✕
      </button>
    </div>
  )
}

const toolbarButtonStyle: CSSProperties = {
  padding: `${spacing[2]} ${spacing[3]}`,
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: borderRadius.md,
  cursor: 'pointer',
  fontSize: '0.875rem',
  color: colors.text.primary,
  display: 'flex',
  alignItems: 'center',
  gap: spacing[1],
  transition: 'background-color 0.15s',
  ':hover': {
    backgroundColor: colors.background.muted,
  },
}
```

### 4.3.2 Update Selection Handler

```typescript
const handleTextSelection = useCallback(() => {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) {
    setShowFloatingToolbar(false)
    return
  }

  const text = selection.toString().trim()

  // Minimum 5 words instead of 10 characters
  if (text.split(/\s+/).length < 5) {
    setShowFloatingToolbar(false)
    return
  }

  // Get selection position
  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()

  setSelectionText(text)
  setSelectionPosition({
    x: rect.left + rect.width / 2,
    y: rect.top,
  })
  setShowFloatingToolbar(true)
}, [])

// Listen for selection changes
useEffect(() => {
  document.addEventListener('selectionchange', handleTextSelection)
  return () => document.removeEventListener('selectionchange', handleTextSelection)
}, [handleTextSelection])
```

### 4.3.3 Add Inline Preview for Regeneration

```typescript
function RegenerationPreview({
  originalText,
  variations,
  onSelect,
  onCancel
}: {
  originalText: string
  variations: string[]
  onSelect: (text: string) => void
  onCancel: () => void
}) {
  const [selectedVariation, setSelectedVariation] = useState(0)

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1001,
    }}>
      <div style={{
        backgroundColor: colors.background.surface,
        borderRadius: borderRadius.xl,
        padding: spacing[6],
        maxWidth: '700px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
      }}>
        <h3 style={{ marginBottom: spacing[4] }}>
          Choose a Variation
        </h3>

        {/* Original for comparison */}
        <div style={{
          padding: spacing[3],
          backgroundColor: colors.background.muted,
          borderRadius: borderRadius.md,
          marginBottom: spacing[4],
          fontSize: '0.875rem',
        }}>
          <strong style={{ color: colors.text.tertiary }}>Original:</strong>
          <p style={{ marginTop: spacing[2], color: colors.text.secondary }}>
            {originalText}
          </p>
        </div>

        {/* Variations */}
        <div style={{ marginBottom: spacing[4] }}>
          {variations.map((variation, index) => (
            <label
              key={index}
              style={{
                display: 'block',
                padding: spacing[4],
                border: `2px solid ${selectedVariation === index ? colors.brand.primary : colors.border.default}`,
                borderRadius: borderRadius.md,
                marginBottom: spacing[3],
                cursor: 'pointer',
                backgroundColor: selectedVariation === index ? colors.background.brandLight : 'transparent',
              }}
            >
              <input
                type="radio"
                name="variation"
                checked={selectedVariation === index}
                onChange={() => setSelectedVariation(index)}
                style={{ marginRight: spacing[3] }}
              />
              <span style={{ color: colors.text.primary }}>
                {variation}
              </span>
            </label>
          ))}
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: spacing[3],
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: `${spacing[3]} ${spacing[5]}`,
              border: `1px solid ${colors.border.default}`,
              borderRadius: borderRadius.md,
              backgroundColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSelect(variations[selectedVariation])}
            style={{
              padding: `${spacing[3]} ${spacing[5]}`,
              background: colors.brand.gradient,
              color: colors.text.inverse,
              border: 'none',
              borderRadius: borderRadius.md,
              cursor: 'pointer',
            }}
          >
            Apply Selection
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 4.3.4 Add Paragraph-Level Quick Action

```typescript
// Detect paragraph boundaries
const handleParagraphAction = (e: React.MouseEvent) => {
  const textarea = textareaRef.current
  if (!textarea) return

  // Find paragraph at cursor position
  const cursorPos = textarea.selectionStart
  const text = textarea.value

  // Find paragraph boundaries
  let paraStart = text.lastIndexOf('\n\n', cursorPos) + 2
  if (paraStart < 2) paraStart = 0

  let paraEnd = text.indexOf('\n\n', cursorPos)
  if (paraEnd === -1) paraEnd = text.length

  const paragraph = text.slice(paraStart, paraEnd)

  if (paragraph.trim().length > 20) {
    setSelectionText(paragraph)
    setSelectionStart(paraStart)
    setSelectionEnd(paraEnd)
    setShowRegenerationOptions(true)
  }
}
```

### Acceptance Criteria
- [ ] Toolbar floats near selection
- [ ] Multiple regeneration types (improve, expand, rewrite, simplify)
- [ ] Minimum 5 words for selection
- [ ] Preview shows original vs variations
- [ ] Radio button to select preferred variation
- [ ] Paragraph-level quick action available

### Testing
- Select 5+ words - toolbar appears near selection
- Click Improve - generates variations
- Select variation - replaces text
- Select less than 5 words - no toolbar
- Right-click paragraph - quick regenerate option

---

## Task 4.4: Add Bulk Chapter Operations

**Priority:** LOW
**Estimated Effort:** 8 hours
**Files:** `app/components/ChaptersList.tsx`, new API endpoints

### Implementation Steps

### 4.4.1 Add Bulk Selection State

```typescript
function ChaptersList({ chapters, projectId }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<string | null>(null)

  const allSelected = selectedIds.size === chapters.length
  const someSelected = selectedIds.size > 0 && !allSelected

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(chapters.map(c => c.id)))
    }
  }

  const toggleOne = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  // ... rest of component
}
```

### 4.4.2 Create Bulk Actions Toolbar

```typescript
{selectedIds.size > 0 && (
  <div style={{
    position: 'sticky',
    top: 0,
    backgroundColor: colors.brand.primary,
    color: colors.text.inverse,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  }}>
    <span>
      {selectedIds.size} chapter{selectedIds.size > 1 ? 's' : ''} selected
    </span>

    <div style={{ display: 'flex', gap: spacing[2] }}>
      <button
        onClick={() => handleBulkExport(selectedIds)}
        style={bulkActionButtonStyle}
      >
        📤 Export Selected
      </button>

      <button
        onClick={() => handleBulkRegenerate(selectedIds)}
        style={bulkActionButtonStyle}
      >
        🔄 Regenerate Selected
      </button>

      <button
        onClick={() => handleBulkLock(selectedIds)}
        style={bulkActionButtonStyle}
      >
        🔒 Lock Selected
      </button>

      <button
        onClick={() => setSelectedIds(new Set())}
        style={{
          ...bulkActionButtonStyle,
          backgroundColor: 'transparent',
        }}
      >
        ✕ Clear
      </button>
    </div>
  </div>
)}
```

### 4.4.3 Implement Bulk Operations

```typescript
const handleBulkExport = async (ids: Set<string>) => {
  const selected = chapters.filter(c => ids.has(c.id))
  // Combine content and export
  const combined = selected
    .map(c => `# ${c.title}\n\n${c.content}`)
    .join('\n\n---\n\n')

  // Download as text file
  const blob = new Blob([combined], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `chapters-${ids.size}-export.txt`
  a.click()
  URL.revokeObjectURL(url)
}

const handleBulkRegenerate = async (ids: Set<string>) => {
  if (!confirm(`Regenerate ${ids.size} chapters? This will replace existing content.`)) {
    return
  }

  setBulkAction('regenerating')

  try {
    await fetch(`/api/projects/${projectId}/chapters/bulk-regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterIds: Array.from(ids) })
    })

    // Refresh chapter list
    router.refresh()
  } finally {
    setBulkAction(null)
    setSelectedIds(new Set())
  }
}

const handleBulkLock = async (ids: Set<string>) => {
  await fetch(`/api/projects/${projectId}/chapters/bulk-lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chapterIds: Array.from(ids), locked: true })
  })

  router.refresh()
  setSelectedIds(new Set())
}
```

### 4.4.4 Add Drag-and-Drop Reordering

```typescript
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'

function ReorderableChapterList({ chapters, onReorder }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return

    const items = Array.from(chapters)
    const [reordered] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reordered)

    onReorder(items)
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="chapters">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
          >
            {chapters.map((chapter, index) => (
              <Draggable
                key={chapter.id}
                draggableId={chapter.id}
                index={index}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    style={{
                      ...provided.draggableProps.style,
                      opacity: snapshot.isDragging ? 0.8 : 1,
                    }}
                  >
                    <div {...provided.dragHandleProps}>
                      ⠿ {/* Drag handle */}
                    </div>
                    <EnhancedChapterCard chapter={chapter} index={index} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}
```

### Acceptance Criteria
- [ ] Select all checkbox in header
- [ ] Individual chapter checkboxes
- [ ] Bulk action toolbar appears when selected
- [ ] Export combines selected chapters
- [ ] Bulk regenerate with confirmation
- [ ] Bulk lock functionality
- [ ] Drag-and-drop reordering

### Testing
- Select 3 chapters - toolbar shows "3 chapters selected"
- Click Export - downloads combined file
- Click Regenerate - confirms then processes
- Drag chapter 5 to position 2 - reorders
- Click Clear - deselects all

---

## Task 4.5: Add Undo/Redo to Chapter Editor

**Priority:** MEDIUM
**Estimated Effort:** 6 hours
**File:** `app/components/ChapterEditor.tsx`

### Implementation Steps

### 4.5.1 Create History Hook

**Create:** `app/hooks/useHistory.ts`
```typescript
import { useState, useCallback } from 'react'

interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

export function useHistory<T>(initialState: T, maxHistory = 50) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  })

  const canUndo = history.past.length > 0
  const canRedo = history.future.length > 0

  const set = useCallback((newPresent: T | ((prev: T) => T)) => {
    setHistory(prev => {
      const presentValue = typeof newPresent === 'function'
        ? (newPresent as (prev: T) => T)(prev.present)
        : newPresent

      // Don't add to history if value hasn't changed
      if (presentValue === prev.present) return prev

      return {
        past: [...prev.past, prev.present].slice(-maxHistory),
        present: presentValue,
        future: [],
      }
    })
  }, [maxHistory])

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev

      const newPast = [...prev.past]
      const newPresent = newPast.pop()!

      return {
        past: newPast,
        present: newPresent,
        future: [prev.present, ...prev.future],
      }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev

      const newFuture = [...prev.future]
      const newPresent = newFuture.shift()!

      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: newFuture,
      }
    })
  }, [])

  const clear = useCallback(() => {
    setHistory(prev => ({
      past: [],
      present: prev.present,
      future: [],
    }))
  }, [])

  return {
    state: history.present,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    historyLength: history.past.length,
  }
}
```

### 4.5.2 Integrate History in Editor

```typescript
import { useHistory } from '../hooks/useHistory'

function ChapterEditor({ chapterId, ... }) {
  // Replace useState with useHistory
  const {
    state: content,
    set: setContent,
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength
  } = useHistory(initialContent)

  // Add keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'z', ctrlKey: true, action: undo, description: 'Undo' },
    { key: 'z', ctrlKey: true, shiftKey: true, action: redo, description: 'Redo' },
    { key: 'y', ctrlKey: true, action: redo, description: 'Redo (alt)' },
  ])

  // ... rest of component
}
```

### 4.5.3 Add Undo/Redo Buttons to Toolbar

```typescript
<div style={{ display: 'flex', gap: spacing[1] }}>
  <button
    onClick={undo}
    disabled={!canUndo}
    title="Undo (Ctrl+Z)"
    style={{
      ...toolbarButtonStyle,
      opacity: canUndo ? 1 : 0.4,
    }}
    aria-label="Undo"
  >
    ↶ Undo
  </button>

  <button
    onClick={redo}
    disabled={!canRedo}
    title="Redo (Ctrl+Shift+Z)"
    style={{
      ...toolbarButtonStyle,
      opacity: canRedo ? 1 : 0.4,
    }}
    aria-label="Redo"
  >
    ↷ Redo
  </button>

  {historyLength > 0 && (
    <span style={{
      fontSize: '0.75rem',
      color: colors.text.tertiary,
      alignSelf: 'center',
      marginLeft: spacing[2],
    }}>
      {historyLength} change{historyLength !== 1 ? 's' : ''}
    </span>
  )}
</div>
```

### Acceptance Criteria
- [ ] Ctrl+Z undoes last change
- [ ] Ctrl+Shift+Z or Ctrl+Y redoes
- [ ] Undo/Redo buttons in toolbar
- [ ] Buttons disabled when no history
- [ ] Change count displayed
- [ ] History limited to 50 states

### Testing
- Type text, Ctrl+Z - undoes
- Undo multiple times - goes back
- Redo after undo - restores
- Make new change after undo - clears redo stack
- 60 changes - only last 50 in history

---

## Task 4.6: Fix Export Discoverability

**Priority:** MEDIUM
**Estimated Effort:** 4 hours
**File:** `app/components/ExportButtons.tsx`, project page

### Implementation Steps

### 4.6.1 Always Show Export Section

```typescript
function ExportSection({ project, hasContent }) {
  return (
    <div style={{
      border: `1px solid ${colors.border.default}`,
      borderRadius: borderRadius.lg,
      padding: spacing[6],
      marginTop: spacing[6],
    }}>
      <h3 style={{
        fontSize: '1.125rem',
        fontWeight: 600,
        marginBottom: spacing[4],
        color: colors.text.primary,
      }}>
        Export Your Novel
      </h3>

      {!hasContent ? (
        // Show when no content
        <div style={{
          textAlign: 'center',
          padding: spacing[6],
          backgroundColor: colors.background.muted,
          borderRadius: borderRadius.md,
        }}>
          <span style={{ fontSize: '2rem', marginBottom: spacing[3], display: 'block' }}>
            📤
          </span>
          <p style={{ color: colors.text.secondary, marginBottom: spacing[2] }}>
            Export will be available after you've written your chapters.
          </p>
          <p style={{ color: colors.text.tertiary, fontSize: '0.875rem' }}>
            Complete at least one chapter to unlock export options.
          </p>
        </div>
      ) : (
        // Show export options
        <div>
          {/* Format explanations */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: spacing[4],
            marginBottom: spacing[6],
          }}>
            <FormatCard
              format="DOCX"
              icon="📄"
              description="Microsoft Word format. Best for editing and collaboration."
              recommended={true}
            />
            <FormatCard
              format="PDF"
              icon="📕"
              description="Fixed layout format. Best for printing and sharing."
            />
            <FormatCard
              format="EPUB"
              icon="📱"
              description="E-reader format. Best for Kindle, Kobo, and mobile reading."
            />
          </div>

          {/* Export buttons */}
          <ExportButtons
            projectId={project.id}
            formats={['docx', 'pdf', 'epub']}
          />
        </div>
      )}
    </div>
  )
}

function FormatCard({ format, icon, description, recommended }) {
  return (
    <div style={{
      padding: spacing[4],
      border: `1px solid ${recommended ? colors.brand.primary : colors.border.default}`,
      borderRadius: borderRadius.md,
      backgroundColor: recommended ? colors.background.brandLight : 'transparent',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[2],
        marginBottom: spacing[2],
      }}>
        <span>{icon}</span>
        <strong>{format}</strong>
        {recommended && (
          <span style={{
            fontSize: '0.75rem',
            backgroundColor: colors.brand.primary,
            color: colors.text.inverse,
            padding: `${spacing[1]} ${spacing[2]}`,
            borderRadius: borderRadius.full,
          }}>
            Recommended
          </span>
        )}
      </div>
      <p style={{
        fontSize: '0.875rem',
        color: colors.text.secondary,
      }}>
        {description}
      </p>
    </div>
  )
}
```

### 4.6.2 Add Export Preview

```typescript
function ExportPreviewModal({ project, format, onClose, onExport }) {
  const [previewLoading, setPreviewLoading] = useState(true)

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: '800px' }}>
        <h2>Export Preview - {format.toUpperCase()}</h2>

        <div style={{
          backgroundColor: colors.background.muted,
          padding: spacing[4],
          borderRadius: borderRadius.md,
          marginBottom: spacing[4],
        }}>
          <h4>Export Details</h4>
          <ul>
            <li>Title: {project.title}</li>
            <li>Chapters: {project.chapters.length}</li>
            <li>Total words: {project.totalWords.toLocaleString()}</li>
            <li>Format: {format.toUpperCase()}</li>
          </ul>
        </div>

        <div style={{
          backgroundColor: '#fff',
          border: `1px solid ${colors.border.default}`,
          borderRadius: borderRadius.md,
          padding: spacing[4],
          maxHeight: '400px',
          overflow: 'auto',
        }}>
          {/* Preview of first page/content */}
          <h1 style={{ textAlign: 'center' }}>{project.title}</h1>
          <p style={{ textAlign: 'center', color: colors.text.tertiary }}>
            by {project.author || 'Author'}
          </p>
          <hr />
          <h2>Chapter 1: {project.chapters[0]?.title}</h2>
          <p>{project.chapters[0]?.content.slice(0, 500)}...</p>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: spacing[3],
          marginTop: spacing[4],
        }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => onExport(format)}>
            Download {format.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Acceptance Criteria
- [ ] Export section always visible
- [ ] Disabled state explains requirements
- [ ] Format cards explain each option
- [ ] DOCX marked as recommended
- [ ] Preview before download available
- [ ] Preview shows title, chapter count, word count

### Testing
- No chapters - see disabled export with explanation
- With chapters - see all export options
- Click format card - see format description
- Click export - preview modal appears
- Confirm export - file downloads

---

## Phase 4 Summary

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| 4.1 Chapter List Previews | MEDIUM | 8h | None |
| 4.2 Chapter Navigation | HIGH | 4h | None |
| 4.3 Selection Regeneration | MEDIUM | 8h | None |
| 4.4 Bulk Operations | LOW | 8h | 4.1 |
| 4.5 Undo/Redo | MEDIUM | 6h | None |
| 4.6 Export Discovery | MEDIUM | 4h | None |

**Total Estimated Effort:** 38 hours

### Success Metrics
- Chapter editing efficiency +30%
- Chapter navigation satisfaction >4.5/5
- Export discovery +40%
- Regeneration usage +25%

### Dependencies
- Phases 1-3 complete
- Tasks 4.1 should be done before 4.4 (bulk ops need enhanced cards)
- Other tasks can run in parallel

### Rollback Plan
- All features are additive
- History hook can be replaced with simple useState
- Bulk operations can be disabled
- Export section changes are styling only

---

## Files Created/Modified in Phase 4

| File | Status | Changes |
|------|--------|---------|
| `app/components/ChaptersList.tsx` | MODIFIED | Enhanced cards, search, bulk ops |
| `app/components/ChapterEditor.tsx` | MODIFIED | Navigation, selection toolbar, undo/redo |
| `app/hooks/useHistory.ts` | NEW | Undo/redo state management |
| `app/components/FloatingRegenerationToolbar.tsx` | NEW | Selection-based regeneration |
| `app/components/RegenerationPreview.tsx` | NEW | Variation selection modal |
| `app/components/ExportSection.tsx` | NEW | Export with preview |
| `app/api/projects/[id]/chapters/bulk-regenerate/route.ts` | NEW | Bulk regeneration endpoint |
| `app/api/projects/[id]/chapters/bulk-lock/route.ts` | NEW | Bulk lock endpoint |

---

*Phase 4 Implementation Plan*
*NovelForge UX Improvement Project*
*27 January 2026*
