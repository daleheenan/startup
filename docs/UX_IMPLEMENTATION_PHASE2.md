# Phase 2: Navigation & Workflow Implementation Plan

**Duration:** 2 weeks (Sprints 3-4)
**Focus:** Navigation Clarity, Workflow Guidance
**Priority:** HIGH
**Prerequisites:** Phase 1 complete

---

## Overview

Phase 2 addresses navigation confusion and workflow guidance issues. Users will understand where they are in the application, what steps are required, and have control over AI generation processes.

---

## Task 2.1: Make Auto-generation Explicit

**Priority:** HIGH
**Estimated Effort:** 8 hours
**File:** `app/projects/[id]/page.tsx`

### Current State
- Lines 120: `forceAutoGenerate` parameter triggers generation
- Lines 243-363: Generation happens automatically on page load
- Lines 244-265: Silent check and trigger without user confirmation
- No explicit user consent before generating content

### Problem
Users are confused when characters, world elements, and plots appear without them taking explicit action.

### Implementation Steps

### 2.1.1 Create Confirmation Modal Component

**Create:** `app/components/GenerationConfirmModal.tsx`
```typescript
'use client'

import { colors, spacing, borderRadius, shadows } from '../lib/design-tokens'

interface GenerationConfirmModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  conceptTitle: string
}

export function GenerationConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  conceptTitle
}: GenerationConfirmModalProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onCancel}
        role="presentation"
      >
        {/* Modal */}
        <div
          role="dialog"
          aria-labelledby="generation-modal-title"
          aria-describedby="generation-modal-description"
          style={{
            backgroundColor: colors.background.surface,
            borderRadius: borderRadius.xl,
            padding: spacing[8],
            maxWidth: '500px',
            width: '90%',
            boxShadow: shadows.xl,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            id="generation-modal-title"
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: spacing[4],
              color: colors.text.primary,
            }}
          >
            Generate Story Foundation
          </h2>

          <p
            id="generation-modal-description"
            style={{
              color: colors.text.secondary,
              marginBottom: spacing[6],
              lineHeight: 1.6,
            }}
          >
            Based on your concept "<strong>{conceptTitle}</strong>", we'll now generate:
          </p>

          <ul style={{
            marginBottom: spacing[6],
            paddingLeft: spacing[6],
            color: colors.text.secondary,
            lineHeight: 1.8,
          }}>
            <li><strong>5-8 main characters</strong> with backstories and relationships</li>
            <li><strong>3-5 world-building elements</strong> matching your setting</li>
            <li><strong>Core plot structure</strong> extracted from your concept</li>
          </ul>

          <p style={{
            backgroundColor: colors.background.muted,
            padding: spacing[4],
            borderRadius: borderRadius.md,
            fontSize: '0.875rem',
            color: colors.text.tertiary,
            marginBottom: spacing[6],
          }}>
            ⏱️ This typically takes 1-2 minutes. You can review and edit all generated content afterwards.
          </p>

          <div style={{
            display: 'flex',
            gap: spacing[4],
            justifyContent: 'flex-end',
          }}>
            <button
              onClick={onCancel}
              style={{
                padding: `${spacing[3]} ${spacing[6]}`,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.border.default}`,
                backgroundColor: 'transparent',
                color: colors.text.secondary,
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: `${spacing[3]} ${spacing[6]}`,
                borderRadius: borderRadius.md,
                border: 'none',
                background: colors.brand.gradient,
                color: colors.text.inverse,
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 500,
              }}
            >
              Generate Story Foundation
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
```

### 2.1.2 Update Project Page Logic

**File:** `app/projects/[id]/page.tsx`

1. **Add state for modal** (after Line 98)
   ```typescript
   const [showGenerationModal, setShowGenerationModal] = useState(false)
   const [userConfirmedGeneration, setUserConfirmedGeneration] = useState(false)
   ```

2. **Replace auto-trigger with modal** (Lines 243-265)
   ```typescript
   // Replace automatic trigger with modal display
   useEffect(() => {
     const shouldGenerate = forceAutoGenerate &&
       hasStoryConcept &&
       !hasCharacters &&
       !hasWorld &&
       generationStatus === 'pending'

     if (shouldGenerate && !userConfirmedGeneration) {
       // Show modal instead of auto-generating
       setShowGenerationModal(true)
     }
   }, [forceAutoGenerate, hasStoryConcept, hasCharacters, hasWorld, generationStatus, userConfirmedGeneration])
   ```

3. **Handle confirmation**
   ```typescript
   const handleGenerationConfirm = () => {
     setShowGenerationModal(false)
     setUserConfirmedGeneration(true)
     // Trigger actual generation (existing code from lines 275-360)
     startGeneration()
   }

   const handleGenerationCancel = () => {
     setShowGenerationModal(false)
     // Remove autoGenerate from URL
     router.replace(`/projects/${id}`, { scroll: false })
   }
   ```

4. **Add modal to render** (in JSX)
   ```typescript
   <GenerationConfirmModal
     isOpen={showGenerationModal}
     onConfirm={handleGenerationConfirm}
     onCancel={handleGenerationCancel}
     conceptTitle={project?.storyConcept?.title || 'your concept'}
   />
   ```

### 2.1.3 Add "Skip AI, Create Manually" Option

In the modal, add alternative:
```typescript
<button
  onClick={handleSkipGeneration}
  style={{
    padding: `${spacing[3]} ${spacing[6]}`,
    borderRadius: borderRadius.md,
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.brand.primary,
    cursor: 'pointer',
    fontSize: '0.875rem',
    textDecoration: 'underline',
  }}
