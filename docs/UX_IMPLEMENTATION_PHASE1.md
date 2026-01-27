# Phase 1: Critical Fixes Implementation Plan

**Duration:** 2 weeks (Sprints 1-2)
**Focus:** Editor UX, Auto-save, Basic Accessibility
**Priority:** CRITICAL

---

## Overview

Phase 1 addresses the most urgent UX issues that directly impact user productivity and accessibility compliance. These fixes prevent data loss, eliminate confusion, and ensure basic accessibility standards.

---

## Task 1.1: Remove Chapter Editor View Mode Toggle

**Priority:** CRITICAL
**Estimated Effort:** 4 hours
**File:** `app/components/ChapterEditor.tsx`

### Current State
- Line 45: `const [editMode, setEditMode] = useState(true)`
- Lines 294-298: Toggle button between Edit/View modes
- Lines 361-413: Conditional rendering based on `editMode`

### Problem
Users are confused by the Edit/View toggle. An editor should always be editable.

### Implementation Steps

1. **Remove editMode state** (Line 45)
   ```typescript
   // DELETE this line:
   const [editMode, setEditMode] = useState(true)
   ```

2. **Remove toggle button** (Lines 294-298)
   ```typescript
   // DELETE the toggle button section
   ```

3. **Simplify conditional rendering** (Lines 361-413)
   - Remove all `editMode` conditional checks
   - Always render the editable textarea
   - Keep the locked state check (when `isLocked` is true, show read-only)

4. **Update toolbar** (Lines 300-328)
   - Remove Edit/View mode references
   - Keep Save, Revert, Find & Replace buttons

### Acceptance Criteria
- [ ] No Edit/View toggle visible
- [ ] Textarea always editable (unless locked)
- [ ] Locked chapters show clear "Unlock to edit" message
- [ ] All existing save functionality preserved

### Testing
- Edit a chapter - should be immediately editable
- Lock a chapter - should show locked indicator
- Unlock and edit - should work seamlessly

---

## Task 1.2: Implement Auto-save in Chapter Editor

**Priority:** CRITICAL
**Estimated Effort:** 8 hours
**File:** `app/components/ChapterEditor.tsx`

### Current State
- Lines 104-133: Manual `handleSave()` function
- Line 106-108: Save guard prevents duplicate saves
- No auto-save mechanism exists

### Implementation Steps

1. **Add auto-save state variables** (after Line 55)
   ```typescript
   const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')
   const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
   const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
   const AUTOSAVE_DELAY = 30000 // 30 seconds
   ```

2. **Create auto-save function**
   ```typescript
   const performAutoSave = useCallback(async () => {
     if (!hasUnsavedChanges || saving || isLocked) return

     setAutoSaveStatus('saving')
     try {
       const response = await fetch(`/api/editing/chapters/${chapterId}/edit`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ content, isLocked, editNotes })
       })

       if (response.ok) {
         setAutoSaveStatus('saved')
         setLastSavedAt(new Date())
         setHasUnsavedChanges(false)
         setOriginalContent(content)
       } else {
         setAutoSaveStatus('error')
       }
     } catch (error) {
       setAutoSaveStatus('error')
     }
   }, [hasUnsavedChanges, saving, isLocked, chapterId, content, editNotes])
   ```

3. **Set up auto-save timer** (in useEffect)
   ```typescript
   useEffect(() => {
     if (hasUnsavedChanges && !isLocked) {
       // Clear existing timer
       if (autoSaveTimerRef.current) {
         clearTimeout(autoSaveTimerRef.current)
       }

       // Set new timer
       autoSaveTimerRef.current = setTimeout(() => {
         performAutoSave()
       }, AUTOSAVE_DELAY)

       setAutoSaveStatus('unsaved')
     }

     return () => {
       if (autoSaveTimerRef.current) {
         clearTimeout(autoSaveTimerRef.current)
       }
     }
   }, [hasUnsavedChanges, isLocked, performAutoSave])
   ```

