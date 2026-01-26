# NovelForge Navigation & UI Redesign - Technical Design

**Date**: 2026-01-26
**Author**: Dr. James Okafor (Principal Software Architect)
**Status**: Design Complete

---

## Executive Summary

This document outlines the technical architecture for a comprehensive navigation and workflow redesign of the NovelForge application. The changes improve discoverability, streamline the creative process, and enforce a logical workflow progression from story ideas through full book creation.

**Key Changes**:
- New primary navigation bar with direct access to Story Ideas, Concepts, and Settings
- Rename "New Project" to "New Novel" with updated workflow
- Story Ideas page for managing saved 3-line premises
- Enhanced Story Concepts page with edit/delete capabilities
- Project page navigation updates (remove Style, add Analytics)
- Sequential workflow enforcement for book creation steps
- Settings page becomes home for global prose style configuration

---

## 1. Architecture Overview

### 1.1 Information Architecture

```
Current Flow:
  Login → Projects Dashboard → New Project (Quick/Full) → Concepts → Create Project → Book Setup

New Flow:
  Login → Projects Dashboard
    ├─ New Novel (Quick/Full)
    │   ├─ Quick Mode → Story Ideas (10/20) OR Full Concepts (5)
    │   └─ Full Mode → Story Ideas (10/20) OR Full Concepts (5)
    ├─ Story Ideas (saved 3-line premises)
    │   └─ Expand to 5 or 10 concepts
    ├─ Story Concepts (saved full concepts)
    │   └─ Select for book creation
    └─ Settings
        └─ Prose Style (global defaults)

Book Creation Flow (Sequential):
  Overview (Story Concept) → Characters → World → Plot → Outline → Chapters → Analytics
  (Style moved to Settings)
```

### 1.2 Component Hierarchy

```
Global Navigation (New Component)
  ├─ Primary Navigation Bar
  │   ├─ Logo/Home → /projects
  │   ├─ New Novel → /new
  │   ├─ Story Ideas → /story-ideas
  │   ├─ Story Concepts → /saved-concepts
  │   ├─ Quick Start → /new?mode=quick (bookmark link)
  │   ├─ Fully Customized → /new?mode=full (bookmark link)
  │   └─ Settings → /settings
  │
  └─ Project Navigation (Modified)
      ├─ Overview (shows story concept)
      ├─ Characters (requires: concept)
      ├─ World (requires: characters)
      ├─ Plot (requires: world)
      ├─ Outline (requires: plot)
      ├─ Chapters (requires: outline)
      └─ Analytics (requires: chapters with content)
```

### 1.3 Key Design Decisions

**1. Story Ideas as First-Class Citizens**: Story ideas (3-line premises) become a distinct stage before full concepts, enabling rapid ideation.

**2. Global Navigation Bar**: Rather than sidebar-only navigation, add a top navigation bar for primary actions. Sidebar remains for app logo and context-specific actions.

**3. Sequential Workflow Enforcement**: Build on existing `useWorkflowPrerequisites` hook to enforce the logical creation order. Lock subsequent steps until prerequisites are complete.

**4. Settings Centralization**: Prose style settings move from per-project to global Settings, reducing redundant configuration and improving consistency.

**5. Analytics as Final Step**: Analytics page is only accessible when there's actual chapter content to analyze, preventing confusion about empty analytics.

---

## 2. Data Model

### 2.1 Database Schema Changes

**Migration: `024_navigation_redesign.sql`**

No new tables required. Existing tables support this design:
- `saved_story_ideas` (already exists, created in migration 022)
- `saved_concepts` (already exists, created in migration 004)
- `projects` (has `story_concept` field from migration 021)
- `prose_style` table (exists from migration 010) - will be used globally

**Optional Enhancement** (not required for MVP):
```sql
-- Add user preferences for default navigation behavior
CREATE TABLE IF NOT EXISTS user_navigation_preferences (
    id INTEGER PRIMARY KEY CHECK(id = 1),  -- Singleton
    default_generation_mode TEXT DEFAULT 'full' CHECK(default_generation_mode IN ('full', 'summaries', 'quick20')),
    show_quick_start_hint INTEGER DEFAULT 1,  -- Show quick start tooltip
    last_visited_section TEXT,  -- Remember last section
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
```

