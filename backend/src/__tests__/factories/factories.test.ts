/**
 * Factory Tests
 *
 * Tests to ensure test data factories produce valid data structures
 */

import { describe, it, expect } from '@jest/globals';
import {
  createTestProject,
  createTestTrilogyProject,
  createTestSeriesProject,
  createTestBook,
  createTestCompletedBook,
  createTestChapter,
  createTestCompletedChapter,
  createTestCharacter,
  createTestMentor,
  createTestAntagonist,
  createTestCharacterCast,
  createTestSceneCards,
} from './index';

describe('Project Factories', () => {
  it('should create a basic test project', () => {
    const project = createTestProject();

    expect(project).toBeDefined();
    expect(project.id).toBe('test-project-id');
    expect(project.type).toBe('standalone');
    expect(project.book_count).toBe(1);
    expect(project.story_dna).toBeDefined();
    expect(project.story_bible).toBeDefined();
  });

  it('should allow overriding project fields', () => {
    const project = createTestProject({
      id: 'custom-id',
      title: 'Custom Title',
      genre: 'Science Fiction',
    });

    expect(project.id).toBe('custom-id');
    expect(project.title).toBe('Custom Title');
    expect(project.genre).toBe('Science Fiction');
  });

  it('should create a trilogy project', () => {
    const project = createTestTrilogyProject();

    expect(project.type).toBe('trilogy');
    expect(project.book_count).toBe(3);
    expect(project.series_bible).toBeDefined();
  });

  it('should create a series project', () => {
    const project = createTestSeriesProject();

    expect(project.type).toBe('series');
    expect(project.book_count).toBe(5);
    expect(project.series_bible).toBeDefined();
  });
});

describe('Book Factories', () => {
  it('should create a basic test book', () => {
    const book = createTestBook();

    expect(book).toBeDefined();
    expect(book.id).toBe('test-book-id');
    expect(book.book_number).toBe(1);
    expect(book.status).toBe('setup');
    expect(book.word_count).toBe(0);
  });

  it('should allow overriding book fields', () => {
    const book = createTestBook({
      id: 'custom-book-id',
      project_id: 'custom-project-id',
      title: 'Custom Book Title',
      book_number: 2,
    });

    expect(book.id).toBe('custom-book-id');
    expect(book.project_id).toBe('custom-project-id');
    expect(book.title).toBe('Custom Book Title');
    expect(book.book_number).toBe(2);
  });

  it('should create a completed book with ending state', () => {
    const book = createTestCompletedBook();

    expect(book.status).toBe('completed');
    expect(book.word_count).toBe(85000);
    expect(book.ending_state).toBeDefined();
    expect(book.book_summary).toBeDefined();
    expect(book.ending_state?.characters).toBeDefined();
    expect(book.ending_state?.world).toBeDefined();
  });
});

describe('Chapter Factories', () => {
  it('should create a basic test chapter', () => {
    const chapter = createTestChapter();

    expect(chapter).toBeDefined();
    expect(chapter.id).toBe('test-chapter-id');
    expect(chapter.chapter_number).toBe(1);
    expect(chapter.status).toBe('pending');
    expect(chapter.scene_cards).toHaveLength(3);
  });

  it('should allow overriding chapter fields', () => {
    const chapter = createTestChapter({
      id: 'custom-chapter-id',
      book_id: 'custom-book-id',
      chapter_number: 5,
      title: 'Custom Chapter Title',
      status: 'completed',
    });

    expect(chapter.id).toBe('custom-chapter-id');
    expect(chapter.book_id).toBe('custom-book-id');
    expect(chapter.chapter_number).toBe(5);
    expect(chapter.title).toBe('Custom Chapter Title');
    expect(chapter.status).toBe('completed');
  });

  it('should create a completed chapter with content', () => {
    const chapter = createTestCompletedChapter();

    expect(chapter.status).toBe('completed');
    expect(chapter.content).toBeDefined();
    expect(chapter.summary).toBeDefined();
    expect(chapter.word_count).toBeGreaterThan(0);
  });

  it('should create scene cards', () => {
    const sceneCards = createTestSceneCards(5);

    expect(sceneCards).toHaveLength(5);
    sceneCards.forEach((scene, index) => {
      expect(scene.id).toBe(`scene-${index + 1}`);
      expect(scene.order).toBe(index + 1);
      expect(scene.povCharacter).toBeDefined();
      expect(scene.goal).toBeDefined();
    });
  });
});

describe('Character Factories', () => {
  it('should create a basic protagonist character', () => {
    const character = createTestCharacter();

    expect(character).toBeDefined();
    expect(character.id).toBe('character-1');
    expect(character.role).toBe('protagonist');
    expect(character.name).toBe('John Smith');
    expect(character.personalityTraits).toBeDefined();
    expect(character.relationships).toHaveLength(3);
  });

  it('should allow overriding character fields', () => {
    const character = createTestCharacter({
      id: 'custom-id',
      name: 'Jane Doe',
      role: 'antagonist',
      personalityTraits: ['cunning', 'ruthless'],
    });

    expect(character.id).toBe('custom-id');
    expect(character.name).toBe('Jane Doe');
    expect(character.role).toBe('antagonist');
    expect(character.personalityTraits).toEqual(['cunning', 'ruthless']);
  });

  it('should create a mentor character', () => {
    const mentor = createTestMentor();

    expect(mentor.role).toBe('mentor');
    expect(mentor.name).toBe('Eleanor Greystone');
    expect(mentor.personalityTraits).toContain('wise');
  });

  it('should create an antagonist character', () => {
    const antagonist = createTestAntagonist();

    expect(antagonist.role).toBe('antagonist');
    expect(antagonist.name).toBe('Lord Malachar');
    expect(antagonist.personalityTraits).toContain('ruthless');
  });

  it('should create a character cast', () => {
    const cast = createTestCharacterCast();

    expect(cast).toHaveLength(5);
    expect(cast[0].role).toBe('protagonist');
    expect(cast[1].role).toBe('mentor');
    expect(cast[2].role).toBe('antagonist');
  });
});

describe('Factory Integration', () => {
  it('should create related entities with matching IDs', () => {
    const project = createTestProject({ id: 'project-1' });
    const book = createTestBook({ project_id: project.id, id: 'book-1' });
    const chapter = createTestChapter({ book_id: book.id });

    expect(book.project_id).toBe(project.id);
    expect(chapter.book_id).toBe(book.id);
  });

  it('should create a complete story structure', () => {
    const project = createTestProject();
    const book = createTestBook({ project_id: project.id });
    const chapter = createTestCompletedChapter({ book_id: book.id });

    expect(project.story_dna).toBeDefined();
    expect(project.story_bible?.characters).toBeDefined();
    expect(book.project_id).toBe(project.id);
    expect(chapter.book_id).toBe(book.id);
    expect(chapter.scene_cards.length).toBeGreaterThan(0);
  });
});
