# NovelForge Navigation & UI Redesign - Implementation Tasks

**Date**: 2026-01-26
**Author**: Dr. James Okafor (Principal Software Architect)
**Status**: Ready for Implementation

---

## Overview

This document breaks down the Navigation UI Redesign into granular, actionable tasks. Tasks are ordered by dependency and grouped into phases for efficient implementation.

**Total Estimated Time**: ~48-56 hours (6-7 days of development)
**Recommended Team Size**: 1-2 developers
**Sprint Allocation**: 2-3 two-week sprints

---

## Implementation Phases

### Phase 1: Foundation & Infrastructure (12 hours)
Core types, utilities, and shared components that other phases depend on.

### Phase 2: Navigation Components (14 hours)
Primary navigation bar and workflow guard components.

### Phase 3: Story Ideas Feature (16 hours)
Story ideas page and expansion functionality.

### Phase 4: Project Workflow Updates (12 hours)
Project navigation changes and workflow enforcement.

### Phase 5: Settings Integration (8 hours)
Global prose style settings and settings page updates.

---

## Phase 1: Foundation & Infrastructure

### Task 1: Add Navigation Types to Shared Types

**Estimated Time**: 1 hour
**Dependencies**: None
**Files to Modify**:
- `shared/types/index.ts`

**Description**:
Add new TypeScript types for navigation, workflow steps, and story idea expansion.

**Acceptance Criteria**:
- [ ] `NavigationSection` type defined
- [ ] `PrimaryNavigationItem` interface defined
- [ ] `WorkflowStep` type extended with 'analytics'
- [ ] `WorkflowRequirement` interface defined
- [ ] `IdeaExpansionMode` type defined
- [ ] `StoryIdeaExpansionRequest` interface defined
- [ ] Types compile without errors
- [ ] Types exported from index

**Code Reference**:
```typescript
// See Section 2.2 of Technical Design
export type NavigationSection = 'projects' | 'new-novel' | 'story-ideas' | 'story-concepts' | 'settings';

export interface PrimaryNavigationItem {
  id: NavigationSection;
  label: string;
  href: string;
  icon: string;
  badge?: number | string;
}

// ... (see technical design for complete types)
```

---

### Task 2: Create Workflow Utility Functions

**Estimated Time**: 2 hours
**Dependencies**: Task 1
**Files to Create**:
- `app/lib/workflow-utils.ts`

**Description**:
Create utility functions for workflow step detection, prerequisite checking, and status calculation.

**Acceptance Criteria**:
- [ ] `isStepComplete(step, project)` function implemented
- [ ] `canAccessStep(step, project)` function implemented
- [ ] `getBlockingReason(step, project)` function implemented
- [ ] `getTabStatus(step, project)` function implemented
- [ ] `WORKFLOW_REQUIREMENTS` constant defined
- [ ] Functions handle all workflow steps correctly
- [ ] Unit tests written and passing

**Code Reference**:
```typescript
// See Section 7 of Technical Design
export const WORKFLOW_REQUIREMENTS: Record<WorkflowStep, WorkflowRequirement> = {
  // ... (see technical design)
};

export function isStepComplete(step: WorkflowStep, project: Project, outline?: Outline, chapters?: Chapter[]): boolean {
  // Implementation from Section 7.2
}
```

---

### Task 3: Create Navigation Constants

**Estimated Time**: 1 hour
**Dependencies**: Task 1
**Files to Create**:
- `app/lib/navigation-constants.ts`

**Description**:
Define constants for tab status colors, navigation items, and UI text.

**Acceptance Criteria**:
- [ ] `TAB_STATUS_COLORS` constant defined
- [ ] `PRIMARY_NAV_ITEMS` array defined
- [ ] `PROJECT_NAV_TABS` array defined
- [ ] Constants properly typed
- [ ] Exported from constants file

**Code Reference**:
```typescript
// See Section 8 of Technical Design
export const TAB_STATUS_COLORS = {
  completed: '#10B981',
  required: '#DC2626',
  optional: 'transparent',
  active: '#667eea'
};
```

---

### Task 4: Update useWorkflowPrerequisites Hook

**Estimated Time**: 2 hours
**Dependencies**: Task 2
**Files to Modify**:
- `app/hooks/useWorkflowPrerequisites.ts`

**Description**:
Extend existing workflow prerequisite hook to support analytics step and new workflow requirements.

