# SciFiConsistencyChecker Component

A comprehensive component for managing science fiction worldbuilding consistency in NovelForge.

## Features

### 1. Hardness Level Configuration
- Select from 5 hardness levels (Hard SF → Science Fantasy)
- View detailed descriptions and reader expectations
- See example authors for reference
- Automatic accuracy priority suggestions
- Warning when settings don't match subgenre defaults

### 2. Technology Explanation Depth
- Four levels: Detailed, Moderate, Minimal, None
- Word budget guidance for each level
- Automatic suggestion based on hardness level

### 3. Scientific Accuracy Priority
- Slider from 1-10
- Adjusts automatically with hardness level changes
- Shows balance between story and science

### 4. Speculative Elements Tracker
- Categorised checklist of common sci-fi elements:
  - Space Travel
  - Artificial Intelligence
  - Biotechnology
  - Cybernetics
  - Energy & Physics
  - Alien Life
  - Time
  - Society
- Add custom elements
- Notes field for consistency rules per element
- Visual indication of which elements are in use

### 5. Real Science Basis Tracking
- Document the real science being extrapolated
- Add sources and references
- Notes for how it's being applied

### 6. Handwave Areas
- Clearly mark areas where accuracy is relaxed
- Document reasons for handwaving
- Visual distinction (yellow warning style)

### 7. Consistency Validation
- Real-time validation of settings
- Warns about mismatches:
  - Hard SF with minimal explanation
  - Science Fantasy with detailed explanation
  - Accuracy priority not aligned with hardness
- Visual feedback (green for consistent, red for issues)

## Usage

```tsx
import SciFiConsistencyChecker from '@/components/SciFiConsistencyChecker';

function ProjectPage() {
  return (
    <SciFiConsistencyChecker
      projectId="project-id"
      currentSubgenre="Space Opera"
      onSettingsChange={(settings) => {
        console.log('Settings updated:', settings);
      }}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `projectId` | `string` | Yes | The project ID |
| `currentSubgenre` | `string` | No | Current subgenre for default suggestions |
| `onSettingsChange` | `(settings: SciFiSettings) => void` | No | Callback when settings are saved |

## API Endpoints

The component uses the following endpoints:

- `GET /api/projects/:id/scifi-settings` - Load settings
- `PUT /api/projects/:id/scifi-settings` - Save all settings
- `GET /api/projects/:id/scifi-classification/validate` - Validate consistency

## Data Structure

```typescript
interface SciFiSettings {
  hardnessLevel: string;
  techExplanationDepth: string;
  scientificAccuracyPriority: number;
  speculativeElements: string[];
  realScienceBasis: Array<{
    area: string;
    sources: string;
    notes: string;
  }>;
  handwaveAllowed: Array<{
    area: string;
    reason: string;
  }>;
}
```

## Hardness Levels

### Hard SF
- **Priority**: 9
- **Depth**: Detailed
- **Examples**: Andy Weir, Kim Stanley Robinson
- **Reader Expectation**: Real science, will fact-check

### Firm SF
- **Priority**: 7
- **Depth**: Moderate
- **Examples**: Alastair Reynolds, James S.A. Corey
- **Reader Expectation**: Accept FTL but expect consistency

### Medium SF
- **Priority**: 5
- **Depth**: Moderate
- **Examples**: Becky Chambers, Ann Leckie
- **Reader Expectation**: Want plausibility, not physics lectures

### Soft SF
- **Priority**: 3
- **Depth**: Minimal
- **Examples**: Ursula K. Le Guin, Octavia Butler
- **Reader Expectation**: Here for story, not science

### Science Fantasy
- **Priority**: 1
- **Depth**: None
- **Examples**: Frank Herbert (Dune), Star Wars
- **Reader Expectation**: Spectacle and wonder, not realism

## Default Subgenre Mappings

- Hard SF → Hard
- Space Opera → Firm
- Cyberpunk → Medium
- Military SF → Firm
- Near Future → Hard
- Dystopian → Soft
- Post-Apocalyptic → Soft

## Example Workflow

1. User selects "Space Opera" subgenre
2. Component loads with "Firm" hardness (default for Space Opera)
3. User checks off "FTL travel" and "Energy shields"
4. User adds handwave area: "FTL propulsion" with reason "Story needs instant travel"
5. User adds real science: "Orbital mechanics" with sources
6. Component validates: All consistent for Firm SF
7. User saves settings

## Accessibility

- Keyboard navigation supported
- ARIA labels on interactive elements
- Clear visual hierarchy
- Collapsible sections with state persistence

## Implementation Notes

- Uses `CollapsibleSection` component for organisation
- Persists collapse state to localStorage
- Validates on every settings change
- Optimistic UI updates with error handling
- Loading and saving states clearly indicated
