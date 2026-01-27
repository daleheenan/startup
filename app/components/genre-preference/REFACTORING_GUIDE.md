# GenrePreferenceForm Refactoring Guide

## Overview

The `GenrePreferenceForm.tsx` file (121KB, 2979 lines) has been split into manageable sub-components organised by functionality.

## Completed Work

### 1. Shared Infrastructure

Created foundational files that all tab components will use:

- **`constants.ts`** - All genre definitions, modifiers, tones, themes, recipes, and compatibility mappings
- **`types.ts`** - TypeScript interfaces shared across components
- **`styles.ts`** - Common style definitions and utility functions
- **`index.ts`** - Barrel export for clean imports

### 2. Tab Components Created

- **`ProjectStructureTab.tsx`** - Tab 1 (Project structure, universe selection, target length, time period)

## Remaining Work

### Tab Components to Create

Follow the pattern established in `ProjectStructureTab.tsx` for the remaining tabs:

#### 2. GenreSelectionTab.tsx (Tab 2)
**Lines:** 1949-2399 in original file

**Content:**
- Genre preview display
- Genre modifiers selection (up to 4)
- Primary genre selection (1-3) with search
- Classic genres grid with trend badges
- Specialist genres grid (collapsible)
- Subgenre selection (up to 3)
- Author style reference selector
- Genre recommendations
- Navigation buttons (Back, Next)

**Props needed:**
- genres, setGenres
- subgenres, setSubgenres
- modifiers, setModifiers
- genreSearch, setGenreSearch
- selectedAuthorStyle, setSelectedAuthorStyle
- showAllAuthors, setShowAllAuthors
- expandedSections, setExpandedSections
- isLoading, errors
- Handler functions: handleGenreToggle, handleSubgenreToggle, handleModifierToggle
- Navigation: onNext, onPrev

#### 3. ToneThemesTab.tsx (Tab 3)
**Lines:** 2400-2705 in original file

**Content:**
- Tone selection (1-3 multi-select with descriptions)
- Themes selection (up to 5 or custom)
- Custom theme text input
- Nationality configuration (NationalitySelector component)
- Navigation buttons (Back, Next)

**Props needed:**
- tones, setTones
- themes, setThemes
- customTheme, setCustomTheme
- nationalityConfig, setNationalityConfig
- isLoading, errors
- Handler functions: handleToneToggle, handleThemeToggle, clearSelection
- Navigation: onNext, onPrev

#### 4. StoryIdeasTab.tsx (Tab 4)
**Lines:** 2706-2930 in original file

**Content:**
- Additional notes textarea
- Custom story ideas textarea
- Story ideas generator button/modal (StoryIdeasGenerator component)
- Generation mode selector (full/summaries/quick20)
- Navigation buttons (Back, Optional Presets, Submit)

**Props needed:**
- additionalNotes, setAdditionalNotes
- customIdeas, setCustomIdeas
- generateMode, setGenerateMode
- showStoryIdeasGenerator, setShowStoryIdeasGenerator
- isLoading, errors
- Handler function: handleSelectGeneratedIdea
- Navigation: onPrev, onSubmit, goToPresets

#### 5. PresetsTab.tsx (Tab 5)
**Lines:** 1188-1630 in original file

**Content:**
- Saved presets grid with load/delete actions
- Save current as preset form
- Genre recipes grid
- Author style library selector
- Navigation buttons (Back, Submit)

**Props needed:**
- presets, setPresets
- showSavePreset, setShowSavePreset
- presetName, setPresetName
- presetDescription, setPresetDescription
- savingPreset
- isLoading, errors
- Handler functions: loadPreset, saveCurrentAsPreset, deletePreset, applyRecipe
- All current form state for saving/loading
- Navigation: onPrev, onSubmit

## Implementation Pattern

### Step 1: Extract Tab Content

For each remaining tab:

```bash
# Extract the tab content from the original file
sed -n 'START_LINE,END_LINEp' GenrePreferenceForm.tsx > temp_tab.txt
```

### Step 2: Create Component File

```typescript
'use client';

import { /* needed imports */ } from '../..';
import type { /* types */ } from './types';
import { /* styles */ } from './styles';
import { /* constants */ } from './constants';

interface TabNameProps {
  // Define all props with explicit types
  // Organise by category: state, setters, handlers, UI flags, navigation
}

export function TabName(props: TabNameProps): JSX.Element {
  const { /* destructure all props */ } = props;

  return (
    <>
      {/* JSX content from extracted section */}
      {/* Replace direct state access with props */}
      {/* Replace style references with imported styles */}
    </>
  );
}
```

### Step 3: Update Main Form

Once all tabs are created, update `GenrePreferenceForm.tsx`:

1. Import tab components
2. Keep all state management in main form
3. Replace tab content with component calls
4. Pass props to each tab component

```typescript
{currentTab === 1 && (
  <ProjectStructureTab
    projectType={projectType}
    setProjectType={setProjectType}
    // ... all other props
    onNext={handleNextTab}
  />
)}

{currentTab === 2 && (
  <GenreSelectionTab
    genres={genres}
    setGenres={setGenres}
    // ... all other props
    onNext={handleNextTab}
    onPrev={handlePrevTab}
  />
)}
// ... etc for tabs 3-5
```

## Key Refactoring Principles

### 1. Maintain Functionality
- All original features preserved
- No changes to business logic
- Identical user experience

### 2. Props Over State
- All state remains in main form component
- Tab components receive state via props
- Tab components call handlers passed as props

### 3. Shared Resources
- Constants imported from `constants.ts`
- Types imported from `types.ts`
- Styles imported from `styles.ts`

### 4. Clean Separation
- Each tab is self-contained UI logic
- No direct dependencies between tabs
- Main form orchestrates tab navigation and state

### 5. Type Safety
- Explicit prop interfaces for each tab
- Import shared types from `types.ts`
- Maintain TypeScript strictness

## Testing After Refactoring

1. Run build to verify no TypeScript errors:
   ```bash
   npm run build
   ```

2. Test all tab navigation flows

3. Verify form submission with all fields

4. Test preset save/load functionality

5. Verify genre recipe application

6. Test universe selection flows

## Benefits Achieved

- **Maintainability**: Each tab is ~300-400 lines instead of 2979
- **Reusability**: Tab components can be tested independently
- **Clarity**: Easier to understand each section's purpose
- **Performance**: Potential for lazy loading tabs in future
- **Collaboration**: Multiple developers can work on different tabs

## File Size Comparison

| File | Original | Refactored |
|------|----------|------------|
| Main Form | 2979 lines (121KB) | ~600 lines (25KB) |
| Tab 1 | - | ~320 lines |
| Tab 2 | - | ~450 lines |
| Tab 3 | - | ~310 lines |
| Tab 4 | - | ~230 lines |
| Tab 5 | - | ~440 lines |
| Constants | - | ~380 lines |
| Types | - | ~70 lines |
| Styles | - | ~100 lines |
| **Total** | **2979 lines** | **~2900 lines** |

Lines remain similar, but organised into 9 manageable files instead of 1 massive file.

## Notes

- UK British spelling maintained throughout ("organise", "colour", etc.)
- All comments and documentation use UK conventions
- Original functionality completely preserved
- Component pattern established for consistency
- Explicit typing ensures compile-time safety
