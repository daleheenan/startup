# ThrillerPacingVisualiser Component

A comprehensive visual component for tracking and managing thriller pacing, tension curves, chapter hooks, plot twists, and ticking clocks.

## Features

### 1. Tension Curve Graph
- **X-axis**: Chapter numbers
- **Y-axis**: Tension level (1-10)
- **Line graph**: Shows expected tension based on selected pacing style
- **Points**: Chapter hooks with hover details showing:
  - Hook type and icon
  - Description
  - Tension level

### 2. Ticking Clocks Timeline
- Visual timeline of active time pressures
- Start/end chapters clearly marked
- Stakes displayed on hover
- Color-coded by urgency
- Shows time remaining in-story

### 3. Twist Tracking
- List of planned plot twists
- Setup chapters marked (start and end)
- Reveal chapter highlighted
- Foreshadowing status indicators:
  - None (red)
  - Minimal (orange)
  - Adequate (blue)
  - Excellent (green)
- Impact level badges (low, medium, high, extreme)
- Planting status (whether clues have been seeded)

### 4. Chapter Hook Summary
- Table view of all chapter hooks
- Hook type with emoji icon
- Tension level indicator (color-coded circle)
- Resolution status (resolved/pending)
- Resolution chapter if applicable

## Props

```typescript
interface ThrillerPacingVisualiserProps {
  projectId: string;           // Project identifier
  totalChapters: number;        // Total number of chapters in the book
  settings?: ThrillerSettings;  // Pacing style and tension curve
  hooks?: ChapterHook[];        // Chapter-end hooks
  twists?: ThrillerTwist[];     // Plot twists
  tickingClocks?: TickingClock[]; // Time pressure elements
  onAddHook?: (chapterNumber: number) => void;  // Callback for adding hooks
  onAddTwist?: () => void;      // Callback for adding twists
  onAddClock?: () => void;      // Callback for adding ticking clocks
  readOnly?: boolean;           // Disable editing features
}
```

## Data Types

### ThrillerSettings
```typescript
interface ThrillerSettings {
  pacing_style: string;           // One of: relentless, escalating, rollercoaster, slow_burn
  target_tension_curve?: number[]; // Custom tension values per chapter (1-10)
}
```

### ChapterHook
```typescript
interface ChapterHook {
  id: string;
  chapter_number: number;
  hook_type: string;              // cliffhanger, revelation, question, threat, betrayal, etc.
  description: string;
  tension_level: number;          // 1-10
  is_resolved: boolean;
  resolution_chapter?: number;
}
```

### ThrillerTwist
```typescript
interface ThrillerTwist {
  id: string;
  twist_type: string;             // major_reveal, betrayal, hidden_identity, etc.
  description: string;
  setup_start_chapter: number;
  setup_end_chapter: number;
  reveal_chapter: number;
  foreshadowing_status: 'none' | 'minimal' | 'adequate' | 'excellent';
  is_planted: boolean;            // Whether clues have been seeded
}
```

### TickingClock
```typescript
interface TickingClock {
  id: string;
  name: string;
  description: string;
  clock_type: string;             // deadline, countdown, racing, decay, opportunity, survival
  start_chapter: number;
  end_chapter: number;
  stakes: string;                 // What's at risk
  is_active: boolean;
}
```

## API Endpoints

The component expects these API endpoints to be available:

- `GET /api/projects/:id/thriller-settings` - Returns ThrillerSettings
- `GET /api/projects/:id/thriller-hooks` - Returns ChapterHook[]
- `GET /api/projects/:id/thriller-twists` - Returns ThrillerTwist[]
- `GET /api/projects/:id/thriller-time-pressure` - Returns TickingClock[]

## Pacing Styles

### Relentless
- Non-stop action with minimal breathers
- Constant tension (8-10) with brief dips to 6-7
- Short chapters (1,500-2,500 words)
- Best for: Action thrillers, chase narratives, 24-style storytelling

### Escalating
- Steady build from moderate to explosive
- Starts at 4-5, builds to 9-10 at climax
- Standard chapters (3,000-4,000 words) that shorten as tension rises
- Best for: Conspiracy thrillers, investigation narratives, mainstream thrillers

### Rollercoaster
- Alternating peaks and valleys
- Oscillates between 3-4 (valleys) and 8-9 (peaks)
- Variable chapter length to match tension
- Best for: Psychological thrillers, character-driven thrillers, complex plots

### Slow Burn
- Gradual tension building to massive payoff
- Low start (2-3), very gradual build, explosive finale (10)
- Longer chapters initially, shorter at end
- Best for: Literary thrillers, atmospheric thrillers, horror-thriller hybrids

## Hook Types

| Type | Icon | Tension Impact | Description |
|------|------|----------------|-------------|
| Cliffhanger | ⚡ | High | End mid-action or mid-crisis |
| Revelation | 💡 | High | Shocking information revealed |
| Question | ❓ | Medium | Compelling question raised |
| Threat | ⚠️ | High | New danger introduced |
| Betrayal | 🗡️ | High | Trust broken |
| Countdown | ⏰ | Medium | Time pressure established |
| Mystery Deepens | 🔍 | Medium | Complexity increases |
| Reversal | 🔄 | High | Situation inverts |
| Emotional Gut Punch | 💔 | Medium | Devastating emotional moment |
| Foreshadowing | 👁️ | Low | Subtle hint of worse to come |

## Usage Example

```tsx
import ThrillerPacingVisualiser from '@/components/ThrillerPacingVisualiser';

function ThrillerProjectPage({ projectId }: { projectId: string }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function loadData() {
      const [settings, hooks, twists, clocks] = await Promise.all([
        fetch(`/api/projects/${projectId}/thriller-settings`).then(r => r.json()),
        fetch(`/api/projects/${projectId}/thriller-hooks`).then(r => r.json()),
        fetch(`/api/projects/${projectId}/thriller-twists`).then(r => r.json()),
        fetch(`/api/projects/${projectId}/thriller-time-pressure`).then(r => r.json()),
      ]);

      setData({ settings, hooks, twists, clocks });
    }

    loadData();
  }, [projectId]);

  if (!data) return <div>Loading...</div>;

  return (
    <ThrillerPacingVisualiser
      projectId={projectId}
      totalChapters={30}
      settings={data.settings}
      hooks={data.hooks}
      twists={data.twists}
      tickingClocks={data.clocks}
      onAddHook={(chapterNum) => {
        // Open hook creation dialog
      }}
      onAddTwist={() => {
        // Open twist creation dialog
      }}
      onAddClock={() => {
        // Open ticking clock creation dialog
      }}
    />
  );
}
```

## Styling

The component uses the project's design tokens from `app/lib/design-tokens.ts`:

- **Colors**: Semantic colors for tension levels (success, info, warning, error)
- **Border radius**: Consistent rounded corners
- **Shadows**: Elevation for interactive elements
- **Typography**: Consistent font sizes and weights

## Accessibility

- Color-coded elements include text labels
- Interactive elements have hover states
- SVG graphs include descriptive text
- Tension levels use both color and numeric values

## Performance Considerations

- Tension curve calculation is memoised based on pacing style
- SVG rendering is optimised for up to 50 chapters
- Large datasets (100+ hooks/twists) may benefit from virtualisation
- Consider implementing pagination for the hooks table if dealing with 50+ hooks

## Future Enhancements

Potential additions:
- Export tension graph as PNG/SVG
- Compare multiple pacing styles side-by-side
- Suggest hook placements based on tension curve
- Validate twist timing (setup duration, reveal placement)
- Alert when tension drops too low for too long
- Suggest chapter breaks based on hook placement
