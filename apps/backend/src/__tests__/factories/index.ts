/**
 * Test Data Factories for NovelForge Backend
 *
 * This module provides factory functions to create test data for unit and integration tests.
 * Each factory provides sensible defaults whilst allowing override of specific fields.
 *
 * Usage:
 * ```typescript
 * import { createTestProject, createTestBook, createTestChapter } from './__tests__/factories';
 *
 * const project = createTestProject({ title: 'My Custom Title' });
 * const book = createTestBook({ project_id: project.id });
 * const chapter = createTestChapter({ book_id: book.id, status: 'completed' });
 * ```
 */

// Project factories
export {
  createTestProject,
  createTestTrilogyProject,
  createTestSeriesProject,
  createTestStoryDNA,
  createTestStoryBible,
  createTestStoryConcept,
  createTestWorldElements,
  createTestSeriesBible,
  createTestTimelineEvent,
} from './project.factory';

// Book factories
export {
  createTestBook,
  createTestCompletedBook,
  createTestGeneratingBook,
  createTestSeriesBook,
  createTestBookEndingState,
  createTestCharacterEndingState,
  createTestWorldEndingState,
  createTestRelationshipState,
} from './book.factory';

// Chapter factories
export {
  createTestChapter,
  createTestPendingChapter,
  createTestWritingChapter,
  createTestEditingChapter,
  createTestCompletedChapter,
  createTestChapterWithFlags,
  createTestChapters,
  createTestSceneCard,
  createTestSceneCards,
  createTestFlag,
  createTestFlags,
} from './chapter.factory';

// Character factories
export {
  createTestCharacter,
  createTestMentor,
  createTestAntagonist,
  createTestAlly,
  createTestLoveInterest,
  createTestMinorCharacter,
  createTestCharacterCast,
  createTestRelationship,
  createTestRelationships,
  createTestCharacterState,
} from './character.factory';