**Acceptance Criteria**:
- [ ] Hook supports 'analytics' step
- [ ] Analytics step requires chapters with content
- [ ] Hook uses new workflow utility functions
- [ ] Backward compatible with existing usage
- [ ] TypeScript types updated
- [ ] Tests updated

**Code Reference**:
```typescript
// Extend existing hook with analytics support
const prerequisites = useWorkflowPrerequisites(projectId, project, outline, proseStyle, chapters);
```

---

### Task 5: Create Custom React Query Hooks

**Estimated Time**: 3 hours
**Dependencies**: Task 1
**Files to Create**:
- `app/hooks/useNavigationCounts.ts`
- `app/hooks/useStoryIdeas.ts`
- `app/hooks/useWorkflowStatus.ts`

**Description**:
Create React Query hooks for fetching navigation badge counts, story ideas, and workflow status.

**Acceptance Criteria**:
- [ ] `useNavigationCounts()` hook fetches story ideas and concepts counts
- [ ] `useStoryIdeas()` hook fetches all saved story ideas
- [ ] `useWorkflowStatus(projectId)` hook calculates workflow status
- [ ] Hooks use proper cache keys
- [ ] Loading and error states handled
- [ ] 5-minute cache TTL for counts
- [ ] TypeScript types correct

**Code Reference**:
```typescript
export function useNavigationCounts() {
  return useQuery(
    ['navigation-counts'],
    async () => {
      const [ideasRes, conceptsRes] = await Promise.all([
        fetch('/api/story-ideas/saved'),
        fetch('/api/saved-concepts')
      ]);
      // ...
    },
    { staleTime: 5 * 60 * 1000 }
  );
}
```

---

### Task 6: Add Plot Layer Constants

**Estimated Time**: 1 hour
**Dependencies**: None
**Files to Create**:
- `app/lib/plot-constants.ts`

**Description**:
Define constants for auto-generated plot layers with their configurations.

**Acceptance Criteria**:
- [ ] `AUTO_GENERATED_PLOT_LAYERS` array defined
- [ ] Layer configurations include: id, name, description, type, color, deletable, editable
- [ ] All four key layers defined: main, character-arcs, subplots, specialized
- [ ] Properly typed with PlotLayer interface
- [ ] Exported for use in plot page

**Code Reference**:
```typescript
// See Section 9.1 of Technical Design
export const AUTO_GENERATED_PLOT_LAYERS: PlotLayer[] = [
  {
    id: 'main-plot',
    name: 'Main Plot',
    description: 'Primary story arc',
    type: 'main',
    color: '#667eea',
    points: [],
    status: 'active',
    deletable: false,
    editable: true
  },
  // ... (see technical design)
];
```

---

### Task 7: Create Plot Auto-Population Service

**Estimated Time**: 2 hours
**Dependencies**: Task 6
**Files to Create**:
- `app/lib/plot-population.ts`

**Description**:
Create service functions for auto-populating plot layers from story concept and characters.

**Acceptance Criteria**:
- [ ] `populatePlotLayers(project)` function implemented
- [ ] `generatePlotPointsFromConcept(concept)` function implemented
- [ ] `generateCharacterArcPoints(characters)` function implemented
- [ ] `detectSpecializedThread(genre)` function implemented
- [ ] Functions return properly structured PlotLayer objects
- [ ] Unit tests written

**Code Reference**:
```typescript
// See Section 9.2 of Technical Design
export async function populatePlotLayers(project: Project): Promise<PlotLayer[]> {
  const layers = [...AUTO_GENERATED_PLOT_LAYERS];

  if (project.story_concept) {
    layers[0].points = generatePlotPointsFromConcept(project.story_concept);
  }

  // ...
}
```

---

## Phase 2: Navigation Components

### Task 8: Create PrimaryNavigationBar Component

**Estimated Time**: 4 hours
**Dependencies**: Task 1, Task 5
**Files to Create**:
- `app/components/shared/PrimaryNavigationBar.tsx`

**Description**:
Create horizontal primary navigation bar with links to main sections and badge counts.

**Acceptance Criteria**:
- [ ] Component renders all navigation items
- [ ] Active section highlighted
- [ ] Badge counts displayed when > 0
- [ ] Responsive design (horizontal scroll on mobile)
- [ ] Matches design system styling
- [ ] Keyboard accessible
- [ ] ARIA labels correct
- [ ] Hover states implemented
- [ ] Links to correct routes

