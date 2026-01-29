/**
 * Shared utilities for project routes
 * Contains helper functions used across multiple project route modules
 */

import db from '../../db/connection.js';
import { createLogger } from '../../services/logger.service.js';

const logger = createLogger('routes:projects:utils');

/**
 * Helper: Safely parse JSON with fallback
 */
export function safeJsonParse(jsonString: string | null | undefined, fallback: any = null): any {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString as any);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'JSON parse error');
    return fallback;
  }
}

/**
 * Helper: Escape special regex characters in a string
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Helper: Format time remaining in a human-readable format
 */
export function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Helper: Sync plot structure to active versions of all books in a project
 */
export function syncPlotStructureToActiveVersions(projectId: string, plotStructure: any): void {
  try {
    const booksStmt = db.prepare<[string], { id: string }>(`
      SELECT id FROM books WHERE project_id = ?
    `);
    const books = booksStmt.all(projectId);

    for (const book of books) {
      const updateVersionStmt = db.prepare(`
        UPDATE book_versions
        SET plot_snapshot = ?
        WHERE book_id = ? AND is_active = 1
      `);
      const result = updateVersionStmt.run(JSON.stringify(plotStructure), book.id);

      if (result.changes > 0) {
        logger.debug({ bookId: book.id }, 'Synced plot_snapshot to active version');
      }
    }
  } catch (error: any) {
    logger.warn({ error: error.message, projectId }, 'Failed to sync plot_snapshot to active versions');
  }
}

/**
 * Helper: Calculate similarity between two strings (0-1)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (s1.length === 0 || s2.length === 0) return 0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  let matches = 0;
  for (const char of shorter) {
    if (longer.includes(char)) {
      matches++;
    }
  }

  return matches / longer.length;
}

/**
 * Helper: Check if new value is too similar to existing values
 */
export function findSimilarValue(newValue: string, existingValues: string[], threshold: number = 0.8): string | null {
  for (const existing of existingValues) {
    const similarity = calculateStringSimilarity(newValue, existing);
    if (similarity >= threshold) {
      return existing;
    }
  }
  return null;
}

/**
 * Helper: Get colour for plot type
 */
export function getPlotColor(type: string, index: number): string {
  const colorPalette: Record<string, string[]> = {
    'main': ['#3b82f6', '#2563eb', '#1d4ed8'],
    'subplot': ['#10b981', '#059669', '#047857'],
    'mystery': ['#8b5cf6', '#7c3aed', '#6d28d9'],
    'romance': ['#ec4899', '#db2777', '#be185d'],
    'character-arc': ['#f59e0b', '#d97706', '#b45309'],
  };

  const colors = colorPalette[type] || colorPalette['subplot'];
  return colors[index % colors.length];
}

/**
 * Propagate character name changes throughout the project
 */
