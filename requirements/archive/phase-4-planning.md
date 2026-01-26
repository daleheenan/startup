# Phase 4: Feature Planning and Implementation

## Overview

Phase 4 focuses on enhancing NovelForge with critical bug fixes and 8 new features to improve user experience, customization, and story generation capabilities.

**Priority Order:**
1. Bug Fixes (Immediate)
2. Navigation Redesign (Foundation)
3. Settings Section (Infrastructure)
4. Feature Implementations

---

## Bug Fixes (Sprint 1)

### BUG-1: Plot Layer Modal - Missing Generate Button

**Issue:** Plot Layer modal has Name and Description fields but no AI generate buttons for these individual fields.

**Current State:**
- Modal has "Save Only" and "Save & Generate Points" buttons
- Name field: manual input only
- Description field: manual input only

**Solution:**
- Add "Generate" button next to Name field
- Add "Generate" button next to Description field
- Use AI to suggest contextually relevant names based on layer type
- Use AI to generate descriptions based on name and story context

**Files to Modify:**
- `app/projects/[id]/plot/page.tsx`
- `backend/src/routes/projects.ts` (add endpoint)

**API Endpoint:**
```
POST /api/projects/:id/generate-plot-layer-field
Body: { field: 'name' | 'description', layerType: string, existingValues: object }
```

---

### BUG-2: Story Outline Map Error

**Issue:** "Cannot read properties of undefined (reading 'map')" error when generating/viewing story outline.

**Current State:**
- Safety check exists at line 594 for `outline.structure?.acts`
- Error may occur in nested mapping of chapters or scenes

**Root Cause Analysis Needed:**
- Check if `act.chapters` can be undefined
- Check if `chapter.scenes` can be undefined
- Add defensive null checks throughout

**Files to Modify:**
- `app/projects/[id]/outline/page.tsx`
- `backend/src/routes/outlines.ts` (validate structure)

---

## Feature 1: Universe Year/Time Setting (Sprint 1)

### Requirements
- Add time period selector to concept generation
- Options:
  - 500 years in the past
  - Modern day (present)
  - 500 years in the future
  - Unknown future
  - Custom year input
- Stories should be contextually relevant to selected time period
- Integrate into:
  - Concept generation prompts
  - World building
  - Character names (period-appropriate)
  - Technology/setting descriptions

### Implementation Plan

**Database Changes:**
```sql
-- Already exists: timeframe in preferences
-- Add specific year_setting field
ALTER TABLE projects ADD COLUMN time_period_type TEXT; -- 'past', 'present', 'future', 'unknown', 'custom'
ALTER TABLE projects ADD COLUMN specific_year INTEGER;
```

**UI Components:**
- Time period selector in `/new` page preferences
- Visual indicator showing selected era
- Year input for custom option

**Backend Integration:**
- Update concept generation prompts with time context
- Add time-period-appropriate name generation
- World building should reference era-specific details

**Files to Modify:**
- `app/new/page.tsx`
- `backend/src/services/concept-generator.ts`
- `backend/src/services/world-builder.ts`
- `backend/src/services/name-generator.ts`

---

## Feature 2: Character Ethnicity/Nationality System (Sprint 2)

### Requirements
- **NOT** diverse by default - user must explicitly choose
- Allow specific nationality selection for key characters
- Support character distribution (e.g., 4 British, 2 US, 1 Russian for 7 characters)
- Designate lead character nationalities
- Name generation respects nationality choices

### Implementation Plan

**Data Model:**
```typescript
interface CharacterNationalityConfig {
  defaultMode: 'single' | 'diverse' | 'custom';
  primaryNationality?: string;
  distribution?: {
    nationality: string;
    count: number;
    leadCharacters?: number;
  }[];
}
```

**UI Components:**
- Nationality mode selector (Single/Mixed/Custom)
- Nationality distribution builder
- Lead character nationality designation
- Preview of name generation by nationality

**Name Generation Integration:**
- Create nationality-specific name databases
- British names, American names, Russian names, etc.
- First/last name combinations per nationality