>
  Skip and create manually
</button>
```

### Acceptance Criteria
- [ ] Modal appears before any auto-generation
- [ ] Clear explanation of what will be generated
- [ ] Time estimate provided
- [ ] Cancel option available
- [ ] "Skip" option for manual creation
- [ ] No content generated without explicit confirmation

### Testing
- Create new project - modal should appear
- Click Cancel - no generation, stay on page
- Click Generate - generation proceeds with progress
- Click Skip - navigate to Characters page for manual entry

---

## Task 2.2: Fix Collapsible Navigation Confusion

**Priority:** HIGH
**Estimated Effort:** 6 hours
**File:** `app/components/shared/ProjectNavigation.tsx`

### Current State
- Lines 67-80: `expandedGroups` state manages collapsed sections
- Lines 94-104: Toggle logic allows any section to collapse
- Active section auto-expands but can be manually collapsed
- No breadcrumb showing current location

### Implementation Steps

### 2.2.1 Keep Active Group Always Expanded

**Update toggle logic** (Lines 94-104):
```typescript
const toggleGroup = (groupId: string) => {
  // Get active group from current path
  const activeGroup = getActiveGroupFromPath(pathname)

  // Prevent collapsing the active group
  if (groupId === activeGroup) {
    return // Don't allow collapsing active group
  }

  setExpandedGroups(prev => {
    if (prev.includes(groupId)) {
      return prev.filter(id => id !== groupId)
    }
    return [...prev, groupId]
  })
}
```

### 2.2.2 Persist Collapse State

**Add localStorage persistence**:
```typescript
// Load from localStorage on mount
useEffect(() => {
  const saved = localStorage.getItem(`nav-expanded-${projectId}`)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      // Always include active group
      const activeGroup = getActiveGroupFromPath(pathname)
      const withActive = [...new Set([...parsed, activeGroup])]
      setExpandedGroups(withActive)
    } catch {
      // Fallback to default
    }
  }
}, [projectId])

// Save to localStorage on change
useEffect(() => {
  localStorage.setItem(`nav-expanded-${projectId}`, JSON.stringify(expandedGroups))
}, [expandedGroups, projectId])
```

### 2.2.3 Add Visual Indicator for Collapsed Content

```typescript
// Show dot indicator when group has active item but is collapsed
{!isExpanded && hasActiveChild && (
  <span
    style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: colors.brand.primary,
      marginLeft: 'auto',
    }}
    aria-label="Contains current page"
  />
)}
```

### 2.2.4 Add "Expand All" / "Collapse All" Toggle

```typescript
<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: spacing[2] }}>
  <button
    onClick={() => {
      if (expandedGroups.length === navigationGroups.length) {
        // Collapse all except active
        const activeGroup = getActiveGroupFromPath(pathname)
        setExpandedGroups([activeGroup])
      } else {
        // Expand all
        setExpandedGroups(navigationGroups.map(g => g.id))
      }
    }}
    style={{
      fontSize: '0.75rem',
      color: colors.text.tertiary,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      textDecoration: 'underline',
    }}
  >
    {expandedGroups.length === navigationGroups.length ? 'Collapse all' : 'Expand all'}
  </button>
