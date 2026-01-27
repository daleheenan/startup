# Phase 3: Mobile & Forms Implementation Plan

**Duration:** 2 weeks (Sprints 5-6)
**Focus:** Mobile Experience, Form Improvements, Accessibility
**Priority:** MEDIUM-HIGH
**Prerequisites:** Phases 1-2 complete

---

## Overview

Phase 3 addresses mobile user experience and form accessibility issues. Mobile users currently lack access to project-level navigation, and forms have inconsistent patterns that create friction.

---

## Task 3.1: Fix Mobile Project Navigation

**Priority:** HIGH
**Estimated Effort:** 10 hours
**File:** `app/components/MobileNavigation.tsx`

### Current State
- Lines 112-225: Header only shows hamburger menu
- Lines 270-389: Drawer shows only 3 global nav items (Projects, New Project, Settings)
- No project-level navigation accessible on mobile
- Lines 54-73: Online/offline status tracking exists

### Problem
Mobile users cannot navigate to Characters, World, Plot, Outline, Chapters, etc. when viewing a project.

### Implementation Steps

### 3.1.1 Detect Project Context

**Add project detection** (after Line 53):
```typescript
const pathname = usePathname()
const params = useParams()

// Detect if we're in a project context
const isInProject = pathname.startsWith('/projects/') && params.id
const projectId = params.id as string | undefined

// Fetch project data for navigation if in project
const [projectData, setProjectData] = useState<ProjectNavData | null>(null)

useEffect(() => {
  if (projectId) {
    // Fetch minimal project data for navigation
    fetch(`/api/projects/${projectId}/nav-data`)
      .then(res => res.json())
      .then(setProjectData)
      .catch(console.error)
  } else {
    setProjectData(null)
  }
}, [projectId])
```

### 3.1.2 Create Project Navigation Section

