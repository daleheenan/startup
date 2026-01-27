/**
 * Test Data Generators for E2E Tests
 *
 * Provides consistent test data across test suites
 */

export interface ProjectTestData {
  title: string;
  genre: string;
  projectType: 'standalone' | 'trilogy' | 'series';
  prompt?: string;
}

/**
 * Generate unique project title for testing
 */
export function generateProjectTitle(prefix = 'Test Novel'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix} ${timestamp}-${random}`;
}

/**
 * Quick Start test data
 */
export const QUICK_START_DATA: ProjectTestData = {
  title: generateProjectTitle('Quick Start'),
  genre: 'fantasy',
  projectType: 'standalone',
  prompt: 'A wizard discovers a hidden library of forbidden spells',
};

/**
 * Full Customisation test data
 */
export const FULL_CUSTOMISATION_DATA: ProjectTestData = {
  title: generateProjectTitle('Full Custom'),
  genre: 'science-fiction',
  projectType: 'trilogy',
  prompt: 'A scientist creates the first sentient AI',
};

/**
 * Genre options available in Quick Start
 */
export const QUICK_GENRES = [
  'fantasy',
  'science-fiction',
  'romance',
  'mystery',
  'thriller',
  'horror',
  'historical',
  'contemporary',
] as const;

/**
 * Project types available
 */
export const PROJECT_TYPES = ['standalone', 'trilogy', 'series'] as const;

/**
 * Validation test cases for form fields
 */
export const VALIDATION_TESTS = {
  emptyTitle: {
    title: '',
    expectedError: /title.*required/i,
  },
  tooShortTitle: {
    title: 'AB',
    expectedError: /title.*at least/i,
  },
  tooLongTitle: {
    title: 'A'.repeat(201),
    expectedError: /title.*maximum/i,
  },
  noGenreSelected: {
    title: 'Valid Title',
    expectedError: /genre.*required/i,
  },
};
