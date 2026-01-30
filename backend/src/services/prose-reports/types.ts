/**
 * Shared types for prose analysis reports
 * Sprint 40: ProWritingAid-Style Reports
 */

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
  positions: number[]; // Word indices
  proximity: number; // Words between repetitions
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
    short: number; // < 10 words
    medium: number; // 10-20 words
    long: number; // 20-30 words
    veryLong: number; // 30+ words
  };
  avgLength: number;
  variance: number;
  structurePatterns: {
    simple: number; // No conjunctions
    compound: number; // One conjunction
    complex: number; // Multiple clauses
  };
  startPatterns: { word: string; count: number }[];
  varietyScore: number; // 0-100
  assessment: 'excellent' | 'good' | 'needs-improvement' | 'poor';
}

export interface DialogueTag {
  tag: string;
  count: number;
  percentage: number; // Of all dialogue
  severity: 'good' | 'overused' | 'excessive';
  alternatives?: string[];
}

export interface DialogueTagsReport {
  tags: DialogueTag[];
  totalDialogueLines: number;
  assessment: 'good' | 'needs-attention' | 'poor';
}

export interface StickySentence {
  sentence: string;
  glueWordCount: number;
  glueWordPercentage: number;
  totalWords: number;
  position: number;
  chapterId?: string;
  severity: 'minor' | 'moderate' | 'severe';
  suggestion: string;
}

export interface StickySentencesReport {
  sentences: StickySentence[];
  totalStickySentences: number;
  severeCount: number;
  moderateCount: number;
  minorCount: number;
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

export interface OverusedWord {
  word: string;
  count: number;
  frequency: number; // Per 10,000 words
  genreAverage: number;
  overuseRatio: number; // Your freq / genre avg
  severity: 'minor' | 'moderate' | 'severe';
}

export interface OverusedWordsReport {
  words: OverusedWord[];
  totalOverusedWords: number;
  severeCount: number;
  moderateCount: number;
  minorCount: number;
}

export interface AdverbIssue {
  adverb: string;
  context: string; // Sentence containing adverb
  position: number;
  chapterId?: string;
  suggestion: string;
}

export interface AdverbsReport {
  instances: AdverbIssue[];
  totalAdverbs: number;
  adverbDensity: number; // Per 1000 words
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

export interface ProseReportsDashboard {
  pacing: PacingReport;
  echoes: EchoesReport;
  sentenceVariety: SentenceVarietyReport;
  dialogueTags: DialogueTagsReport;
  stickySentences: StickySentencesReport;
  readability: ReadabilityReport;
  overusedWords: OverusedWordsReport;
  adverbs: AdverbsReport;
  passiveVoice: PassiveVoiceReport;
  summary: {
    overallScore: number;
    criticalIssues: number;
    warnings: number;
    suggestions: number;
  };
}