### 2.2 Type Definitions

**New/Modified Types** (`shared/types/index.ts`):

```typescript
// Navigation types
export type NavigationSection =
  | 'projects'
  | 'new-novel'
  | 'story-ideas'
  | 'story-concepts'
  | 'settings';

export interface PrimaryNavigationItem {
  id: NavigationSection;
  label: string;
  href: string;
  icon: string;  // Emoji or icon identifier
  badge?: number | string;  // Optional count badge
}

// Workflow step types (extend existing)
export type WorkflowStep =
  | 'concept'      // Story concept exists
  | 'characters'   // Characters created
  | 'world'        // World elements defined
  | 'plots'        // Plot layers created
  | 'outline'      // Outline generated
  | 'chapters'     // Chapters exist (at least 1)
  | 'analytics';   // Chapters have content

export interface WorkflowRequirement {
  step: WorkflowStep;
  requiredSteps: WorkflowStep[];
  label: string;
  route: string;
  icon?: string;
}

// Story idea expansion options
export type IdeaExpansionMode = 'concepts_5' | 'concepts_10';

export interface StoryIdeaExpansionRequest {
  ideaId: string;
  storyIdea: string;
  characterConcepts: string[];
  plotElements: string[];
  uniqueTwists: string[];
  preferences: any;  // Original genre/theme preferences
  mode: IdeaExpansionMode;  // 5 or 10 concepts
}
```

---

## 3. API Routes

### 3.1 New Routes

**Story Ideas Expansion**:
```
POST /api/story-ideas/:id/expand
```
Expands a saved story idea into 5 or 10 full story concepts.

Request body:
```json
{
  "mode": "concepts_5" | "concepts_10",
  "preferences": {
    "genre": "fantasy",
    "tone": "dark",
    "themes": ["power", "betrayal"]
  }
}
```

Response:
```json
{
  "success": true,
  "concepts": [/* array of full StoryConcept objects */],
  "sourceIdeaId": "uuid"
}
```

**Implementation location**: `backend/src/routes/story-ideas.ts`
Uses existing `ConceptGeneratorService` to expand the idea with additional context.

### 3.2 Modified Routes

**No breaking changes to existing routes**. All current endpoints remain functional.

Optional enhancement:
```
GET /api/projects/:id/workflow-status
```
Returns current workflow completion status for a project:
```json
{
  "projectId": "uuid",
  "steps": {
    "concept": { "completed": true, "updatedAt": "2026-01-26T..." },
    "characters": { "completed": true, "updatedAt": "..." },
    "world": { "completed": false },
    "plots": { "completed": false },
    "outline": { "completed": false },
    "chapters": { "completed": false },
    "analytics": { "completed": false }
  },
  "canGenerate": false,
  "nextStep": "world"
}
```

---

## 4. Frontend Architecture

### 4.1 New Components

#### 4.1.1 `PrimaryNavigationBar`
**Location**: `app/components/shared/PrimaryNavigationBar.tsx`

```tsx
interface PrimaryNavigationBarProps {
  activeSection?: NavigationSection;
  storyIdeasCount?: number;
  savedConceptsCount?: number;
}

// Renders horizontal navigation bar
// Positioned at top of page (below header or as header)
// Shows: New Novel | Story Ideas (badge) | Concepts (badge) | Quick Start | Fully Customized | Settings
```

**Styling**: Matches existing design system (purple gradient for active state, clean layout)

**Responsive**: Horizontal scroll on mobile, full display on desktop

#### 4.1.2 `StoryIdeasPage`
**Location**: `app/story-ideas/page.tsx`

```tsx
// Lists all saved story ideas from database
// Actions per idea:
//   - Expand to 5 concepts
//   - Expand to 10 concepts
//   - Edit (modify the idea text, character concepts, plot elements)
//   - Delete
//   - Add notes
// Filter by genre, status
// Sort by date created
```

**UI Features**:
- Card-based grid layout
- Expansion modal for selecting 5 vs 10 concepts
- Inline editing for quick changes
- Confirmation dialogs for destructive actions

#### 4.1.3 `StoryConceptExpansionModal`
**Location**: `app/components/StoryConceptExpansionModal.tsx`