export function propagateCharacterNameChange(
  projectId: string,
  oldName: string,
  newName: string,
  options: { updateChapterContent?: boolean } = {}
): {
  updatedSceneCards: number;
  updatedRelationships: number;
  updatedTimeline: number;
  updatedChapters: number;
  updatedStoryConcept: boolean;
  updatedPlotStructure: boolean;
  updatedCharacterFields: number;
} {
  const stats = {
    updatedSceneCards: 0,
    updatedRelationships: 0,
    updatedTimeline: 0,
    updatedChapters: 0,
    updatedStoryConcept: false,
    updatedPlotStructure: false,
    updatedCharacterFields: 0,
  };

  if (oldName === newName) return stats;

  const booksStmt = db.prepare<[string], any>(`
    SELECT id FROM books WHERE project_id = ?
  `);
  const books = booksStmt.all(projectId);

  const nameRegex = new RegExp(`\\b${escapeRegex(oldName)}\\b`, 'g');

  // Update scene cards in all chapters
  for (const book of books) {
    const chaptersStmt = db.prepare<[string], any>(`
      SELECT id, scene_cards, content, summary FROM chapters WHERE book_id = ?
    `);
    const chapters = chaptersStmt.all(book.id);

    for (const chapter of chapters) {
      let needsUpdate = false;
      let sceneCards = safeJsonParse(chapter.scene_cards, []);
      let content = chapter.content || '';
      let summary = chapter.summary || '';

      for (const scene of sceneCards) {
        if (scene.characters && Array.isArray(scene.characters)) {
          const idx = scene.characters.indexOf(oldName);
          if (idx !== -1) {
            scene.characters[idx] = newName;
            stats.updatedSceneCards++;
            needsUpdate = true;
          }
        }
        if (scene.povCharacter === oldName) {
          scene.povCharacter = newName;
          stats.updatedSceneCards++;
          needsUpdate = true;
        }
      }

      if (options.updateChapterContent && content) {
        if (nameRegex.test(content)) {
          content = content.replace(nameRegex, newName);
          stats.updatedChapters++;
          needsUpdate = true;
        }
        if (summary && nameRegex.test(summary)) {
          summary = summary.replace(nameRegex, newName);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        const updateChapterStmt = db.prepare(`
          UPDATE chapters SET scene_cards = ?, content = ?, summary = ?, updated_at = ? WHERE id = ?
        `);
        updateChapterStmt.run(
          JSON.stringify(sceneCards),
          content,
          summary,
          new Date().toISOString(),
          chapter.id
        );
      }
    }
  }

  // Update project fields
  const projectStmt = db.prepare<[string], any>(`
    SELECT story_bible, series_bible, story_concept, plot_structure FROM projects WHERE id = ?
  `);
  const project = projectStmt.get(projectId);

  if (project?.story_concept) {
    const storyConcept = safeJsonParse(project.story_concept, null);
    if (storyConcept) {
      let conceptChanged = false;
      const textFields = ['logline', 'synopsis', 'hook', 'protagonistHint', 'title'];
      for (const field of textFields) {
        if (storyConcept[field] && typeof storyConcept[field] === 'string') {
          const updated = storyConcept[field].replace(nameRegex, newName);
          if (updated !== storyConcept[field]) {
            storyConcept[field] = updated;
            conceptChanged = true;
          }
        }
      }
      if (conceptChanged) {
        const updateConceptStmt = db.prepare(`
          UPDATE projects SET story_concept = ?, updated_at = ? WHERE id = ?
        `);
        updateConceptStmt.run(JSON.stringify(storyConcept), new Date().toISOString(), projectId);
        stats.updatedStoryConcept = true;
      }
    }
  }

  if (project?.plot_structure) {
    const plotStructure = safeJsonParse(project.plot_structure, null);
    if (plotStructure) {
      const replaceInObject = (obj: any): boolean => {
        let changed = false;
        if (!obj || typeof obj !== 'object') return false;

        if (Array.isArray(obj)) {
          for (let i = 0; i < obj.length; i++) {
            if (typeof obj[i] === 'string') {
              const updated = obj[i].replace(nameRegex, newName);
              if (updated !== obj[i]) {
                obj[i] = updated;
                changed = true;
              }
            } else if (typeof obj[i] === 'object') {
              if (replaceInObject(obj[i])) changed = true;
            }
          }
        } else {
          for (const key of Object.keys(obj)) {
            if (typeof obj[key] === 'string') {
              const updated = obj[key].replace(nameRegex, newName);
              if (updated !== obj[key]) {
                obj[key] = updated;
                changed = true;
              }
            } else if (typeof obj[key] === 'object') {
              if (replaceInObject(obj[key])) changed = true;
            }
          }
        }
        return changed;
      };

      if (replaceInObject(plotStructure)) {
        const updatePlotStmt = db.prepare(`
          UPDATE projects SET plot_structure = ?, updated_at = ? WHERE id = ?
        `);
        updatePlotStmt.run(JSON.stringify(plotStructure), new Date().toISOString(), projectId);
        syncPlotStructureToActiveVersions(projectId, plotStructure);
        stats.updatedPlotStructure = true;
      }
    }
  }

  if (project?.story_bible) {
    const storyBible = safeJsonParse(project.story_bible, null);
    if (storyBible) {
      let bibleChanged = false;

      for (const character of storyBible.characters || []) {
        if (character.name === oldName) {
          character.name = newName;
          bibleChanged = true;
        }

        const textFields = ['voiceSample', 'backstory', 'characterArc', 'physicalDescription'];
        for (const field of textFields) {
          if (character[field] && typeof character[field] === 'string') {
            const updated = character[field].replace(nameRegex, newName);
            if (updated !== character[field]) {
              character[field] = updated;
              stats.updatedCharacterFields++;
              bibleChanged = true;
            }
          }
        }

        if (character.relationships && Array.isArray(character.relationships)) {
          for (const rel of character.relationships) {
            if (rel.characterName === oldName) {
              rel.characterName = newName;
              stats.updatedRelationships++;
              bibleChanged = true;
            }
            if (rel.description && typeof rel.description === 'string') {
              const updated = rel.description.replace(nameRegex, newName);
              if (updated !== rel.description) {
                rel.description = updated;
                stats.updatedRelationships++;
                bibleChanged = true;
              }
            }
          }
        }
      }

      if (storyBible.timeline && Array.isArray(storyBible.timeline)) {
        for (const event of storyBible.timeline) {
          if (event.participants && Array.isArray(event.participants)) {
            const idx = event.participants.indexOf(oldName);
            if (idx !== -1) {
              event.participants[idx] = newName;
              stats.updatedTimeline++;
              bibleChanged = true;
            }
          }
          if (event.description && typeof event.description === 'string') {
            const updated = event.description.replace(nameRegex, newName);
            if (updated !== event.description) {
              event.description = updated;
              stats.updatedTimeline++;
              bibleChanged = true;
            }
          }
        }
      }

      if (bibleChanged) {
        const updateProjectStmt = db.prepare(`
          UPDATE projects SET story_bible = ?, updated_at = ? WHERE id = ?
        `);
        updateProjectStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);
      }
    }
  }

  return stats;
}

