/**
 * Barrel export file for backend services
 *
 * Provides organised imports for all services in NovelForge backend
 */

// Core services
export * from './logger.service.js';
export * from './cache.service.js';
export * from './metrics.service.js';
export * from './sentry.service.js';

// AI generation services
export * from './claude.service.js';
export * from './concept-generator.js';
export * from './character-generator.js';
export * from './world-generator.js';
export * from './outline-generator.js';
export * from './chapter-orchestrator.service.js';
export * from './chapter-brief-generator.js';
export * from './context-assembly.service.js';

// Editorial and quality services
export * from './specialist-agents.service.js';
export * from './agent-configuration.service.js';
export * from './veb.service.js';
export * from './outline-editorial.service.js';
export * from './editing.service.js';
export * from './follow-up.service.js';
export * from './regeneration.service.js';

// Bestseller formula validators
export * from './opening-hook-validator.service.js';
export * from './tension-arc-validator.service.js';
export {
  CharacterArcValidatorService,
  type CharacterArcAnalysis,
  type CharacterArcResult
} from './character-arc-validator.service.js';

// Book management services
export * from './book-transition.service.js';
export * from './book-cloning.service.js';
export * from './book-versioning.service.js';
export * from './cross-book-continuity.service.js';
export * from './series-bible-generator.service.js';

// Content analysis services
export * from './proseAnalyzer.js';
export * from './analyticsService.js';
export * from './completion-detection.service.js';
export * from './plagiarism-checker.service.js';

// Lookup and reference services
export * from './author-lookup.service.js';
export * from './author-styles.js';
export * from './genre-tropes.service.js';
export * from './genre-conventions.service.js';

export * from './name-generator.js';

// Utility services
export * from './mystery-tracking.service.js';
export * from './progress-tracking.service.js';
export * from './session-tracker.js';
export * from './circuit-breaker.service.js';
export * from './backup.service.js';
export * from './universe.service.js';
export * from './export.service.js';

// Data and templates
export * from './structure-templates.js';
export * from './reflections.js';
export * from './lessons.js';

// Editorial lessons curation
export * from './editorial-lessons.service.js';
export * from './lesson-curation.service.js';

// Story generation utilities
export * from './story-dna-generator.js';
export * from './story-ideas-generator.js';

// Prose analysis reports (ProWritingAid-style)
export * from './prose-reports/index.js';

// Publishing support
export * from './publishing/index.js';

// Enhanced export services (KDP/Publishing - Sprint 41)
// Note: Export subdirectory exports are available via direct import
// e.g., import { TRIM_SIZES } from './services/export/trim-sizes'

// Token optimization
export * from './token.service.js';

// Voice extraction
export * from './voice-extraction.service.js';

// Bestseller mode
export * from './bestseller-mode.service.js';

// Image generation
export * from './image-generation.service.js';

// Commercial genre services (Romance, Thriller, Sci-Fi)
export * from './romance-commercial.service.js';
export * from './thriller-commercial.service.js';
export * from './scifi-commercial.service.js';

// Unified Analysis Engine
export * from './unified-analysis.service.js';
