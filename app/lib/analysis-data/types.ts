/**
 * Analysis Data Types
 * Type definitions for the Unified Analysis Engine
 */

// ============================================================================
// ProWritingAid-Style Reports
// ============================================================================

export interface PacingSegment {
  type: 'slow' | 'fast';
  startWord: number;
  endWord: number;
  text: string;
}

export interface ChapterPacing {
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  segments: PacingSegment[];
  fastPercentage: number;
  slowPercentage: number;
  pacingScore: 'balanced' | 'too-slow' | 'too-fast';
  wordCount: number;
}

export interface PacingReport {
  chapters: ChapterPacing[];
  overallFastPercentage: number;
  overallSlowPercentage: number;
  genreExpectation: {
    min: number;
    max: number;
    description: string;
  };
  score: 'good' | 'needs-attention' | 'poor';
}

export interface Echo {
  word: string;
  positions: number[];
  proximity: number;
  severity: 'minor' | 'moderate' | 'severe';
  context: { position: number; sentence: string }[];
}

export interface EchoesReport {
  echoes: Echo[];
  totalEchoes: number;
  severeCount: number;
  moderateCount: number;
  minorCount: number;
}

export interface SentenceVarietyReport {
  lengthDistribution: {
    short: number;
    medium: number;
    long: number;
    veryLong: number;
  };
  avgLength: number;
  variance: number;
  structurePatterns: {
    simple: number;
    compound: number;
    complex: number;
  };
  startPatterns: { word: string; count: number }[];
  varietyScore: number;
  assessment: 'excellent' | 'good' | 'needs-improvement' | 'poor';
}

export interface DialogueTag {
  tag: string;
  count: number;
  percentage: number;
  severity: 'good' | 'overused' | 'excessive';
  alternatives?: string[];
}

export interface DialogueTagsReport {
  tags: DialogueTag[];
  totalDialogueLines: number;
  assessment: 'good' | 'needs-attention' | 'poor';
}

export interface ReadabilityReport {
  fleschKincaidGradeLevel: number;
  fleschReadingEase: number;
  gunningFogIndex: number;
  automatedReadabilityIndex: number;
  complexWordPercentage: number;
  avgSentenceLength: number;
  avgWordLength: number;
  interpretation: string;
  targetAudience: string;
  assessment: 'appropriate' | 'too-simple' | 'too-complex';
}

export interface AdverbIssue {
  adverb: string;
  context: string;
  position: number;
  chapterId?: string;
  suggestion: string;
}

export interface AdverbsReport {
  instances: AdverbIssue[];
  totalAdverbs: number;
  adverbDensity: number;
  assessment: 'good' | 'moderate' | 'excessive';
}

export interface PassiveVoiceInstance {
  sentence: string;
  passivePhrase: string;
  position: number;
  chapterId?: string;
  activeSuggestion: string;
}

export interface PassiveVoiceReport {
  instances: PassiveVoiceInstance[];
  totalInstances: number;
  passivePercentage: number;
  assessment: 'good' | 'moderate' | 'excessive';
}

// ============================================================================
// Genre Conventions
// ============================================================================

export interface GenreConvention {
  name: string;
  description: string;
  required: boolean;
  category: 'structure' | 'character' | 'theme' | 'ending' | 'pacing' | 'tone';
  examples: string[];
}

export interface ConventionCheck {
  convention: GenreConvention;
  met: boolean;
  confidence: number;
  evidence?: string;
  suggestions?: string[];
}

export interface GenreConventionsReport {
  genre: string;
  overallScore: number;
  checks: ConventionCheck[];
  warnings: string[];
  recommendations: string[];
  summary: string;
}

// ============================================================================
// Bestseller Formula
// ============================================================================

export interface OpeningHookAnalysis {
  score: number;
  hasHook: boolean;
  hookType?: 'action' | 'mystery' | 'voice' | 'conflict' | 'setting';
  firstLineStrength: number;
  firstParagraphStrength: number;
  firstPageStrength: number;
  issues: string[];
  recommendations: string[];
}

export interface TensionArcPoint {
  chapterNumber: number;
  tensionLevel: number;
  description: string;
}

export interface TensionArcAnalysis {
  overallArcScore: number;
  points: TensionArcPoint[];
  hasIncitingIncident: boolean;
  hasMidpoint: boolean;
  hasAllIsLost: boolean;
  hasClimax: boolean;
  issues: string[];
  recommendations: string[];
}

export interface CharacterArcAnalysis {
  characters: {
    name: string;
    arcType: string;
    arcCompleteness: number;
    transformationClarity: number;
    issues: string[];
  }[];
  overallScore: number;
  recommendations: string[];
}

export interface BestsellerAnalysis {
  bookId: string;
  overallScore: number;
  openingHook: OpeningHookAnalysis;
  tensionArc: TensionArcAnalysis;
  characterArc: CharacterArcAnalysis;
}

// ============================================================================
// Commercial Viability
// ============================================================================

export interface CommercialViabilityScore {
  overallScore: number;
  breakdown: {
    genreAdherence: number;
    pacingAppropriate: number;
    characterDevelopment: number;
    openingHook: number;
    structuralIntegrity: number;
    emotionalResonance: number;
  };
  marketability: 'high' | 'medium' | 'low';
  targetAudience: string;
  recommendations: string[];
}

// ============================================================================
// Unified Analysis Dashboard
// ============================================================================

export interface UnifiedAnalysis {
  bookId: string;
  versionId?: string;
  timestamp: string;

  // ProWritingAid-style reports
  pacing?: PacingReport;
  echoes?: EchoesReport;
  sentenceVariety?: SentenceVarietyReport;
  dialogueTags?: DialogueTagsReport;
  readability?: ReadabilityReport;
  adverbs?: AdverbsReport;
  passiveVoice?: PassiveVoiceReport;

  // Genre & bestseller
  genreConventions?: GenreConventionsReport;
  bestsellerAnalysis?: BestsellerAnalysis;
  commercialViability?: CommercialViabilityScore;

  // Summary
  summary: {
    overallScore: number;
    criticalIssues: number;
    warnings: number;
    suggestions: number;
  };
}