**Add inside drawer** (after Line 330):
```typescript
{/* Project Navigation - Only show when in project context */}
{isInProject && projectData && (
  <div style={{ marginTop: spacing[4], borderTop: `1px solid ${colors.border.default}`, paddingTop: spacing[4] }}>
    <div style={{
      fontSize: '0.75rem',
      fontWeight: 600,
      color: colors.text.tertiary,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: spacing[3],
      paddingLeft: spacing[4],
    }}>
      {projectData.title || 'Current Project'}
    </div>

    {/* Project Navigation Groups */}
    {PROJECT_NAV_GROUPS.map(group => (
      <div key={group.id} style={{ marginBottom: spacing[2] }}>
        <button
          onClick={() => toggleMobileGroup(group.id)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${spacing[3]} ${spacing[4]}`,
            background: 'none',
            border: 'none',
            color: colors.text.secondary,
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
          aria-expanded={expandedMobileGroups.includes(group.id)}
        >
          <span>{group.icon} {group.label}</span>
          <span style={{
            transform: expandedMobileGroups.includes(group.id) ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}>
            ▼
          </span>
        </button>

        {expandedMobileGroups.includes(group.id) && (
          <div style={{ paddingLeft: spacing[6] }}>
            {group.items.map(item => {
              const isActive = pathname === item.href
              const isLocked = !canAccessStep(item.workflowStep, projectData.workflowStatus)

              return (
                <Link
                  key={item.id}
                  href={isLocked ? '#' : item.href.replace('[id]', projectId!)}
                  onClick={(e) => {
                    if (isLocked) {
                      e.preventDefault()
                      // Show toast explaining why locked
                      return
                    }
                    closeDrawer()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[3],
                    padding: `${spacing[3]} ${spacing[4]}`,
                    color: isLocked
                      ? colors.text.tertiary
                      : isActive
                        ? colors.brand.primary
                        : colors.text.secondary,
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    opacity: isLocked ? 0.5 : 1,
                    backgroundColor: isActive ? colors.background.muted : 'transparent',
                    borderRadius: borderRadius.md,
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  aria-disabled={isLocked}
                >
                  {isLocked && <span aria-label="Locked">🔒</span>}
                  {item.label}
                  {getStatusBadge(item.id, projectData.status)}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    ))}
  </div>
)}
```

### 3.1.3 Add Project Navigation Constants

**Create:** `app/lib/mobile-navigation.ts`
```typescript
export const PROJECT_NAV_GROUPS = [
  {
    id: 'overview',
    icon: '📋',
    label: 'Overview',
    items: [
      { id: 'overview', label: 'Project Overview', href: '/projects/[id]', workflowStep: 'concept' },
    ],
  },
  {
    id: 'elements',
    icon: '👥',
    label: 'Elements',
    items: [
      { id: 'characters', label: 'Characters', href: '/projects/[id]/characters', workflowStep: 'characters' },
      { id: 'world', label: 'World', href: '/projects/[id]/world', workflowStep: 'world' },
    ],
  },
  {
    id: 'story',
    icon: '📖',
    label: 'Story',
    items: [
      { id: 'plot', label: 'Plot', href: '/projects/[id]/plot', workflowStep: 'plots' },
      { id: 'outline', label: 'Outline', href: '/projects/[id]/outline', workflowStep: 'outline' },
    ],
  },
  {
    id: 'novel',
    icon: '✍️',
    label: 'Novel',
    items: [
      { id: 'chapters', label: 'Chapters', href: '/projects/[id]/chapters', workflowStep: 'chapters' },
      { id: 'analytics', label: 'Analytics', href: '/projects/[id]/analytics', workflowStep: 'chapters' },
    ],
  },
  {
    id: 'editorial',
    icon: '📝',
    label: 'Editorial',
    items: [
      { id: 'editorial-report', label: 'Editorial Report', href: '/projects/[id]/editorial-report', workflowStep: 'editorial-report' },
    ],
  },
]
```

### 3.1.4 Add Mobile Group State

```typescript
const [expandedMobileGroups, setExpandedMobileGroups] = useState<string[]>([])

const toggleMobileGroup = (groupId: string) => {
  setExpandedMobileGroups(prev =>
    prev.includes(groupId)
      ? prev.filter(id => id !== groupId)
      : [...prev, groupId]
  )
}

// Auto-expand active group when drawer opens
useEffect(() => {
  if (isDrawerOpen && isInProject) {
    const activeGroup = PROJECT_NAV_GROUPS.find(group =>
      group.items.some(item => pathname.includes(item.id))
    )
    if (activeGroup && !expandedMobileGroups.includes(activeGroup.id)) {
      setExpandedMobileGroups(prev => [...prev, activeGroup.id])
    }
  }
}, [isDrawerOpen, pathname, isInProject])
```

### 3.1.5 Create Nav Data API Endpoint

**Create:** `app/api/projects/[id]/nav-data/route.ts`
```typescript
import { NextResponse } from 'next/server'
import { getProject } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const project = await getProject(params.id)

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Return minimal data needed for navigation
  return NextResponse.json({
    title: project.title,
    workflowStatus: {
      hasCharacters: project.characters?.length > 0,
      hasWorld: project.worldElements?.length > 0,
      hasPlots: project.plots?.length > 0,
      hasOutline: project.outline !== null,
      hasChapters: project.chapters?.length > 0,
    },
    status: {
      characters: project.characters?.length > 0 ? 'completed' : 'pending',
      world: project.worldElements?.length > 0 ? 'completed' : 'pending',
      plot: project.plots?.length > 0 ? 'completed' : 'pending',
      outline: project.outline ? 'completed' : 'pending',
      chapters: project.chapters?.filter(c => c.content).length || 0,
    },
  })
}
```

### Acceptance Criteria
- [ ] Mobile drawer shows project navigation when in project context
- [ ] Navigation groups are collapsible
- [ ] Active page highlighted
- [ ] Locked items show lock icon and are not clickable
- [ ] Status badges show completion state
- [ ] Drawer closes after navigation

### Testing
- Open project on mobile - drawer shows project nav
- Tap Characters - navigates and closes drawer
- Locked items cannot be clicked
- Navigate between pages - correct item highlighted

---

## Task 3.2: Enforce Touch-Friendly Targets

**Priority:** HIGH
**Estimated Effort:** 6 hours
**Files:** Multiple components

### Current State
- Touch targets inconsistent across app
- Some buttons too small for comfortable mobile use
- Genre grid creates tiny buttons on mobile

### WCAG Requirement
- Minimum touch target: 44x44 pixels

### Implementation Steps

### 3.2.1 Create Touch Target Utility

**Create:** `app/lib/touch-targets.ts`
```typescript
import { CSSProperties } from 'react'

export const MIN_TOUCH_TARGET = 44 // pixels

export const touchTargetStyles: CSSProperties = {
  minWidth: `${MIN_TOUCH_TARGET}px`,
  minHeight: `${MIN_TOUCH_TARGET}px`,
}

// For inline elements that need touch-friendly hit areas
export const touchTargetPadding = (currentPadding: string = '0'): CSSProperties => ({
  position: 'relative' as const,
  // Add invisible touch area
  '::after': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    minWidth: `${MIN_TOUCH_TARGET}px`,
    minHeight: `${MIN_TOUCH_TARGET}px`,
  },
})

// Media query for mobile-specific sizing
export const mobileButtonStyles: CSSProperties = {
  '@media (max-width: 768px)': {
    minHeight: `${MIN_TOUCH_TARGET}px`,
    padding: '12px 16px',
  },
}
```

### 3.2.2 Update Genre Selection Grid

**File:** `app/quick-start/page.tsx` (Lines 415-460)

```typescript
// Update grid to 2 columns on mobile
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', // Was repeat(4, 1fr)
    gap: spacing[3],
  }}
  // Or use CSS media query
  className="genre-grid"