/**
 * Propagate world element name changes throughout the project
 */
export function propagateWorldNameChange(
  projectId: string,
  oldName: string,
  newName: string,
  options: { updateChapterContent?: boolean } = {}
): {
  updatedSceneCards: number;
  updatedStoryBible: boolean;
  updatedStoryConcept: boolean;
  updatedPlotStructure: boolean;
  updatedChapters: number;
} {
  const stats = {
    updatedSceneCards: 0,
    updatedStoryBible: false,
    updatedStoryConcept: false,
    updatedPlotStructure: false,
    updatedChapters: 0,
  };

  if (oldName === newName) return stats;

  const nameRegex = new RegExp(`\\b${escapeRegex(oldName)}\\b`, 'g');

  const booksStmt = db.prepare<[string], any>(`
    SELECT id FROM books WHERE project_id = ?
  `);
  const books = booksStmt.all(projectId);

  for (const book of books) {
    const chaptersStmt = db.prepare<[string], any>(`
      SELECT id, scene_cards, content, summary FROM chapters WHERE book_id = ?
    `);
    const chapters = chaptersStmt.all(book.id);

    for (const chapter of chapters) {
      let needsUpdate = false;
      let sceneCards = safeJsonParse(chapter.scene_cards, []);
      let content = chapter.content || '';
      let summary = chapter.summary || '';

      for (const scene of sceneCards) {
        if (scene.location && typeof scene.location === 'string') {
          const updated = scene.location.replace(nameRegex, newName);
          if (updated !== scene.location) {
            scene.location = updated;
            stats.updatedSceneCards++;
            needsUpdate = true;
          }
        }
      }

      if (options.updateChapterContent && content) {
        if (nameRegex.test(content)) {
          content = content.replace(nameRegex, newName);
          stats.updatedChapters++;
          needsUpdate = true;
        }
        if (summary && nameRegex.test(summary)) {
          summary = summary.replace(nameRegex, newName);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        const updateChapterStmt = db.prepare(`
          UPDATE chapters SET scene_cards = ?, content = ?, summary = ?, updated_at = ? WHERE id = ?
        `);
        updateChapterStmt.run(
          JSON.stringify(sceneCards),
          content,
          summary,
          new Date().toISOString(),
          chapter.id
        );
      }
    }
  }

  const projectStmt = db.prepare<[string], any>(`
    SELECT story_bible, story_concept, plot_structure FROM projects WHERE id = ?
  `);
  const project = projectStmt.get(projectId);

  if (project?.story_concept) {
    const storyConcept = safeJsonParse(project.story_concept, null);
    if (storyConcept) {
      let conceptChanged = false;
      const textFields = ['logline', 'synopsis', 'hook', 'protagonistHint', 'title'];
      for (const field of textFields) {
        if (storyConcept[field] && typeof storyConcept[field] === 'string') {
          const updated = storyConcept[field].replace(nameRegex, newName);
          if (updated !== storyConcept[field]) {
            storyConcept[field] = updated;
            conceptChanged = true;
          }
        }
      }
      if (conceptChanged) {
        const updateConceptStmt = db.prepare(`
          UPDATE projects SET story_concept = ?, updated_at = ? WHERE id = ?
        `);
        updateConceptStmt.run(JSON.stringify(storyConcept), new Date().toISOString(), projectId);
        stats.updatedStoryConcept = true;
      }
    }
  }

  if (project?.plot_structure) {
    const plotStructure = safeJsonParse(project.plot_structure, null);
    if (plotStructure) {
      const replaceInObject = (obj: any): boolean => {
        let changed = false;
        if (!obj || typeof obj !== 'object') return false;

        if (Array.isArray(obj)) {
          for (let i = 0; i < obj.length; i++) {
            if (typeof obj[i] === 'string') {
              const updated = obj[i].replace(nameRegex, newName);
              if (updated !== obj[i]) {
                obj[i] = updated;
                changed = true;
              }
            } else if (typeof obj[i] === 'object') {
              if (replaceInObject(obj[i])) changed = true;
            }
          }
        } else {
          for (const key of Object.keys(obj)) {
            if (typeof obj[key] === 'string') {
              const updated = obj[key].replace(nameRegex, newName);
              if (updated !== obj[key]) {
                obj[key] = updated;
                changed = true;
              }
            } else if (typeof obj[key] === 'object') {
              if (replaceInObject(obj[key])) changed = true;
            }
          }
        }
        return changed;
      };

      if (replaceInObject(plotStructure)) {
        const updatePlotStmt = db.prepare(`
          UPDATE projects SET plot_structure = ?, updated_at = ? WHERE id = ?
        `);
        updatePlotStmt.run(JSON.stringify(plotStructure), new Date().toISOString(), projectId);
        syncPlotStructureToActiveVersions(projectId, plotStructure);
        stats.updatedPlotStructure = true;
      }
    }
  }

  if (project?.story_bible) {
    const storyBible = safeJsonParse(project.story_bible, null);
    if (storyBible) {
      let bibleChanged = false;

      for (const character of storyBible.characters || []) {
        const textFields = ['backstory', 'physicalDescription', 'characterArc'];
        for (const field of textFields) {
          if (character[field] && typeof character[field] === 'string') {
            const updated = character[field].replace(nameRegex, newName);
            if (updated !== character[field]) {
              character[field] = updated;
              bibleChanged = true;
            }
          }
        }
        if (character.currentState?.location && typeof character.currentState.location === 'string') {
          const updated = character.currentState.location.replace(nameRegex, newName);
          if (updated !== character.currentState.location) {
            character.currentState.location = updated;
            bibleChanged = true;
          }
        }
      }

      if (storyBible.timeline && Array.isArray(storyBible.timeline)) {
        for (const event of storyBible.timeline) {
          if (event.description && typeof event.description === 'string') {
            const updated = event.description.replace(nameRegex, newName);
            if (updated !== event.description) {
              event.description = updated;
              bibleChanged = true;
            }
          }
        }
      }

      if (bibleChanged) {
        const updateBibleStmt = db.prepare(`
          UPDATE projects SET story_bible = ?, updated_at = ? WHERE id = ?
        `);
        updateBibleStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);
        stats.updatedStoryBible = true;
      }
    }
  }

  return stats;
}