**Files to Create:**
- `backend/src/data/nationality-names.ts`
- `app/components/NationalitySelector.tsx`

**Files to Modify:**
- `app/new/page.tsx`
- `backend/src/services/name-generator.ts`
- `backend/src/services/character-generator.ts`

---

## Feature 3: Navigation Redesign (Sprint 2)

### Requirements
- Improve menu navigation throughout app
- Add progress indicator for novel creation process
- Better navigation in `/new` page
- Simplify creation workflow visibility
- Show % complete before novel can be generated

### Implementation Plan

**Progress Indicator System:**
```typescript
interface CreationProgress {
  steps: {
    id: string;
    name: string;
    required: boolean;
    completed: boolean;
    route: string;
  }[];
  percentComplete: number;
  canGenerate: boolean;
}
```

**Steps to Track:**
1. Story Concept - Required
2. Characters - Required
3. World Building - Optional
4. Plot Structure - Optional
5. Outline - Required for generation
6. Ready to Generate

**UI Components:**
- Progress stepper component (horizontal/vertical)
- Breadcrumb navigation
- Quick-jump menu
- "What's Next" suggestions

**Files to Create:**
- `app/components/shared/CreationProgress.tsx`
- `app/components/shared/ProjectNavigation.tsx`

**Files to Modify:**
- `app/new/page.tsx`
- `app/projects/[id]/page.tsx`
- All project sub-pages

---

## Feature 4: Settings Section (Sprint 3)

### Requirements
- Central location for managing all setup values
- CRUD operations for:
  - Genres (add custom genres)
  - Author presets
  - Exclusions/blacklists
  - Genre recipes

### Implementation Plan

**Database Schema:**
```sql
CREATE TABLE user_genres (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_genre TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE user_exclusions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'name', 'word', 'theme', 'trope'
  value TEXT NOT NULL,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE user_genre_recipes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  genres TEXT NOT NULL, -- JSON array
  tones TEXT NOT NULL, -- JSON array
  themes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

**UI Structure:**
```
/settings
  ├── /genres - Manage custom genres
  ├── /authors - Manage author presets
  ├── /exclusions - Manage blacklists
  └── /recipes - Manage genre recipes
```

**Files to Create:**
- `app/settings/page.tsx`
- `app/settings/genres/page.tsx`
- `app/settings/authors/page.tsx`
- `app/settings/exclusions/page.tsx`
- `app/settings/recipes/page.tsx`
- `backend/src/routes/user-settings.ts`
- `backend/src/db/migrations/019_user_settings.sql`

---

## Feature 5: Character Auto-Update (Sprint 3)

### Requirements
- When character name changes or regenerates, auto-update:
  - Backstory
  - Character Arc
- No save required to trigger update
- Real-time update as name changes

### Implementation Plan

**Approach:**
- Debounced name change detection
- Background API call for dependent field regeneration
- Optimistic UI update with loading indicators

**UI Flow:**
1. User edits/regenerates character name
2. Show "Updating backstory..." indicator
3. Background API generates new content
4. Auto-populate fields without page reload

**Files to Modify:**
- `app/projects/[id]/characters/page.tsx`
- `backend/src/routes/characters.ts`
- `backend/src/services/character-generator.ts`

---

## Feature 6: Full Customization UI Improvements (Sprint 4)

### Requirements
- Close by default:
  - Book Style Presets
  - Genre Recipes
  - Author Style References
  - Specialist Genres
- Consider tabs instead of accordions
- Subgenre should be optional, not mandatory

### Implementation Plan

**UI Changes:**
- Convert to collapsible sections with "closed" default state
- OR implement tabbed interface for cleaner organization
- Remove "required" validation from subgenre field
- Add "Skip" option for optional sections

**Tab Structure Option:**
```
[ Basic Info ] [ Genres & Tones ] [ Style & Authors ] [ Advanced ]
```

**Files to Modify:**
- `app/new/page.tsx`
- `app/components/FullCustomization.tsx` (if exists)

---

## Feature 7: Story Ideas Generator (Sprint 4)

### Requirements
- "Generate Ideas" button in Story Ideas box
- Display 5 ideas at a time
- Each idea has sections:
  - Specific story ideas
  - Character concepts
  - Plot elements
  - Unique twists
- "Generate More" button for additional 5 ideas
- Click to populate Story Ideas box
- Regenerate individual sections

### Implementation Plan

**Data Model:**
```typescript
interface GeneratedIdea {
  id: string;
  storyIdea: string;
  characterConcepts: string[];
  plotElements: string[];
  uniqueTwists: string[];
}
```

**UI Components:**
- Ideas generator modal/panel
- Idea card with expandable sections
- Section regenerate buttons
- "Use This Idea" button

**API Endpoint:**
```
POST /api/story-ideas/generate
Body: { preferences: object, count: 5 }