**Code Reference**:
```tsx
interface PrimaryNavigationBarProps {
  activeSection?: NavigationSection;
  storyIdeasCount?: number;
  savedConceptsCount?: number;
}

export default function PrimaryNavigationBar({ activeSection, storyIdeasCount, savedConceptsCount }: Props) {
  const navItems = [
    { id: 'new-novel', label: 'New Novel', href: '/new', icon: '✨' },
    { id: 'story-ideas', label: 'Story Ideas', href: '/story-ideas', icon: '💡', badge: storyIdeasCount },
    // ... (see technical design section 4.1.1)
  ];

  // ...
}
```

---

### Task 9: Integrate PrimaryNavigationBar into Layout

**Estimated Time**: 2 hours
**Dependencies**: Task 8
**Files to Modify**:
- `app/layout.tsx` (or relevant layout file)
- `app/projects/page.tsx`
- `app/new/page.tsx`
- `app/settings/page.tsx`

**Description**:
Add PrimaryNavigationBar to all relevant pages (exclude login page).

**Acceptance Criteria**:
- [ ] Navigation bar appears on all authenticated pages
- [ ] Navigation bar does not appear on login page
- [ ] Active section correctly detected on each page
- [ ] Badge counts load correctly
- [ ] No layout shift when loading
- [ ] Sticky positioning works on desktop
- [ ] Mobile responsive

**Code Reference**:
```tsx
// In page components
<div>
  <PrimaryNavigationBar activeSection="projects" />
  {/* existing page content */}
</div>
```

---

### Task 10: Create WorkflowNavigationGuard Component

**Estimated Time**: 3 hours
**Dependencies**: Task 2
**Files to Create**:
- `app/components/shared/WorkflowNavigationGuard.tsx`

**Description**:
Create guard component that checks workflow prerequisites and redirects or shows blocked message.

**Acceptance Criteria**:
- [ ] Component checks if current step is accessible
- [ ] Redirects to appropriate step if prerequisites not met
- [ ] Shows helpful blocked message with call-to-action
- [ ] Message includes which step is blocking
- [ ] Styled consistently with design system
- [ ] Accessible (screen reader friendly)
- [ ] Loading state while checking prerequisites
- [ ] Error state if project load fails

**Code Reference**:
```tsx
interface WorkflowNavigationGuardProps {
  projectId: string;
  currentStep: WorkflowStep;
  children: React.ReactNode;
}

export default function WorkflowNavigationGuard({ projectId, currentStep, children }: Props) {
  const { canAccess, getBlockingReason, isLoading } = useWorkflowPrerequisites(projectId);

  if (isLoading) return <LoadingState />;

  if (!canAccess(currentStep)) {
    return <BlockedStepMessage step={currentStep} reason={getBlockingReason(currentStep)} />;
  }

  return <>{children}</>;
}
```

---

### Task 11: Create BlockedStepMessage Component

**Estimated Time**: 2 hours
**Dependencies**: Task 10
**Files to Create**:
- `app/components/shared/BlockedStepMessage.tsx`

**Description**:
Create visual component for displaying blocked workflow step message.

**Acceptance Criteria**:
- [ ] Displays lock icon
- [ ] Shows step name that is blocked
- [ ] Explains prerequisite requirement
- [ ] Includes "Go to [Step]" button
- [ ] Button navigates to blocking step
- [ ] Styled with card layout
- [ ] Responsive design
- [ ] Accessible

**Code Reference**:
```tsx
interface BlockedStepMessageProps {
  step: WorkflowStep;
  reason: string;
  projectId: string;
}

export default function BlockedStepMessage({ step, reason, projectId }: Props) {
  return (
    <div style={{ /* card styling */ }}>
      <span aria-hidden="true" style={{ fontSize: '3rem' }}>🔒</span>
      <h2>{WORKFLOW_REQUIREMENTS[step].label} Locked</h2>
      <p>{reason}</p>
      <Button href={`/projects/${projectId}${getPrerequisiteRoute(step)}`}>
        Complete Prerequisites
      </Button>
    </div>
  );
}
```

---

### Task 12: Update ProjectNavigation Component

**Estimated Time**: 3 hours
**Dependencies**: Task 2, Task 3
**Files to Modify**:
- `app/components/shared/ProjectNavigation.tsx`

**Description**:
Update ProjectNavigation to remove Style tab, add Analytics tab, and implement status indicators.

**Acceptance Criteria**:
- [ ] Style tab removed from tabs array
- [ ] Analytics tab added at end
- [ ] Tab order correct: Overview, Characters, World, Plot, Outline, Chapters, Analytics
- [ ] Status underline colors implemented (red/green)
- [ ] Analytics tab locked until chapters have content
- [ ] Tooltip shows lock reason
- [ ] Active tab styling unchanged
- [ ] Backward compatible with existing projects