```tsx
interface Props {
  storyIdea: SavedStoryIdea;
  isOpen: boolean;
  onClose: () => void;
  onExpand: (mode: IdeaExpansionMode) => Promise<void>;
}

// Modal showing:
//   - Story idea summary
//   - Button: "Generate 5 Detailed Concepts"
//   - Button: "Generate 10 Detailed Concepts"
//   - Estimated tokens/cost
//   - Progress during generation
```

#### 4.1.4 `WorkflowNavigationGuard`
**Location**: `app/components/shared/WorkflowNavigationGuard.tsx`

```tsx
interface Props {
  projectId: string;
  currentStep: WorkflowStep;
  children: React.ReactNode;
}

// Wrapper component that checks workflow prerequisites
// Redirects to appropriate step if prerequisites not met
// Shows helpful message: "Please complete Characters before accessing World"
```

### 4.2 Modified Components

#### 4.2.1 `ProjectNavigation.tsx`
**Changes**:
- Remove "Style" tab
- Add "Analytics" tab (locked until chapters have content)
- Update tab order: Overview, Characters, World, Plot, Outline, Chapters, Analytics
- Enhance prerequisite checking with Analytics requirement

#### 4.2.2 `app/new/page.tsx`
**Changes**:
- Update page title: "Create New Novel" → "New Novel"
- Change "Quick summaries" to "Story ideas" in UI text
- Add URL parameter support: `?mode=quick` or `?mode=full` for direct linking
- Update generation mode descriptions to clarify Story Ideas vs Full Concepts

#### 4.2.3 `app/saved-concepts/page.tsx`
**Changes**:
- Add Edit functionality (currently only has Delete and Use)
- Add inline concept editing modal
- Improve visual hierarchy of concept cards
- Add status badges (saved, used, archived)

#### 4.2.4 `app/projects/[id]/page.tsx` (Overview)
**Changes**:
- Display story concept prominently at top (below title)
- Show concept details: logline, synopsis, hook
- Visual separation from Story DNA section
- Add "Edit Concept" button if needed

#### 4.2.5 `app/settings/page.tsx`
**Changes**:
- Add new section: "Prose Style Defaults"
- Link to prose style configuration page
- Include description: "Set default writing style for all new projects"

### 4.3 New Pages

**1. `/story-ideas` - Story Ideas Management**
- Grid of saved story ideas
- Create new story idea manually
- Expand ideas to concepts
- Edit, delete, archive

**2. `/settings/prose-style` - Global Prose Style**
- Form for configuring default prose style
- Same interface as existing project-level prose style
- Saved as user default, applied to new projects

**3. `/projects/[id]/analytics` - Analytics Dashboard**
- Replaces or enhances existing analytics
- Only accessible when chapters exist with content
- Shows: pacing, readability, character balance, etc.

---

## 5. Component Integration Map

```
App Layout
├─ PrimaryNavigationBar (NEW - top of page)
│   └─ Renders on all pages except login
│
├─ Projects Dashboard (/projects)
│   └─ No changes to core layout
│
├─ New Novel Page (/new)
│   ├─ Modified: URL parameter support
│   ├─ Modified: "Story ideas" terminology
│   └─ Modified: Time period above description
│
├─ Story Ideas Page (/story-ideas) - NEW
│   ├─ StoryIdeaCard (NEW component)
│   ├─ StoryConceptExpansionModal (NEW)
│   └─ EditStoryIdeaModal (NEW)
│
├─ Saved Concepts Page (/saved-concepts)
│   ├─ Modified: Add edit capability
│   └─ EditConceptModal (NEW)
│
├─ Project Detail Page (/projects/[id])
│   ├─ Modified ProjectNavigation (tab changes)
│   └─ WorkflowNavigationGuard (NEW - wraps content)
│
├─ Overview Page (/projects/[id]/overview)
│   └─ Modified: Display story concept prominently
│
├─ Characters Page (/projects/[id]/characters)
│   └─ Existing (no changes)
│
├─ World Page (/projects/[id]/world)
│   └─ Existing (no changes)
│
├─ Plot Page (/projects/[id]/plot)
│   └─ Existing (no changes)
│
├─ Outline Page (/projects/[id]/outline)
│   └─ Existing (no changes)
│
├─ Chapters Page (/projects/[id]/chapters)
│   └─ Existing (no changes)
│
├─ Analytics Page (/projects/[id]/analytics) - NEW
│   └─ Requires chapters with content
│
└─ Settings Pages (/settings/*)
    ├─ Modified: Add prose style section
    └─ NEW: /settings/prose-style
```

