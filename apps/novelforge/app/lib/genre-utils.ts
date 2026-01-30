/**
 * Genre utility functions
 * Helper functions for genre detection and classification
 */

/**
 * Detect which commercial genre settings apply to a given genre/subgenre
 */
export function detectApplicableGenreSettings(genre: string, subgenre?: string): {
  showRomance: boolean;
  showThriller: boolean;
  showSciFi: boolean;
} {
  const genreLower = genre?.toLowerCase() || '';
  const subgenreLower = subgenre?.toLowerCase() || '';

  // Romance detection
  const showRomance =
    genreLower === 'romance' ||
    genreLower.includes('romantasy') ||
    subgenreLower.includes('romance');

  // Thriller detection
  const showThriller =
    genreLower === 'thriller' ||
    genreLower === 'mystery' ||
    genreLower.includes('thriller') ||
    subgenreLower.includes('thriller') ||
    subgenreLower.includes('suspense');

  // Sci-Fi detection
  const showSciFi =
    genreLower === 'science-fiction' ||
    genreLower === 'sci-fi' ||
    genreLower.includes('science') ||
    genreLower.includes('scifi') ||
    subgenreLower.includes('sci-fi') ||
    subgenreLower.includes('science');

  return {
    showRomance,
    showThriller,
    showSciFi,
  };
}

/**
 * Get a display name for a genre
 */
export function getGenreDisplayName(genre: string): string {
  const displayNames: Record<string, string> = {
    'science-fiction': 'Science Fiction',
    'sci-fi': 'Sci-Fi',
    'romance': 'Romance',
    'thriller': 'Thriller',
    'mystery': 'Mystery',
    'fantasy': 'Fantasy',
    'horror': 'Horror',
    'historical': 'Historical Fiction',
    'contemporary': 'Contemporary',
    'literary': 'Literary Fiction',
    'western': 'Western',
    'romantasy': 'Romantasy',
    'cozy-fantasy': 'Cozy Fantasy',
    'grimdark': 'Grimdark',
    'litrpg': 'LitRPG',
  };

  return displayNames[genre.toLowerCase()] || genre;
}
