/**
 * Project Search/Replace Routes
 * Handles global text search and replace across project content
 */

import { Router } from 'express';
import db from '../../db/connection.js';
import { createLogger } from '../../services/logger.service.js';
import { safeJsonParse, escapeRegex, syncPlotStructureToActiveVersions } from './utils.js';

const router = Router();
const logger = createLogger('routes:projects:search-replace');

/**
 * POST /api/projects/:id/search-replace
 * Search and replace text across all content in a project
 */
router.post('/:id/search-replace', (req, res) => {
  try {
    const projectId = req.params.id;
    const { searchText, replaceText, caseSensitive = true, preview = false } = req.body;

    if (!searchText) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'searchText is required' },
      });
    }

    if (replaceText === undefined) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'replaceText is required' },
      });
    }

    logger.info({ projectId, searchText, replaceText, caseSensitive, preview }, 'Search and replace request');

    // Get project
    const projectStmt = db.prepare<[string], any>(`SELECT * FROM projects WHERE id = ?`);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Create regex for search
    const flags = caseSensitive ? 'g' : 'gi';
    const searchRegex = new RegExp(escapeRegex(searchText), flags);

    // Track all replacements
    const replacements: Array<{
      location: string;
      field: string;
      originalText: string;
      count: number;
    }> = [];

    // Helper to count and optionally replace
    const processText = (text: string | null, location: string, field: string): string | null => {
      if (!text) return text;
      const matches = text.match(searchRegex);
      if (matches && matches.length > 0) {
        const contextMatches: string[] = [];
        let match;
        const contextRegex = new RegExp(escapeRegex(searchText), flags);
        while ((match = contextRegex.exec(text)) !== null) {
          const start = Math.max(0, match.index - 30);
          const end = Math.min(text.length, match.index + searchText.length + 30);
          const context = text.substring(start, end);
          contextMatches.push(context);
          if (contextMatches.length >= 3) break;
        }

        replacements.push({
          location,
          field,
          originalText: contextMatches.join(' ... '),
          count: matches.length,
        });

        if (!preview) {
          return text.replace(searchRegex, replaceText);
        }
      }
      return text;
    };

    // Helper to process JSON fields
    const processJson = (jsonStr: string | null, location: string, fieldName: string): string | null => {
      if (!jsonStr) return jsonStr;
      try {
        const obj = JSON.parse(jsonStr);
        const processObject = (o: any, path: string): any => {
          if (typeof o === 'string') {
            return processText(o, location, `${fieldName}.${path}`);
          }
          if (Array.isArray(o)) {
            return o.map((item, i) => processObject(item, `${path}[${i}]`));
          }
          if (typeof o === 'object' && o !== null) {
            const result: any = {};
            for (const [key, value] of Object.entries(o)) {
              result[key] = processObject(value, path ? `${path}.${key}` : key);
            }
            return result;
          }
          return o;
        };
        const processed = processObject(obj, '');
        return JSON.stringify(processed);
      } catch {
        return processText(jsonStr, location, fieldName);
      }
    };

    // Process project fields
    const updatedProject: any = {};

    if (project.story_bible) {
      const processed = processJson(project.story_bible, 'Project', 'story_bible');
      if (!preview && processed !== project.story_bible) {
        updatedProject.story_bible = processed;
      }
    }

    if (project.story_dna) {
      const processed = processJson(project.story_dna, 'Project', 'story_dna');
      if (!preview && processed !== project.story_dna) {
        updatedProject.story_dna = processed;
      }
    }

    if (project.plot_structure) {
      const processed = processJson(project.plot_structure, 'Project', 'plot_structure');
      if (!preview && processed !== project.plot_structure) {
        updatedProject.plot_structure = processed;
      }
    }

    if (project.story_concept) {
      const processed = processJson(project.story_concept, 'Project', 'story_concept');
      if (!preview && processed !== project.story_concept) {
        updatedProject.story_concept = processed;
      }
    }

    if (project.series_bible) {
      const processed = processJson(project.series_bible, 'Project', 'series_bible');
      if (!preview && processed !== project.series_bible) {
        updatedProject.series_bible = processed;
      }
    }

    if (project.title) {
      const processed = processText(project.title, 'Project', 'title');
      if (!preview && processed !== project.title) {
        updatedProject.title = processed;
      }
    }

    // Update project if changes were made
    if (!preview && Object.keys(updatedProject).length > 0) {
      const updates = Object.keys(updatedProject).map(k => `${k} = ?`).join(', ');
      const values = [...Object.values(updatedProject), new Date().toISOString(), projectId];
      const stmt = db.prepare(`UPDATE projects SET ${updates}, updated_at = ? WHERE id = ?`);
      stmt.run(...values);

      // Sync plot structure to active versions if changed
      if (updatedProject.plot_structure) {
        syncPlotStructureToActiveVersions(projectId, JSON.parse(updatedProject.plot_structure));
      }
    }

    // Get all books for this project
    const booksStmt = db.prepare<[string], any>(`SELECT id, title FROM books WHERE project_id = ?`);
    const books = booksStmt.all(projectId);

    // Process chapters
    const chaptersStmt = db.prepare<[string], any>(`
      SELECT c.id, c.title, c.content, c.summary, c.scene_cards, b.title as book_title
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      WHERE b.project_id = ?
    `);
    const chapters = chaptersStmt.all(projectId);

    for (const chapter of chapters) {
      const chapterUpdates: any = {};
      const location = `Chapter: ${chapter.title || 'Untitled'} (${chapter.book_title})`;

      if (chapter.content) {
        const processed = processText(chapter.content, location, 'content');
        if (!preview && processed !== chapter.content) {
          chapterUpdates.content = processed;
        }
      }

      if (chapter.title) {
        const processed = processText(chapter.title, location, 'title');
        if (!preview && processed !== chapter.title) {
          chapterUpdates.title = processed;
        }
      }

      if (chapter.summary) {
        const processed = processText(chapter.summary, location, 'summary');
        if (!preview && processed !== chapter.summary) {
          chapterUpdates.summary = processed;
        }
      }

      if (chapter.scene_cards) {
        const processed = processJson(chapter.scene_cards, location, 'scene_cards');
        if (!preview && processed !== chapter.scene_cards) {
          chapterUpdates.scene_cards = processed;
        }
      }

      if (!preview && Object.keys(chapterUpdates).length > 0) {
        const updates = Object.keys(chapterUpdates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(chapterUpdates), new Date().toISOString(), chapter.id];
        const stmt = db.prepare(`UPDATE chapters SET ${updates}, updated_at = ? WHERE id = ?`);
        stmt.run(...values);
      }
    }

    // Process outlines
    const outlinesStmt = db.prepare<[string], any>(`
      SELECT o.id, o.structure, b.title as book_title
      FROM outlines o
      JOIN books b ON o.book_id = b.id
      WHERE b.project_id = ?
    `);
    const outlines = outlinesStmt.all(projectId);

    for (const outline of outlines) {
      if (outline.structure) {
        const location = `Outline: ${outline.book_title}`;
        const processed = processJson(outline.structure, location, 'structure');
        if (!preview && processed !== outline.structure) {
          const stmt = db.prepare(`UPDATE outlines SET structure = ?, updated_at = ? WHERE id = ?`);
          stmt.run(processed, new Date().toISOString(), outline.id);
        }
      }
    }

    // Process book titles
    for (const book of books) {
      if (book.title) {
        const processed = processText(book.title, `Book: ${book.title}`, 'title');
        if (!preview && processed !== book.title) {
          const stmt = db.prepare(`UPDATE books SET title = ?, updated_at = ? WHERE id = ?`);
          stmt.run(processed, new Date().toISOString(), book.id);
        }
      }
    }

    const totalReplacements = replacements.reduce((sum, r) => sum + r.count, 0);

    logger.info({
      projectId,
      searchText,
      replaceText,
      preview,
      totalReplacements,
      locations: replacements.length,
    }, 'Search and replace completed');

    res.json({
      success: true,
      preview,
      searchText,
      replaceText,
      caseSensitive,
      totalReplacements,
      locations: replacements.length,
      replacements: replacements.slice(0, 50),
      message: preview
        ? `Found ${totalReplacements} occurrences in ${replacements.length} locations`
        : `Replaced ${totalReplacements} occurrences in ${replacements.length} locations`,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error in search and replace');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/search-replace/preview
 * Preview what would be replaced without making changes
 */
router.post('/:id/search-replace/preview', (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { searchText, caseSensitive, wholeWord, includeChapterContent } = req.body;

    if (!searchText) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'searchText is required' },
      });
    }

    // Build regex
    const flags = (caseSensitive !== false) ? 'g' : 'gi';
    const pattern = (wholeWord !== false) ? `\\b${escapeRegex(searchText)}\\b` : escapeRegex(searchText);
    const regex = new RegExp(pattern, flags);

    const matches: Array<{ field: string; context: string; count: number }> = [];

    // Helper to find matches in string
    const findInString = (str: string | null | undefined, fieldName: string): void => {
      if (!str || typeof str !== 'string') return;
      const found = str.match(regex);
      if (found) {
        const idx = str.search(regex);
        const start = Math.max(0, idx - 30);
        const end = Math.min(str.length, idx + searchText.length + 30);
        const context = (start > 0 ? '...' : '') + str.slice(start, end) + (end < str.length ? '...' : '');
        matches.push({ field: fieldName, context, count: found.length });
      }
    };

    // Helper to recursively search object
    const searchInObject = (obj: any, fieldPrefix: string): void => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        obj.forEach((item, i) => {
          if (typeof item === 'string') findInString(item, `${fieldPrefix}[${i}]`);
          else if (typeof item === 'object') searchInObject(item, `${fieldPrefix}[${i}]`);
        });
      } else {
        Object.keys(obj).forEach(key => {
          if (typeof obj[key] === 'string') findInString(obj[key], `${fieldPrefix}.${key}`);
          else if (typeof obj[key] === 'object') searchInObject(obj[key], `${fieldPrefix}.${key}`);
        });
      }
    };

    // Get project data
    const projectStmt = db.prepare<[string], any>(`
      SELECT story_concept, story_dna, story_bible, plot_structure, title
      FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);
    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Search in all fields
    findInString(project.title, 'project.title');
    if (project.story_concept) searchInObject(safeJsonParse(project.story_concept, null), 'story_concept');
    if (project.story_dna) searchInObject(safeJsonParse(project.story_dna, null), 'story_dna');
    if (project.story_bible) searchInObject(safeJsonParse(project.story_bible, null), 'story_bible');
    if (project.plot_structure) searchInObject(safeJsonParse(project.plot_structure, null), 'plot_structure');

    // Search in books
    const booksStmt = db.prepare<[string], { id: string; title: string }>(`
      SELECT id, title FROM books WHERE project_id = ?
    `);
    const books = booksStmt.all(projectId);
    books.forEach(book => findInString(book.title, `book.${book.id}.title`));

    // Search in chapters
    if (includeChapterContent !== false) {
      const chaptersStmt = db.prepare<[string], { id: string; chapter_number: number; scene_cards: string; content: string; summary: string }>(`
        SELECT c.id, c.chapter_number, c.scene_cards, c.content, c.summary
        FROM chapters c
        JOIN books b ON c.book_id = b.id
        WHERE b.project_id = ?
      `);
      const chapters = chaptersStmt.all(projectId);

      chapters.forEach(chapter => {
        if (chapter.scene_cards) searchInObject(safeJsonParse(chapter.scene_cards, []), `chapter${chapter.chapter_number}.scene_cards`);
        findInString(chapter.content, `chapter${chapter.chapter_number}.content`);
        findInString(chapter.summary, `chapter${chapter.chapter_number}.summary`);
      });
    }

    const totalCount = matches.reduce((sum, m) => sum + m.count, 0);

    res.json({
      searchText,
      totalMatches: totalCount,
      fieldsWithMatches: matches.length,
      matches: matches.slice(0, 50),
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error in search/replace preview');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