>
  {GENRES.map(genre => (
    <button
      key={genre.id}
      style={{
        ...buttonStyle,
        minHeight: '48px', // Ensure touch friendly
        padding: `${spacing[3]} ${spacing[4]}`,
        fontSize: '0.875rem',
      }}
    >
      {genre.emoji} {genre.label}
    </button>
  ))}
</div>
```

**Add CSS class:**
```css
/* In globals.css or relevant stylesheet */
.genre-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

@media (max-width: 768px) {
  .genre-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .genre-grid {
    grid-template-columns: 1fr;
  }
}
```

### 3.2.3 Update Button Components Throughout

**Files to update:**
- `app/components/ChaptersList.tsx`
- `app/components/ChapterEditor.tsx`
- `app/projects/[id]/page.tsx`

**Pattern to apply:**
```typescript
<button
  style={{
    ...existingStyles,
    minHeight: '44px',
    padding: '10px 16px', // Increased from smaller values
  }}
>
```

### 3.2.4 Update Navigation Link Targets

**File:** `app/components/shared/ProjectNavigation.tsx`

```typescript
// Ensure nav items have sufficient touch targets
<Link
  href={item.href}
  style={{
    display: 'flex',
    alignItems: 'center',
    minHeight: '44px', // Touch-friendly
    padding: `${spacing[3]} ${spacing[4]}`,
    // ... rest of styles
  }}
>
```

### Acceptance Criteria
- [ ] All interactive elements minimum 44x44px on mobile
- [ ] Genre grid shows 2 columns on tablet, 1 on phone
- [ ] Buttons have adequate padding for finger taps
- [ ] Navigation links touch-friendly
- [ ] No overlapping touch targets

### Testing
- Test on actual mobile devices
- Use Chrome DevTools device emulation
- Tap every button/link - should be easy to hit
- No accidental taps on adjacent elements

---

## Task 3.3: Optimise Forms for Mobile

**Priority:** MEDIUM
**Estimated Effort:** 6 hours
**Files:** Form components

### Current State
- Font sizes may trigger iOS zoom (< 16px)
- Input padding inconsistent
- Textareas fixed height

### Implementation Steps

### 3.3.1 Create Mobile Form Styles

**Create:** `app/styles/forms.css`
```css
/* Prevent iOS zoom on focus */
input,
textarea,
select {
  font-size: 16px !important; /* Minimum to prevent zoom */
}