**Code Reference**:
```tsx
const tabs = [
  { id: 'overview', label: 'Overview', route: '', icon: '📋' },
  { id: 'characters', label: 'Characters', route: '/characters', icon: '👥' },
  { id: 'world', label: 'World', route: '/world', icon: '🌍' },
  { id: 'plot', label: 'Plot', route: '/plot', icon: '📖' },
  { id: 'outline', label: 'Outline', route: '/outline', icon: '📝' },
  { id: 'chapters', label: 'Chapters', route: '/chapters', icon: '📚' },
  { id: 'analytics', label: 'Analytics', route: '/analytics', icon: '📊' },
];

// Add status underline
borderBottom: getTabStatus(step) === 'completed' ? `2px solid ${TAB_STATUS_COLORS.completed}` : ...
```

---

## Phase 3: Story Ideas Feature

### Task 13: Create Story Ideas API Expansion Endpoint

**Estimated Time**: 3 hours
**Dependencies**: Task 1
**Files to Modify**:
- `backend/src/routes/story-ideas.ts`

**Description**:
Add POST endpoint for expanding a story idea into 5 or 10 full concepts.

**Acceptance Criteria**:
- [ ] `POST /api/story-ideas/:id/expand` endpoint created
- [ ] Validates request with Zod schema
- [ ] Fetches story idea from database
- [ ] Calls concept generator service with idea context
- [ ] Generates 5 or 10 concepts based on mode
- [ ] Returns array of full concepts
- [ ] Handles rate limiting gracefully
- [ ] Logs expansion with story idea id
- [ ] Proper error handling

**Code Reference**:
```typescript
router.post('/:id/expand', async (req, res) => {
  const { id } = req.params;
  const { mode, preferences } = req.body;

  // Fetch story idea
  const idea = await getStoryIdea(id);
  if (!idea) return res.status(404).json({ error: 'Story idea not found' });

  // Generate concepts
  const count = mode === 'concepts_5' ? 5 : 10;
  const concepts = await conceptGenerator.generateFromIdea(idea, preferences, count);

  res.json({ success: true, concepts, sourceIdeaId: id });
});
```

---

### Task 14: Extend ConceptGeneratorService for Idea Expansion

**Estimated Time**: 2 hours
**Dependencies**: Task 13
**Files to Modify**:
- `backend/src/services/concept-generator.ts`

**Description**:
Add method to ConceptGeneratorService to generate concepts from a story idea.

**Acceptance Criteria**:
- [ ] `generateFromIdea(idea, preferences, count)` method added
- [ ] Method builds prompt including story idea, character concepts, plot elements
- [ ] Generates specified number of concepts (5 or 10)
- [ ] Concepts align with original idea theme
- [ ] Uses existing concept generation logic
- [ ] Proper error handling
- [ ] Rate limiting respected

**Code Reference**:
```typescript
async generateFromIdea(
  idea: SavedStoryIdea,
  preferences: any,
  count: number
): Promise<StoryConcept[]> {
  const prompt = this.buildIdeaExpansionPrompt(idea, preferences, count);
  const response = await this.claudeService.generateText(prompt);
  return this.parseConceptsResponse(response);
}
```

---

### Task 15: Create StoryIdeaCard Component

**Estimated Time**: 2 hours
**Dependencies**: None
**Files to Create**:
- `app/components/StoryIdeaCard.tsx`

**Description**:
Create card component for displaying a single story idea with actions.

**Acceptance Criteria**:
- [ ] Displays story idea text (truncated if long)
- [ ] Shows character concepts (first 2-3)
- [ ] Shows plot elements (first 2-3)
- [ ] Shows unique twists (first 1-2)
- [ ] Genre badge displayed
- [ ] Created date shown
- [ ] Action buttons: Expand, Edit, Delete
- [ ] Expand button shows dropdown: 5 or 10 concepts
- [ ] Card hover state
- [ ] Responsive layout

**Code Reference**:
```tsx
interface StoryIdeaCardProps {
  idea: SavedStoryIdea;
  onExpand: (mode: IdeaExpansionMode) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function StoryIdeaCard({ idea, onExpand, onEdit, onDelete }: Props) {
  // ... (card layout with actions)
}
```

---

### Task 16: Create EditStoryIdeaModal Component

