import { Book, BookStatus, BookEndingState, CharacterEndingState, RelationshipState, WorldEndingState } from '../../shared/types';

/**
 * Creates a test RelationshipState object with sensible defaults
 */
export const createTestRelationshipState = (overrides?: Partial<RelationshipState>): RelationshipState => ({
  withCharacterId: 'character-2',
  withCharacterName: 'Jane Doe',
  status: 'allies',
  notes: 'Strong bond formed during battle',
  ...overrides,
});

/**
 * Creates a test CharacterEndingState object with sensible defaults
 */
export const createTestCharacterEndingState = (overrides?: Partial<CharacterEndingState>): CharacterEndingState => ({
  characterId: 'character-1',
  characterName: 'John Smith',
  location: 'The Capital',
  emotionalState: 'Cautiously optimistic',
  physicalState: 'Recovering from injuries',
  relationships: [createTestRelationshipState()],
  goals: ['Rebuild the kingdom', 'Find the traitor'],
  knowledge: ['The ancient prophecy is real', 'Magic can be learned'],
  possessions: ['The royal sword', 'A mysterious amulet'],
  ...overrides,
});

/**
 * Creates a test WorldEndingState object with sensible defaults
 */
export const createTestWorldEndingState = (overrides?: Partial<WorldEndingState>): WorldEndingState => ({
  politicalChanges: ['Peace treaty signed with neighbouring kingdom', 'New council formed'],
  physicalChanges: ['Eastern tower destroyed', 'New wall constructed'],
  socialChanges: ['Magic users now accepted', 'Trade routes reopened'],
  activeThreats: ['Dark cultists still at large', 'Economic instability'],
  knownSecrets: ['The king has a hidden heir', 'Ancient magic exists beneath the castle'],
  ...overrides,
});

/**
 * Creates a test BookEndingState object with sensible defaults
 */
export const createTestBookEndingState = (overrides?: Partial<BookEndingState>): BookEndingState => ({
  characters: [createTestCharacterEndingState()],
  world: createTestWorldEndingState(),
  timeline: 'End of autumn, Year 1024',
  unresolved: ['Who is the mysterious hooded figure?', 'What is the source of the dark magic?'],
  ...overrides,
});

/**
 * Creates a test Book object with sensible defaults
 */
export const createTestBook = (overrides?: Partial<Book>): Book => {
  const now = new Date().toISOString();

  return {
    id: 'test-book-id',
    project_id: 'test-project-id',
    book_number: 1,
    title: 'Book One: The Beginning',
    status: 'setup' as BookStatus,
    word_count: 0,
    ending_state: null,
    book_summary: null,
    timeline_end: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
};

/**
 * Creates a completed test Book with ending state
 */
export const createTestCompletedBook = (overrides?: Partial<Book>): Book => {
  return createTestBook({
    status: 'completed',
    word_count: 85000,
    ending_state: createTestBookEndingState(),
    book_summary: 'The kingdom was saved from the dark sorcerer, but new threats emerge on the horizon. The young prince has grown into a capable leader, though he still carries the weight of his decisions.',
    timeline_end: 'End of autumn, Year 1024',
    ...overrides,
  });
};

/**
 * Creates a generating test Book
 */
export const createTestGeneratingBook = (overrides?: Partial<Book>): Book => {
  return createTestBook({
    status: 'generating',
    word_count: 35000,
    ...overrides,
  });
};

/**
 * Creates a test Book that's part of a series
 */
export const createTestSeriesBook = (bookNumber: number, overrides?: Partial<Book>): Book => {
  return createTestBook({
    book_number: bookNumber,
    title: `Book ${bookNumber}: The Journey Continues`,
    ...overrides,
  });
};
