/**
 * Thriller Commercial Service
 *
 * Manages thriller-specific commercial elements:
 * - Pacing styles (relentless, escalating, rollercoaster, slow_burn)
 * - Chapter hooks and cliffhangers
 * - Twist and reveal tracking with foreshadowing validation
 * - Ticking clock mechanics (deadlines, countdowns, time pressure)
 */

import { createLogger } from './logger.service.js';
import db from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('services:thriller-commercial');

// ============================================================================
// Type Definitions
// ============================================================================

export type PacingStyle = 'relentless' | 'escalating' | 'rollercoaster' | 'slow_burn';
export type CliffhangerFrequency = 'every' | 'most' | 'some';

export interface ThrillerPacing {
  id: string;
  projectId: string;
  pacingStyle: PacingStyle;
  chapterHookRequired: boolean;
  cliffhangerFrequency: CliffhangerFrequency;
  actionSceneRatio: number; // 10-90%
  averageChapterTension: number; // 1-10
  createdAt: string;
  updatedAt: string;
}

export type HookType =
  | 'cliffhanger'
  | 'revelation'
  | 'question'
  | 'threat'
  | 'betrayal'
  | 'countdown'
  | 'mystery_deepens'
  | 'reversal'
  | 'emotional_gut_punch'
  | 'foreshadowing';

export interface ChapterHook {
  id: string;
  projectId: string;
  chapterNumber: number;
  hookType: HookType;
  hookDescription: string | null;
  tensionLevel: number; // 1-10
  resolvedInChapter: number | null;
  createdAt: string;
}

export type TwistType =
  | 'major_reveal'
  | 'minor_reveal'
  | 'red_herring'
  | 'false_victory'
  | 'betrayal'
  | 'hidden_identity'
  | 'plot_reversal'
  | 'unreliable_info'
  | 'connection_reveal'
  | 'stakes_escalation';

export type ImpactLevel = 'low' | 'medium' | 'high' | 'extreme';

export interface ThrillerTwist {
  id: string;
  projectId: string;
  twistType: TwistType;
  chapterNumber: number | null;
  setupChapters: number[];
  description: string;
  impactLevel: ImpactLevel;
  foreshadowed: boolean;
  createdAt: string;
}

export type ClockType = 'deadline' | 'countdown' | 'racing' | 'decay' | 'opportunity' | 'survival';
export type ReminderFrequency = 'constant' | 'regular' | 'occasional';

export interface TickingClock {
  id: string;
  projectId: string;
  clockType: ClockType;
  description: string;
  startChapter: number | null;
  resolutionChapter: number | null;
  stakes: string | null;
  timeRemaining: string | null;
  reminderFrequency: ReminderFrequency;
  active: boolean;
  createdAt: string;
}

export interface TensionCurve {
  chapters: Array<{
    chapterNumber: number;
    tensionLevel: number;
    hasHook: boolean;
    hookType: HookType | null;
  }>;
  averageTension: number;
  tensionPeaks: number[];
  tensionValleys: number[];
  pacingAnalysis: string;
}

// ============================================================================
// Thriller Commercial Service
// ============================================================================

