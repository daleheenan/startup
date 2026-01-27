/**
 * Barrel export file for backend services
 *
 * Provides organised imports for all services in NovelForge backend
 */

// Core services
export * from './logger.service';
export * from './cache.service';
export * from './metrics.service';
export * from './sentry.service';

// AI generation services
export * from './claude.service';
export * from './concept-generator';
export * from './character-generator';
export * from './world-generator';
export * from './outline-generator';
export * from './context-assembly.service';
export * from './chapter-orchestrator.service';

// Editorial and quality services
export * from './specialist-agents.service';
export * from './veb.service';
export * from './outline-editorial.service';
export * from './editing.service';
export * from './follow-up.service';
export * from './regeneration.service';

// Book management services
export * from './book-transition.service';
export * from './book-cloning.service';
export * from './book-versioning.service';
export * from './cross-book-continuity.service';
export * from './series-bible-generator.service';

// Content analysis services
export * from './proseAnalyzer';
export * from './analyticsService';
export * from './completion-detection.service';
export * from './plagiarism-checker.service';

// Lookup and reference services
export * from './author-lookup.service';
export * from './author-styles';
export * from './genre-tropes.service';
export * from './genre-conventions.service';
export * from './name-generator';

// Utility services
export * from './mystery-tracking.service';
export * from './progress-tracking.service';
export * from './session-tracker';
export * from './circuit-breaker.service';
export * from './backup.service';
export * from './universe.service';
export * from './export.service';

// Data and templates
export * from './structure-templates';
export * from './reflections';
export * from './lessons';

// Story generation utilities
export * from './story-dna-generator';
export * from './story-ideas-generator';