---

## 6. State Management

### 6.1 Client-Side State

**React Query Cache Keys**:
```typescript
// Existing (no changes)
['projects']
['project', projectId]
['saved-concepts']

// New cache keys
['story-ideas']  // All story ideas
['story-idea', ideaId]  // Single idea
['workflow-status', projectId]  // Project workflow state
['navigation-counts']  // Badge counts for nav bar
```

**Local Storage Keys**:
```typescript
'navigation-preference'  // User's preferred starting section
'quick-start-dismissed'  // Whether user dismissed quick start hint
'last-visited-section'  // For "return to last section" feature
```

### 6.2 URL State

**Query Parameters**:
- `/new?mode=quick` - Open in Quick Mode
- `/new?mode=full` - Open in Full Customization Mode
- `/story-ideas?filter=genre:fantasy` - Filter story ideas
- `/saved-concepts?filter=status:saved` - Filter concepts

---

## 7. Workflow Enforcement Logic

### 7.1 Prerequisite Chain

```typescript
const WORKFLOW_REQUIREMENTS: Record<WorkflowStep, WorkflowRequirement> = {
  concept: {
    step: 'concept',
    requiredSteps: [],
    label: 'Overview',
    route: '',
    icon: '📋'
  },
  characters: {
    step: 'characters',
    requiredSteps: ['concept'],
    label: 'Characters',
    route: '/characters',
    icon: '👥'
  },
  world: {
    step: 'world',
    requiredSteps: ['concept', 'characters'],
    label: 'World',
    route: '/world',
    icon: '🌍'
  },
  plots: {
    step: 'plots',
    requiredSteps: ['concept', 'characters', 'world'],
    label: 'Plot',
    route: '/plot',
    icon: '📖'
  },
  outline: {
    step: 'outline',
    requiredSteps: ['concept', 'characters', 'world', 'plots'],
    label: 'Outline',
    route: '/outline',
    icon: '📝'
  },
  chapters: {
    step: 'chapters',
    requiredSteps: ['concept', 'characters', 'world', 'plots', 'outline'],
    label: 'Chapters',
    route: '/chapters',
    icon: '📚'
  },
  analytics: {
    step: 'analytics',
    requiredSteps: ['concept', 'characters', 'world', 'plots', 'outline', 'chapters'],
    label: 'Analytics',
    route: '/analytics',
    icon: '📊'
  }
};
```

### 7.2 Completion Detection

```typescript
function isStepComplete(step: WorkflowStep, project: Project): boolean {
  switch (step) {
    case 'concept':
      return project.story_concept !== null;

    case 'characters':
      return project.story_bible?.characters?.length > 0;

    case 'world':
      return project.story_bible?.world !== null;

    case 'plots':
      return project.plot_structure?.plot_layers?.length > 0;

    case 'outline':
      // Check if outline exists for first book
      return outline !== null && outline.total_chapters > 0;

    case 'chapters':
      // At least one chapter exists
      return chapterCount > 0;

    case 'analytics':
      // At least one chapter has content
      return chaptersWithContent > 0;

    default:
      return false;
  }
}
```

### 7.3 Navigation Guards

```typescript
// In ProjectNavigation component
tabs.map(tab => {
  const step = getStepFromTab(tab.id);
  const isLocked = !canAccessStep(step, project);
  const status = getStepStatus(step, project);

  return (
    <Tab
      key={tab.id}
      label={tab.label}
      icon={tab.icon}
      locked={isLocked}
      status={status}  // 'required' | 'completed' | 'optional'
      tooltip={isLocked ? getBlockingReason(step) : undefined}
    />
  );
});
```

---

## 8. Visual Status Indicators

### 8.1 Tab Underline Colors

```typescript
const TAB_STATUS_COLORS = {
  completed: '#10B981',  // Green - step completed
  required: '#DC2626',   // Red - step needs completion
  optional: 'transparent', // No indicator
  active: '#667eea'      // Purple - currently viewing
};
```