**Estimated Time**: 3 hours
**Dependencies**: None
**Files to Create**:
- `app/components/EditStoryIdeaModal.tsx`

**Description**:
Create modal for editing story idea content.

**Acceptance Criteria**:
- [ ] Modal displays on edit button click
- [ ] Form includes: story idea textarea
- [ ] Form includes: character concepts (editable list)
- [ ] Form includes: plot elements (editable list)
- [ ] Form includes: unique twists (editable list)
- [ ] Form includes: notes field
- [ ] Save and Cancel buttons
- [ ] Validation: story idea required
- [ ] Updates story idea via API
- [ ] Closes on save or cancel
- [ ] Loading state during save

**Code Reference**:
```tsx
interface EditStoryIdeaModalProps {
  idea: SavedStoryIdea;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Partial<SavedStoryIdea>) => Promise<void>;
}
```

---

### Task 17: Create StoryConceptExpansionModal Component

**Estimated Time**: 2 hours
**Dependencies**: Task 13
**Files to Create**:
- `app/components/StoryConceptExpansionModal.tsx`

**Description**:
Create modal for selecting expansion mode and showing progress.

**Acceptance Criteria**:
- [ ] Modal displays story idea summary
- [ ] Two prominent buttons: "5 Concepts" and "10 Concepts"
- [ ] Shows estimated token usage and cost
- [ ] Shows progress spinner during generation
- [ ] Shows current step (e.g., "Generating concept 3 of 10")
- [ ] Error handling with retry option
- [ ] Success state redirects to concepts page
- [ ] Can cancel during generation

**Code Reference**:
```tsx
interface StoryConceptExpansionModalProps {
  storyIdea: SavedStoryIdea;
  isOpen: boolean;
  onClose: () => void;
  onExpand: (mode: IdeaExpansionMode) => Promise<void>;
}
```

---

### Task 18: Create Story Ideas Page

**Estimated Time**: 4 hours
**Dependencies**: Task 15, Task 16, Task 17
**Files to Create**:
- `app/story-ideas/page.tsx`

**Description**:
Create main story ideas page listing all saved ideas.

**Acceptance Criteria**:
- [ ] Fetches all saved story ideas from API
- [ ] Displays ideas in grid layout
- [ ] Filter by genre dropdown
- [ ] Filter by status dropdown
- [ ] Sort by date (newest first)
- [ ] Empty state when no ideas
- [ ] "Create New Idea" button
- [ ] Expansion modal integration
- [ ] Edit modal integration
- [ ] Delete confirmation dialog
- [ ] Loading state
- [ ] Error state
- [ ] Responsive layout

**Code Reference**:
```tsx
export default function StoryIdeasPage() {
  const { data: ideas, isLoading } = useStoryIdeas();
  const [expandingIdea, setExpandingIdea] = useState<string | null>(null);

  // ... (grid of StoryIdeaCard components)
}
```

---

## Phase 4: Project Workflow Updates

### Task 19: Update Project Overview Page

**Estimated Time**: 2 hours
**Dependencies**: None
**Files to Modify**:
- `app/projects/[id]/page.tsx`

**Description**:
Update overview page to prominently display story concept.

**Acceptance Criteria**:
- [ ] Story concept displayed at top (below title)
- [ ] Concept includes: logline, synopsis, hook
- [ ] Visual separation from Story DNA section
- [ ] Concept section expandable/collapsible
- [ ] "Edit Concept" button (links to concepts page)
- [ ] Handles projects without concept gracefully
- [ ] Styling matches design system

**Code Reference**:
```tsx
// Add story concept section
{project.story_concept && (
  <div style={{ ...card, marginBottom: '1.5rem' }}>
    <h2>Story Concept</h2>
    <p><strong>Logline:</strong> {project.story_concept.logline}</p>
    <p>{project.story_concept.synopsis}</p>
    <p><em>{project.story_concept.hook}</em></p>
  </div>
)}
```

---

### Task 20: Integrate WorkflowNavigationGuard in Project Pages

**Estimated Time**: 3 hours
**Dependencies**: Task 10, Task 11
**Files to Modify**:
- `app/projects/[id]/characters/page.tsx`
- `app/projects/[id]/world/page.tsx`
- `app/projects/[id]/plot/page.tsx`
- `app/projects/[id]/outline/page.tsx`
- `app/projects/[id]/chapters/page.tsx`

**Description**:
Wrap each project page content with WorkflowNavigationGuard.

