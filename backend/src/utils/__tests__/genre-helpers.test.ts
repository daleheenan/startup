import { describe, it, expect } from '@jest/globals';
import {
  formatGenre,
  formatSubgenre,
  formatModifiers,
  getWordCountContext,
} from '../genre-helpers.js';

describe('genre-helpers', () => {
  describe('formatGenre', () => {
    it('should return single genre when provided', () => {
      // Arrange
      const preferences = { genre: 'Fantasy' };

      // Act
      const result = formatGenre(preferences);

      // Assert
      expect(result).toBe('Fantasy');
    });

    it('should join multiple genres with +', () => {
      // Arrange
      const preferences = { genres: ['Fantasy', 'Romance', 'Mystery'] };

      // Act
      const result = formatGenre(preferences);

      // Assert
      expect(result).toBe('Fantasy + Romance + Mystery');
    });

    it('should prioritise single genre over genres array', () => {
      // Arrange
      const preferences = {
        genre: 'Science Fiction',
        genres: ['Fantasy', 'Romance'],
      };

      // Act
      const result = formatGenre(preferences);

      // Assert
      expect(result).toBe('Science Fiction');
    });

    it('should return "Not specified" when neither genre nor genres provided', () => {
      // Arrange
      const preferences = {};

      // Act
      const result = formatGenre(preferences);

      // Assert
      expect(result).toBe('Not specified');
    });

    it('should return "Not specified" when genres array is empty', () => {
      // Arrange
      const preferences = { genres: [] };

      // Act
      const result = formatGenre(preferences);

      // Assert
      expect(result).toBe('Not specified');
    });

    it('should handle single item in genres array', () => {
      // Arrange
      const preferences = { genres: ['Horror'] };

      // Act
      const result = formatGenre(preferences);

      // Assert
      expect(result).toBe('Horror');
    });

    it('should handle empty string genre', () => {
      // Arrange
      const preferences = { genre: '' };

      // Act
      const result = formatGenre(preferences);

      // Assert
      expect(result).toBe('Not specified');
    });
  });

  describe('formatSubgenre', () => {
    it('should return single subgenre when provided', () => {
      // Arrange
      const preferences = { subgenre: 'Urban Fantasy' };

      // Act
      const result = formatSubgenre(preferences);

      // Assert
      expect(result).toBe('Urban Fantasy');
    });

    it('should join multiple subgenres with commas', () => {
      // Arrange
      const preferences = { subgenres: ['Epic', 'Sword and Sorcery', 'Dark'] };

      // Act
      const result = formatSubgenre(preferences);

      // Assert
      expect(result).toBe('Epic, Sword and Sorcery, Dark');
    });

    it('should prioritise single subgenre over subgenres array', () => {
      // Arrange
      const preferences = {
        subgenre: 'Cosy Mystery',
        subgenres: ['Police Procedural', 'Hard-Boiled'],
      };

      // Act
      const result = formatSubgenre(preferences);

      // Assert
      expect(result).toBe('Cosy Mystery');
    });

    it('should return "Not specified" when neither subgenre nor subgenres provided', () => {
      // Arrange
      const preferences = {};

      // Act
      const result = formatSubgenre(preferences);

      // Assert
      expect(result).toBe('Not specified');
    });

    it('should return "Not specified" when subgenres array is empty', () => {
      // Arrange
      const preferences = { subgenres: [] };

      // Act
      const result = formatSubgenre(preferences);

      // Assert
      expect(result).toBe('Not specified');
    });

    it('should handle single item in subgenres array', () => {
      // Arrange
      const preferences = { subgenres: ['Cyberpunk'] };

      // Act
      const result = formatSubgenre(preferences);

      // Assert
      expect(result).toBe('Cyberpunk');
    });

    it('should handle empty string subgenre', () => {
      // Arrange
      const preferences = { subgenre: '' };

      // Act
      const result = formatSubgenre(preferences);

      // Assert
      expect(result).toBe('Not specified');
    });
  });

  describe('formatModifiers', () => {
    it('should join modifiers with commas', () => {
      // Arrange
      const modifiers = ['Dark', 'Humorous', 'Character-Driven'];

      // Act
      const result = formatModifiers(modifiers);

      // Assert
      expect(result).toBe('Dark, Humorous, Character-Driven');
    });

    it('should return null when modifiers array is empty', () => {
      // Arrange
      const modifiers: string[] = [];

      // Act
      const result = formatModifiers(modifiers);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when modifiers is undefined', () => {
      // Arrange & Act
      const result = formatModifiers(undefined);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle single modifier', () => {
      // Arrange
      const modifiers = ['Fast-Paced'];

      // Act
      const result = formatModifiers(modifiers);

      // Assert
      expect(result).toBe('Fast-Paced');
    });

    it('should handle modifiers with special characters', () => {
      // Arrange
      const modifiers = ['Action-Packed', 'Thought-Provoking', 'Coming-of-Age'];

      // Act
      const result = formatModifiers(modifiers);

      // Assert
      expect(result).toBe('Action-Packed, Thought-Provoking, Coming-of-Age');
    });
  });

  describe('getWordCountContext', () => {
    it('should return "novella or short novel" for under 60,000 words', () => {
      // Arrange & Act & Assert
      expect(getWordCountContext(30000)).toBe('novella or short novel');
      expect(getWordCountContext(50000)).toBe('novella or short novel');
      expect(getWordCountContext(59999)).toBe('novella or short novel');
    });

    it('should return "standard novel" for 60,000 to 89,999 words', () => {
      // Arrange & Act & Assert
      expect(getWordCountContext(60000)).toBe('standard novel');
      expect(getWordCountContext(75000)).toBe('standard novel');
      expect(getWordCountContext(89999)).toBe('standard novel');
    });

    it('should return "longer novel" for 90,000 to 119,999 words', () => {
      // Arrange & Act & Assert
      expect(getWordCountContext(90000)).toBe('longer novel');
      expect(getWordCountContext(100000)).toBe('longer novel');
      expect(getWordCountContext(119999)).toBe('longer novel');
    });

    it('should return "epic-length novel" for 120,000 words and above', () => {
      // Arrange & Act & Assert
      expect(getWordCountContext(120000)).toBe('epic-length novel');
      expect(getWordCountContext(150000)).toBe('epic-length novel');
      expect(getWordCountContext(200000)).toBe('epic-length novel');
    });

    it('should handle edge case at exact boundaries', () => {
      // Arrange & Act & Assert
      expect(getWordCountContext(60000)).toBe('standard novel');
      expect(getWordCountContext(90000)).toBe('longer novel');
      expect(getWordCountContext(120000)).toBe('epic-length novel');
    });

    it('should handle very small word counts', () => {
      // Arrange & Act & Assert
      expect(getWordCountContext(1000)).toBe('novella or short novel');
      expect(getWordCountContext(0)).toBe('novella or short novel');
    });
  });
});