@media (max-width: 768px) {
  /* Increase touch targets for form elements */
  input[type="text"],
  input[type="email"],
  input[type="password"],
  input[type="number"],
  textarea,
  select {
    min-height: 48px;
    padding: 12px 16px;
    border-radius: 8px;
  }

  /* Stack labels above inputs */
  .form-group {
    flex-direction: column;
    align-items: stretch;
  }

  .form-group label {
    margin-bottom: 8px;
  }

  /* Full-width buttons on mobile */
  .form-actions button {
    width: 100%;
    margin-bottom: 12px;
  }

  .form-actions {
    flex-direction: column;
  }
}

/* Auto-expanding textarea */
.auto-expand-textarea {
  min-height: 100px;
  resize: vertical;
  overflow-y: auto;
}
```

### 3.3.2 Create Auto-Expanding Textarea Component

**Create:** `app/components/ui/AutoExpandTextarea.tsx`
```typescript
'use client'

import { useRef, useEffect, TextareaHTMLAttributes } from 'react'
import { colors, spacing, borderRadius } from '../../lib/design-tokens'

interface AutoExpandTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number
  maxRows?: number
}

export function AutoExpandTextarea({
  minRows = 3,
  maxRows = 10,
  value,
  onChange,
  style,
  ...props
}: AutoExpandTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to calculate new scroll height
    textarea.style.height = 'auto'

    // Calculate line height
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24
    const minHeight = lineHeight * minRows
    const maxHeight = lineHeight * maxRows

    // Set new height within bounds
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
    textarea.style.height = `${newHeight}px`

    // Show scrollbar if content exceeds max
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [value, minRows, maxRows])

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      style={{
        width: '100%',
        padding: spacing[4],
        fontSize: '16px', // Prevent iOS zoom
        lineHeight: '1.5',
        border: `1px solid ${colors.border.default}`,
        borderRadius: borderRadius.md,
        resize: 'none',
        fontFamily: 'inherit',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        ...style,
      }}
      {...props}
    />
  )
}
```

### 3.3.3 Update Quick Start Form

**File:** `app/quick-start/page.tsx`

Replace textarea (around Line 600):
```typescript
import { AutoExpandTextarea } from '../components/ui/AutoExpandTextarea'

// Replace fixed rows textarea
<AutoExpandTextarea
  value={idea}
  onChange={(e) => setIdea(e.target.value)}
  placeholder="Describe your story idea..."
  minRows={3}
  maxRows={8}
  aria-label="Story idea"
/>
```

### 3.3.4 Update Input Focus States

```typescript
// Add to form inputs
const inputFocusStyles = {
  outline: 'none',
  borderColor: colors.brand.primary,
  boxShadow: `0 0 0 3px ${colors.brand.primaryAlpha}`,
}

// Apply on focus
<input
  onFocus={(e) => {
    e.target.style.borderColor = colors.brand.primary
    e.target.style.boxShadow = `0 0 0 3px rgba(85, 88, 214, 0.2)`
  }}
  onBlur={(e) => {
    e.target.style.borderColor = colors.border.default
    e.target.style.boxShadow = 'none'
  }}