### 8.2 Status Logic

```typescript
function getTabStatus(step: WorkflowStep, project: Project): TabStatus {
  const isComplete = isStepComplete(step, project);
  const isActive = currentPath.includes(WORKFLOW_REQUIREMENTS[step].route);

  if (isActive) return 'active';
  if (isComplete) return 'completed';

  // Check if any future step requires this one
  const isMandatory = Object.values(WORKFLOW_REQUIREMENTS)
    .some(req => req.requiredSteps.includes(step));

  return isMandatory ? 'required' : 'optional';
}
```

---

## 9. Plot Page Auto-Population

### 9.1 Key Plot Layers (Auto-Generated)

When user navigates to Plot page for first time, automatically generate skeleton structure:

```typescript
const AUTO_GENERATED_PLOT_LAYERS = [
  {
    id: 'main-plot',
    name: 'Main Plot',
    description: 'Primary story arc',
    type: 'main',
    color: '#667eea',
    points: [],  // Populated from story concept
    status: 'active',
    deletable: false,  // Key layers cannot be deleted
    editable: true
  },
  {
    id: 'character-arcs',
    name: 'Character Arcs',
    description: 'Character development and transformation',
    type: 'character-arc',
    color: '#F59E0B',
    points: [],  // Populated from characters
    status: 'active',
    deletable: false,
    editable: true
  },
  {
    id: 'subplots',
    name: 'Subplots',
    description: 'Secondary story threads',
    type: 'subplot',
    color: '#10B981',
    points: [],  // Can be added by user
    status: 'active',
    deletable: false,
    editable: true
  },
  {
    id: 'specialized-threads',
    name: 'Specialized Threads',
    description: 'Mystery, romance, or other genre-specific arcs',
    type: 'mystery',  // or 'romance', determined by genre
    color: '#8B5CF6',
    points: [],
    status: 'active',
    deletable: false,
    editable: true
  }
];
```

### 9.2 Population Logic

```typescript
async function populatePlotLayers(project: Project) {
  const layers = [...AUTO_GENERATED_PLOT_LAYERS];

  // Populate main plot from story concept
  if (project.story_concept) {
    layers[0].points = generatePlotPointsFromConcept(project.story_concept);
  }

  // Populate character arcs from characters
  if (project.story_bible?.characters) {
    layers[1].points = generateCharacterArcPoints(project.story_bible.characters);
  }

  // Add specialized thread based on genre
  const genreType = detectSpecializedThread(project.genre);
  if (genreType) {
    layers[3].type = genreType;
    layers[3].name = `${capitalizeFirst(genreType)} Thread`;
  }

  return layers;
}
```

User can:
- ✅ Edit key layers (modify description, add/remove plot points)
- ✅ Add additional plot layers (custom subplots, world-building threads)
- ✅ Delete user-added layers
- ❌ Delete key layers (main plot, character arcs, subplots, specialized threads)

---

## 10. Settings Page Integration

### 10.1 New Settings Section

Add to `app/settings/page.tsx`:

```tsx
{
  title: 'Prose Style Defaults',
  description: 'Configure default writing style, sentence structure, and pacing for all new projects.',
  href: '/settings/prose-style',
  icon: 'P',
  iconBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  count: null,
  countLabel: '',
}
```

### 10.2 Prose Style Settings Page

**Location**: `app/settings/prose-style/page.tsx`

Reuses existing `ProseStyleForm` component from project-level prose style configuration.

```tsx
// Loads user's default prose style from database
// Saves changes to user_prose_style_defaults table (or user_settings)
// Applied to all new projects created after setting
```

**Database**:
- Option 1: Add `default_prose_style_id` column to `user_settings` table
- Option 2: Add `is_default` flag to `prose_styles` table with `project_id = NULL`

---

## 11. Migration Strategy

### 11.1 Database Migration Order

1. **No migrations required** - existing tables support all features
2. Optional enhancement: `024_navigation_redesign.sql` for user preferences

### 11.2 Frontend Migration

**Phase 1: Navigation Bar** (Non-breaking)
- Add `PrimaryNavigationBar` component
- Integrate into existing layouts
- No removal of existing navigation

**Phase 2: Story Ideas Page** (Additive)
- Create new `/story-ideas` page
- Add expansion endpoint
- Existing story ideas API already functional

