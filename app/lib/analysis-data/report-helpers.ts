/**
 * Report Helper Functions
 * Utilities for formatting and processing analysis reports
 */

import type { UnifiedAnalysis } from './types.js';

/**
 * Calculate overall health score from unified analysis
 */
export function calculateOverallHealth(analysis: UnifiedAnalysis): number {
  const scores: number[] = [];

  // ProWritingAid scores
  if (analysis.pacing) {
    scores.push(mapPacingScore(analysis.pacing.score));
  }
  if (analysis.sentenceVariety) {
    scores.push(analysis.sentenceVariety.varietyScore);
  }
  if (analysis.readability) {
    scores.push(mapReadabilityScore(analysis.readability.assessment));
  }
  if (analysis.dialogueTags) {
    scores.push(mapDialogueScore(analysis.dialogueTags.assessment));
  }
  if (analysis.adverbs) {
    scores.push(mapAdverbScore(analysis.adverbs.assessment));
  }
  if (analysis.passiveVoice) {
    scores.push(mapPassiveScore(analysis.passiveVoice.assessment));
  }

  // Genre conventions score
  if (analysis.genreConventions) {
    scores.push(analysis.genreConventions.overallScore * 100);
  }

  // Bestseller score
  if (analysis.bestsellerAnalysis) {
    scores.push(analysis.bestsellerAnalysis.overallScore);
  }

  // Commercial viability
  if (analysis.commercialViability) {
    scores.push(analysis.commercialViability.overallScore);
  }

  if (scores.length === 0) return 0;

  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function mapPacingScore(score: 'good' | 'needs-attention' | 'poor'): number {
  switch (score) {
    case 'good': return 85;
    case 'needs-attention': return 60;
    case 'poor': return 35;
  }
}

function mapReadabilityScore(assessment: 'appropriate' | 'too-simple' | 'too-complex'): number {
  switch (assessment) {
    case 'appropriate': return 85;
    case 'too-simple': return 60;
    case 'too-complex': return 60;
  }
}

function mapDialogueScore(assessment: 'good' | 'needs-attention' | 'poor'): number {
  switch (assessment) {
    case 'good': return 85;
    case 'needs-attention': return 60;
    case 'poor': return 35;
  }
}

function mapAdverbScore(assessment: 'good' | 'moderate' | 'excessive'): number {
  switch (assessment) {
    case 'good': return 85;
    case 'moderate': return 60;
    case 'excessive': return 35;
  }
}

function mapPassiveScore(assessment: 'good' | 'moderate' | 'excessive'): number {
  switch (assessment) {
    case 'good': return 85;
    case 'moderate': return 60;
    case 'excessive': return 35;
  }
}

/**
 * Count total issues across all reports
 */
export function countIssues(analysis: UnifiedAnalysis): {
  critical: number;
  warnings: number;
  suggestions: number;
} {
  let critical = 0;
  let warnings = 0;
  let suggestions = 0;

  if (analysis.echoes) {
    critical += analysis.echoes.severeCount;
    warnings += analysis.echoes.moderateCount;
    suggestions += analysis.echoes.minorCount;
  }

  if (analysis.adverbs) {
    if (analysis.adverbs.assessment === 'excessive') critical += 1;
    else if (analysis.adverbs.assessment === 'moderate') warnings += 1;
  }

  if (analysis.passiveVoice) {
    if (analysis.passiveVoice.assessment === 'excessive') critical += 1;
    else if (analysis.passiveVoice.assessment === 'moderate') warnings += 1;
  }

  if (analysis.dialogueTags) {
    if (analysis.dialogueTags.assessment === 'poor') critical += 1;
    else if (analysis.dialogueTags.assessment === 'needs-attention') warnings += 1;
  }

  if (analysis.genreConventions) {
    critical += analysis.genreConventions.checks.filter(c => c.convention.required && !c.met).length;
    warnings += analysis.genreConventions.warnings.length;
    suggestions += analysis.genreConventions.recommendations.length;
  }

  if (analysis.bestsellerAnalysis) {
    critical += analysis.bestsellerAnalysis.openingHook.issues.length;
    warnings += analysis.bestsellerAnalysis.tensionArc.issues.length;
  }

  return { critical, warnings, suggestions };
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-GB');
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Truncate text to max length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