/>
```

### Acceptance Criteria
- [ ] All form inputs 16px+ font size
- [ ] Inputs have 48px+ height on mobile
- [ ] Textareas auto-expand with content
- [ ] Labels stack above inputs on mobile
- [ ] Clear focus states visible
- [ ] No iOS zoom on input focus

### Testing
- Test on iPhone Safari - no zoom on focus
- Type in textarea - expands smoothly
- All inputs comfortable to tap
- Forms usable in landscape and portrait

---

## Task 3.4: Add Comprehensive ARIA Labels

**Priority:** MEDIUM
**Estimated Effort:** 8 hours
**Files:** Multiple components

### Current State
- Some ARIA labels present but incomplete
- Genre buttons lack proper roles
- Error messages not associated with inputs
- Required fields missing `aria-required`

### Implementation Steps

### 3.4.1 Fix Genre Selection Accessibility

**File:** `app/quick-start/page.tsx` (Lines 420-456)

```typescript
<div
  role="group"
  aria-labelledby="genre-selection-label"
>
  <h3 id="genre-selection-label">
    Choose 1-2 Genres to Blend
    <span className="sr-only">(select up to 2 genres)</span>
  </h3>

  <div
    role="listbox"
    aria-multiselectable="true"
    aria-label="Available genres"
    className="genre-grid"
  >
    {GENRES.map(genre => {
      const isSelected = quickGenres.includes(genre.id)
      const canSelect = quickGenres.length < 2 || isSelected

      return (
        <button
          key={genre.id}
          role="option"
          aria-selected={isSelected}
          aria-disabled={!canSelect}
          onClick={() => handleGenreToggle(genre.id)}
          disabled={!canSelect}
          style={/* ... */}
        >
          <span aria-hidden="true">{genre.emoji}</span>
          {genre.label}
        </button>
      )
    })}
  </div>

  {/* Screen reader announcement */}
  <div
    role="status"
    aria-live="polite"
    className="sr-only"
  >
    {quickGenres.length === 0 && 'No genres selected'}
    {quickGenres.length === 1 && `${quickGenres[0]} selected. Select one more or continue.`}
    {quickGenres.length === 2 && `${quickGenres.join(' and ')} selected. Maximum reached.`}
  </div>
</div>
```

### 3.4.2 Add Screen Reader Only Utility

**Add to:** `app/styles/accessibility.css`
```css
/* Screen reader only - visually hidden but accessible */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Show on focus for skip links etc */
.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

### 3.4.3 Associate Errors with Inputs

**Pattern for form validation:**
```typescript
interface FormFieldProps {
  id: string
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

function FormField({ id, label, error, required, children }: FormFieldProps) {
  const errorId = `${id}-error`
  const descriptionId = `${id}-description`

  return (
    <div className="form-group">
      <label
        htmlFor={id}
        style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}
      >
        {label}
        {required && (
          <span aria-hidden="true" style={{ color: colors.status.error }}>*</span>
        )}
      </label>

      {React.cloneElement(children as React.ReactElement, {
        id,
        'aria-required': required,
        'aria-invalid': !!error,
        'aria-describedby': error ? errorId : undefined,
      })}

      {error && (
        <div
          id={errorId}
          role="alert"
          style={{
            color: colors.status.error,
            fontSize: '0.875rem',
            marginTop: spacing[1],
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
```

### 3.4.4 Update Project Navigation ARIA

**File:** `app/components/shared/ProjectNavigation.tsx`

```typescript
<nav
  aria-label="Project navigation"
  role="navigation"
>
  {groups.map(group => (
    <div
      key={group.id}
      role="group"
      aria-labelledby={`group-${group.id}-label`}
    >
      <button
        id={`group-${group.id}-label`}
        aria-expanded={expandedGroups.includes(group.id)}
        aria-controls={`group-${group.id}-content`}
        onClick={() => toggleGroup(group.id)}
      >
        {group.label}
        <span aria-hidden="true">{expandedGroups.includes(group.id) ? '▼' : '▶'}</span>
      </button>

      <ul
        id={`group-${group.id}-content`}
        role="list"
        hidden={!expandedGroups.includes(group.id)}
      >
        {group.items.map(item => (
          <li key={item.id} role="listitem">
            <Link
              href={item.href}
              aria-current={isActive(item) ? 'page' : undefined}
              aria-disabled={item.locked}
              tabIndex={item.locked ? -1 : 0}
            >
              {item.locked && <span aria-label="Locked">🔒</span>}
              {item.label}
              {item.status === 'completed' && (
                <span aria-label="Completed">✓</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  ))}
</nav>
```