</div>
```

### Acceptance Criteria
- [ ] Active navigation group cannot be collapsed
- [ ] Collapse state persists between sessions
- [ ] Visual indicator shows when collapsed group contains active item
- [ ] Expand/Collapse all toggle available
- [ ] No disorientation when navigating

### Testing
- Navigate to Characters - Elements group stays expanded
- Try to collapse Elements group - should not collapse
- Refresh page - collapse state preserved
- Click Expand All - all groups expand

---

## Task 2.3: Add Breadcrumb Trail

**Priority:** HIGH
**Estimated Effort:** 4 hours
**Files:** New component + layout integration

### Implementation Steps

### 2.3.1 Create Breadcrumb Component

**Create:** `app/components/shared/Breadcrumb.tsx`
```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { colors, spacing } from '../../lib/design-tokens'

interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumb() {
  const pathname = usePathname()

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Projects', href: '/projects' }
    ]

    // Build breadcrumb based on path
    if (segments[0] === 'projects' && segments[1]) {
      // Project page
      breadcrumbs.push({ label: 'Project', href: `/projects/${segments[1]}` })

      if (segments[2]) {
        // Sub-page
        const subPageLabels: Record<string, string> = {
          'characters': 'Characters',
          'world': 'World',
          'plot': 'Plot',
          'outline': 'Outline',
          'chapters': 'Chapters',
          'analytics': 'Analytics',
          'editorial-report': 'Editorial Report',
          'follow-up': 'Follow-up',
        }
        const label = subPageLabels[segments[2]] || segments[2]
        breadcrumbs.push({ label })
      }
    } else if (segments[0] === 'quick-start') {
      breadcrumbs.push({ label: 'Quick Start' })
    } else if (segments[0] === 'full-customization') {
      breadcrumbs.push({ label: 'Full Customisation' })
    } else if (segments[0] === 'concepts') {
      breadcrumbs.push({ label: 'Story Concepts' })
    } else if (segments[0] === 'story-ideas') {
      breadcrumbs.push({ label: 'Story Ideas' })
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  // Don't show on dashboard
  if (pathname === '/projects' || pathname === '/') {
    return null
  }

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        padding: `${spacing[3]} ${spacing[6]}`,
        backgroundColor: colors.background.muted,
        borderBottom: `1px solid ${colors.border.default}`,
      }}
    >
      <ol
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          listStyle: 'none',
          margin: 0,
          padding: 0,
          fontSize: '0.875rem',
        }}
      >
        {breadcrumbs.map((crumb, index) => (
          <li
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
            }}
          >
            {index > 0 && (
              <span
                style={{ color: colors.text.tertiary }}
                aria-hidden="true"
              >
                /
              </span>
            )}
            {crumb.href && index < breadcrumbs.length - 1 ? (
              <Link
                href={crumb.href}
                style={{
                  color: colors.brand.primary,
                  textDecoration: 'none',
                }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                style={{ color: colors.text.primary }}
                aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
              >
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
```

### 2.3.2 Integrate in Layout

**File:** `app/projects/[id]/layout.tsx` (or relevant layout)
```typescript
import { Breadcrumb } from '../components/shared/Breadcrumb'

export default function ProjectLayout({ children }) {
  return (
    <>
      <Breadcrumb />
      {children}
    </>
  )
}
```

### Acceptance Criteria
- [ ] Breadcrumb shows: Projects > Project > Current Section
- [ ] All segments except current are clickable links
- [ ] Hidden on dashboard (no breadcrumb needed)
- [ ] Proper ARIA labelling for screen readers
- [ ] Visual separator between segments

### Testing
- Navigate to Characters - shows "Projects > Project > Characters"
- Click "Projects" - returns to projects list
- Click "Project" - returns to project overview

---

## Task 2.4: Implement Workflow Progress Indicator

**Priority:** HIGH
**Estimated Effort:** 8 hours
**Files:** New component + project page integration

### Implementation Steps

### 2.4.1 Create Progress Indicator Component

**Create:** `app/components/shared/WorkflowProgress.tsx`
```typescript
'use client'

import { colors, spacing, borderRadius } from '../../lib/design-tokens'

interface WorkflowStep {
  id: string
  label: string
  status: 'completed' | 'current' | 'upcoming' | 'locked'
}

interface WorkflowProgressProps {
  steps: WorkflowStep[]
  currentStep: string
  overallProgress: number // 0-100
}

export function WorkflowProgress({
  steps,
  currentStep,
  overallProgress
}: WorkflowProgressProps) {
  return (
    <div
      style={{
        backgroundColor: colors.background.surface,
        borderBottom: `1px solid ${colors.border.default}`,
        padding: `${spacing[4]} ${spacing[6]}`,
      }}
    >
      {/* Overall Progress Bar */}
      <div style={{ marginBottom: spacing[4] }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: spacing[2],
            fontSize: '0.875rem',
          }}
        >
          <span style={{ color: colors.text.secondary }}>Overall Progress</span>
          <span style={{ color: colors.brand.primary, fontWeight: 600 }}>
            {Math.round(overallProgress)}%
          </span>
        </div>
        <div
          style={{
            height: '8px',
            backgroundColor: colors.background.muted,
            borderRadius: borderRadius.full,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${overallProgress}%`,
              background: colors.brand.gradient,
              borderRadius: borderRadius.full,
              transition: 'width 0.3s ease',
            }}
            role="progressbar"
            aria-valuenow={overallProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: spacing[2],
        }}
      >
        {steps.map((step, index) => (
          <div
            key={step.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              flex: 1,
            }}
          >
            {/* Step Circle */}
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor:
                  step.status === 'completed' ? colors.status.success :
                  step.status === 'current' ? colors.brand.primary :
                  colors.background.muted,
                color:
                  step.status === 'completed' || step.status === 'current'
                    ? colors.text.inverse
                    : colors.text.tertiary,
                border: step.status === 'locked'
                  ? `2px dashed ${colors.border.default}`
                  : 'none',
              }}
            >
              {step.status === 'completed' ? '✓' : index + 1}
            </div>

            {/* Step Label */}
            <span
              style={{
                marginLeft: spacing[2],
                fontSize: '0.75rem',
                color:
                  step.status === 'current' ? colors.brand.primary :
                  step.status === 'completed' ? colors.status.success :
                  colors.text.tertiary,
                fontWeight: step.status === 'current' ? 600 : 400,
                display: index < steps.length - 1 ? 'block' : 'block',
              }}
            >
              {step.label}
            </span>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  backgroundColor:
                    step.status === 'completed'
                      ? colors.status.success
                      : colors.border.default,
                  margin: `0 ${spacing[2]}`,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 2.4.2 Create Progress Calculation Hook

**Create:** `app/hooks/useWorkflowProgress.ts`
```typescript
import { useMemo } from 'react'

interface Project {
  hasCharacters: boolean
  hasWorld: boolean
  hasPlots: boolean
  hasOutline: boolean
  chapterCount: number
  totalChapters: number
  hasEditorialReport: boolean
}

export function useWorkflowProgress(project: Project) {
  return useMemo(() => {
    const steps = [
      {
        id: 'concept',
        label: 'Concept',
        status: 'completed' as const, // Always done if we're on project page
        weight: 10,
      },
      {
        id: 'elements',
        label: 'Elements',
        status: (project.hasCharacters && project.hasWorld)
          ? 'completed' as const
          : 'current' as const,
        weight: 15,
      },
      {
        id: 'plot',
        label: 'Plot',
        status: project.hasPlots
          ? 'completed' as const
          : (project.hasCharacters && project.hasWorld)
            ? 'current' as const
            : 'upcoming' as const,
        weight: 15,
      },
      {
        id: 'outline',
        label: 'Outline',
        status: project.hasOutline
          ? 'completed' as const
          : project.hasPlots
            ? 'current' as const
            : 'upcoming' as const,
        weight: 20,
      },
      {
        id: 'chapters',
        label: 'Chapters',
        status: project.chapterCount === project.totalChapters
          ? 'completed' as const
          : project.hasOutline
            ? 'current' as const
            : 'upcoming' as const,
        weight: 30,
      },
      {
        id: 'editorial',
        label: 'Editorial',
        status: project.hasEditorialReport
          ? 'completed' as const
          : project.chapterCount === project.totalChapters
            ? 'current' as const
            : 'locked' as const,
        weight: 10,
      },
    ]

    // Calculate overall progress
    let progress = 0
    for (const step of steps) {
      if (step.status === 'completed') {
        progress += step.weight
      } else if (step.id === 'chapters' && project.chapterCount > 0) {
        // Partial chapter progress
        const chapterProgress = (project.chapterCount / project.totalChapters) * step.weight
        progress += chapterProgress
      }
    }

    const currentStep = steps.find(s => s.status === 'current')?.id || 'concept'

    return {
      steps,
      currentStep,
      overallProgress: Math.min(100, progress),
    }
  }, [project])
}
```

### 2.4.3 Integrate in Project Page

**File:** `app/projects/[id]/page.tsx`
```typescript
import { WorkflowProgress } from '../../components/shared/WorkflowProgress'
import { useWorkflowProgress } from '../../hooks/useWorkflowProgress'

// Inside component
const { steps, currentStep, overallProgress } = useWorkflowProgress({
  hasCharacters: characters.length > 0,
  hasWorld: worldElements.length > 0,
  hasPlots: plots.length > 0,
  hasOutline: outline !== null,
  chapterCount: chapters.filter(c => c.status === 'completed').length,
  totalChapters: outline?.chapters?.length || 18,
  hasEditorialReport: editorialReport !== null,
})

// In JSX, after navigation
<WorkflowProgress
  steps={steps}
  currentStep={currentStep}
  overallProgress={overallProgress}
/>
```

### Acceptance Criteria
- [ ] Progress bar shows percentage complete
- [ ] Step indicators show completed/current/upcoming/locked
- [ ] Chapter progress shows partial completion
- [ ] Visual connector lines between steps
- [ ] Updates in real-time as work progresses

### Testing
- New project - shows ~10% (concept only)
- After characters/world - shows ~25%
- After all chapters - shows ~90%
- After editorial - shows 100%

---

## Task 2.5: Create First-Time User Onboarding

**Priority:** MEDIUM
**Estimated Effort:** 6 hours
**Files:** New components + localStorage tracking

### Implementation Steps

### 2.5.1 Create Onboarding Modal

**Create:** `app/components/OnboardingWizard.tsx`
```typescript
'use client'

import { useState, useEffect } from 'react'
import { colors, spacing, borderRadius, shadows } from '../lib/design-tokens'

interface OnboardingStep {
  title: string
  description: string
  image?: string
  action?: string
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to NovelForge',
    description: 'Create compelling novels with AI assistance. Let\'s show you around.',
  },
  {
    title: 'Choose Your Approach',
    description: 'Start with Quick Start for rapid concept generation, or Full Customisation for detailed control over every aspect of your story.',
  },
  {
    title: 'Story Foundation',
    description: 'NovelForge generates characters, world elements, and plot structure from your concept. You can edit everything afterwards.',
  },
  {
    title: 'Write Your Novel',
    description: 'Generate chapters from your outline, then edit and refine them. Use the regeneration tools to improve specific passages.',
  },
  {
    title: 'Export Your Work',
    description: 'When you\'re happy with your novel, export to DOCX, PDF, or EPUB formats.',
  },
]

export function OnboardingWizard() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('novelforge-onboarding-complete')
    if (!hasSeenOnboarding) {
      setIsOpen(true)
    }
  }, [])

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  const handleComplete = () => {
    localStorage.setItem('novelforge-onboarding-complete', 'true')
    setIsOpen(false)
  }

  if (!isOpen) return null

  const step = ONBOARDING_STEPS[currentStep]
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          backgroundColor: colors.background.surface,
          borderRadius: borderRadius.xl,
          padding: spacing[8],
          maxWidth: '480px',
          width: '90%',
          boxShadow: shadows.xl,
        }}
      >
        {/* Step indicator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: spacing[2],
            marginBottom: spacing[6],
          }}
        >
          {ONBOARDING_STEPS.map((_, index) => (
            <div
              key={index}
              style={{
                width: index === currentStep ? '24px' : '8px',
                height: '8px',
                borderRadius: borderRadius.full,
                backgroundColor: index <= currentStep
                  ? colors.brand.primary
                  : colors.border.default,
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: spacing[4],
            color: colors.text.primary,
            textAlign: 'center',
          }}
        >
          {step.title}
        </h2>

        <p
          style={{
            color: colors.text.secondary,
            textAlign: 'center',
            lineHeight: 1.6,
            marginBottom: spacing[8],
          }}
        >
          {step.description}
        </p>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={handleSkip}
            style={{
              padding: `${spacing[3]} ${spacing[4]}`,
              background: 'none',
              border: 'none',
              color: colors.text.tertiary,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Skip tour
          </button>

          <button
            onClick={handleNext}
            style={{
              padding: `${spacing[3]} ${spacing[6]}`,
              borderRadius: borderRadius.md,
              border: 'none',
              background: colors.brand.gradient,
              color: colors.text.inverse,
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 500,
            }}
          >
            {isLastStep ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 2.5.2 Add to Root Layout

**File:** `app/layout.tsx`
```typescript
import { OnboardingWizard } from './components/OnboardingWizard'

// In the body
<OnboardingWizard />
```

### Acceptance Criteria
- [ ] Appears on first visit only
- [ ] 5-step wizard explaining key features
- [ ] Skip option available
- [ ] Progress dots show current position
- [ ] Doesn't appear again after completion

### Testing
- Clear localStorage, visit app - wizard appears
- Complete wizard - never appears again
- Skip wizard - never appears again
- Different browser - wizard appears (new user)

---

## Phase 2 Summary

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| 2.1 Explicit Generation | HIGH | 8h | Phase 1 |
| 2.2 Fix Navigation Collapse | HIGH | 6h | None |
| 2.3 Add Breadcrumb | HIGH | 4h | None |
| 2.4 Progress Indicator | HIGH | 8h | None |
| 2.5 Onboarding Wizard | MEDIUM | 6h | None |

**Total Estimated Effort:** 32 hours

### Success Metrics
- Auto-generation confusion reduced by 80%
- Navigation task completion >85%
- First-time user completion rate >60%
- User reported "lost" incidents reduced by 70%

### Dependencies
- Phase 1 must be complete (especially colour and accessibility fixes)
- Tasks 2.2 and 2.3 can run in parallel
- Task 2.1 should be done before 2.4 (affects progress calculation)

### Rollback Plan
- Generation confirmation modal can be disabled via feature flag
- Breadcrumb is purely additive, easy to remove
- Progress indicator is standalone component
- Onboarding can be disabled by setting localStorage flag

---

## Files Created/Modified in Phase 2

| File | Status | Changes |
|------|--------|---------|
| `app/components/GenerationConfirmModal.tsx` | NEW | Confirmation dialog |
| `app/projects/[id]/page.tsx` | MODIFIED | Add modal, remove auto-trigger |
| `app/components/shared/ProjectNavigation.tsx` | MODIFIED | Fix collapse, persist state |
| `app/components/shared/Breadcrumb.tsx` | NEW | Navigation breadcrumb |
| `app/components/shared/WorkflowProgress.tsx` | NEW | Progress indicator |
| `app/hooks/useWorkflowProgress.ts` | NEW | Progress calculation |
| `app/components/OnboardingWizard.tsx` | NEW | First-time tutorial |
| `app/layout.tsx` | MODIFIED | Add breadcrumb, onboarding |

---

*Phase 2 Implementation Plan*
*NovelForge UX Improvement Project*
*27 January 2026*
