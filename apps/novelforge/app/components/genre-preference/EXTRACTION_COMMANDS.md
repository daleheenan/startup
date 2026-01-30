# Tab Extraction Commands

## Quick Reference for Extracting Remaining Tabs

Use these commands to extract each tab's content from the original file for easier component creation.

### Tab 2: Genre Selection (Lines 1949-2399)

```bash
# Windows PowerShell
Get-Content "C:\Users\daleh\Projects\novelforge\app\components\GenrePreferenceForm.tsx" | Select-Object -Index (1948..2398) | Out-File "temp_tab2.txt"

# Git Bash / WSL
sed -n '1949,2399p' "C:\Users\daleh\Projects\novelforge\app\components\GenrePreferenceForm.tsx" > temp_tab2.txt
```

**Key sections:**
- Genre preview display
- Genre modifiers grid
- Primary genre selection with search
- Classic/Specialist genres with trend badges
- Subgenre selection
- Author style reference
- Navigation

### Tab 3: Tone & Themes (Lines 2400-2705)

```bash
# Windows PowerShell
Get-Content "C:\Users\daleh\Projects\novelforge\app\components\GenrePreferenceForm.tsx" | Select-Object -Index (2399..2704) | Out-File "temp_tab3.txt"

# Git Bash / WSL
sed -n '2400,2705p' "C:\Users\daleh\Projects\novelforge\app\components\GenrePreferenceForm.tsx" > temp_tab3.txt
```

**Key sections:**
- Tone multi-select (1-3)
- Themes multi-select (up to 5)
- Custom theme input
- Nationality configuration
- Navigation

### Tab 4: Story Ideas (Lines 2706-2930)

```bash
# Windows PowerShell
Get-Content "C:\Users\daleh\Projects\novelforge\app\components\GenrePreferenceForm.tsx" | Select-Object -Index (2705..2929) | Out-File "temp_tab4.txt"

# Git Bash / WSL
sed -n '2706,2930p' "C:\Users\daleh\Projects\novelforge\app\components\GenrePreferenceForm.tsx" > temp_tab4.txt
```

**Key sections:**
- Additional notes textarea
- Custom ideas textarea
- Story ideas generator modal
- Generation mode selector
- Submit button with generation modes

### Tab 5: Presets (Lines 1188-1630)

```bash
# Windows PowerShell
Get-Content "C:\Users\daleh\Projects\novelforge\app\components\GenrePreferenceForm.tsx" | Select-Object -Index (1187..1629) | Out-File "temp_tab5.txt"

# Git Bash / WSL
sed -n '1188,1630p' "C:\Users\daleh\Projects\novelforge\app\components\GenrePreferenceForm.tsx" > temp_tab5.txt
```

**Key sections:**
- Presets grid with load/delete
- Save preset form
- Genre recipes
- Author style library
- Navigation

## After Extraction Workflow

For each tab:

1. **Extract** using command above
2. **Read** the extracted content
3. **Identify** all state variables used
4. **Create** props interface with all needed state, setters, and handlers
5. **Build** component following `ProjectStructureTab.tsx` pattern
6. **Import** shared constants, types, styles
7. **Test** by importing into main form

## Component File Template

Use this template for each new tab component:

```typescript
'use client';

import type { /* needed types */ } from './types';
import { /* needed constants */ } from './constants';
import { inputStyle, labelStyle, errorStyle, sectionStyle } from './styles';
// Import any other needed components

interface TabNameProps {
  // State props
  someState: string;
  setSomeState: (value: string) => void;

  // Handler props
  onSomeAction: () => void;

  // UI state
  isLoading: boolean;
  errors: Record<string, string>;

  // Navigation
  onNext: () => void;
  onPrev?: () => void;
}

export function TabName(props: TabNameProps): JSX.Element {
  const {
    someState,
    setSomeState,
    onSomeAction,
    isLoading,
    errors,
    onNext,
    onPrev,
  } = props;

  return (
    <>
      {/* Extracted JSX content here */}
      {/* Remember to: */}
      {/* 1. Replace state access with props */}
      {/* 2. Replace inline styles with imported styles */}
      {/* 3. Keep all handlers as prop calls */}
    </>
  );
}
```

## Main Form Integration

After creating all tab components, update `GenrePreferenceForm.tsx`:

```typescript
import {
  ProjectStructureTab,
  GenreSelectionTab,
  ToneThemesTab,
  StoryIdeasTab,
  PresetsTab,
} from './genre-preference';

// In render:
{currentTab === 1 && (
  <ProjectStructureTab
    projectType={projectType}
    setProjectType={setProjectType}
    bookCount={bookCount}
    setBookCount={setBookCount}
    useExistingUniverse={useExistingUniverse}
    setUseExistingUniverse={setUseExistingUniverse}
    // ... all other props
    isLoading={isLoading}
    errors={errors}
    onNext={handleNextTab}
  />
)}

{currentTab === 2 && (
  <GenreSelectionTab
    // ... all props
    onNext={handleNextTab}
    onPrev={handlePrevTab}
  />
)}

// ... etc for tabs 3-5
```

## Verification Commands

After refactoring:

```bash
# Check TypeScript compilation
npm run build

# Check file sizes
Get-ChildItem "app\components\genre-preference\" | Sort-Object Length -Descending | Format-Table Name, Length

# Count lines in each file
Get-ChildItem "app\components\genre-preference\*.tsx" | ForEach-Object {
  "$($_.Name): $((Get-Content $_.FullName).Count) lines"
}
```

## Notes

- Always maintain UK British spelling
- Keep all functionality identical to original
- Test each tab independently after creation
- Verify form submission works with all tabs
- Check that presets load/save correctly
- Ensure navigation flows work properly
