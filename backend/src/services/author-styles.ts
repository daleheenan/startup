/**
 * Published Author Style Library (Backend Copy)
 *
 * This is a copy of the shared author-styles.ts for backend use.
 * Ideally, we'd reference the shared file, but TypeScript rootDir constraints
 * make this the simpler solution.
 */

export interface AuthorStyle {
  id: string;
  name: string;
  fullName: string;
  era: string;
  nationality: string;
  knownFor: string[];
  genres: string[];
  styleDescription: string;
  characteristics: {
    sentenceStyle: 'short' | 'medium' | 'long' | 'varied';
    vocabularyLevel: 'simple' | 'moderate' | 'complex' | 'literary';
    narrativeVoice: 'close' | 'distant' | 'omniscient' | 'intimate';
    toneSignature: string[];
    pacing: 'fast' | 'moderate' | 'slow' | 'deliberate' | 'varied';
    dialogueStyle: string;
    descriptiveApproach: string;
  };
  sampleDescription: string;
  bestFor: string[];
  icon: string;
}

// Re-export from the shared module at runtime (works for JavaScript)
// Note: This file is only used by the backend routes
export const AUTHOR_STYLES: AuthorStyle[] = [];

// This will be populated at runtime by importing the actual shared file
// For now, we'll just use dynamic imports in the routes
