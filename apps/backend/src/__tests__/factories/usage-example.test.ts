/**
 * Usage Examples for Test Factories
 *
 * This file demonstrates practical usage patterns for the test data factories.
 * These examples show how to use factories in real-world test scenarios.
 */

import { describe, it, expect } from '@jest/globals';
import {
  createTestProject,
  createTestTrilogyProject,
  createTestBook,
  createTestCompletedBook,
  createTestChapter,
  createTestCompletedChapter,
  createTestChapters,
  createTestCharacter,
  createTestCharacterCast,
  createTestStoryDNA,
} from './index';

describe('Factory Usage Examples', () => {
  describe('Basic Entity Creation', () => {
    it('creates a simple project', () => {
      const project = createTestProject();

      expect(project.id).toBeDefined();
      expect(project.title).toBe('Test Novel');
      expect(project.type).toBe('standalone');
    });

    it('creates a project with custom values', () => {
      const project = createTestProject({
        title: 'The Dragon Chronicles',
        genre: 'Epic Fantasy',
        status: 'generating',
      });

      expect(project.title).toBe('The Dragon Chronicles');
      expect(project.genre).toBe('Epic Fantasy');
      expect(project.status).toBe('generating');
    });
  });

  describe('Creating Related Entities', () => {
    it('creates a complete project-book-chapter hierarchy', () => {
      // Create the project
      const project = createTestProject({
        id: 'project-1',
        title: 'The Shadow Rising',
      });

      // Create a book linked to the project
      const book = createTestBook({
        id: 'book-1',
        project_id: project.id,
        title: 'Book One: Dawn',
      });

      // Create a chapter linked to the book
      const chapter = createTestChapter({
        book_id: book.id,
        chapter_number: 1,
        title: 'The Awakening',
      });

      // Verify relationships
      expect(book.project_id).toBe(project.id);
      expect(chapter.book_id).toBe(book.id);
    });

    it('creates a trilogy with multiple books', () => {
      const project = createTestTrilogyProject({ id: 'trilogy-1' });

      const books = [
        createTestBook({ project_id: project.id, book_number: 1 }),
        createTestBook({ project_id: project.id, book_number: 2 }),
        createTestBook({ project_id: project.id, book_number: 3 }),
      ];

      expect(project.type).toBe('trilogy');
      expect(books).toHaveLength(3);
      books.forEach((book, index) => {
        expect(book.project_id).toBe(project.id);
        expect(book.book_number).toBe(index + 1);
      });
    });
  });

  describe('Testing Different States', () => {
    it('creates a book in different completion states', () => {
      const setupBook = createTestBook({ status: 'setup' });
      const generatingBook = createTestBook({ status: 'generating' });
      const completedBook = createTestCompletedBook();

      expect(setupBook.status).toBe('setup');
      expect(setupBook.word_count).toBe(0);

      expect(generatingBook.status).toBe('generating');

      expect(completedBook.status).toBe('completed');
      expect(completedBook.word_count).toBeGreaterThan(0);
      expect(completedBook.ending_state).toBeDefined();
    });

    it('creates chapters in various states of completion', () => {
      const book = createTestBook({ id: 'book-1' });

      const chapters = createTestChapters(5, book.id);

      // First chapter should be completed
      expect(chapters[0].status).toBe('completed');
      expect(chapters[0].word_count).toBeGreaterThan(0);

      // Second chapter should be editing
      expect(chapters[1].status).toBe('editing');

      // Third chapter should be writing
      expect(chapters[2].status).toBe('writing');

      // Last chapters should be pending
      expect(chapters[4].status).toBe('pending');
    });
  });

  describe('Customising Nested Data', () => {
    it('creates a project with custom story DNA', () => {
      const project = createTestProject({
        story_dna: createTestStoryDNA({
          genre: 'Science Fiction',
          subgenre: 'Cyberpunk',
          tone: 'Dark and gritty',
          themes: ['Technology vs Humanity', 'Corporate Corruption', 'Identity'],
        }),
      });

      expect(project.story_dna?.genre).toBe('Science Fiction');
      expect(project.story_dna?.subgenre).toBe('Cyberpunk');
      expect(project.story_dna?.themes).toContain('Identity');
    });

    it('creates a chapter with custom scene cards', () => {
      const chapter = createTestCompletedChapter({
        scene_cards: [
          {
            id: 'scene-1',
            order: 1,
            location: 'Underground hacker den',
            characters: ['char-1', 'char-2'],
            povCharacter: 'char-1',
            timeOfDay: 'Midnight',
            goal: 'Infiltrate the corporate network',
            conflict: 'Security systems are more advanced than expected',
            outcome: 'Partial success but alarm triggered',
            emotionalBeat: 'Tension and adrenaline',
          },
        ],
      });

      expect(chapter.scene_cards[0].location).toBe('Underground hacker den');
      expect(chapter.scene_cards[0].goal).toBe('Infiltrate the corporate network');
    });
  });

  describe('Character Creation', () => {
    it('creates a diverse cast of characters', () => {
      const cast = createTestCharacterCast();

      expect(cast).toHaveLength(5);

      const [protagonist, mentor, antagonist, ally, loveInterest] = cast;

      expect(protagonist.role).toBe('protagonist');
      expect(mentor.role).toBe('mentor');
      expect(antagonist.role).toBe('antagonist');
      expect(ally.role).toBe('supporting');
      expect(loveInterest.role).toBe('supporting');
    });

    it('creates a custom protagonist', () => {
      const hero = createTestCharacter({
        name: 'Alex Mercer',
        role: 'protagonist',
        ethnicity: 'Mixed',
        personalityTraits: ['resourceful', 'cynical', 'determined'],
        goals: ['Expose corporate conspiracy', 'Protect his sister'],
        conflicts: ['Trust issues', 'Haunted by past failure'],
      });

      expect(hero.name).toBe('Alex Mercer');
      expect(hero.personalityTraits).toContain('resourceful');
      expect(hero.goals).toContain('Expose corporate conspiracy');
    });
  });

  describe('Testing Book Completion Flow', () => {
    it('simulates the progression from setup to completion', () => {
      // Start with a setup book
      const book = createTestBook({
        id: 'book-flow',
        status: 'setup',
        word_count: 0,
      });

      expect(book.status).toBe('setup');

      // Simulate progression to generating
      const generatingBook = {
        ...book,
        status: 'generating' as const,
        word_count: 35000,
      };

      expect(generatingBook.status).toBe('generating');
      expect(generatingBook.word_count).toBe(35000);

      // Simulate completion
      const completedBook = createTestCompletedBook({
        id: book.id,
        project_id: book.project_id,
      });

      expect(completedBook.status).toBe('completed');
      expect(completedBook.word_count).toBeGreaterThan(50000);
      expect(completedBook.ending_state).toBeDefined();
      expect(completedBook.book_summary).toBeDefined();
    });
  });

  describe('Helper Function Pattern', () => {
    /**
     * Example of creating a helper function using factories
     */
    function createCompleteBookWithChapters(chapterCount: number = 10) {
      const project = createTestProject();
      const book = createTestBook({ project_id: project.id });
      const chapters = createTestChapters(chapterCount, book.id);

      return { project, book, chapters };
    }

    it('uses a helper function to create complex test scenarios', () => {
      const { project, book, chapters } = createCompleteBookWithChapters(15);

      expect(book.project_id).toBe(project.id);
      expect(chapters).toHaveLength(15);
      expect(chapters[0].book_id).toBe(book.id);
    });

    /**
     * Helper for testing trilogy generation
     */
    function createTrilogyWithBooks() {
      const project = createTestTrilogyProject({ id: 'trilogy-test' });
      const books = [
        createTestBook({ project_id: project.id, book_number: 1, title: 'Book One: Origins' }),
        createTestBook({ project_id: project.id, book_number: 2, title: 'Book Two: Conflict' }),
        createTestBook({ project_id: project.id, book_number: 3, title: 'Book Three: Resolution' }),
      ];

      return { project, books };
    }

    it('uses a trilogy helper function', () => {
      const { project, books } = createTrilogyWithBooks();

      expect(project.type).toBe('trilogy');
      expect(project.book_count).toBe(3);
      expect(books).toHaveLength(3);
      expect(books[2].title).toBe('Book Three: Resolution');
    });
  });

  describe('Testing Edge Cases', () => {
    it('creates an empty chapter (no content)', () => {
      const chapter = createTestChapter({
        content: null,
        summary: null,
        word_count: 0,
        status: 'pending',
      });

      expect(chapter.content).toBeNull();
      expect(chapter.summary).toBeNull();
      expect(chapter.word_count).toBe(0);
    });

    it('creates a chapter with critical flags', () => {
      const chapter = createTestCompletedChapter({
        flags: [
          {
            id: 'flag-critical-1',
            type: 'plot_hole',
            severity: 'critical',
            description: 'Character knows information they should not have access to',
            location: 'Chapter 5, Scene 2',
            resolved: false,
          },
        ],
      });

      expect(chapter.flags).toHaveLength(1);
      expect(chapter.flags[0].severity).toBe('critical');
      expect(chapter.flags[0].resolved).toBe(false);
    });

    it('creates a book with no ending state (incomplete)', () => {
      const book = createTestBook({
        status: 'generating',
        ending_state: null,
        book_summary: null,
      });

      expect(book.ending_state).toBeNull();
      expect(book.book_summary).toBeNull();
    });
  });
});
