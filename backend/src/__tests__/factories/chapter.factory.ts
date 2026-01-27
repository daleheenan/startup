import { Chapter, ChapterStatus, SceneCard, Flag } from '../../shared/types';

/**
 * Creates a test SceneCard object with sensible defaults
 */
export const createTestSceneCard = (overrides?: Partial<SceneCard>): SceneCard => ({
  id: 'scene-1',
  order: 1,
  location: 'The throne room',
  characters: ['character-1', 'character-2'],
  povCharacter: 'character-1',
  timeOfDay: 'Morning',
  goal: 'Confront the traitor',
  conflict: 'Accusations fly but proof is lacking',
  outcome: 'Suspicion deepens, trust erodes',
  emotionalBeat: 'Tension and betrayal',
  notes: 'Keep the dialogue sharp and accusations subtle',
  ...overrides,
});

/**
 * Creates multiple test SceneCards for a chapter
 */
export const createTestSceneCards = (count: number = 3): SceneCard[] => {
  return Array.from({ length: count }, (_, index) =>
    createTestSceneCard({
      id: `scene-${index + 1}`,
      order: index + 1,
      location: index === 0 ? 'The throne room' : index === 1 ? 'The courtyard' : 'The dungeon',
      goal: index === 0 ? 'Confront the traitor' : index === 1 ? 'Gather evidence' : 'Interrogate the prisoner',
    })
  );
};

/**
 * Creates a test Flag object with sensible defaults
 */
export const createTestFlag = (overrides?: Partial<Flag>): Flag => ({
  id: 'flag-1',
  type: 'continuity',
  severity: 'minor',
  description: 'Character mentioned having blue eyes, but previously described as brown-eyed',
  location: 'Chapter 5, paragraph 3',
  resolved: false,
  ...overrides,
});

/**
 * Creates multiple test Flags
 */
export const createTestFlags = (severities: Array<'minor' | 'major' | 'critical'> = ['minor', 'major']): Flag[] => {
  return severities.map((severity, index) =>
    createTestFlag({
      id: `flag-${index + 1}`,
      severity,
      type: severity === 'critical' ? 'plot_hole' : severity === 'major' ? 'character_inconsistency' : 'continuity',
      description:
        severity === 'critical'
          ? 'Major plot hole: Character knows information they should not have access to'
          : severity === 'major'
          ? 'Character acts out of character without explanation'
          : 'Minor continuity issue with timeline',
    })
  );
};

/**
 * Creates a test Chapter object with sensible defaults
 */
export const createTestChapter = (overrides?: Partial<Chapter>): Chapter => {
  const now = new Date().toISOString();

  return {
    id: 'test-chapter-id',
    book_id: 'test-book-id',
    chapter_number: 1,
    title: 'The Awakening',
    scene_cards: createTestSceneCards(3),
    content: null,
    summary: null,
    status: 'pending' as ChapterStatus,
    word_count: 0,
    flags: [],
    created_at: now,
    updated_at: now,
    ...overrides,
  };
};

/**
 * Creates a pending test Chapter (ready to be written)
 */
export const createTestPendingChapter = (overrides?: Partial<Chapter>): Chapter => {
  return createTestChapter({
    status: 'pending',
    scene_cards: createTestSceneCards(3),
    ...overrides,
  });
};

/**
 * Creates a writing test Chapter (currently being generated)
 */
export const createTestWritingChapter = (overrides?: Partial<Chapter>): Chapter => {
  return createTestChapter({
    status: 'writing',
    content: 'The morning sun streamed through the tall windows of the throne room...',
    word_count: 150,
    ...overrides,
  });
};

/**
 * Creates an editing test Chapter
 */
export const createTestEditingChapter = (overrides?: Partial<Chapter>): Chapter => {
  const content = `The morning sun streamed through the tall windows of the throne room, casting long shadows across the marble floor. John stood before the empty throne, his heart heavy with the weight of what he had to do.

"You cannot be serious," said the chancellor, his voice echoing off the stone walls. "These accusations are baseless."

John turned to face him, his jaw set with determination. "The evidence speaks for itself. The traitor must be found."

The tension in the room was palpable as the gathered nobles waited for his next move. Justice would be served, one way or another.`;

  return createTestChapter({
    status: 'editing',
    content,
    summary: 'John confronts the council about a traitor in their midst. Tensions rise as accusations are made.',
    word_count: 120,
    flags: createTestFlags(['minor']),
    ...overrides,
  });
};

/**
 * Creates a completed test Chapter with full content
 */
export const createTestCompletedChapter = (overrides?: Partial<Chapter>): Chapter => {
  const content = `The morning sun streamed through the tall windows of the throne room, casting long shadows across the marble floor. John stood before the empty throne, his heart heavy with the weight of what he had to do.

"You cannot be serious," said the chancellor, his voice echoing off the stone walls. "These accusations are baseless."

John turned to face him, his jaw set with determination. "The evidence speaks for itself. Someone in this very room betrayed the king. The question is not whether there is a traitor, but who."

A murmur rippled through the assembled nobles. Some looked shocked, others guilty, and a few simply appeared confused.

"This is outrageous!" Lord Pemberton stepped forward, his face red with indignation. "How dare you suggest—"

"I suggest nothing," John interrupted. "I state facts. The attack on the eastern wall could not have succeeded without inside knowledge. Someone provided our enemies with the patrol routes."

The tension in the room was palpable. Lady Ashford clutched her handkerchief, whilst Sir Edmund's hand moved instinctively to his sword hilt.

"Then let us examine the evidence," said the chancellor, his composure returning. "If what you say is true, the traitor will be found."

John nodded slowly, knowing that justice would be served, one way or another. But as he looked into the faces of those he had trusted, he wondered if he was truly ready for what he might discover.`;

  return createTestChapter({
    status: 'completed',
    content,
    summary: 'John confronts the council about a traitor in their midst. He presents evidence of inside knowledge being used against the kingdom. Tensions rise as the nobles react with shock, indignation, and fear. The chancellor agrees to investigate, but John worries about what the truth might reveal.',
    word_count: 285,
    flags: [],
    ...overrides,
  });
};

/**
 * Creates a test Chapter with flags
 */
export const createTestChapterWithFlags = (overrides?: Partial<Chapter>): Chapter => {
  return createTestCompletedChapter({
    flags: createTestFlags(['minor', 'major', 'critical']),
    ...overrides,
  });
};

/**
 * Creates multiple test Chapters for a book
 */
export const createTestChapters = (count: number = 5, bookId: string = 'test-book-id'): Chapter[] => {
  return Array.from({ length: count }, (_, index) => {
    const chapterNumber = index + 1;
    const status: ChapterStatus =
      chapterNumber === 1 ? 'completed' :
      chapterNumber === 2 ? 'editing' :
      chapterNumber === 3 ? 'writing' :
      'pending';

    return createTestChapter({
      id: `chapter-${chapterNumber}`,
      book_id: bookId,
      chapter_number: chapterNumber,
      title: `Chapter ${chapterNumber}`,
      status,
      word_count: status === 'completed' ? 3000 : status === 'editing' ? 2500 : status === 'writing' ? 800 : 0,
    });
  });
};