**Acceptance Criteria**:
- [ ] Characters page wrapped with guard (step: 'characters')
- [ ] World page wrapped with guard (step: 'world')
- [ ] Plot page wrapped with guard (step: 'plots')
- [ ] Outline page wrapped with guard (step: 'outline')
- [ ] Chapters page wrapped with guard (step: 'chapters')
- [ ] Guards check correct prerequisites
- [ ] Blocked message displays correctly
- [ ] Navigation to prerequisite step works
- [ ] Loading states handled

**Code Reference**:
```tsx
// In each page
export default function CharactersPage() {
  const { id } = useParams();

  return (
    <WorkflowNavigationGuard projectId={id} currentStep="characters">
      {/* existing page content */}
    </WorkflowNavigationGuard>
  );
}
```

---

### Task 21: Auto-Populate Plot Layers on First Visit

**Estimated Time**: 3 hours
**Dependencies**: Task 7
**Files to Modify**:
- `app/projects/[id]/plot/page.tsx`

**Description**:
Detect first visit to plot page and auto-generate skeleton plot layers.

**Acceptance Criteria**:
- [ ] Checks if plot_structure exists for project
- [ ] If null, calls populatePlotLayers function
- [ ] Saves generated plot structure to database
- [ ] Displays generated layers in UI
- [ ] Loading state during generation
- [ ] Error handling if generation fails
- [ ] User can edit generated layers immediately
- [ ] Key layers marked as non-deletable
- [ ] User can add custom layers

**Code Reference**:
```tsx
useEffect(() => {
  if (!project.plot_structure) {
    generateInitialPlotLayers();
  }
}, [project]);

async function generateInitialPlotLayers() {
  setIsGenerating(true);
  try {
    const layers = await populatePlotLayers(project);
    await savePlotStructure(project.id, { plot_layers: layers, act_structure: defaultActStructure });
    refetchProject();
  } catch (error) {
    showError('Failed to generate plot layers');
  } finally {
    setIsGenerating(false);
  }
}
```

---

### Task 22: Enhance Plot Page with Layer Controls

**Estimated Time**: 2 hours
**Dependencies**: Task 21
**Files to Modify**:
- `app/projects/[id]/plot/page.tsx`
- `app/components/PlotLayersVisualization.tsx` (if exists)

**Description**:
Add UI controls for plot layers: edit, delete (user layers only), add custom layer.

**Acceptance Criteria**:
- [ ] Each layer has Edit button
- [ ] User-added layers have Delete button
- [ ] Key layers (main, character-arcs, subplots, specialized) cannot be deleted
- [ ] Delete button disabled or hidden for key layers
- [ ] Tooltip explains why layer cannot be deleted
- [ ] "Add Custom Layer" button
- [ ] Add layer modal/form
- [ ] Deletion requires confirmation

**Code Reference**:
```tsx
{layers.map(layer => (
  <PlotLayerCard key={layer.id} layer={layer}>
    <Button onClick={() => editLayer(layer.id)}>Edit</Button>
    {layer.deletable && (
      <Button onClick={() => deleteLayer(layer.id)} variant="danger">Delete</Button>
    )}
    {!layer.deletable && (
      <Tooltip content="Key plot layers cannot be deleted">
        <Button disabled>Delete</Button>
      </Tooltip>
    )}
  </PlotLayerCard>
))}
```

---

### Task 23: Create Analytics Page

**Estimated Time**: 2 hours
**Dependencies**: Task 10
**Files to Create**:
- `app/projects/[id]/analytics/page.tsx`

**Description**:
Create analytics page that displays only when chapters have content.

**Acceptance Criteria**:
- [ ] Page wrapped in WorkflowNavigationGuard (step: 'analytics')
- [ ] Fetches chapter analytics data
- [ ] Displays: pacing analysis, readability scores, character balance
- [ ] Empty state if no chapters generated yet
- [ ] Loading state while fetching data
- [ ] Error state with retry
- [ ] Responsive charts/graphs
- [ ] Export analytics button (if feature exists)

**Code Reference**:
```tsx
export default function AnalyticsPage() {
  const { id } = useParams();
  const { data: analytics, isLoading } = useQuery(['analytics', id], fetchAnalytics);

  return (
    <WorkflowNavigationGuard projectId={id} currentStep="analytics">
      <PageLayout title="Analytics">
        {/* analytics content */}
      </PageLayout>
    </WorkflowNavigationGuard>
  );
}
```

---

## Phase 5: Settings Integration

### Task 24: Create Prose Style Settings Page

**Estimated Time**: 3 hours
**Dependencies**: None
**Files to Create**:
- `app/settings/prose-style/page.tsx`