4. **Add beforeunload warning**
   ```typescript
   useEffect(() => {
     const handleBeforeUnload = (e: BeforeUnloadEvent) => {
       if (hasUnsavedChanges) {
         e.preventDefault()
         e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
       }
     }

     window.addEventListener('beforeunload', handleBeforeUnload)
     return () => window.removeEventListener('beforeunload', handleBeforeUnload)
   }, [hasUnsavedChanges])
   ```

5. **Update Save button UI**
   ```typescript
   // Replace current save button with status-aware version
   <button
     onClick={handleSave}
     disabled={!hasUnsavedChanges || saving}
     style={{
       ...buttonStyle,
       backgroundColor: autoSaveStatus === 'saved' ? '#10B981' :
                        autoSaveStatus === 'saving' ? '#667eea' :
                        autoSaveStatus === 'error' ? '#DC2626' : '#3B82F6'
     }}
   >
     {autoSaveStatus === 'saved' && 'Saved ✓'}
     {autoSaveStatus === 'saving' && 'Saving...'}
     {autoSaveStatus === 'unsaved' && 'Save Now'}
     {autoSaveStatus === 'error' && 'Retry Save'}
   </button>
   ```

6. **Add status indicator below toolbar**
   ```typescript
   <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.5rem' }}>
     {autoSaveStatus === 'saved' && lastSavedAt && (
       `Last saved ${formatTimeAgo(lastSavedAt)}`
     )}
     {autoSaveStatus === 'unsaved' && (
       `Unsaved changes • Auto-save in ${Math.ceil(AUTOSAVE_DELAY/1000)}s`
     )}
     {autoSaveStatus === 'saving' && 'Saving...'}
     {autoSaveStatus === 'error' && (
       <span style={{ color: '#DC2626' }}>
         Auto-save failed • <button onClick={performAutoSave}>Retry</button>
       </span>
     )}
   </div>
   ```

### Acceptance Criteria
- [ ] Auto-save triggers 30 seconds after last change
- [ ] Status indicator shows current state (Saved/Saving/Unsaved/Error)
- [ ] "Last saved" timestamp displayed
- [ ] Browser warns before closing with unsaved changes
- [ ] Manual save still works immediately
- [ ] No duplicate save requests

### Testing
- Make changes, wait 30s - should auto-save
- Make changes, close browser - should warn
- Network failure during save - should show error and retry option
- Rapid typing - should debounce and save once

---

## Task 1.3: Fix Colour Contrast (WCAG 1.4.3)

**Priority:** CRITICAL
**Estimated Effort:** 6 hours
**Files:** `app/lib/design-tokens.ts`, `app/lib/constants.ts`

### Current State
- Brand primary: `#667eea` (contrast ratio ~3.2:1 on white - FAILS)
- Secondary text: `#64748B` (contrast ratio ~4.36:1 - barely passes for large text only)

### WCAG Requirements
- Normal text: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- UI components: 3:1 minimum

### Implementation Steps

1. **Update design-tokens.ts** (Lines 12-87)
   ```typescript
   // Update brand colours for better contrast
   brand: {
     primary: '#5558d6',      // Was #667eea (now 4.52:1)
     primaryHover: '#4448c5', // Darker for hover
     secondary: '#6b4f9e',    // Was #764ba2 (now 4.8:1)
     gradient: 'linear-gradient(135deg, #5558d6 0%, #6b4f9e 100%)',
   },

   // Update text colours
   text: {
     primary: '#1A1A2E',      // Keep - good contrast
     secondary: '#3d4a5c',    // Was #475569 (now 7.2:1)
     tertiary: '#52637a',     // Was #64748B (now 4.6:1)
     inverse: '#FFFFFF',
     muted: '#6b7a8c',        // For less important text (4.5:1)
   },
   ```

