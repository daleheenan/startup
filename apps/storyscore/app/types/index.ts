// StoryScore TypeScript Type Definitions

export type Product = 'novelforge' | 'storyscore';

export interface CategoryScore {
  score: number; // 0-100
  subscores: Record<string, number>;
  notes: string;
  confidence?: number; // 0-1
}

export interface CategoryScores {
  plot: CategoryScore;
  character: CategoryScore;
  pacing: CategoryScore;
  prose: CategoryScore;
  marketability: CategoryScore;
  genre?: CategoryScore;
}

export interface Recommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  issue: string;
  suggestion: string;
  affectedChapters?: string[];
  estimatedImpact: string;
}

export interface TokenUsage {
  totalInput: number;
  totalOutput: number;
  byModule?: Record<string, { input: number; output: number }>;
  estimatedCostUsd: number;
  estimatedCostGbp: number;
}

export interface GenreComparison {
  genre: string;
  percentile: number;
  benchmarkNotes: string;
}

export interface AnalysisResult {
  analysisId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  overallScore: number; // 0-100
  categories: CategoryScores;
  strengths: string[];
  weaknesses: string[];
  recommendations: Recommendation[];
  genreComparison?: GenreComparison;
  tokenUsage?: TokenUsage;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

export interface AnalysisHistoryItem {
  analysisId: string;
  title?: string;
  overallScore?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

export interface AnalysisProgress {
  analysisId: string;
  step: string;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: string;
}