**Description**:
Create global prose style settings page using existing prose style form.

**Acceptance Criteria**:
- [ ] Page layout matches settings design
- [ ] Reuses existing ProseStyleForm component
- [ ] Loads user's default prose style from database
- [ ] Saves to user's default prose style (not project-specific)
- [ ] Form includes all prose style options
- [ ] Save button updates database
- [ ] Success notification on save
- [ ] "Apply to all new projects" explanation text
- [ ] Link back to settings

**Code Reference**:
```tsx
export default function ProseStyleSettingsPage() {
  const { data: defaultStyle, isLoading } = useQuery('default-prose-style', fetchDefaultProseStyle);

  async function handleSave(style: ProseStyle) {
    await saveDefaultProseStyle(style);
    showNotification('Default prose style saved');
  }

  return (
    <PageLayout title="Prose Style Defaults" backLink="/settings">
      <p>Set your default writing style for all new projects</p>
      {defaultStyle && <ProseStyleForm initialValue={defaultStyle} onSave={handleSave} />}
    </PageLayout>
  );
}
```

---

### Task 25: Add Prose Style Section to Settings Page

**Estimated Time**: 1 hour
**Dependencies**: Task 24
**Files to Modify**:
- `app/settings/page.tsx`

**Description**:
Add prose style card to main settings page.

**Acceptance Criteria**:
- [ ] New card added to settings grid
- [ ] Card title: "Prose Style Defaults"
- [ ] Card description explains feature
- [ ] Card links to `/settings/prose-style`
- [ ] Card icon and gradient defined
- [ ] Card matches existing settings card design
- [ ] Responsive layout maintained

**Code Reference**:
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

---

### Task 26: Create Backend API for Default Prose Style

**Estimated Time**: 2 hours
**Dependencies**: None
**Files to Create**:
- `backend/src/routes/user-settings.ts` (or modify if exists)

**Description**:
Add API endpoints for fetching and saving user's default prose style.

**Acceptance Criteria**:
- [ ] `GET /api/user-settings/prose-style` endpoint returns default style
- [ ] `PUT /api/user-settings/prose-style` endpoint saves default style
- [ ] Stores in prose_styles table with project_id = null
- [ ] Validates prose style data with Zod
- [ ] User can only access their own style
- [ ] Returns 404 if no default exists (use system default)
- [ ] Proper error handling

**Code Reference**:
```typescript
router.get('/prose-style', async (req, res) => {
  const userId = req.user.id;
  const stmt = db.prepare('SELECT * FROM prose_styles WHERE user_id = ? AND project_id IS NULL');
  const style = stmt.get(userId);

  if (!style) {
    // Return system default
    return res.json({ style: DEFAULT_PROSE_STYLE });
  }

  res.json({ style });
});

router.put('/prose-style', async (req, res) => {
  // Save or update default prose style
});
```

---

### Task 27: Apply Default Prose Style to New Projects

**Estimated Time**: 2 hours
**Dependencies**: Task 26
**Files to Modify**:
- `backend/src/routes/projects.ts` (project creation endpoint)

**Description**:
When creating a new project, automatically apply user's default prose style.

**Acceptance Criteria**:
- [ ] Project creation checks for user's default prose style
- [ ] If default exists, copies to new project
- [ ] If no default, uses system default or null
- [ ] Prose style ID generated for project
- [ ] Foreign key relationship maintained
- [ ] Works for all project creation paths (from concept, from scratch, etc.)
- [ ] User can override later

**Code Reference**:
```typescript
async function createProject(projectData: ProjectInput, userId: string) {
  // ... existing project creation logic

  // Get user's default prose style
  const defaultStyle = await getDefaultProseStyle(userId);
  if (defaultStyle) {
    // Copy to new project
    await copyProseStyleToProject(defaultStyle, newProject.id);
  }

  return newProject;
}
```

---

## Phase 6: Testing & Polish (Not Included in Hour Estimate)

### Task 28: Write Unit Tests
- Test workflow utility functions
- Test React Query hooks
- Test plot population service
- Test component rendering (Jest + React Testing Library)

### Task 29: Write Integration Tests
- Test story idea expansion flow
- Test workflow navigation guards
- Test prose style default application

### Task 30: Write E2E Tests
- Test complete workflow: idea → concept → project → chapters
- Test navigation bar functionality
- Test plot auto-population

### Task 31: Visual Polish
- Consistent spacing and alignment
- Animation polish (transitions, loading states)
- Responsive design verification
- Dark mode support (if applicable)