**Phase 3: Enhanced Concepts** (Enhancement)
- Add edit functionality to saved concepts
- Non-breaking addition

**Phase 4: Project Navigation** (Breaking for existing projects)
- Update ProjectNavigation tabs
- Add workflow guards
- Migration script for existing projects to add analytics placeholder

**Phase 5: Settings** (Additive)
- Add prose style section to settings
- Create prose style defaults page

### 11.3 Rollback Plan

All changes are additive or optional:
- Primary navigation can be toggled via feature flag
- Workflow enforcement can be disabled via config
- Existing routes continue to function
- No data is deleted or modified destructively

---

## 12. Testing Strategy

### 12.1 Unit Tests

**Components**:
- `PrimaryNavigationBar`: Active state, badge counts, link behavior
- `WorkflowNavigationGuard`: Prerequisite checking, redirection logic
- `StoryConceptExpansionModal`: Mode selection, API interaction
- Workflow utility functions: `isStepComplete`, `canAccessStep`, `getBlockingReason`

**Services**:
- Story idea expansion service
- Workflow status calculation
- Plot layer auto-population

### 12.2 Integration Tests

**API Routes**:
- `POST /api/story-ideas/:id/expand` - Expansion generation
- `GET /api/projects/:id/workflow-status` - Status calculation

**User Flows**:
1. Create story idea → Expand to concepts → Create project
2. Navigate through workflow steps in order
3. Attempt to skip steps (should be blocked)
4. Edit story idea and concept

### 12.3 E2E Tests

**Critical Paths**:
1. Complete workflow: Story idea → Concept → Characters → World → Plot → Outline → Chapters
2. Navigation bar functionality across all pages
3. Plot page auto-population on first visit
4. Analytics page access restriction

### 12.4 Visual Regression Tests

**Pages to Screenshot**:
- Primary navigation bar (all states)
- Project navigation tabs (all states: locked, required, completed)
- Story ideas grid
- Plot page with auto-generated layers

---

## 13. Performance Considerations

### 13.1 Optimization Strategies

**1. Badge Count Caching**:
```typescript
// Cache navigation badge counts with 5-minute TTL
const { data: counts } = useQuery(
  ['navigation-counts'],
  fetchNavigationCounts,
  { staleTime: 5 * 60 * 1000 }
);
```

**2. Lazy Loading**:
- Analytics page: Only load when accessed
- Concept expansion: Stream results instead of blocking
- Plot auto-population: Background generation with loading state

**3. Prefetching**:
```typescript
// Prefetch likely next step when completing current step
if (charactersComplete) {
  queryClient.prefetchQuery(['world', projectId]);
}
```

**4. Database Indexes**:
```sql
-- Already exist from migration 013
CREATE INDEX idx_saved_story_ideas_status ON saved_story_ideas(status);
CREATE INDEX idx_saved_concepts_status ON saved_concepts(status);
CREATE INDEX idx_projects_status ON projects(status);
```

### 13.2 Metrics to Monitor

- Story idea expansion time (target: <30s for 10 concepts)
- Badge count query time (target: <100ms)
- Plot auto-population time (target: <5s)
- Navigation bar render time (target: <50ms)

---

## 14. Accessibility

### 14.1 ARIA Labels

```tsx
<nav aria-label="Primary navigation">
  <a href="/story-ideas" aria-label="Story Ideas (3 saved)">
    Story Ideas {count > 0 && <span aria-hidden="true">{count}</span>}
  </a>
</nav>

<div role="tablist" aria-label="Project sections">
  <a
    role="tab"
    aria-selected={isActive}
    aria-disabled={isLocked}
    aria-label="Characters (required, not completed)"
  >
    Characters
  </a>
</div>
```

### 14.2 Keyboard Navigation

- Tab order: Logo → Navigation items → Project tabs → Page content
- Arrow keys navigate between tabs
- Enter/Space activate links
- Escape closes modals
- Focus visible on all interactive elements

### 14.3 Screen Reader Support

- Status announcements: "Step completed", "Step required"
- Lock reasons: "Cannot access World until Characters are completed"
- Badge counts: "Story Ideas, 3 saved"
- Loading states: "Expanding story idea, please wait"