2. **Update constants.ts** colour references
   - Search for all hardcoded `#667eea` references
   - Replace with new brand primary `#5558d6`
   - Search for all `#64748B` references
   - Replace with new tertiary `#52637a`

3. **Update component inline styles**
   Files to update:
   - `app/components/ChapterEditor.tsx` (Lines 427-570)
   - `app/components/shared/ProjectNavigation.tsx`
   - `app/quick-start/page.tsx`
   - `app/projects/[id]/page.tsx`

4. **Add focus shadow with sufficient contrast**
   ```typescript
   // In design-tokens.ts
   focus: {
     outline: '2px solid #5558d6',
     outlineOffset: '2px',
     shadow: '0 0 0 3px rgba(85, 88, 214, 0.3)',
   }
   ```

5. **Create colour contrast utility**
   ```typescript
   // app/lib/accessibility.ts
   export const a11yColors = {
     // Text on white background
     textOnWhite: {
       primary: '#1A1A2E',   // 15.4:1
       secondary: '#3d4a5c', // 7.2:1
       tertiary: '#52637a',  // 4.6:1
       link: '#5558d6',      // 4.52:1
     },
     // Text on dark background
     textOnDark: {
       primary: '#FFFFFF',
       secondary: '#E2E8F0',
       muted: '#94A3B8',
     },
     // Status colours (all pass 4.5:1 on white)
     status: {
       success: '#059669',   // Was #10B981
       warning: '#b45309',   // Was #D97706
       error: '#b91c1c',     // Was #DC2626
       info: '#2563eb',      // Was #3B82F6
     }
   }
   ```

### Acceptance Criteria
- [ ] All text meets 4.5:1 contrast ratio on backgrounds
- [ ] Large text (18pt+) meets 3:1 minimum
- [ ] Interactive elements have 3:1 contrast
- [ ] Focus indicators clearly visible
- [ ] Colour changes don't break visual hierarchy

### Testing
- Use browser DevTools accessibility audit
- Test with Colour Contrast Analyser tool
- Visual inspection in bright/dim lighting
- Ensure status colours still distinguishable

---

## Task 1.4: Add Keyboard Navigation & Focus Indicators

**Priority:** CRITICAL
**Estimated Effort:** 12 hours
**Files:** Multiple components

### Current State
- Some ARIA labels present but incomplete
- Focus indicators missing or insufficient
- No keyboard shortcuts implemented
- Tab order potentially broken in collapsible sections

### Implementation Steps

### 1.4.1 Add Focus Indicators (4 hours)

**Global styles** - Create `app/styles/accessibility.css`:
```css
/* Focus indicators for all interactive elements */
:focus-visible {
  outline: 2px solid #5558d6;
  outline-offset: 2px;
}

/* Remove default outline when using mouse */
:focus:not(:focus-visible) {
  outline: none;
}

/* High contrast focus for buttons */
button:focus-visible,
[role="button"]:focus-visible {
  outline: 2px solid #5558d6;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(85, 88, 214, 0.2);
}

/* Focus within for composite widgets */
[role="listbox"]:focus-within,
[role="menu"]:focus-within {
  outline: 2px solid #5558d6;
  outline-offset: 2px;
}

/* Skip link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #5558d6;
  color: white;
  padding: 8px 16px;
  z-index: 10000;
  transition: top 0.2s;
}

.skip-link:focus {
  top: 0;
}
```

**Import in layout.tsx:**
```typescript
import '../styles/accessibility.css'
```

### 1.4.2 Add Skip Link (1 hour)

**File:** `app/layout.tsx`
```typescript
// Add as first element in body
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

// Add id to main content area
<main id="main-content" tabIndex={-1}>
  {children}
</main>
```

### 1.4.3 Implement Keyboard Shortcuts (4 hours)

