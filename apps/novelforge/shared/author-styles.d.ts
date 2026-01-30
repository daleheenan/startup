/**
 * Published Author Style Library
 *
 * A curated collection of famous author writing styles that can be
 * used as references for AI-assisted novel generation.
 *
 * Note: These are stylistic descriptions, not copyrighted content.
 * The AI uses these to emulate writing characteristics, not to copy text.
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
export declare const AUTHOR_STYLES: AuthorStyle[];
export declare const AUTHORS_BY_GENRE: Record<string, string[]>;
export declare function getRecommendedAuthors(genres: string[]): AuthorStyle[];
export declare function getAuthorById(id: string): AuthorStyle | undefined;
//# sourceMappingURL=author-styles.d.ts.map