/**
 * Validation Configuration
 * Business rules and limits
 */
export const ValidationConfig = {
  /** Minimum book word count */
  MIN_BOOK_WORD_COUNT: 40000,

  /** Maximum book word count */
  MAX_BOOK_WORD_COUNT: 150000,

  /** Maximum items in regeneration history */
  MAX_REGENERATION_HISTORY_LIMIT: 100,

  /** Maximum user exclusions per request */
  MAX_USER_EXCLUSIONS_PER_REQUEST: 100,

  /** Book categorisation thresholds */
  WORD_COUNT: {
    NOVELLA_MAX: 50000,
    NOVEL_MAX: 100000,
    // Anything above NOVEL_MAX is 'epic'
  },
} as const;
