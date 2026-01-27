import { Project, ProjectType, ProjectStatus, StoryDNA, StoryBible, StoryConcept, Character, WorldElements, TimelineEvent, SeriesBible } from '../../shared/types';

/**
 * Creates a test StoryDNA object with sensible defaults
 */
export const createTestStoryDNA = (overrides?: Partial<StoryDNA>): StoryDNA => ({
  genre: 'Fantasy',
  subgenre: 'Epic Fantasy',
  tone: 'Dark and serious',
  themes: ['Good vs Evil', 'Coming of Age', 'Power Corruption'],
  proseStyle: 'Descriptive and immersive',
  timeframe: 'Medieval Era',
  ...overrides,
});

/**
 * Creates a test WorldElements object with sensible defaults
 */
export const createTestWorldElements = (overrides?: Partial<WorldElements>): WorldElements => ({
  locations: [
    {
      id: 'location-1',
      name: 'The Capital',
      description: 'A sprawling medieval city',
      significance: 'Political centre of the realm',
    },
  ],
  factions: [
    {
      id: 'faction-1',
      name: 'The Royal Guard',
      description: 'Elite soldiers protecting the throne',
      goals: ['Protect the king', 'Maintain order'],
    },
  ],
  systems: [
    {
      id: 'system-1',
      type: 'magic',
      name: 'Elemental Magic',
      description: 'Magic drawn from natural elements',
      rules: ['Requires spoken incantations', 'Drains user energy'],
    },
  ],
  ...overrides,
});

/**
 * Creates a test Character object with sensible defaults
 */
export const createTestCharacter = (overrides?: Partial<Character>): Character => ({
  id: 'character-1',
  name: 'John Smith',
  role: 'protagonist',
  ethnicity: 'British',
  nationality: 'England',
  physicalDescription: 'Tall with dark hair and grey eyes',
  personalityTraits: ['brave', 'stubborn', 'loyal'],
  voiceSample: '"I won\'t let you down," he said firmly.',
  goals: ['Save the kingdom', 'Prove himself worthy'],
  conflicts: ['Self-doubt', 'Family expectations'],
  relationships: [
    {
      characterId: 'character-2',
      type: 'mentor',
      description: 'Trusted advisor and guide',
    },
  ],
  characterArc: 'From uncertain youth to confident leader',
  currentState: {
    location: 'The Capital',
    emotionalState: 'Determined but anxious',
    goals: ['Master swordsmanship', 'Earn father\'s respect'],
    conflicts: ['Fear of failure', 'Romantic tension'],
  },
  ...overrides,
});

/**
 * Creates a test TimelineEvent object with sensible defaults
 */
export const createTestTimelineEvent = (overrides?: Partial<TimelineEvent>): TimelineEvent => ({
  id: 'timeline-1',
  timestamp: '2024-01-01T00:00:00Z',
  description: 'The coronation ceremony',
  participants: ['character-1', 'character-2'],
  ...overrides,
});

/**
 * Creates a test StoryBible object with sensible defaults
 */
export const createTestStoryBible = (overrides?: Partial<StoryBible>): StoryBible => ({
  characters: [createTestCharacter()],
  world: createTestWorldElements(),
  timeline: [createTestTimelineEvent()],
  ...overrides,
});

/**
 * Creates a test SeriesBible object with sensible defaults
 */
export const createTestSeriesBible = (overrides?: Partial<SeriesBible>): SeriesBible => ({
  characters: [
    {
      characterId: 'character-1',
      name: 'John Smith',
      role: 'protagonist',
      firstAppearance: { bookNumber: 1, chapterNumber: 1 },
      lastAppearance: { bookNumber: 1, chapterNumber: 25 },
      status: 'alive',
      development: [
        {
          bookNumber: 1,
          changes: ['Gained confidence', 'Learned magic'],
          relationships: ['Formed bond with mentor'],
          arc: 'Overcame self-doubt',
        },
      ],
    },
  ],
  world: [
    {
      elementId: 'location-1',
      type: 'location',
      name: 'The Capital',
      introduced: 1,
      evolution: [
        {
          bookNumber: 1,
          changes: ['Attacked by enemy forces'],
          significance: 'Centre of conflict',
        },
      ],
    },
  ],
  timeline: [
    {
      bookNumber: 1,
      timespan: '6 months',
      startDate: 'Spring, Year 1024',
      endDate: 'Autumn, Year 1024',
      majorEvents: ['Coronation', 'Battle of the capital', 'Peace treaty signed'],
    },
  ],
  themes: ['Good vs Evil', 'Coming of Age'],
  mysteries: [
    {
      id: 'mystery-1',
      question: 'Who betrayed the king?',
      raisedIn: {
        bookNumber: 1,
        chapterNumber: 5,
        context: 'A shadowy figure was seen fleeing the throne room.',
      },
      status: 'open',
      importance: 'major',
      seriesId: 'project-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ],
  ...overrides,
});

/**
 * Creates a test StoryConcept object with sensible defaults
 */
export const createTestStoryConcept = (overrides?: Partial<StoryConcept>): StoryConcept => ({
  title: 'The Kingdom Falls',
  logline: 'A young prince must reclaim his throne from a dark sorcerer.',
  synopsis: 'When the kingdom falls to dark magic, a reluctant prince must master his own powers to save his people.',
  hook: 'What if the only way to save your kingdom was to become what you feared most?',
  protagonistHint: 'A young prince struggling with self-doubt',
  conflictType: 'Man vs Supernatural',
  ...overrides,
});

/**
 * Creates a test Project object with sensible defaults
 */
export const createTestProject = (overrides?: Partial<Project>): Project => {
  const now = new Date().toISOString();

  return {
    id: 'test-project-id',
    title: 'Test Novel',
    type: 'standalone' as ProjectType,
    genre: 'Fantasy',
    status: 'setup' as ProjectStatus,
    story_concept: createTestStoryConcept(),
    story_dna: createTestStoryDNA(),
    story_bible: createTestStoryBible(),
    series_bible: null,
    plot_structure: null,
    book_count: 1,
    universe_id: null,
    is_universe_root: false,
    source_concept_id: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
};

/**
 * Creates a test trilogy Project
 */
export const createTestTrilogyProject = (overrides?: Partial<Project>): Project => {
  return createTestProject({
    type: 'trilogy',
    book_count: 3,
    series_bible: createTestSeriesBible(),
    ...overrides,
  });
};

/**
 * Creates a test series Project
 */
export const createTestSeriesProject = (overrides?: Partial<Project>): Project => {
  return createTestProject({
    type: 'series',
    book_count: 5,
    series_bible: createTestSeriesBible(),
    ...overrides,
  });
};
