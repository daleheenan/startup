/**
 * Romance Commercial Service
 *
 * Manages romance-specific commercial elements:
 * - Heat level classification (1-5 spicy scale)
 * - Emotional beat tracking (meet-cute through HEA/HFN)
 * - Content warnings and sensuality focus
 * - Validation of beat placement against reader expectations
 */

import { createLogger } from './logger.service.js';
import db from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('services:romance-commercial');

// ============================================================================
// Type Definitions
// ============================================================================

export interface RomanceHeatLevel {
  id: string;
  projectId: string;
  heatLevel: 1 | 2 | 3 | 4 | 5;
  contentWarnings: string[];
  fadeToBlack: boolean;
  onPageIntimacy: boolean;
  sensualityFocus: 'emotional' | 'physical' | 'balanced';
  createdAt: string;
  updatedAt: string;
}

export interface RomanceBeat {
  id: string;
  projectId: string;
  beatType: RomanceBeatType;
  chapterNumber: number | null;
  sceneDescription: string | null;
  emotionalIntensity: number | null; // 1-10
  completed: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RomanceBeatType =
  | 'meet_cute'
  | 'first_attraction'
  | 'first_conflict'
  | 'first_touch'
  | 'first_kiss'
  | 'first_intimacy'
  | 'black_moment'
  | 'grand_gesture'
  | 'declaration'
  | 'commitment'
  | 'hea_hfn';

export interface BeatValidationResult {
  beatType: RomanceBeatType;
  required: boolean;
  present: boolean;
  chapterNumber: number | null;
  idealPlacementPercentage: number;
  actualPlacementPercentage: number | null;
  withinTolerance: boolean;
  issue: string | null;
  recommendation: string | null;
}

export interface RomanceBeatValidation {
  allRequiredBeatsPresent: boolean;
  hasHEAorHFN: boolean;
  beatResults: BeatValidationResult[];
  warnings: string[];
  recommendations: string[];
}

// Required beats that MUST be present in romance
export const REQUIRED_ROMANCE_BEATS: RomanceBeatType[] = [
  'meet_cute',
  'first_kiss',
  'black_moment',
  'declaration',
  'hea_hfn',
];

// Ideal placement percentages for each beat (based on industry standards)
export const BEAT_PLACEMENT_PERCENTAGES: Record<RomanceBeatType, { ideal: number; min: number; max: number }> = {
  meet_cute: { ideal: 8, min: 5, max: 12 },
  first_attraction: { ideal: 12, min: 10, max: 15 },
  first_conflict: { ideal: 20, min: 15, max: 25 },
  first_touch: { ideal: 28, min: 20, max: 35 },
  first_kiss: { ideal: 40, min: 30, max: 50 },
  first_intimacy: { ideal: 55, min: 40, max: 60 },
  black_moment: { ideal: 78, min: 75, max: 85 },
  grand_gesture: { ideal: 88, min: 85, max: 95 },
  declaration: { ideal: 90, min: 85, max: 95 },
  commitment: { ideal: 93, min: 90, max: 100 },
  hea_hfn: { ideal: 98, min: 95, max: 100 },
};

// ============================================================================
// Romance Commercial Service
// ============================================================================

export class RomanceCommercialService {
  /**
   * Set heat level configuration for a project
   */
  setHeatLevel(
    projectId: string,
    heatLevel: 1 | 2 | 3 | 4 | 5,
    options: {
      contentWarnings?: string[];
      fadeToBlack?: boolean;
      onPageIntimacy?: boolean;
      sensualityFocus?: 'emotional' | 'physical' | 'balanced';
    } = {}
  ): RomanceHeatLevel {
    logger.info({ projectId, heatLevel }, 'Setting romance heat level');

    // Validate heat level
    if (heatLevel < 1 || heatLevel > 5) {
      throw new Error('Heat level must be between 1 and 5');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const config: RomanceHeatLevel = {
      id,
      projectId,
      heatLevel,
      contentWarnings: options.contentWarnings || [],
      fadeToBlack: options.fadeToBlack ?? (heatLevel <= 2),
      onPageIntimacy: options.onPageIntimacy ?? (heatLevel >= 3),
      sensualityFocus: options.sensualityFocus || 'balanced',
      createdAt: now,
      updatedAt: now,
    };

    // Insert or replace
    db.prepare(
      `INSERT INTO romance_heat_levels (id, project_id, heat_level, content_warnings, fade_to_black, on_page_intimacy, sensuality_focus, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(project_id) DO UPDATE SET
         heat_level = excluded.heat_level,
         content_warnings = excluded.content_warnings,
         fade_to_black = excluded.fade_to_black,
         on_page_intimacy = excluded.on_page_intimacy,
         sensuality_focus = excluded.sensuality_focus,
         updated_at = excluded.updated_at`
    ).run(
      id,
      projectId,
      heatLevel,
      JSON.stringify(config.contentWarnings),
      config.fadeToBlack ? 1 : 0,
      config.onPageIntimacy ? 1 : 0,
      config.sensualityFocus,
      now,
      now
    );

    logger.info({ projectId, heatLevel }, 'Heat level set successfully');
    return config;
  }

  /**
   * Get heat level configuration for a project
   */
  getHeatLevel(projectId: string): RomanceHeatLevel | null {
    const row = db.prepare(
      'SELECT * FROM romance_heat_levels WHERE project_id = ?'
    ).get(projectId) as any | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      projectId: row.project_id,
      heatLevel: row.heat_level as 1 | 2 | 3 | 4 | 5,
      contentWarnings: JSON.parse(row.content_warnings || '[]'),
      fadeToBlack: Boolean(row.fade_to_black),
      onPageIntimacy: Boolean(row.on_page_intimacy),
      sensualityFocus: row.sensuality_focus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Track an emotional beat
   */
  trackBeat(
    projectId: string,
    beatType: RomanceBeatType,
    chapterNumber: number | null,
    details: {
      sceneDescription?: string;
      emotionalIntensity?: number;
      notes?: string;
      completed?: boolean;
    } = {}
  ): RomanceBeat {
    logger.info({ projectId, beatType, chapterNumber }, 'Tracking romance beat');

    // Validate beat type
    const validBeatTypes: RomanceBeatType[] = [
      'meet_cute',
      'first_attraction',
      'first_conflict',
      'first_touch',
      'first_kiss',
      'first_intimacy',
      'black_moment',
      'grand_gesture',
      'declaration',
      'commitment',
      'hea_hfn',
    ];

    if (!validBeatTypes.includes(beatType)) {
      throw new Error(`Invalid beat type: ${beatType}`);
    }

    // Validate emotional intensity if provided
    if (details.emotionalIntensity !== undefined) {
      if (details.emotionalIntensity < 1 || details.emotionalIntensity > 10) {
        throw new Error('Emotional intensity must be between 1 and 10');
      }
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const beat: RomanceBeat = {
      id,
      projectId,
      beatType,
      chapterNumber,
      sceneDescription: details.sceneDescription || null,
      emotionalIntensity: details.emotionalIntensity || null,
      completed: details.completed ?? false,
      notes: details.notes || null,
      createdAt: now,
      updatedAt: now,
    };

    // Insert or replace (unique constraint on project_id + beat_type)
    db.prepare(
      `INSERT INTO romance_beats (id, project_id, beat_type, chapter_number, scene_description, emotional_intensity, completed, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(project_id, beat_type) DO UPDATE SET
         chapter_number = excluded.chapter_number,
         scene_description = excluded.scene_description,
         emotional_intensity = excluded.emotional_intensity,
         completed = excluded.completed,
         notes = excluded.notes,
         updated_at = excluded.updated_at`
    ).run(
      id,
      projectId,
      beatType,
      chapterNumber,
      beat.sceneDescription,
      beat.emotionalIntensity,
      beat.completed ? 1 : 0,
      beat.notes,
      now,
      now
    );

    logger.info({ projectId, beatType }, 'Beat tracked successfully');
    return beat;
  }

  /**
   * Get all tracked beats for a project
   */
  getBeatTracking(projectId: string): RomanceBeat[] {
    const rows = db.prepare(
      'SELECT * FROM romance_beats WHERE project_id = ? ORDER BY chapter_number ASC'
    ).all(projectId) as any[];

    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      beatType: row.beat_type as RomanceBeatType,
      chapterNumber: row.chapter_number,
      sceneDescription: row.scene_description,
      emotionalIntensity: row.emotional_intensity,
      completed: Boolean(row.completed),
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Validate that all required beats are present and well-placed
   */
  validateBeats(projectId: string, totalChapters: number): RomanceBeatValidation {
    logger.info({ projectId, totalChapters }, 'Validating romance beats');

    const trackedBeats = this.getBeatTracking(projectId);
    const beatResults: BeatValidationResult[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check each beat type
    for (const beatType of Object.keys(BEAT_PLACEMENT_PERCENTAGES) as RomanceBeatType[]) {
      const placement = BEAT_PLACEMENT_PERCENTAGES[beatType];
      const tracked = trackedBeats.find((b) => b.beatType === beatType);
      const required = REQUIRED_ROMANCE_BEATS.includes(beatType);

      if (!tracked) {
        beatResults.push({
          beatType,
          required,
          present: false,
          chapterNumber: null,
          idealPlacementPercentage: placement.ideal,
          actualPlacementPercentage: null,
          withinTolerance: false,
          issue: required ? `Required beat "${beatType}" is missing` : null,
          recommendation: `Add "${beatType}" around chapter ${Math.round((totalChapters * placement.ideal) / 100)}`,
        });

        if (required) {
          warnings.push(`Missing required beat: ${beatType}`);
        }
      } else {
        const actualPercentage = tracked.chapterNumber
          ? (tracked.chapterNumber / totalChapters) * 100
          : 0;
        const withinTolerance =
          actualPercentage >= placement.min && actualPercentage <= placement.max;

        let issue: string | null = null;
        let recommendation: string | null = null;

        if (!withinTolerance && tracked.chapterNumber) {
          if (actualPercentage < placement.min) {
            issue = `"${beatType}" occurs too early (${actualPercentage.toFixed(1)}% vs ${placement.ideal}%)`;
            recommendation = `Consider moving "${beatType}" later in the story`;
          } else {
            issue = `"${beatType}" occurs too late (${actualPercentage.toFixed(1)}% vs ${placement.ideal}%)`;
            recommendation = `Consider moving "${beatType}" earlier in the story`;
          }
        }

        beatResults.push({
          beatType,
          required,
          present: true,
          chapterNumber: tracked.chapterNumber,
          idealPlacementPercentage: placement.ideal,
          actualPlacementPercentage: actualPercentage,
          withinTolerance,
          issue,
          recommendation,
        });

        if (issue) {
          warnings.push(issue);
        }
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }

    // Check for HEA/HFN - this is NON-NEGOTIABLE in romance
    const hasHEAorHFN = trackedBeats.some((b) => b.beatType === 'hea_hfn');
    if (!hasHEAorHFN) {
      warnings.push('CRITICAL: Romance MUST have HEA (Happily Ever After) or HFN (Happy For Now) ending');
      recommendations.push('Add HEA/HFN beat in final chapter - this is a genre requirement');
    }

    const allRequiredBeatsPresent = REQUIRED_ROMANCE_BEATS.every((beatType) =>
      trackedBeats.some((b) => b.beatType === beatType)
    );

    return {
      allRequiredBeatsPresent,
      hasHEAorHFN,
      beatResults,
      warnings,
      recommendations,
    };
  }

  /**
   * Get suggested chapter placement for beats based on total chapter count
   */
  getSuggestedBeats(totalChapters: number): Array<{ beatType: RomanceBeatType; suggestedChapter: number; description: string }> {
    return (Object.keys(BEAT_PLACEMENT_PERCENTAGES) as RomanceBeatType[]).map((beatType) => {
      const placement = BEAT_PLACEMENT_PERCENTAGES[beatType];
      const suggestedChapter = Math.round((totalChapters * placement.ideal) / 100);

      const descriptions: Record<RomanceBeatType, string> = {
        meet_cute: 'First meeting between romantic leads with chemistry or conflict',
        first_attraction: 'Character acknowledges attraction to the other',
        first_conflict: 'First major obstacle or disagreement threatening the relationship',
        first_touch: 'First meaningful physical contact beyond casual interaction',
        first_kiss: 'First romantic kiss between the leads',
        first_intimacy: 'First intimate scene (level depends on heat rating)',
        black_moment: 'Darkest point where relationship seems impossible',
        grand_gesture: 'Significant action to win back the love interest',
        declaration: 'Explicit "I love you" moment',
        commitment: 'Clear indication couple is committed to future together',
        hea_hfn: 'Happily Ever After or Happy For Now ending',
      };

      return {
        beatType,
        suggestedChapter: Math.max(1, suggestedChapter),
        description: descriptions[beatType],
      };
    });
  }

  /**
   * Check if story meets romance genre requirements (heartbreaker test)
   */
  isHeartbreaker(projectId: string, totalChapters: number): { passes: boolean; issues: string[] } {
    const validation = this.validateBeats(projectId, totalChapters);
    const issues: string[] = [];

    if (!validation.hasHEAorHFN) {
      issues.push('HEARTBREAKER: No HEA/HFN ending - romance readers will revolt');
    }

    if (!validation.allRequiredBeatsPresent) {
      const missingBeats = REQUIRED_ROMANCE_BEATS.filter(
        (beatType) => !validation.beatResults.find((r) => r.beatType === beatType && r.present)
      );
      issues.push(`Missing required beats: ${missingBeats.join(', ')}`);
    }

    // Check for meet-cute early enough
    const meetCute = validation.beatResults.find((r) => r.beatType === 'meet_cute');
    if (meetCute && meetCute.actualPlacementPercentage && meetCute.actualPlacementPercentage > 15) {
      issues.push('Meet-cute happens too late - romance readers want to meet the leads early');
    }

    return {
      passes: issues.length === 0,
      issues,
    };
  }

  /**
   * Delete a tracked beat
   */
  deleteBeat(projectId: string, beatType: RomanceBeatType): void {
    db.prepare('DELETE FROM romance_beats WHERE project_id = ? AND beat_type = ?').run(
      projectId,
      beatType
    );
    logger.info({ projectId, beatType }, 'Beat deleted');
  }

  /**
   * Delete heat level configuration
   */
  deleteHeatLevel(projectId: string): void {
    db.prepare('DELETE FROM romance_heat_levels WHERE project_id = ?').run(projectId);
    logger.info({ projectId }, 'Heat level configuration deleted');
  }
}

// Export singleton instance
export const romanceCommercialService = new RomanceCommercialService();