**Create:** `app/hooks/useKeyboardShortcuts.ts`
```typescript
import { useEffect, useCallback } from 'react'

interface Shortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  action: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger in input/textarea
    const target = event.target as HTMLElement
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
      // Allow Escape in inputs
      if (event.key !== 'Escape') return
    }

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrlKey ? (event.ctrlKey || event.metaKey) : true
      const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey

      if (event.key.toLowerCase() === shortcut.key.toLowerCase() && ctrlMatch && shiftMatch) {
        event.preventDefault()
        shortcut.action()
        return
      }
    }
  }, [shortcuts])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Common shortcuts
export const EDITOR_SHORTCUTS = [
  { key: 's', ctrlKey: true, description: 'Save chapter' },
  { key: 'z', ctrlKey: true, description: 'Undo' },
  { key: 'z', ctrlKey: true, shiftKey: true, description: 'Redo' },
  { key: 'f', ctrlKey: true, description: 'Find & Replace' },
  { key: 'Escape', description: 'Close modal/cancel' },
]

export const NAVIGATION_SHORTCUTS = [
  { key: 'n', description: 'New novel' },
  { key: '/', description: 'Search' },
  { key: '?', shiftKey: true, description: 'Show shortcuts help' },
]
```

**Integrate in ChapterEditor.tsx:**
```typescript
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

// Inside component
useKeyboardShortcuts([
  { key: 's', ctrlKey: true, action: handleSave, description: 'Save' },
  { key: 'Escape', action: () => setShowFindReplace(false), description: 'Close' },
])
```

### 1.4.4 Fix Navigation Keyboard Support (3 hours)

**File:** `app/components/shared/ProjectNavigation.tsx`

1. Add arrow key navigation:
```typescript
const handleKeyDown = (event: React.KeyboardEvent, groupId: string, itemIndex: number) => {
  const items = navigationGroups.find(g => g.id === groupId)?.items || []

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      // Focus next item or first item of next group
      focusNextItem(groupId, itemIndex)
      break
    case 'ArrowUp':
      event.preventDefault()
      // Focus previous item
      focusPreviousItem(groupId, itemIndex)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      // Navigate to item
      navigateToItem(items[itemIndex])
      break
    case 'Home':
      event.preventDefault()
      // Focus first item
      focusFirstItem()
      break
    case 'End':
      event.preventDefault()
      // Focus last item
      focusLastItem()
      break
  }
}
```

2. Add proper ARIA attributes:
```typescript
<nav aria-label="Project navigation">
  {groups.map(group => (
    <div role="group" aria-labelledby={`${group.id}-header`}>
      <button
        id={`${group.id}-header`}
        aria-expanded={expandedGroups.includes(group.id)}
        aria-controls={`${group.id}-content`}
      >
        {group.label}
      </button>
      <ul
        id={`${group.id}-content`}
        role="list"
        aria-hidden={!expandedGroups.includes(group.id)}
      >
        {group.items.map((item, index) => (
          <li role="listitem">
            <a
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              aria-disabled={item.locked}
              tabIndex={item.locked ? -1 : 0}
              onKeyDown={(e) => handleKeyDown(e, group.id, index)}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  ))}
</nav>
```

### Acceptance Criteria
- [ ] All interactive elements have visible focus indicator
- [ ] Skip link appears on Tab and works correctly
- [ ] Ctrl+S saves in editor
- [ ] Escape closes modals
- [ ] Arrow keys navigate within navigation groups
- [ ] Tab order follows logical reading order
- [ ] Locked items not focusable via keyboard

### Testing
- Navigate entire app using only keyboard
- Test with screen reader (NVDA/VoiceOver)
- Verify focus never gets trapped
- Ensure all actions achievable via keyboard

---

## Task 1.5: Fix Genre Selection Labelling

**Priority:** HIGH
**Estimated Effort:** 2 hours
**File:** `app/quick-start/page.tsx`

### Current State
- Lines 420-456: Genre selection grid
- Lines 422-423: Max 2 genres validation
- No explanation of limit or blending

### Implementation Steps