export class ThrillerCommercialService {
  /**
   * Set pacing configuration for a thriller project
   */
  setPacingStyle(
    projectId: string,
    pacingStyle: PacingStyle,
    options: {
      chapterHookRequired?: boolean;
      cliffhangerFrequency?: CliffhangerFrequency;
      actionSceneRatio?: number;
      averageChapterTension?: number;
    } = {}
  ): ThrillerPacing {
    logger.info({ projectId, pacingStyle }, 'Setting thriller pacing style');

    // Validate pacing style
    const validStyles: PacingStyle[] = ['relentless', 'escalating', 'rollercoaster', 'slow_burn'];
    if (!validStyles.includes(pacingStyle)) {
      throw new Error(`Invalid pacing style: ${pacingStyle}`);
    }

    // Validate action scene ratio
    if (options.actionSceneRatio !== undefined) {
      if (options.actionSceneRatio < 10 || options.actionSceneRatio > 90) {
        throw new Error('Action scene ratio must be between 10 and 90');
      }
    }

    // Validate average tension
    if (options.averageChapterTension !== undefined) {
      if (options.averageChapterTension < 1 || options.averageChapterTension > 10) {
        throw new Error('Average chapter tension must be between 1 and 10');
      }
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const config: ThrillerPacing = {
      id,
      projectId,
      pacingStyle,
      chapterHookRequired: options.chapterHookRequired ?? true,
      cliffhangerFrequency: options.cliffhangerFrequency || 'most',
      actionSceneRatio: options.actionSceneRatio || 40,
      averageChapterTension: options.averageChapterTension || 7,
      createdAt: now,
      updatedAt: now,
    };

    db.prepare(
      `INSERT INTO thriller_pacing (id, project_id, pacing_style, chapter_hook_required, cliffhanger_frequency, action_scene_ratio, average_chapter_tension, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(project_id) DO UPDATE SET
         pacing_style = excluded.pacing_style,
         chapter_hook_required = excluded.chapter_hook_required,
         cliffhanger_frequency = excluded.cliffhanger_frequency,
         action_scene_ratio = excluded.action_scene_ratio,
         average_chapter_tension = excluded.average_chapter_tension,
         updated_at = excluded.updated_at`
    ).run(
      id,
      projectId,
      pacingStyle,
      config.chapterHookRequired ? 1 : 0,
      config.cliffhangerFrequency,
      config.actionSceneRatio,
      config.averageChapterTension,
      now,
      now
    );

    logger.info({ projectId, pacingStyle }, 'Pacing style set successfully');
    return config;
  }

  /**
   * Get pacing configuration for a project
   */
  getPacingConfig(projectId: string): ThrillerPacing | null {
    const row = db.prepare(
      'SELECT * FROM thriller_pacing WHERE project_id = ?'
    ).get(projectId) as any | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      projectId: row.project_id,
      pacingStyle: row.pacing_style as PacingStyle,
      chapterHookRequired: Boolean(row.chapter_hook_required),
      cliffhangerFrequency: row.cliffhanger_frequency as CliffhangerFrequency,
      actionSceneRatio: row.action_scene_ratio,
      averageChapterTension: row.average_chapter_tension,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Add a chapter hook
   */
  addChapterHook(
    projectId: string,
    chapterNumber: number,
    hookType: HookType,
    hookDescription: string | null,
    tensionLevel: number
  ): ChapterHook {
    logger.info({ projectId, chapterNumber, hookType }, 'Adding chapter hook');

    // Validate hook type
    const validHookTypes: HookType[] = [
      'cliffhanger',
      'revelation',
      'question',
      'threat',
      'betrayal',
      'countdown',
      'mystery_deepens',
      'reversal',
      'emotional_gut_punch',
      'foreshadowing',
    ];

    if (!validHookTypes.includes(hookType)) {
      throw new Error(`Invalid hook type: ${hookType}`);
    }

    // Validate tension level
    if (tensionLevel < 1 || tensionLevel > 10) {
      throw new Error('Tension level must be between 1 and 10');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const hook: ChapterHook = {
      id,
      projectId,
      chapterNumber,
      hookType,
      hookDescription,
      tensionLevel,
      resolvedInChapter: null,
      createdAt: now,
    };

    db.prepare(
      `INSERT INTO thriller_chapter_hooks (id, project_id, chapter_number, hook_type, hook_description, tension_level, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(project_id, chapter_number) DO UPDATE SET
         hook_type = excluded.hook_type,
         hook_description = excluded.hook_description,
         tension_level = excluded.tension_level`
    ).run(id, projectId, chapterNumber, hookType, hookDescription, tensionLevel, now);

    logger.info({ projectId, chapterNumber, hookType }, 'Chapter hook added');
    return hook;
  }

  /**
   * Get all chapter hooks for a project
   */
  getChapterHooks(projectId: string): ChapterHook[] {
    const rows = db.prepare(
      'SELECT * FROM thriller_chapter_hooks WHERE project_id = ? ORDER BY chapter_number ASC'
    ).all(projectId) as any[];

    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      chapterNumber: row.chapter_number,
      hookType: row.hook_type as HookType,
      hookDescription: row.hook_description,
      tensionLevel: row.tension_level,
      resolvedInChapter: row.resolved_in_chapter,
      createdAt: row.created_at,
    }));
  }