### 3.4.5 Add Live Regions for Status Updates

```typescript
// Add to generation progress, save status, etc.
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {generationStatus === 'generating' && 'Generating content...'}
  {generationStatus === 'done' && 'Generation complete'}
  {generationStatus === 'error' && 'Generation failed'}
</div>
```

### Acceptance Criteria
- [ ] All form inputs have associated labels
- [ ] Error messages linked to inputs via `aria-describedby`
- [ ] Required fields have `aria-required="true"`
- [ ] Genre selection uses proper listbox pattern
- [ ] Navigation has proper landmark roles
- [ ] Status updates announced to screen readers
- [ ] Locked items have clear disabled state

### Testing
- Test with NVDA/VoiceOver
- Verify all form fields read correctly
- Errors announced when fields invalid
- Navigation structure clear to screen reader
- Status changes announced

---

## Task 3.5: Add Time Period Impact Warnings

**Priority:** MEDIUM
**Estimated Effort:** 4 hours
**File:** `app/quick-start/page.tsx`

### Current State
- Lines 14-40: Time period constraints defined
- Constraints applied silently without user awareness
- Users may expect incompatible elements

### Implementation Steps

### 3.5.1 Create Time Period Warning Component

```typescript
interface TimePeriodWarningProps {
  period: string
  selectedGenres: string[]
}

function TimePeriodWarning({ period, selectedGenres }: TimePeriodWarningProps) {
  const warnings = getTimePeriodWarnings(period, selectedGenres)

  if (warnings.length === 0) return null

  return (
    <div
      role="alert"
      style={{
        marginTop: spacing[4],
        padding: spacing[4],
        backgroundColor: colors.background.warning,
        borderRadius: borderRadius.md,
        border: `1px solid ${colors.status.warning}`,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing[3],
      }}>
        <span aria-hidden="true" style={{ fontSize: '1.25rem' }}>⚠️</span>
        <div>
          <strong style={{ color: colors.status.warning }}>
            {period} Setting Constraints
          </strong>
          <ul style={{
            marginTop: spacing[2],
            paddingLeft: spacing[5],
            color: colors.text.secondary,
            fontSize: '0.875rem',
          }}>
            {warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
```

### 3.5.2 Define Warning Logic

```typescript
function getTimePeriodWarnings(period: string, genres: string[]): string[] {
  const warnings: string[] = []

  if (period === 'modern-day') {
    if (genres.includes('sci-fi')) {
      warnings.push('Near-future tech only (no FTL travel, alien civilisations)')
    }
    if (genres.includes('fantasy')) {
      warnings.push('Urban/contemporary fantasy elements only')
    }
    warnings.push('Present-day technology and social norms apply')
  }

  if (period === 'historical' || period === 'past') {
    warnings.push('Technology limited to historical period')
    if (genres.includes('sci-fi')) {
      warnings.push('Sci-fi elements will be steampunk/alternate history style')
    }
  }

  if (period === 'future') {
    if (genres.includes('historical')) {
      warnings.push('Historical elements will appear as flashbacks or records')
    }
  }

  return warnings
}
```

### 3.5.3 Integrate Warning Display

**File:** `app/quick-start/page.tsx` (after time period selector)

```typescript
{/* Time Period Selection */}
<TimePeriodSelector
  value={timePeriod}
  onChange={setTimePeriod}
  compact
/>

{/* Show warning if constraints apply */}
{timePeriod && quickGenres.length > 0 && (
  <TimePeriodWarning
    period={timePeriod}
    selectedGenres={quickGenres}
  />
)}
```