---

## 15. Security Considerations

### 15.1 Authorization

All API endpoints require authentication:
```typescript
// Existing auth middleware applies to all routes
router.use(authMiddleware);

// Story idea expansion checks ownership
if (storyIdea.user_id !== req.user.id) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### 15.2 Input Validation

```typescript
// Story idea expansion request validation
const expandIdeaSchema = z.object({
  mode: z.enum(['concepts_5', 'concepts_10']),
  preferences: z.object({
    genre: z.string().min(1).max(100),
    tone: z.string().optional(),
    themes: z.array(z.string()).optional()
  })
});
```

### 15.3 Rate Limiting

Story idea expansion uses existing Claude API rate limiting:
- Respects session limits (45 requests per 5 hours)
- Queues expansion requests via job system
- Provides feedback on queue position

---

## 16. Error Handling

### 16.1 User-Facing Errors

**Story Idea Expansion Failure**:
```typescript
try {
  await expandIdea(ideaId, mode);
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    showNotification({
      type: 'warning',
      title: 'Rate Limit Reached',
      message: 'Claude API limit reached. Expansion queued, you\'ll be notified when complete.',
      action: { label: 'View Queue', href: '/queue' }
    });
  } else if (error.code === 'INVALID_IDEA') {
    showNotification({
      type: 'error',
      title: 'Cannot Expand Idea',
      message: error.message,
      action: { label: 'Edit Idea', onClick: () => openEditModal(ideaId) }
    });
  } else {
    showNotification({
      type: 'error',
      title: 'Expansion Failed',
      message: 'An error occurred. Please try again.',
      action: { label: 'Retry', onClick: () => retryExpansion(ideaId) }
    });
  }
}
```

**Workflow Prerequisite Blocking**:
```typescript
// Clear message when user tries to access locked step
<BlockedStepMessage>
  <Icon>🔒</Icon>
  <Title>World Building Locked</Title>
  <Message>Please complete the Characters step before accessing World building.</Message>
  <Action>
    <Button onClick={() => navigate(`/projects/${id}/characters`)}>
      Go to Characters
    </Button>
  </Action>
</BlockedStepMessage>
```

### 16.2 Error Recovery

**Auto-retry with Exponential Backoff**:
```typescript
// For transient API errors during expansion
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 9000]; // 1s, 3s, 9s

async function expandWithRetry(ideaId: string, mode: string, attempt = 0) {
  try {
    return await expandIdea(ideaId, mode);
  } catch (error) {
    if (attempt < MAX_RETRIES && isRetryableError(error)) {
      await sleep(RETRY_DELAYS[attempt]);
      return expandWithRetry(ideaId, mode, attempt + 1);
    }
    throw error;
  }
}
```

**Checkpoint Recovery**:
- Expansion jobs use existing checkpoint system
- Can resume from last completed concept if interrupted
- User can view partial results

---

## 17. Documentation Updates

### 17.1 User Documentation

**New Sections**:
1. "Creating Story Ideas" - How to use the story ideas feature
2. "Understanding the Workflow" - Sequential steps explanation
3. "Navigation Guide" - Where to find each feature
4. "Plot Page Auto-Population" - What layers are created automatically

**Updated Sections**:
1. "Getting Started" - Update to show new navigation
2. "Prose Style Settings" - Move from project to global settings
3. "Project Navigation" - Update tab descriptions

### 17.2 Developer Documentation

**New Docs**:
1. `docs/architecture/navigation-redesign.md` - This document
2. `docs/workflows/story-idea-to-book.md` - Complete flow diagram
3. `docs/components/workflow-guards.md` - How to use guards

**Updated Docs**:
1. `docs/api/story-ideas.md` - Add expansion endpoint
2. `docs/frontend/navigation.md` - New navigation structure
3. `docs/database/schema.md` - No changes (existing tables used)

---

## 18. Monitoring & Analytics

### 18.1 Metrics to Track

**User Behavior**:
- Most common starting point (Quick Start vs Full vs Story Ideas)
- Average time to complete each workflow step
- Dropout rate at each step
- Story idea expansion usage (5 vs 10 concepts)

**Technical Performance**:
- API response times for expansion endpoint
- Badge count calculation time
- Workflow status calculation time
- Navigation render performance

**Business Metrics**:
- Conversion rate: Story ideas → Concepts → Projects
- Feature adoption: Settings prose style usage
- Analytics page engagement
- Plot page auto-population satisfaction (via edit rate)

### 18.2 Event Tracking

```typescript
// Example analytics events
analytics.track('story_idea_expanded', {
  ideaId: string,
  mode: 'concepts_5' | 'concepts_10',
  genre: string,
  expansionTime: number  // ms
});

