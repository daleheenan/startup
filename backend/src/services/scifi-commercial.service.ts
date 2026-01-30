/**
 * Sci-Fi Commercial Service
 *
 * Manages science fiction-specific commercial elements:
 * - Hardness level classification (hard to science fantasy)
 * - Technology explanation depth
 * - Scientific accuracy priority
 * - Speculative elements tracking
 * - Real science basis documentation
 */

import { createLogger } from './logger.service.js';
import db from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('services:scifi-commercial');

// ============================================================================
// Type Definitions
// ============================================================================

export type HardnessLevel = 'hard' | 'firm' | 'medium' | 'soft' | 'science_fantasy';
export type TechExplanationDepth = 'detailed' | 'moderate' | 'minimal' | 'none';

export interface SciFiClassification {
  id: string;
  projectId: string;
  hardnessLevel: HardnessLevel;
  techExplanationDepth: TechExplanationDepth;
  scientificAccuracyPriority: number; // 1-10
  speculativeElements: string[];
  realScienceBasis: string[];
  handwaveAllowed: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReaderExpectations {
  hardnessLevel: HardnessLevel;
  description: string;
  readerExpectation: string;
  exampleAuthors: string[];
  techExplanation: string;
  typicalAccuracyPriority: number;
}

// Reader expectations for each hardness level
export const HARDNESS_EXPECTATIONS: Record<HardnessLevel, ReaderExpectations> = {
  hard: {
    hardnessLevel: 'hard',
    description: 'Rigorous scientific accuracy. Technology follows known physics.',
    readerExpectation: 'Readers expect real science. Will fact-check you.',
    exampleAuthors: ['Andy Weir', 'Kim Stanley Robinson', 'Greg Egan', 'Peter Watts'],
    techExplanation: 'Detailed explanations expected. Science is often central to plot.',
    typicalAccuracyPriority: 9,
  },
  firm: {
    hardnessLevel: 'firm',
    description: 'Generally plausible with some handwaving. One or two impossibilities allowed.',
    readerExpectation: 'Readers accept FTL or similar but expect internal consistency.',
    exampleAuthors: ['Alastair Reynolds', 'James S.A. Corey', 'Vernor Vinge'],
    techExplanation: 'Moderate explanation. Handwaved tech should be consistent.',
    typicalAccuracyPriority: 7,
  },
  medium: {
    hardnessLevel: 'medium',
    description: 'Balance of science and speculation. Technology serves the story.',
    readerExpectation: 'Readers want plausibility, not physics lectures.',
    exampleAuthors: ['Becky Chambers', 'Ann Leckie', 'Martha Wells'],
    techExplanation: 'Light touch. Explain what matters, handwave the rest.',
    typicalAccuracyPriority: 5,
  },
  soft: {
    hardnessLevel: 'soft',
    description: 'Science as backdrop. Focus on characters, society, or philosophy.',
    readerExpectation: 'Readers here for story, not science. Consistency matters more than accuracy.',
    exampleAuthors: ['Ursula K. Le Guin', 'Octavia Butler', 'Ray Bradbury'],
    techExplanation: 'Minimal. Technology is a given, not explained.',
    typicalAccuracyPriority: 3,
  },
  science_fantasy: {
    hardnessLevel: 'science_fantasy',
    description: 'Science-flavoured fantasy. Magic with a tech aesthetic.',
    readerExpectation: 'Readers expect spectacle and wonder, not realism.',
    exampleAuthors: ['Frank Herbert (Dune)', 'Star Wars novelists', 'Warhammer 40K authors'],
    techExplanation: 'None required. Mysticism and technology blend.',
    typicalAccuracyPriority: 1,
  },
};

// ============================================================================
// Sci-Fi Commercial Service
// ============================================================================

export class SciFiCommercialService {
  /**
   * Set sci-fi classification for a project
   */
  setClassification(
    projectId: string,
    hardnessLevel: HardnessLevel,
    techExplanationDepth: TechExplanationDepth,
    scientificAccuracyPriority: number
  ): SciFiClassification {
    logger.info({ projectId, hardnessLevel, techExplanationDepth }, 'Setting sci-fi classification');

    // Validate hardness level
    const validHardness: HardnessLevel[] = ['hard', 'firm', 'medium', 'soft', 'science_fantasy'];
    if (!validHardness.includes(hardnessLevel)) {
      throw new Error(`Invalid hardness level: ${hardnessLevel}`);
    }

    // Validate tech explanation depth
    const validDepths: TechExplanationDepth[] = ['detailed', 'moderate', 'minimal', 'none'];
    if (!validDepths.includes(techExplanationDepth)) {
      throw new Error(`Invalid tech explanation depth: ${techExplanationDepth}`);
    }

    // Validate accuracy priority
    if (scientificAccuracyPriority < 1 || scientificAccuracyPriority > 10) {
      throw new Error('Scientific accuracy priority must be between 1 and 10');
    }

    // Warn about inconsistencies
    const consistency = this.checkConsistency(
      hardnessLevel,
      techExplanationDepth,
      scientificAccuracyPriority
    );
    if (!consistency.consistent) {
      logger.warn(
        { projectId, issues: consistency.issues },
        'Sci-fi classification has consistency warnings'
      );
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const classification: SciFiClassification = {
      id,
      projectId,
      hardnessLevel,
      techExplanationDepth,
      scientificAccuracyPriority,
      speculativeElements: [],
      realScienceBasis: [],
      handwaveAllowed: [],
      createdAt: now,
      updatedAt: now,
    };

    db.prepare(
      `INSERT INTO scifi_classification (id, project_id, hardness_level, tech_explanation_depth, scientific_accuracy_priority, speculative_elements, real_science_basis, handwave_allowed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(project_id) DO UPDATE SET
         hardness_level = excluded.hardness_level,
         tech_explanation_depth = excluded.tech_explanation_depth,
         scientific_accuracy_priority = excluded.scientific_accuracy_priority,
         updated_at = excluded.updated_at`
    ).run(
      id,
      projectId,
      hardnessLevel,
      techExplanationDepth,
      scientificAccuracyPriority,
      JSON.stringify(classification.speculativeElements),
      JSON.stringify(classification.realScienceBasis),
      JSON.stringify(classification.handwaveAllowed),
      now,
      now
    );

    logger.info({ projectId, hardnessLevel }, 'Sci-fi classification set successfully');
    return classification;
  }

  /**
   * Get classification for a project
   */
  getClassification(projectId: string): SciFiClassification | null {
    const row = db.prepare(
      'SELECT * FROM scifi_classification WHERE project_id = ?'
    ).get(projectId) as any | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      projectId: row.project_id,
      hardnessLevel: row.hardness_level as HardnessLevel,
      techExplanationDepth: row.tech_explanation_depth as TechExplanationDepth,
      scientificAccuracyPriority: row.scientific_accuracy_priority,
      speculativeElements: JSON.parse(row.speculative_elements || '[]'),
      realScienceBasis: JSON.parse(row.real_science_basis || '[]'),
      handwaveAllowed: JSON.parse(row.handwave_allowed || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Add a speculative element (FTL, AI, biotech, etc.)
   */
  addSpeculativeElement(projectId: string, category: string, element: string): void {
    logger.info({ projectId, category, element }, 'Adding speculative element');

    const classification = this.getClassification(projectId);
    if (!classification) {
      throw new Error('No sci-fi classification exists for this project');
    }

    const elementEntry = `${category}: ${element}`;

    if (classification.speculativeElements.includes(elementEntry)) {
      logger.info({ projectId, element: elementEntry }, 'Speculative element already exists');
      return;
    }

    const updatedElements = [...classification.speculativeElements, elementEntry];
    db.prepare(
      'UPDATE scifi_classification SET speculative_elements = ?, updated_at = ? WHERE project_id = ?'
    ).run(JSON.stringify(updatedElements), new Date().toISOString(), projectId);

    logger.info({ projectId, category, element }, 'Speculative element added');
  }

  /**
   * Get all speculative elements
   */
  getSpeculativeElements(projectId: string): string[] {
    const classification = this.getClassification(projectId);
    return classification?.speculativeElements || [];
  }

  /**
   * Set real science basis (what real science is being extrapolated)
   */
  setRealScienceBasis(projectId: string, scienceAreas: string[]): void {
    logger.info({ projectId, scienceAreas }, 'Setting real science basis');

    const classification = this.getClassification(projectId);
    if (!classification) {
      throw new Error('No sci-fi classification exists for this project');
    }

    db.prepare(
      'UPDATE scifi_classification SET real_science_basis = ?, updated_at = ? WHERE project_id = ?'
    ).run(JSON.stringify(scienceAreas), new Date().toISOString(), projectId);

    logger.info({ projectId }, 'Real science basis set');
  }

  /**
   * Set handwave areas (where accuracy is intentionally relaxed)
   */
  setHandwaveAreas(projectId: string, areas: string[]): void {
    logger.info({ projectId, areas }, 'Setting handwave areas');

    const classification = this.getClassification(projectId);
    if (!classification) {
      throw new Error('No sci-fi classification exists for this project');
    }

    db.prepare(
      'UPDATE scifi_classification SET handwave_allowed = ?, updated_at = ? WHERE project_id = ?'
    ).run(JSON.stringify(areas), new Date().toISOString(), projectId);

    logger.info({ projectId }, 'Handwave areas set');
  }

  /**
   * Check consistency between hardness, explanation depth, and accuracy priority
   */
  checkConsistency(
    hardnessLevel: HardnessLevel,
    techExplanationDepth: TechExplanationDepth,
    accuracyPriority: number
  ): { consistent: boolean; issues: string[] } {
    const issues: string[] = [];

    // Hard sci-fi with no explanation is inconsistent
    if (hardnessLevel === 'hard' && techExplanationDepth === 'none') {
      issues.push('Hard sci-fi readers expect detailed tech explanations');
    }

    // Science fantasy with detailed explanations is odd
    if (hardnessLevel === 'science_fantasy' && techExplanationDepth === 'detailed') {
      issues.push('Science fantasy typically doesn\'t require detailed tech explanations');
    }

    // Check accuracy priority alignment
    const expected = HARDNESS_EXPECTATIONS[hardnessLevel].typicalAccuracyPriority;
    if (Math.abs(accuracyPriority - expected) > 3) {
      issues.push(
        `Accuracy priority (${accuracyPriority}) doesn't align with ${hardnessLevel} expectations (typically ${expected})`
      );
    }

    // Hard sci-fi should have high accuracy
    if (hardnessLevel === 'hard' && accuracyPriority < 7) {
      issues.push('Hard sci-fi requires high scientific accuracy priority (7+)');
    }

    // Soft/fantasy shouldn't claim high accuracy
    if ((hardnessLevel === 'soft' || hardnessLevel === 'science_fantasy') && accuracyPriority > 6) {
      issues.push(`${hardnessLevel} doesn't typically prioritise scientific accuracy this highly`);
    }

    return {
      consistent: issues.length === 0,
      issues,
    };
  }

  /**
   * Validate classification consistency
   */
  validateConsistency(projectId: string): { consistent: boolean; issues: string[] } {
    const classification = this.getClassification(projectId);
    if (!classification) {
      return {
        consistent: false,
        issues: ['No sci-fi classification set for this project'],
      };
    }

    return this.checkConsistency(
      classification.hardnessLevel,
      classification.techExplanationDepth,
      classification.scientificAccuracyPriority
    );
  }

  /**
   * Get reader expectations for a hardness level
   */
  getReaderExpectations(hardnessLevel: HardnessLevel): ReaderExpectations {
    return HARDNESS_EXPECTATIONS[hardnessLevel];
  }

  /**
   * Suggest appropriate explanation depth for a hardness level
   */
  suggestExplanationDepth(hardnessLevel: HardnessLevel): {
    recommended: TechExplanationDepth;
    alternatives: TechExplanationDepth[];
    reasoning: string;
  } {
    const suggestions: Record<
      HardnessLevel,
      { recommended: TechExplanationDepth; alternatives: TechExplanationDepth[]; reasoning: string }
    > = {
      hard: {
        recommended: 'detailed',
        alternatives: ['moderate'],
        reasoning: 'Hard sci-fi readers expect comprehensive explanations of technology and science',
      },
      firm: {
        recommended: 'moderate',
        alternatives: ['detailed', 'minimal'],
        reasoning: 'Firm sci-fi balances plausibility with story flow - moderate explanation works best',
      },
      medium: {
        recommended: 'moderate',
        alternatives: ['minimal', 'detailed'],
        reasoning: 'Medium sci-fi focuses on story over science - explain what matters, skip the rest',
      },
      soft: {
        recommended: 'minimal',
        alternatives: ['moderate', 'none'],
        reasoning: 'Soft sci-fi uses science as backdrop - minimal explanation unless plot-critical',
      },
      science_fantasy: {
        recommended: 'none',
        alternatives: ['minimal'],
        reasoning: 'Science fantasy treats tech like magic - explanation typically not expected',
      },
    };

    return suggestions[hardnessLevel];
  }

  /**
   * Get default classification for a sci-fi subgenre
   */
  getSubgenreDefaults(subgenre: string): {
    hardnessLevel: HardnessLevel;
    techExplanationDepth: TechExplanationDepth;
    accuracyPriority: number;
  } {
    const defaults: Record<
      string,
      { hardnessLevel: HardnessLevel; techExplanationDepth: TechExplanationDepth; accuracyPriority: number }
    > = {
      'Hard SF': { hardnessLevel: 'hard', techExplanationDepth: 'detailed', accuracyPriority: 9 },
      'Space Opera': { hardnessLevel: 'firm', techExplanationDepth: 'moderate', accuracyPriority: 6 },
      Cyberpunk: { hardnessLevel: 'medium', techExplanationDepth: 'moderate', accuracyPriority: 5 },
      Dystopian: { hardnessLevel: 'soft', techExplanationDepth: 'minimal', accuracyPriority: 4 },
      'Post-Apocalyptic': { hardnessLevel: 'soft', techExplanationDepth: 'minimal', accuracyPriority: 3 },
      'First Contact': { hardnessLevel: 'firm', techExplanationDepth: 'moderate', accuracyPriority: 7 },
      'Military SF': { hardnessLevel: 'firm', techExplanationDepth: 'moderate', accuracyPriority: 7 },
      'Near Future': { hardnessLevel: 'hard', techExplanationDepth: 'detailed', accuracyPriority: 8 },
      'Far Future': { hardnessLevel: 'medium', techExplanationDepth: 'moderate', accuracyPriority: 5 },
      Biopunk: { hardnessLevel: 'medium', techExplanationDepth: 'moderate', accuracyPriority: 6 },
    };

    return (
      defaults[subgenre] || {
        hardnessLevel: 'medium',
        techExplanationDepth: 'moderate',
        accuracyPriority: 5,
      }
    );
  }

  /**
   * Delete classification
   */
  deleteClassification(projectId: string): void {
    db.prepare('DELETE FROM scifi_classification WHERE project_id = ?').run(projectId);
    logger.info({ projectId }, 'Sci-fi classification deleted');
  }
}

// Export singleton instance
export const sciFiCommercialService = new SciFiCommercialService();