  /**
   * Add a twist/reveal
   */
  addTwist(
    projectId: string,
    chapterNumber: number | null,
    twistType: TwistType,
    setupChapters: number[],
    description: string,
    impactLevel: ImpactLevel = 'medium',
    foreshadowed: boolean = true
  ): ThrillerTwist {
    logger.info({ projectId, chapterNumber, twistType }, 'Adding thriller twist');

    // Validate twist type
    const validTwistTypes: TwistType[] = [
      'major_reveal',
      'minor_reveal',
      'red_herring',
      'false_victory',
      'betrayal',
      'hidden_identity',
      'plot_reversal',
      'unreliable_info',
      'connection_reveal',
      'stakes_escalation',
    ];

    if (!validTwistTypes.includes(twistType)) {
      throw new Error(`Invalid twist type: ${twistType}`);
    }

    // Validate impact level
    const validImpactLevels: ImpactLevel[] = ['low', 'medium', 'high', 'extreme'];
    if (!validImpactLevels.includes(impactLevel)) {
      throw new Error(`Invalid impact level: ${impactLevel}`);
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const twist: ThrillerTwist = {
      id,
      projectId,
      twistType,
      chapterNumber,
      setupChapters,
      description,
      impactLevel,
      foreshadowed,
      createdAt: now,
    };

    db.prepare(
      `INSERT INTO thriller_twists (id, project_id, twist_type, chapter_number, setup_chapters, description, impact_level, foreshadowed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      projectId,
      twistType,
      chapterNumber,
      JSON.stringify(setupChapters),
      description,
      impactLevel,
      foreshadowed ? 1 : 0,
      now
    );

    logger.info({ projectId, twistType }, 'Twist added');
    return twist;
  }

  /**
   * Get all twists for a project
   */
  getTwists(projectId: string): ThrillerTwist[] {
    const rows = db.prepare(
      'SELECT * FROM thriller_twists WHERE project_id = ? ORDER BY chapter_number ASC'
    ).all(projectId) as any[];

    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      twistType: row.twist_type as TwistType,
      chapterNumber: row.chapter_number,
      setupChapters: JSON.parse(row.setup_chapters || '[]'),
      description: row.description,
      impactLevel: row.impact_level as ImpactLevel,
      foreshadowed: Boolean(row.foreshadowed),
      createdAt: row.created_at,
    }));
  }

  /**
   * Validate twist setup (check if properly foreshadowed)
   */
  validateTwistSetup(projectId: string, twistId: string): { valid: boolean; issues: string[] } {
    const twist = db.prepare(
      'SELECT * FROM thriller_twists WHERE id = ? AND project_id = ?'
    ).get(twistId, projectId) as any | undefined;

    if (!twist) {
      throw new Error('Twist not found');
    }

    const issues: string[] = [];

    if (!twist.foreshadowed) {
      issues.push('Twist is marked as not foreshadowed - this will feel cheap to readers');
    }

    const setupChapters = JSON.parse(twist.setup_chapters || '[]');
    if (setupChapters.length === 0) {
      issues.push('No setup chapters specified - twist needs foreshadowing');
    }

    if (twist.chapter_number && setupChapters.length > 0) {
      const lastSetup = Math.max(...setupChapters);
      if (twist.chapter_number - lastSetup < 2) {
        issues.push('Setup too close to twist - readers need time to forget the clues');
      }
    }

    if (twist.impact_level === 'extreme' && setupChapters.length < 3) {
      issues.push('Extreme impact twists need extensive setup (at least 3 chapters)');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Add a ticking clock / time pressure element
   */
  addTickingClock(
    projectId: string,
    clockType: ClockType,
    description: string,
    options: {
      startChapter?: number;
      resolutionChapter?: number;
      stakes?: string;
      timeRemaining?: string;
      reminderFrequency?: ReminderFrequency;
      active?: boolean;
    } = {}
  ): TickingClock {
    logger.info({ projectId, clockType }, 'Adding ticking clock');

    // Validate clock type
    const validClockTypes: ClockType[] = ['deadline', 'countdown', 'racing', 'decay', 'opportunity', 'survival'];
    if (!validClockTypes.includes(clockType)) {
      throw new Error(`Invalid clock type: ${clockType}`);
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const clock: TickingClock = {
      id,
      projectId,
      clockType,
      description,
      startChapter: options.startChapter || null,
      resolutionChapter: options.resolutionChapter || null,
      stakes: options.stakes || null,
      timeRemaining: options.timeRemaining || null,
      reminderFrequency: options.reminderFrequency || 'regular',
      active: options.active ?? true,
      createdAt: now,
    };

    db.prepare(
      `INSERT INTO thriller_time_pressure (id, project_id, clock_type, description, start_chapter, resolution_chapter, stakes, time_remaining, reminder_frequency, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      projectId,
      clockType,
      description,
      clock.startChapter,
      clock.resolutionChapter,
      clock.stakes,
      clock.timeRemaining,
      clock.reminderFrequency,
      clock.active ? 1 : 0,
      now
    );

    logger.info({ projectId, clockType }, 'Ticking clock added');
    return clock;
  }

  /**
   * Get active time pressure elements
   */
  getActiveTimePressure(projectId: string): TickingClock[] {
    const rows = db.prepare(
      'SELECT * FROM thriller_time_pressure WHERE project_id = ? AND active = 1 ORDER BY created_at ASC'
    ).all(projectId) as any[];

    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      clockType: row.clock_type as ClockType,
      description: row.description,
      startChapter: row.start_chapter,
      resolutionChapter: row.resolution_chapter,
      stakes: row.stakes,
      timeRemaining: row.time_remaining,
      reminderFrequency: row.reminder_frequency as ReminderFrequency,
      active: Boolean(row.active),
      createdAt: row.created_at,
    }));
  }

  /**
   * Deactivate a ticking clock
   */
  deactivateTickingClock(clockId: string): void {
    db.prepare('UPDATE thriller_time_pressure SET active = 0 WHERE id = ?').run(clockId);
    logger.info({ clockId }, 'Ticking clock deactivated');
  }

  /**
   * Calculate tension curve across all chapters
   */
  calculateTensionCurve(projectId: string, totalChapters: number): TensionCurve {
    const hooks = this.getChapterHooks(projectId);
    const pacing = this.getPacingConfig(projectId);

    const chapters = Array.from({ length: totalChapters }, (_, i) => {
      const chapterNumber = i + 1;
      const hook = hooks.find((h) => h.chapterNumber === chapterNumber);

      // Calculate base tension based on pacing style
      let baseTension = 5;
      if (pacing) {
        const percentage = (chapterNumber / totalChapters) * 100;

        switch (pacing.pacingStyle) {
          case 'relentless':
            baseTension = 8; // Constant high
            break;
          case 'escalating':
            baseTension = 3 + (percentage / 100) * 7; // 3 to 10
            break;
          case 'rollercoaster':
            baseTension = 5 + Math.sin((chapterNumber / totalChapters) * Math.PI * 4) * 3; // Oscillate 2-8
            break;
          case 'slow_burn':
            baseTension = 2 + Math.pow(percentage / 100, 2) * 8; // Slow curve to 10
            break;
        }
      }

      const tensionLevel = hook ? Math.max(hook.tensionLevel, baseTension) : baseTension;

      return {
        chapterNumber,
        tensionLevel: Math.round(tensionLevel),
        hasHook: !!hook,
        hookType: hook?.hookType || null,
      };
    });

    const averageTension =
      chapters.reduce((sum, ch) => sum + ch.tensionLevel, 0) / chapters.length;

    // Find peaks (local maxima) and valleys (local minima)
    const tensionPeaks: number[] = [];
    const tensionValleys: number[] = [];

    for (let i = 1; i < chapters.length - 1; i++) {
      const prev = chapters[i - 1].tensionLevel;
      const curr = chapters[i].tensionLevel;
      const next = chapters[i + 1].tensionLevel;

      if (curr > prev && curr > next) {
        tensionPeaks.push(chapters[i].chapterNumber);
      }
      if (curr < prev && curr < next) {
        tensionValleys.push(chapters[i].chapterNumber);
      }
    }

    // Generate pacing analysis
    let pacingAnalysis = '';
    if (pacing) {
      switch (pacing.pacingStyle) {
        case 'relentless':
          pacingAnalysis = 'Relentless pacing: constant high tension with minimal breathers';
          break;
        case 'escalating':
          pacingAnalysis = 'Escalating pacing: steady build from moderate to explosive';
          break;
        case 'rollercoaster':
          pacingAnalysis = 'Rollercoaster pacing: alternating peaks and valleys of tension';
          break;
        case 'slow_burn':
          pacingAnalysis = 'Slow burn pacing: gradual tension accumulation to massive payoff';
          break;
      }
    } else {
      pacingAnalysis = 'No pacing configuration set';
    }

    return {
      chapters,
      averageTension: Math.round(averageTension * 10) / 10,
      tensionPeaks,
      tensionValleys,
      pacingAnalysis,
    };
  }

  /**
   * Validate pacing meets style requirements
   */
  validatePacing(projectId: string, totalChapters: number): { valid: boolean; issues: string[] } {
    const pacing = this.getPacingConfig(projectId);
    const hooks = this.getChapterHooks(projectId);
    const issues: string[] = [];

    if (!pacing) {
      issues.push('No pacing configuration set for this thriller');
      return { valid: false, issues };
    }

    // Check chapter hook requirements
    if (pacing.chapterHookRequired) {
      const chaptersWithoutHooks = totalChapters - hooks.length;
      if (chaptersWithoutHooks > 0) {
        issues.push(`${chaptersWithoutHooks} chapters missing required hooks`);
      }
    }

    // Check cliffhanger frequency
    const cliffhangers = hooks.filter((h) => h.hookType === 'cliffhanger').length;
    const cliffhangerPercentage = (cliffhangers / totalChapters) * 100;

    switch (pacing.cliffhangerFrequency) {
      case 'every':
        if (cliffhangerPercentage < 90) {
          issues.push(`Not enough cliffhangers for "every chapter" frequency (${cliffhangerPercentage.toFixed(0)}%)`);
        }
        break;
      case 'most':
        if (cliffhangerPercentage < 60) {
          issues.push(`Not enough cliffhangers for "most chapters" frequency (${cliffhangerPercentage.toFixed(0)}%)`);
        }
        break;
      case 'some':
        if (cliffhangerPercentage < 30) {
          issues.push(`Not enough cliffhangers for "some chapters" frequency (${cliffhangerPercentage.toFixed(0)}%)`);
        }
        break;
    }

    // Check average tension
    const tensionCurve = this.calculateTensionCurve(projectId, totalChapters);
    if (Math.abs(tensionCurve.averageTension - pacing.averageChapterTension) > 2) {
      issues.push(
        `Average tension (${tensionCurve.averageTension.toFixed(1)}) doesn't match target (${pacing.averageChapterTension})`
      );
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

// Export singleton instance
export const thrillerCommercialService = new ThrillerCommercialService();