analytics.track('workflow_step_completed', {
  projectId: string,
  step: WorkflowStep,
  timeSpent: number,  // ms
  previousStep: WorkflowStep
});

analytics.track('navigation_clicked', {
  section: NavigationSection,
  previousSection: NavigationSection,
  timestamp: number
});
```

---

## 19. Future Enhancements

### 19.1 Short-term (Next Sprint)

1. **Smart Workflow Suggestions**: "You've completed Characters and World. Ready to build your plot?"
2. **Progress Visualization**: Progress bar showing completion percentage across workflow
3. **Quick Actions Menu**: Keyboard shortcuts for common navigation
4. **Recent Projects**: Quick access to last 3 projects in navigation

### 19.2 Medium-term (Next Quarter)

1. **Workflow Templates**: Different paths for different project types (novel vs trilogy)
2. **Collaborative Workflows**: Multi-user project progression tracking
3. **Mobile Navigation**: Bottom tab bar for mobile devices
4. **Workflow Analytics**: Insights into most efficient creation paths

### 19.3 Long-term (Next Year)

1. **AI-Powered Workflow Guidance**: Suggest next steps based on project analysis
2. **Custom Workflow Builder**: Let users define their own creation sequences
3. **Workflow Automation**: Auto-generate next steps when previous completes
4. **Cross-Project Navigation**: Jump between related projects/universes

---

## 20. Open Questions & Decisions Needed

### 20.1 Design Decisions

**Q1**: Should navigation bar be sticky (fixed at top) or scroll with page?
**Recommendation**: Sticky for easy access, but consider mobile performance.

**Q2**: Where to display story concept on Overview page - above or below Story DNA?
**Recommendation**: Above Story DNA - it's the source material.

**Q3**: Should we enforce workflow order strictly, or allow users to skip ahead with warnings?
**Recommendation**: Strict enforcement with clear messaging. Prevents incomplete data issues.

**Q4**: Should Analytics be auto-populated like Plot, or empty until first visit?
**Recommendation**: Empty until first visit to avoid unnecessary processing.

### 20.2 Technical Decisions

**Q1**: Store prose style defaults in user_settings table or separate table?
**Recommendation**: Use existing `prose_styles` table with `project_id = NULL` and `user_id` set. Clean and reuses existing structure.

**Q2**: Implement story idea expansion as synchronous or async (job queue)?
**Recommendation**: Async via job queue for consistency with other generation tasks. Allows user to continue working.

**Q3**: Cache workflow status in database or calculate on-demand?
**Recommendation**: Calculate on-demand initially. Add caching only if performance issue identified.

**Q4**: Should Quick Start/Fully Customized be separate pages or just URL parameters?
**Recommendation**: URL parameters (`?mode=quick`). Avoids page duplication.

---

## Conclusion

This navigation redesign transforms NovelForge from a tools-based interface to a guided workflow experience. By surfacing Story Ideas as a first-class feature, enforcing sequential progression, and consolidating settings, we create a more intuitive and efficient creation process.

**Key Benefits**:
- **Clearer mental model**: Users understand where they are and what comes next
- **Reduced errors**: Sequential workflow prevents incomplete projects
- **Faster ideation**: Story ideas → concepts → books streamlines the creative process
- **Better organization**: Centralized settings and navigation improve discoverability
- **Enhanced UX**: Visual indicators and helpful messaging guide users to success

**Implementation Risk**: Low. All changes are additive or optional. Existing functionality remains intact.

**Estimated Timeline**: 2-3 sprints for full implementation across all components.

---

**Next Steps**:
1. Review and approve technical design
2. Create detailed implementation task breakdown
3. Begin with Phase 1: Primary Navigation Bar
4. Iterate based on user feedback

**Document Version**: 1.0
**Last Updated**: 2026-01-26