### Task 32: Accessibility Audit
- Screen reader testing
- Keyboard navigation verification
- ARIA label validation
- Color contrast checking

### Task 33: Performance Optimization
- React Query cache optimization
- Lazy loading implementation
- Image optimization (if applicable)
- Bundle size analysis

### Task 34: Documentation
- Update user guide
- Update developer docs
- Add inline code comments
- Update API documentation

---

## Implementation Order Summary

**Week 1 (Phase 1 & 2)**:
- Day 1-2: Tasks 1-7 (Foundation)
- Day 3-4: Tasks 8-12 (Navigation Components)
- Day 5: Buffer + code review

**Week 2-3 (Phase 3 & 4)**:
- Day 6-8: Tasks 13-18 (Story Ideas Feature)
- Day 9-11: Tasks 19-23 (Project Workflow Updates)
- Day 12: Buffer + code review

**Week 4 (Phase 5 & Testing)**:
- Day 13-14: Tasks 24-27 (Settings Integration)
- Day 15-16: Tasks 28-32 (Testing & Polish)
- Day 17-18: Task 33-34 (Optimization & Documentation)
- Day 19-20: Final QA + deployment preparation

---

## Risk Mitigation

### High-Risk Tasks
1. **Task 13-14**: Story idea expansion endpoint - complex AI integration
   - **Mitigation**: Reuse existing concept generation service, extensive testing

2. **Task 20**: Workflow guard integration - affects all project pages
   - **Mitigation**: Feature flag to disable guards if issues arise

3. **Task 21**: Plot auto-population - complex data transformation
   - **Mitigation**: Extensive unit tests, fallback to manual creation

### Dependencies
- All Phase 1 tasks must complete before other phases
- Task 10 (WorkflowNavigationGuard) blocks Task 20
- Task 13 (expansion endpoint) blocks Task 17-18

---

## Deployment Strategy

**Stage 1: Foundation (Low Risk)**
- Deploy Tasks 1-7 (types, utilities, hooks)
- No user-visible changes

**Stage 2: Navigation Bar (Medium Risk)**
- Deploy Tasks 8-9 (primary navigation)
- User can see new navigation
- Feature flag: `ENABLE_PRIMARY_NAV`

**Stage 3: Story Ideas (Medium Risk)**
- Deploy Tasks 13-18 (story ideas feature)
- Feature flag: `ENABLE_STORY_IDEAS`

**Stage 4: Workflow Guards (High Risk)**
- Deploy Tasks 19-23 (workflow enforcement)
- Feature flag: `ENABLE_WORKFLOW_GUARDS`
- Gradual rollout to subset of users

**Stage 5: Settings (Low Risk)**
- Deploy Tasks 24-27 (prose style settings)
- Feature flag: `ENABLE_PROSE_SETTINGS`

---

## Success Metrics

**Technical Metrics**:
- All unit tests passing (>80% coverage)
- All integration tests passing
- E2E tests passing for critical paths
- No TypeScript errors
- No console errors in production

**User Metrics**:
- Navigation bar loads <100ms
- Story idea expansion completes <30s (10 concepts)
- Workflow step transitions <200ms
- Plot auto-population <5s

**Quality Metrics**:
- Lighthouse accessibility score >90
- No critical accessibility issues
- Mobile responsive (tested on 3+ devices)
- Works in Chrome, Firefox, Safari

---

## Rollback Procedures

**If navigation bar causes issues**:
1. Set `ENABLE_PRIMARY_NAV=false`
2. Users revert to sidebar navigation only
3. No data loss

**If workflow guards cause issues**:
1. Set `ENABLE_WORKFLOW_GUARDS=false`
2. Users can access all pages freely
3. No data loss

**If story ideas expansion fails**:
1. Disable expansion button in UI
2. Users can still view/edit saved ideas
3. Manual concept creation still available

---

## Post-Implementation Checklist

- [ ] All tasks completed and tested
- [ ] Feature flags configured
- [ ] Database migrations applied
- [ ] Documentation updated
- [ ] User guide updated
- [ ] Deployment plan reviewed
- [ ] Rollback procedures documented
- [ ] Monitoring configured
- [ ] Support team trained
- [ ] Release notes prepared

---

**End of Implementation Tasks**
**Total Tasks**: 27 core tasks + 7 testing/polish tasks
**Total Estimated Time**: 48-56 hours
**Recommended Timeline**: 3-4 weeks
