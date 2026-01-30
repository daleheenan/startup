/**
 * Bestseller Mode Service
 *
 * Premium feature that enforces commercial fiction best practices throughout
 * the writing process. Includes pre-generation checklist validation, real-time
 * quality monitoring, and post-generation commercial viability scoring.
 *
 * Business Model: +£15/book premium feature
 *
 * Key Features:
 * - Pre-generation checklist (must pass before generation starts)
 * - Real-time validation during chapter completion
 * - Commercial viability scoring (1-100 scale)
 * - Marketing package generation (blurb, tagline, keywords)
 * - Comprehensive bestseller report
 */

import { randomUUID } from 'crypto';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';

const logger = createLogger('services:bestseller-mode');

// ============================================================================
// Type Definitions
// ============================================================================

export interface BestsellerCriteria {
  id: string;
  projectId: string;

  // Pre-writing checklist
  hasStrongPremise: boolean;
  premiseHook: string | null;
  genreConventionsIdentified: boolean;
  genreConventions: string[];
  targetTropes: string[];
  compTitles: CompTitle[];
  wordCountTarget: number | null;

  // Structure checklist
  saveTheCatBeatsMapped: boolean;
  beatsData: BeatMapping | null;
  incitingIncidentChapter: number | null;
  midpointChapter: number | null;
  allIsLostChapter: number | null;
  resolutionPlanned: boolean;
  resolutionNotes: string | null;

  // Character checklist
  protagonistWant: string | null;
  protagonistNeed: string | null;
  protagonistLie: string | null;
  characterArcComplete: boolean;
  voiceSamples: string[];

  // Validation status
  checklistComplete: boolean;
  checklistPassed: boolean;
  validationErrors: string[];

  createdAt: string;
  updatedAt: string;
}

export interface CompTitle {
  title: string;
  author: string;
  year: number;
  whyComparable: string;
}

export interface BeatMapping {
  openingHook: { chapter: number; description: string };
  incitingIncident: { chapter: number; description: string };
  firstPlotPoint: { chapter: number; description: string };
  midpointTwist: { chapter: number; description: string };
  allIsLost: { chapter: number; description: string };
  climax: { chapter: number; description: string };
  resolution: { chapter: number; description: string };
}

export interface ChecklistValidationResult {
  isComplete: boolean;
  isPassed: boolean;
  errors: string[];
  warnings: string[];
  completionPercentage: number;
  missingItems: string[];
}

export interface ChecklistRequirements {
  preWriting: {
    hasStrongPremise: boolean;
    genreConventionsIdentified: boolean;
    minTropes: number; // Minimum 3
    minCompTitles: number; // Minimum 2
    wordCountTargetSet: boolean;
  };
  structure: {
    saveTheCatBeatsMapped: boolean;
    incitingIncidentPlaced: boolean;
    midpointPlaced: boolean;
    allIsLostPlaced: boolean;
    resolutionPlanned: boolean;
  };
  character: {
    protagonistWantDefined: boolean;
    protagonistNeedDefined: boolean;
    protagonistLieDefined: boolean;
    characterArcComplete: boolean;
    voiceSampleProvided: boolean;
  };
}

// ============================================================================
// Service Class
// ============================================================================

