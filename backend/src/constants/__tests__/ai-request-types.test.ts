/**
 * AI Request Types Constants Tests
 * Tests for AI request type definitions, labels, and categorisation
 */

import { describe, it, expect } from '@jest/globals';
import {
  AI_REQUEST_TYPES,
  AI_REQUEST_TYPE_LABELS,
  AI_REQUEST_TYPE_CATEGORIES,
  getAllRequestTypes,
  getRequestTypesByCategory,
  type AIRequestType,
} from '../ai-request-types.js';

describe('AI Request Types Constants', () => {
  describe('AI_REQUEST_TYPES', () => {
    it('should have all expected request type categories', () => {
      // Chapter operations
      expect(AI_REQUEST_TYPES.CHAPTER_GENERATION).toBe('chapter_generation');
      expect(AI_REQUEST_TYPES.DEVELOPMENTAL_EDIT).toBe('developmental_edit');
      expect(AI_REQUEST_TYPES.LINE_EDIT).toBe('line_edit');
      expect(AI_REQUEST_TYPES.CONTINUITY_CHECK).toBe('continuity_check');

      // VEB
      expect(AI_REQUEST_TYPES.VEB_BETA_SWARM).toBe('veb_beta_swarm');
      expect(AI_REQUEST_TYPES.VEB_RUTHLESS_EDITOR).toBe('veb_ruthless_editor');
      expect(AI_REQUEST_TYPES.VEB_MARKET_ANALYST).toBe('veb_market_analyst');

      // Outline Editorial
      expect(AI_REQUEST_TYPES.OUTLINE_STRUCTURE_ANALYST).toBe('outline_structure_analyst');
      expect(AI_REQUEST_TYPES.OUTLINE_CHARACTER_ARC).toBe('outline_character_arc');
      expect(AI_REQUEST_TYPES.OUTLINE_MARKET_FIT).toBe('outline_market_fit');
      expect(AI_REQUEST_TYPES.OUTLINE_REWRITE).toBe('outline_rewrite');

      // Generators
      expect(AI_REQUEST_TYPES.STORY_DNA_GENERATION).toBe('story_dna_generation');
      expect(AI_REQUEST_TYPES.CHARACTER_GENERATION).toBe('character_generation');
      expect(AI_REQUEST_TYPES.WORLD_GENERATION).toBe('world_generation');
      expect(AI_REQUEST_TYPES.OUTLINE_GENERATION).toBe('outline_generation');

      // Quality checks
      expect(AI_REQUEST_TYPES.COHERENCE_CHECK).toBe('coherence_check');
      expect(AI_REQUEST_TYPES.ORIGINALITY_CHECK).toBe('originality_check');
    });

    it('should have unique values for all request types', () => {
      const values = Object.values(AI_REQUEST_TYPES);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should use lowercase snake_case for all values', () => {
      const values = Object.values(AI_REQUEST_TYPES);
      for (const value of values) {
        expect(value).toMatch(/^[a-z_]+$/);
      }
    });
  });

  describe('AI_REQUEST_TYPE_LABELS', () => {
    it('should have a label for every request type', () => {
      const requestTypes = Object.values(AI_REQUEST_TYPES);
      const labelKeys = Object.keys(AI_REQUEST_TYPE_LABELS);

      expect(labelKeys.length).toBe(requestTypes.length);

      for (const requestType of requestTypes) {
        expect(AI_REQUEST_TYPE_LABELS[requestType as AIRequestType]).toBeDefined();
        expect(AI_REQUEST_TYPE_LABELS[requestType as AIRequestType]).not.toBe('');
      }
    });

    it('should have human-readable labels', () => {
      expect(AI_REQUEST_TYPE_LABELS[AI_REQUEST_TYPES.CHAPTER_GENERATION]).toBe(
        'Chapter Generation'
      );
      expect(AI_REQUEST_TYPE_LABELS[AI_REQUEST_TYPES.VEB_BETA_SWARM]).toBe('VEB: Beta Swarm');
      expect(AI_REQUEST_TYPE_LABELS[AI_REQUEST_TYPES.OUTLINE_STRUCTURE_ANALYST]).toBe(
        'Outline: Structure Analyst'
      );
      expect(AI_REQUEST_TYPE_LABELS[AI_REQUEST_TYPES.COHERENCE_CHECK]).toBe('Coherence Check');
    });

    it('should use title case for labels', () => {
      const labels = Object.values(AI_REQUEST_TYPE_LABELS);
      for (const label of labels) {
        // Check that first character of each word is uppercase (except "and", "of", etc.)
        const words = label.split(' ');
        for (const word of words) {
          if (word.length > 0 && !['and', 'of', 'the', 'in', 'on'].includes(word.toLowerCase())) {
            // First character should be uppercase, colon, or opening parenthesis
            expect(word[0]).toMatch(/[A-Z:(]/);
          }
        }
      }
    });
  });

  describe('AI_REQUEST_TYPE_CATEGORIES', () => {
    it('should have all major categories', () => {
      expect(AI_REQUEST_TYPE_CATEGORIES['Chapter Operations']).toBeDefined();
      expect(AI_REQUEST_TYPE_CATEGORIES['Editorial Board']).toBeDefined();
      expect(AI_REQUEST_TYPE_CATEGORIES['Outline Editorial']).toBeDefined();
      expect(AI_REQUEST_TYPE_CATEGORIES['Specialist Reviews']).toBeDefined();
      expect(AI_REQUEST_TYPE_CATEGORIES['Quality Checks']).toBeDefined();
      expect(AI_REQUEST_TYPE_CATEGORIES['Generation']).toBeDefined();
      expect(AI_REQUEST_TYPE_CATEGORIES['Follow-up']).toBeDefined();
      expect(AI_REQUEST_TYPE_CATEGORIES['Word Count']).toBeDefined();
      expect(AI_REQUEST_TYPE_CATEGORIES['Analysis']).toBeDefined();
    });

    it('should categorise all request types', () => {
      const allRequestTypes = Object.values(AI_REQUEST_TYPES);
      const categorisedTypes: string[] = [];

      for (const types of Object.values(AI_REQUEST_TYPE_CATEGORIES)) {
        categorisedTypes.push(...types);
      }

      // Remove duplicates
      const uniqueCategorisedTypes = [...new Set(categorisedTypes)];

      expect(uniqueCategorisedTypes.length).toBe(allRequestTypes.length);

      // Every request type should be in exactly one category
      for (const requestType of allRequestTypes) {
        const count = categorisedTypes.filter((t) => t === requestType).length;
        expect(count).toBe(1);
      }
    });

    it('should have correct types in Chapter Operations category', () => {
      const chapterOps = AI_REQUEST_TYPE_CATEGORIES['Chapter Operations'];
      expect(chapterOps).toContain(AI_REQUEST_TYPES.CHAPTER_GENERATION);
      expect(chapterOps).toContain(AI_REQUEST_TYPES.DEVELOPMENTAL_EDIT);
      expect(chapterOps).toContain(AI_REQUEST_TYPES.LINE_EDIT);
      expect(chapterOps).toContain(AI_REQUEST_TYPES.COPY_EDIT);
      expect(chapterOps).toContain(AI_REQUEST_TYPES.PROOFREAD);
    });

    it('should have correct types in Editorial Board category', () => {
      const editorialBoard = AI_REQUEST_TYPE_CATEGORIES['Editorial Board'];
      expect(editorialBoard).toContain(AI_REQUEST_TYPES.VEB_BETA_SWARM);
      expect(editorialBoard).toContain(AI_REQUEST_TYPES.VEB_RUTHLESS_EDITOR);
      expect(editorialBoard).toContain(AI_REQUEST_TYPES.VEB_MARKET_ANALYST);
      expect(editorialBoard).toHaveLength(3);
    });

    it('should have correct types in Outline Editorial category', () => {
      const outlineEditorial = AI_REQUEST_TYPE_CATEGORIES['Outline Editorial'];
      expect(outlineEditorial).toContain(AI_REQUEST_TYPES.OUTLINE_STRUCTURE_ANALYST);
      expect(outlineEditorial).toContain(AI_REQUEST_TYPES.OUTLINE_CHARACTER_ARC);
      expect(outlineEditorial).toContain(AI_REQUEST_TYPES.OUTLINE_MARKET_FIT);
      expect(outlineEditorial).toContain(AI_REQUEST_TYPES.OUTLINE_REWRITE);
    });

    it('should have correct types in Generation category', () => {
      const generation = AI_REQUEST_TYPE_CATEGORIES['Generation'];
      expect(generation).toContain(AI_REQUEST_TYPES.STORY_DNA_GENERATION);
      expect(generation).toContain(AI_REQUEST_TYPES.CHARACTER_GENERATION);
      expect(generation).toContain(AI_REQUEST_TYPES.WORLD_GENERATION);
      expect(generation).toContain(AI_REQUEST_TYPES.OUTLINE_GENERATION);
      expect(generation).toContain(AI_REQUEST_TYPES.PLOT_GENERATION);
    });

    it('should have correct types in Quality Checks category', () => {
      const qualityChecks = AI_REQUEST_TYPE_CATEGORIES['Quality Checks'];
      expect(qualityChecks).toContain(AI_REQUEST_TYPES.COHERENCE_CHECK);
      expect(qualityChecks).toContain(AI_REQUEST_TYPES.ORIGINALITY_CHECK);
      expect(qualityChecks).toContain(AI_REQUEST_TYPES.CROSS_BOOK_CONTINUITY);
      expect(qualityChecks).toContain(AI_REQUEST_TYPES.MYSTERY_TRACKING);
    });
  });

  describe('getAllRequestTypes', () => {
    it('should return an array of all request types with labels', () => {
      const allTypes = getAllRequestTypes();

      expect(Array.isArray(allTypes)).toBe(true);
      expect(allTypes.length).toBeGreaterThan(0);

      // Check structure
      for (const type of allTypes) {
        expect(type).toHaveProperty('value');
        expect(type).toHaveProperty('label');
        expect(typeof type.value).toBe('string');
        expect(typeof type.label).toBe('string');
      }
    });

    it('should include all request types', () => {
      const allTypes = getAllRequestTypes();
      const values = allTypes.map((t) => t.value);
      const expectedTypes = Object.values(AI_REQUEST_TYPES);

      expect(values.length).toBe(expectedTypes.length);

      for (const requestType of expectedTypes) {
        expect(values).toContain(requestType);
      }
    });

    it('should have matching labels from AI_REQUEST_TYPE_LABELS', () => {
      const allTypes = getAllRequestTypes();

      for (const type of allTypes) {
        expect(type.label).toBe(AI_REQUEST_TYPE_LABELS[type.value as AIRequestType]);
      }
    });
  });

  describe('getRequestTypesByCategory', () => {
    it('should return an array of categories with types', () => {
      const categories = getRequestTypesByCategory();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);

      // Check structure
      for (const category of categories) {
        expect(category).toHaveProperty('category');
        expect(category).toHaveProperty('types');
        expect(typeof category.category).toBe('string');
        expect(Array.isArray(category.types)).toBe(true);

        for (const type of category.types) {
          expect(type).toHaveProperty('value');
          expect(type).toHaveProperty('label');
        }
      }
    });

    it('should include all categories from AI_REQUEST_TYPE_CATEGORIES', () => {
      const categories = getRequestTypesByCategory();
      const categoryNames = categories.map((c) => c.category);
      const expectedCategories = Object.keys(AI_REQUEST_TYPE_CATEGORIES);

      expect(categoryNames.length).toBe(expectedCategories.length);

      for (const expectedCategory of expectedCategories) {
        expect(categoryNames).toContain(expectedCategory);
      }
    });

    it('should have correct types in each category', () => {
      const categories = getRequestTypesByCategory();

      for (const category of categories) {
        const expectedTypes = AI_REQUEST_TYPE_CATEGORIES[
          category.category as keyof typeof AI_REQUEST_TYPE_CATEGORIES
        ];
        const actualTypeValues = category.types.map((t) => t.value);

        expect(actualTypeValues.length).toBe(expectedTypes.length);

        for (const expectedType of expectedTypes) {
          expect(actualTypeValues).toContain(expectedType);
        }
      }
    });

    it('should have matching labels from AI_REQUEST_TYPE_LABELS', () => {
      const categories = getRequestTypesByCategory();

      for (const category of categories) {
        for (const type of category.types) {
          expect(type.label).toBe(AI_REQUEST_TYPE_LABELS[type.value as AIRequestType]);
        }
      }
    });

    it('should be suitable for dropdown menus', () => {
      const categories = getRequestTypesByCategory();

      // Check that it's structured well for UI
      expect(categories.length).toBeGreaterThan(0);

      // Find Chapter Operations category
      const chapterOps = categories.find((c) => c.category === 'Chapter Operations');
      expect(chapterOps).toBeDefined();
      expect(chapterOps!.types.length).toBeGreaterThan(0);

      // Verify first type has proper structure
      const firstType = chapterOps!.types[0];
      expect(firstType.value).toBeTruthy();
      expect(firstType.label).toBeTruthy();
    });
  });

  describe('Type Safety', () => {
    it('should enforce AIRequestType as a valid type', () => {
      const validType: AIRequestType = 'chapter_generation';
      expect(validType).toBe('chapter_generation');

      // This should compile successfully
      const label = AI_REQUEST_TYPE_LABELS[validType];
      expect(label).toBe('Chapter Generation');
    });

    it('should have all request types as valid AIRequestType values', () => {
      const allTypes = getAllRequestTypes();

      for (const type of allTypes) {
        // Type assertion should be safe
        const label = AI_REQUEST_TYPE_LABELS[type.value as AIRequestType];
        expect(label).toBeDefined();
      }
    });
  });

  describe('Consistency Checks', () => {
    it('should have no orphaned labels', () => {
      const requestTypes = Object.values(AI_REQUEST_TYPES);
      const labelKeys = Object.keys(AI_REQUEST_TYPE_LABELS);

      for (const labelKey of labelKeys) {
        expect(requestTypes).toContain(labelKey);
      }
    });

    it('should have no orphaned category entries', () => {
      const requestTypes = Object.values(AI_REQUEST_TYPES);
      const categorisedTypes: string[] = [];

      for (const types of Object.values(AI_REQUEST_TYPE_CATEGORIES)) {
        categorisedTypes.push(...types);
      }

      for (const categorisedType of categorisedTypes) {
        expect(requestTypes).toContain(categorisedType);
      }
    });

    it('should have consistent naming between constants and labels', () => {
      // VEB types should all have VEB prefix in label
      expect(AI_REQUEST_TYPE_LABELS[AI_REQUEST_TYPES.VEB_BETA_SWARM]).toContain('VEB');
      expect(AI_REQUEST_TYPE_LABELS[AI_REQUEST_TYPES.VEB_RUTHLESS_EDITOR]).toContain('VEB');
      expect(AI_REQUEST_TYPE_LABELS[AI_REQUEST_TYPES.VEB_MARKET_ANALYST]).toContain('VEB');

      // Outline types should have Outline prefix
      expect(AI_REQUEST_TYPE_LABELS[AI_REQUEST_TYPES.OUTLINE_STRUCTURE_ANALYST]).toContain(
        'Outline'
      );
      expect(AI_REQUEST_TYPE_LABELS[AI_REQUEST_TYPES.OUTLINE_CHARACTER_ARC]).toContain('Outline');
      expect(AI_REQUEST_TYPE_LABELS[AI_REQUEST_TYPES.OUTLINE_MARKET_FIT]).toContain('Outline');
    });
  });
});
