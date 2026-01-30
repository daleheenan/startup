/**
 * Format genre from preferences (supports both single and multi-genre formats)
 */
export function formatGenre(preferences: {
  genre?: string;
  genres?: string[];
}): string {
  const { genre, genres } = preferences;
  return genre || (genres && genres.length > 0 ? genres.join(' + ') : 'Not specified');
}

/**
 * Format subgenre from preferences (supports both single and multi-subgenre formats)
 */
export function formatSubgenre(preferences: {
  subgenre?: string;
  subgenres?: string[];
}): string {
  const { subgenre, subgenres } = preferences;
  return subgenre || (subgenres && subgenres.length > 0 ? subgenres.join(', ') : 'Not specified');
}

/**
 * Format modifiers if present
 */
export function formatModifiers(modifiers?: string[]): string | null {
  return modifiers && modifiers.length > 0 ? modifiers.join(', ') : null;
}

/**
 * Get context about target word count
 */
export function getWordCountContext(targetLength: number): string {
  if (targetLength < 60000) return 'novella or short novel';
  if (targetLength < 90000) return 'standard novel';
  if (targetLength < 120000) return 'longer novel';
  return 'epic-length novel';
}