### Acceptance Criteria
- [ ] Warning appears when time period has constraints
- [ ] Specific constraints listed based on genre combination
- [ ] Warning uses appropriate alert role for accessibility
- [ ] Clear visual styling (warning colour scheme)
- [ ] Users understand what will/won't be included

### Testing
- Select Modern-Day + Sci-Fi - shows tech constraints
- Select Historical + Fantasy - shows period limits
- No genres selected - no warning
- Future + any genre - appropriate constraints shown

---

## Task 3.6: Implement Progressive Disclosure on Dashboard

**Priority:** MEDIUM
**Estimated Effort:** 6 hours
**File:** `app/projects/[id]/page.tsx`

### Current State
- Lines 471-1434: Everything shown at once
- Information overload for users
- Critical actions buried among details

### Implementation Steps

### 3.6.1 Create Collapsible Section Component

```typescript
interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  badge?: React.ReactNode
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  badge
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const contentId = `section-${title.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div style={{
      border: `1px solid ${colors.border.default}`,
      borderRadius: borderRadius.lg,
      marginBottom: spacing[4],
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: spacing[4],
          backgroundColor: isOpen ? colors.background.surface : colors.background.muted,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[3],
        }}>
          <span style={{
            transform: isOpen ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s',
          }}>
            ▶
          </span>
          <span style={{
            fontWeight: 600,
            color: colors.text.primary,
          }}>
            {title}
          </span>
          {badge}
        </span>
      </button>

      <div
        id={contentId}
        hidden={!isOpen}
        style={{
          padding: isOpen ? spacing[4] : 0,
          borderTop: isOpen ? `1px solid ${colors.border.default}` : 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}
```

### 3.6.2 Reorganise Project Dashboard

```typescript
// Above the fold - always visible
<div className="project-hero">
  {/* Current Status */}
  <ProjectStatusCard status={project.status} />

  {/* Next Action - most important */}
  <NextActionCard
    nextStep={getNextStep(project)}
    onAction={handleNextAction}
  />

  {/* Quick Stats */}
  <QuickStats
    chapters={project.chapters.length}
    words={project.totalWords}
    progress={progress}
  />
</div>

{/* Collapsible sections */}
<CollapsibleSection
  title="Story Concept"
  defaultOpen={!project.hasCharacters} // Open if early in workflow
  badge={project.storyConcept && <span style={completedBadge}>✓</span>}
>
  <StoryConcept concept={project.storyConcept} />
</CollapsibleSection>

<CollapsibleSection
  title="Story DNA"
  badge={project.storyDna && <span style={completedBadge}>✓</span>}
>
  <StoryDna dna={project.storyDna} />
</CollapsibleSection>

<CollapsibleSection title="Story Bible">
  <StoryBible bible={project.storyBible} />
</CollapsibleSection>

<CollapsibleSection title="Job Statistics">
  <JobStatistics stats={project.jobStats} />
</CollapsibleSection>

<CollapsibleSection title="Export Options">
  <ExportButtons project={project} />
</CollapsibleSection>
```

### 3.6.3 Create Next Action Card

```typescript
function NextActionCard({ nextStep, onAction }) {
  const actions = {
    characters: {
      title: 'Generate Characters',
      description: 'Create the cast for your story',
      buttonText: 'Generate Characters',
      icon: '👥',
    },
    world: {
      title: 'Build Your World',
      description: 'Define the setting and rules',
      buttonText: 'Generate World',
      icon: '🌍',
    },
    plot: {
      title: 'Develop Plot',
      description: 'Structure your story arc',
      buttonText: 'Create Plot',
      icon: '📖',
    },
    outline: {
      title: 'Create Outline',
      description: 'Plan your chapters',
      buttonText: 'Generate Outline',
      icon: '📝',
    },
    chapters: {
      title: 'Write Chapters',
      description: 'Generate your novel content',
      buttonText: 'Generate Chapters',
      icon: '✍️',
    },
    editorial: {
      title: 'Editorial Review',
      description: 'Get AI feedback on your novel',
      buttonText: 'Run Editorial Board',
      icon: '📋',
    },
    export: {
      title: 'Export Your Novel',
      description: 'Download in your preferred format',
      buttonText: 'Export',
      icon: '📤',
    },
  }

  const action = actions[nextStep]

  return (
    <div style={{
      background: colors.brand.gradient,
      borderRadius: borderRadius.xl,
      padding: spacing[6],
      color: colors.text.inverse,
    }}>
      <div style={{ fontSize: '2rem', marginBottom: spacing[2] }}>
        {action.icon}
      </div>
      <h3 style={{ fontSize: '1.25rem', marginBottom: spacing[2] }}>
        {action.title}
      </h3>
      <p style={{ marginBottom: spacing[4], opacity: 0.9 }}>
        {action.description}
      </p>
      <button
        onClick={() => onAction(nextStep)}
        style={{
          backgroundColor: colors.background.surface,
          color: colors.brand.primary,
          padding: `${spacing[3]} ${spacing[6]}`,
          borderRadius: borderRadius.md,
          border: 'none',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {action.buttonText}
      </button>
    </div>
  )
}
```

### Acceptance Criteria
- [ ] Above-fold shows: status, next action, quick stats
- [ ] Story Concept, DNA, Bible in collapsible sections
- [ ] Sections default closed except relevant ones
- [ ] Next action prominently displayed
- [ ] Reduced visual clutter
- [ ] All content still accessible

### Testing
- New project - see clear next action
- Completed project - see export options
- All sections expandable
- Mobile - sections work correctly

---

## Phase 3 Summary

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| 3.1 Mobile Project Nav | HIGH | 10h | Phase 2 |
| 3.2 Touch Targets | HIGH | 6h | None |
| 3.3 Mobile Forms | MEDIUM | 6h | 3.2 |
| 3.4 ARIA Labels | MEDIUM | 8h | None |
| 3.5 Time Period Warnings | MEDIUM | 4h | None |
| 3.6 Progressive Disclosure | MEDIUM | 6h | None |

**Total Estimated Effort:** 40 hours

### Success Metrics
- Mobile task completion >70%
- Form completion rate >90%
- Screen reader usability score >4/5
- No iOS zoom on input focus
- All buttons pass 44px touch target test

### Dependencies
- Phases 1-2 complete (colours, navigation fixes)
- Tasks 3.1-3.2 should be done first (core mobile)
- Tasks 3.3-3.6 can run in parallel

### Rollback Plan
- Mobile nav is additive - existing nav still works
- Touch targets increase won't break layouts
- ARIA labels are non-visual, easy to adjust
- Collapsible sections can default to open

---

## Files Created/Modified in Phase 3

| File | Status | Changes |
|------|--------|---------|
| `app/components/MobileNavigation.tsx` | MODIFIED | Add project navigation |
| `app/lib/mobile-navigation.ts` | NEW | Mobile nav constants |
| `app/api/projects/[id]/nav-data/route.ts` | NEW | Nav data endpoint |
| `app/lib/touch-targets.ts` | NEW | Touch target utilities |
| `app/styles/forms.css` | NEW | Mobile form styles |
| `app/components/ui/AutoExpandTextarea.tsx` | NEW | Auto-expand textarea |
| `app/quick-start/page.tsx` | MODIFIED | Touch targets, ARIA, warnings |
| `app/components/shared/ProjectNavigation.tsx` | MODIFIED | ARIA improvements |
| `app/projects/[id]/page.tsx` | MODIFIED | Progressive disclosure |
| `app/styles/accessibility.css` | MODIFIED | Add sr-only class |

---

*Phase 3 Implementation Plan*
*NovelForge UX Improvement Project*
*27 January 2026*