POST /api/story-ideas/regenerate-section
Body: { ideaId: string, section: 'characters' | 'plot' | 'twists' }
```

**Files to Create:**
- `app/components/StoryIdeasGenerator.tsx`
- `backend/src/routes/story-ideas.ts`
- `backend/src/services/story-ideas-generator.ts`

**Files to Modify:**
- `app/new/page.tsx`

---

## Feature 8: Author Management (Sprint 5)

### Requirements
- Add/edit/delete authors in Author Style Reference
- Genre-specific author filtering
- Online search to identify unknown authors' writing styles
- Support for authors like B.V. Larson, Dan Brown, Vaughn Heppner

### Implementation Plan

**Database Schema:**
```sql
CREATE TABLE authors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  genres TEXT NOT NULL, -- JSON array
  writing_style TEXT,
  notable_works TEXT, -- JSON array
  style_keywords TEXT, -- JSON array for generation prompts
  user_added BOOLEAN DEFAULT false,
  created_at TEXT DEFAULT (datetime('now'))
);
```

**Author Lookup Service:**
- Use web search to find author information
- Parse writing style descriptions
- Extract genre associations
- Cache results in database

**UI Components:**
- Author manager modal
- Author search with auto-complete
- Genre filter dropdown
- "Add Custom Author" form
- Style preview/description

**Files to Create:**
- `app/components/AuthorManager.tsx`
- `backend/src/routes/authors.ts`
- `backend/src/services/author-lookup.ts`
- `backend/src/db/migrations/020_authors.sql`

---

## Sprint Plan

### Sprint 1 (Week 1-2)
- [ ] BUG-1: Plot Layer Modal Generate Buttons
- [ ] BUG-2: Story Outline Map Error Fix
- [ ] Feature 1: Universe Year/Time Setting

### Sprint 2 (Week 3-4)
- [ ] Feature 2: Character Ethnicity/Nationality System
- [ ] Feature 3: Navigation Redesign (Part 1 - Progress Indicator)

### Sprint 3 (Week 5-6)
- [ ] Feature 3: Navigation Redesign (Part 2 - Menu Improvements)
- [ ] Feature 4: Settings Section
- [ ] Feature 5: Character Auto-Update

### Sprint 4 (Week 7-8)
- [ ] Feature 6: Full Customization UI Improvements
- [ ] Feature 7: Story Ideas Generator

### Sprint 5 (Week 9-10)
- [ ] Feature 8: Author Management
- [ ] Integration Testing
- [ ] Documentation Updates

---

## Technical Considerations

### Performance
- Lazy load settings data
- Debounce auto-update triggers
- Cache author lookup results
- Optimize name generation queries

### UX Priorities
1. Don't break existing workflows
2. Progressive disclosure of advanced features
3. Clear feedback for all actions
4. Mobile-responsive design

### Security
- Validate all user inputs
- Sanitize custom genre/author data
- Rate limit AI generation endpoints
- Protect user preferences

---

## Success Metrics

- Bug reports reduced by 80%
- User completion rate for novel creation increased by 25%
- Time to first generated chapter reduced by 15%
- User satisfaction with customization options increased

---

## Dependencies

- OpenRouter API for AI generation
- Web search capability for author lookup
- Existing database migration system
- React component library patterns

---

*Created: 2026-01-25*
*Last Updated: 2026-01-25*
*Status: Planning Complete - Ready for Implementation*