export class BestsellerModeService {
  /**
   * Toggle bestseller mode on/off for a project
   */
  toggleBestsellerMode(projectId: string, enabled: boolean): void {
    logger.info({ projectId, enabled }, '[BestsellerMode] Toggling bestseller mode');

    const stmt = db.prepare(`
      UPDATE projects
      SET bestseller_mode = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(enabled ? 1 : 0, new Date().toISOString(), projectId);

    // Create criteria record if enabling and doesn't exist
    if (enabled) {
      this.getOrCreateCriteria(projectId);
    }
  }

  /**
   * Check if bestseller mode is enabled for a project
   */
  isEnabled(projectId: string): boolean {
    const stmt = db.prepare<[string], { bestseller_mode: number }>(`
      SELECT bestseller_mode FROM projects WHERE id = ?
    `);

    const result = stmt.get(projectId);
    return result?.bestseller_mode === 1;
  }

  /**
   * Get or create bestseller criteria for a project
   */
  getOrCreateCriteria(projectId: string): BestsellerCriteria {
    // Check if exists
    const existingStmt = db.prepare<[string], any>(`
      SELECT * FROM bestseller_criteria WHERE project_id = ?
    `);

    const existing = existingStmt.get(projectId);

    if (existing) {
      return this.mapRowToCriteria(existing);
    }

    // Create new criteria
    const id = randomUUID();
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO bestseller_criteria (
        id, project_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?)
    `);

    insertStmt.run(id, projectId, now, now);

    logger.info({ projectId, criteriaId: id }, '[BestsellerMode] Created new criteria record');

    return {
      id,
      projectId,
      hasStrongPremise: false,
      premiseHook: null,
      genreConventionsIdentified: false,
      genreConventions: [],
      targetTropes: [],
      compTitles: [],
      wordCountTarget: null,
      saveTheCatBeatsMapped: false,
      beatsData: null,
      incitingIncidentChapter: null,
      midpointChapter: null,
      allIsLostChapter: null,
      resolutionPlanned: false,
      resolutionNotes: null,
      protagonistWant: null,
      protagonistNeed: null,
      protagonistLie: null,
      characterArcComplete: false,
      voiceSamples: [],
      checklistComplete: false,
      checklistPassed: false,
      validationErrors: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get bestseller criteria for a project
   */
  getCriteria(projectId: string): BestsellerCriteria | null {
    const stmt = db.prepare<[string], any>(`
      SELECT * FROM bestseller_criteria WHERE project_id = ?
    `);

    const row = stmt.get(projectId);
    return row ? this.mapRowToCriteria(row) : null;
  }

  /**
   * Update bestseller criteria
   */
  updateCriteria(criteria: Partial<BestsellerCriteria> & { projectId: string }): BestsellerCriteria {
    const existing = this.getOrCreateCriteria(criteria.projectId);

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    // Pre-writing fields
    if (criteria.hasStrongPremise !== undefined) {
      updates.push('has_strong_premise = ?');
      values.push(criteria.hasStrongPremise ? 1 : 0);
    }
    if (criteria.premiseHook !== undefined) {
      updates.push('premise_hook = ?');
      values.push(criteria.premiseHook);
    }
    if (criteria.genreConventionsIdentified !== undefined) {
      updates.push('genre_conventions_identified = ?');
      values.push(criteria.genreConventionsIdentified ? 1 : 0);
    }
    if (criteria.genreConventions !== undefined) {
      updates.push('genre_conventions = ?');
      values.push(JSON.stringify(criteria.genreConventions));
    }
    if (criteria.targetTropes !== undefined) {
      updates.push('target_tropes = ?');
      values.push(JSON.stringify(criteria.targetTropes));
    }
    if (criteria.compTitles !== undefined) {
      updates.push('comp_titles = ?');
      values.push(JSON.stringify(criteria.compTitles));
    }
    if (criteria.wordCountTarget !== undefined) {
      updates.push('word_count_target = ?');
      values.push(criteria.wordCountTarget);
    }

    // Structure fields
    if (criteria.saveTheCatBeatsMapped !== undefined) {
      updates.push('save_the_cat_beats_mapped = ?');
      values.push(criteria.saveTheCatBeatsMapped ? 1 : 0);
    }
    if (criteria.beatsData !== undefined) {
      updates.push('beats_data = ?');
      values.push(criteria.beatsData ? JSON.stringify(criteria.beatsData) : null);
    }
    if (criteria.incitingIncidentChapter !== undefined) {
      updates.push('inciting_incident_chapter = ?');
      values.push(criteria.incitingIncidentChapter);
    }
    if (criteria.midpointChapter !== undefined) {
      updates.push('midpoint_chapter = ?');
      values.push(criteria.midpointChapter);
    }
    if (criteria.allIsLostChapter !== undefined) {
      updates.push('all_is_lost_chapter = ?');
      values.push(criteria.allIsLostChapter);
    }
    if (criteria.resolutionPlanned !== undefined) {
      updates.push('resolution_planned = ?');
      values.push(criteria.resolutionPlanned ? 1 : 0);
    }
    if (criteria.resolutionNotes !== undefined) {
      updates.push('resolution_notes = ?');
      values.push(criteria.resolutionNotes);
    }

    // Character fields
    if (criteria.protagonistWant !== undefined) {
      updates.push('protagonist_want = ?');
      values.push(criteria.protagonistWant);
    }
    if (criteria.protagonistNeed !== undefined) {
      updates.push('protagonist_need = ?');
      values.push(criteria.protagonistNeed);
    }
    if (criteria.protagonistLie !== undefined) {
      updates.push('protagonist_lie = ?');
      values.push(criteria.protagonistLie);
    }
    if (criteria.characterArcComplete !== undefined) {
      updates.push('character_arc_complete = ?');
      values.push(criteria.characterArcComplete ? 1 : 0);
    }
    if (criteria.voiceSamples !== undefined) {
      updates.push('voice_samples = ?');
      values.push(JSON.stringify(criteria.voiceSamples));
    }

    // Always update timestamp
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());

    // Add WHERE clause
    values.push(existing.id);

    const stmt = db.prepare(`
      UPDATE bestseller_criteria
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    logger.info({ projectId: criteria.projectId }, '[BestsellerMode] Updated criteria');

    // Revalidate after update
    const validationResult = this.validateChecklist(criteria.projectId);
    this.updateChecklistValidationStatus(criteria.projectId, validationResult);

    return this.getCriteria(criteria.projectId)!;
  }

  /**
   * Validate the bestseller checklist
   */
  validateChecklist(projectId: string): ChecklistValidationResult {
    const criteria = this.getCriteria(projectId);

    if (!criteria) {
      return {
        isComplete: false,
        isPassed: false,
        errors: ['Bestseller criteria not found'],
        warnings: [],
        completionPercentage: 0,
        missingItems: ['All checklist items'],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const missingItems: string[] = [];
    let completedItems = 0;
    const totalItems = 15; // Total checklist items

    // Pre-writing checklist (5 items)
    if (!criteria.hasStrongPremise || !criteria.premiseHook) {
      errors.push('Strong premise with hook is required');
      missingItems.push('Strong premise');
    } else {
      completedItems++;
    }

    if (!criteria.genreConventionsIdentified || criteria.genreConventions.length === 0) {
      errors.push('Genre conventions must be identified');
      missingItems.push('Genre conventions');
    } else {
      completedItems++;
    }

    if (criteria.targetTropes.length < 3) {
      errors.push('At least 3 target tropes are required');
      missingItems.push(`Target tropes (${criteria.targetTropes.length}/3)`);
    } else {
      completedItems++;
    }

    if (criteria.compTitles.length < 2) {
      errors.push('At least 2 comparable titles are required');
      missingItems.push(`Comparable titles (${criteria.compTitles.length}/2)`);
    } else {
      completedItems++;
    }

    if (!criteria.wordCountTarget || criteria.wordCountTarget < 50000) {
      errors.push('Word count target must be set (minimum 50,000 words)');
      missingItems.push('Word count target');
    } else {
      completedItems++;
    }

    // Structure checklist (5 items)
    if (!criteria.saveTheCatBeatsMapped || !criteria.beatsData) {
      errors.push('Save the Cat beats must be mapped to chapters');
      missingItems.push('Save the Cat beats');
    } else {
      completedItems++;
    }

    if (!criteria.incitingIncidentChapter) {
      errors.push('Inciting incident chapter must be specified (typically by Chapter 3)');
      missingItems.push('Inciting incident placement');
    } else if (criteria.incitingIncidentChapter > 3) {
      warnings.push('Inciting incident after Chapter 3 may lose reader interest');
      completedItems++;
    } else {
      completedItems++;
    }

    if (!criteria.midpointChapter) {
      errors.push('Midpoint twist chapter must be specified');
      missingItems.push('Midpoint twist placement');
    } else {
      completedItems++;
    }

    if (!criteria.allIsLostChapter) {
      errors.push('All is Lost moment chapter must be specified');
      missingItems.push('All is Lost placement');
    } else {
      completedItems++;
    }

    if (!criteria.resolutionPlanned) {
      errors.push('Resolution must be planned');
      missingItems.push('Resolution planning');
    } else {
      completedItems++;
    }

    // Character checklist (5 items)
    if (!criteria.protagonistWant) {
      errors.push('Protagonist WANT (external goal) must be defined');
      missingItems.push('Protagonist WANT');
    } else {
      completedItems++;
    }

    if (!criteria.protagonistNeed) {
      errors.push('Protagonist NEED (internal growth) must be defined');
      missingItems.push('Protagonist NEED');
    } else {
      completedItems++;
    }

    if (!criteria.protagonistLie) {
      errors.push('Protagonist LIE (false belief) must be defined');
      missingItems.push('Protagonist LIE');
    } else {
      completedItems++;
    }

    if (!criteria.characterArcComplete) {
      errors.push('Character arc must be planned from Lie to Truth');
      missingItems.push('Character arc completion');
    } else {
      completedItems++;
    }

    if (criteria.voiceSamples.length === 0) {
      warnings.push('Voice samples recommended to establish character voice');
      missingItems.push('Voice samples');
    } else {
      completedItems++;
    }

    const completionPercentage = Math.round((completedItems / totalItems) * 100);
    const isComplete = completedItems === totalItems;
    const isPassed = errors.length === 0;

    return {
      isComplete,
      isPassed,
      errors,
      warnings,
      completionPercentage,
      missingItems,
    };
  }

  /**
   * Update checklist validation status in database
   */
  private updateChecklistValidationStatus(
    projectId: string,
    validation: ChecklistValidationResult
  ): void {
    const stmt = db.prepare(`
      UPDATE bestseller_criteria
      SET checklist_complete = ?,
          checklist_passed = ?,
          validation_errors = ?,
          updated_at = ?
      WHERE project_id = ?
    `);

    stmt.run(
      validation.isComplete ? 1 : 0,
      validation.isPassed ? 1 : 0,
      JSON.stringify(validation.errors),
      new Date().toISOString(),
      projectId
    );
  }

  /**
   * Check if project can start generation (checklist must pass in bestseller mode)
   */
  canStartGeneration(projectId: string): { allowed: boolean; reason?: string } {
    if (!this.isEnabled(projectId)) {
      return { allowed: true }; // Not in bestseller mode, no restrictions
    }

    const validation = this.validateChecklist(projectId);

    if (!validation.isPassed) {
      return {
        allowed: false,
        reason: `Bestseller checklist incomplete: ${validation.errors.join(', ')}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get enhanced generation prompts for bestseller mode
   */
  getBestsellerPromptEnhancements(projectId: string): string | null {
    if (!this.isEnabled(projectId)) {
      return null;
    }

    const criteria = this.getCriteria(projectId);
    if (!criteria) {
      return null;
    }

    const enhancements: string[] = [
      '\n\n--- BESTSELLER MODE ACTIVE ---',
      'This project is in Bestseller Mode. Ensure all commercial fiction best practices are followed:',
    ];

    // Add trope guidance
    if (criteria.targetTropes.length > 0) {
      enhancements.push(`\nTarget Tropes to incorporate: ${criteria.targetTropes.join(', ')}`);
    }

    // Add genre conventions
    if (criteria.genreConventions.length > 0) {
      enhancements.push(`\nGenre Conventions to honour: ${criteria.genreConventions.join(', ')}`);
    }

    // Add character arc guidance
    if (criteria.protagonistWant && criteria.protagonistNeed && criteria.protagonistLie) {
      enhancements.push('\nProtagonist Character Arc:');
      enhancements.push(`  WANT (External Goal): ${criteria.protagonistWant}`);
      enhancements.push(`  NEED (Internal Growth): ${criteria.protagonistNeed}`);
      enhancements.push(`  LIE (False Belief): ${criteria.protagonistLie}`);
    }

    // Add comparable titles
    if (criteria.compTitles.length > 0) {
      enhancements.push('\nComparable Titles (match quality and style):');
      criteria.compTitles.forEach(comp => {
        enhancements.push(`  - "${comp.title}" by ${comp.author} (${comp.year})`);
      });
    }

    enhancements.push('\nPrioritise: Commercial hooks, page-turner pacing, emotional resonance.');
    enhancements.push('--- END BESTSELLER MODE ---\n');

    return enhancements.join('\n');
  }

  /**
   * Map database row to BestsellerCriteria type
   */
  private mapRowToCriteria(row: any): BestsellerCriteria {
    return {
      id: row.id,
      projectId: row.project_id,
      hasStrongPremise: row.has_strong_premise === 1,
      premiseHook: row.premise_hook,
      genreConventionsIdentified: row.genre_conventions_identified === 1,
      genreConventions: row.genre_conventions ? JSON.parse(row.genre_conventions) : [],
      targetTropes: row.target_tropes ? JSON.parse(row.target_tropes) : [],
      compTitles: row.comp_titles ? JSON.parse(row.comp_titles) : [],
      wordCountTarget: row.word_count_target,
      saveTheCatBeatsMapped: row.save_the_cat_beats_mapped === 1,
      beatsData: row.beats_data ? JSON.parse(row.beats_data) : null,
      incitingIncidentChapter: row.inciting_incident_chapter,
      midpointChapter: row.midpoint_chapter,
      allIsLostChapter: row.all_is_lost_chapter,
      resolutionPlanned: row.resolution_planned === 1,
      resolutionNotes: row.resolution_notes,
      protagonistWant: row.protagonist_want,
      protagonistNeed: row.protagonist_need,
      protagonistLie: row.protagonist_lie,
      characterArcComplete: row.character_arc_complete === 1,
      voiceSamples: row.voice_samples ? JSON.parse(row.voice_samples) : [],
      checklistComplete: row.checklist_complete === 1,
      checklistPassed: row.checklist_passed === 1,
      validationErrors: row.validation_errors ? JSON.parse(row.validation_errors) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Export singleton instance
export const bestsellerModeService = new BestsellerModeService();