1. **Update label** (around Line 410)
   ```typescript
   <h3 style={{ marginBottom: '1rem' }}>
     Choose 1-2 Genres to Blend
     <span style={{
       fontSize: '0.875rem',
       color: '#52637a',
       fontWeight: 'normal',
       marginLeft: '0.5rem'
     }}>
       (Maximum 2)
     </span>
   </h3>
   ```

2. **Add blend preview** (after genre selection)
   ```typescript
   {quickGenres.length === 2 && (
     <div style={{
       marginTop: '1rem',
       padding: '0.75rem 1rem',
       backgroundColor: '#F0F4FF',
       borderRadius: '8px',
       fontSize: '0.875rem',
       color: '#5558d6'
     }}>
       <strong>Genre Blend:</strong> {quickGenres[0]} + {quickGenres[1]}
       {/* Optional: Show blend name if defined */}
     </div>
   )}
   ```

3. **Improve disabled state tooltip** (Lines 438-455)
   ```typescript
   <button
     key={genre.id}
     onClick={() => handleGenreToggle(genre.id)}
     disabled={!canSelect}
     title={!canSelect ? 'Unselect a genre to choose this one' : genre.label}
     aria-pressed={isSelected}
     style={{
       ...buttonStyle,
       opacity: canSelect ? 1 : 0.4, // Was 0.5
       cursor: canSelect ? 'pointer' : 'not-allowed',
     }}
   >
     {genre.emoji} {genre.label}
   </button>
   ```

4. **Add ARIA for accessibility**
   ```typescript
   <div
     role="group"
     aria-label="Genre selection, choose 1 to 2 genres"
   >
     {genres.map(genre => (
       <button
         role="checkbox"
         aria-checked={isSelected}
         aria-disabled={!canSelect}
       >
   ```

### Acceptance Criteria
- [ ] Label clearly states "1-2 Genres" with "(Maximum 2)"
- [ ] Disabled genres show tooltip explaining why
- [ ] Selected genres show blend preview
- [ ] Screen readers announce selection state

### Testing
- Select 2 genres - blend preview appears
- Hover disabled genre - tooltip explains
- Test with screen reader

---

## Phase 1 Summary

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| 1.1 Remove View Mode | CRITICAL | 4h | None |
| 1.2 Auto-save | CRITICAL | 8h | 1.1 |
| 1.3 Colour Contrast | CRITICAL | 6h | None |
| 1.4 Keyboard Nav | CRITICAL | 12h | 1.3 |
| 1.5 Genre Labels | HIGH | 2h | None |

**Total Estimated Effort:** 32 hours

### Success Metrics
- Zero editor mode confusion in user testing
- Zero data loss incidents reported
- WCAG 1.4.3 colour contrast AA compliance
- Keyboard navigation success rate >80%
- Genre selection error rate reduced by 50%

### Dependencies
- Tasks 1.1 and 1.2 should be done together (editor changes)
- Task 1.3 should be done before 1.4 (colours used in focus indicators)
- Task 1.5 can be done independently

### Rollback Plan
- All changes are additive or modifications to existing code
- Feature flags can wrap auto-save if issues arise
- Colour changes can be reverted via design tokens
- Keep backup of original ChapterEditor.tsx

---

## Files Modified in Phase 1

| File | Changes |
|------|---------|
| `app/components/ChapterEditor.tsx` | Remove view mode, add auto-save |
| `app/lib/design-tokens.ts` | Update colour values |
| `app/lib/constants.ts` | Update colour references |
| `app/styles/accessibility.css` | New file - focus styles |
| `app/hooks/useKeyboardShortcuts.ts` | New file - keyboard handling |
| `app/layout.tsx` | Add skip link, import styles |
| `app/components/shared/ProjectNavigation.tsx` | Add ARIA, keyboard nav |
| `app/quick-start/page.tsx` | Fix genre labels |

---

*Phase 1 Implementation Plan*
*NovelForge UX Improvement Project*
*27 January 2026*
