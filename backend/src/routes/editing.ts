import express from 'express';
import db from '../db/connection.js';
import { editingService } from '../services/editing.service.js';
import { QueueWorker } from '../queue/worker.js';

const router = express.Router();

/**
 * GET /api/editing/chapters/:chapterId/flags
 * Get all flags for a chapter
 */
router.get('/chapters/:chapterId/flags', (req, res) => {
  try {
    const { chapterId } = req.params;

    const stmt = db.prepare<[string], { flags: string | null }>(`
      SELECT flags FROM chapters WHERE id = ?
    `);

    const row = stmt.get(chapterId);
    if (!row) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const flags = row.flags ? JSON.parse(row.flags) : [];

    res.json({ flags });
  } catch (error: any) {
    console.error('[API] Error getting flags:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/editing/chapters/:chapterId/flags/:flagId/resolve
 * Mark a flag as resolved
 */
router.post('/chapters/:chapterId/flags/:flagId/resolve', (req, res) => {
  try {
    const { chapterId, flagId } = req.params;

    const stmt = db.prepare<[string], { flags: string | null }>(`
      SELECT flags FROM chapters WHERE id = ?
    `);

    const row = stmt.get(chapterId);
    if (!row) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const flags = row.flags ? JSON.parse(row.flags) : [];
    const flag = flags.find((f: any) => f.id === flagId);

    if (!flag) {
      return res.status(404).json({ error: 'Flag not found' });
    }

    flag.resolved = true;

    const updateStmt = db.prepare(`
      UPDATE chapters
      SET flags = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(flags), new Date().toISOString(), chapterId);

    res.json({ success: true, flag });
  } catch (error: any) {
    console.error('[API] Error resolving flag:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/editing/chapters/:chapterId/regenerate-with-edits
 * Regenerate a chapter and re-run the full editing pipeline
 */
router.post('/chapters/:chapterId/regenerate-with-edits', (req, res) => {
  try {
    const { chapterId } = req.params;

    // Verify chapter exists
    const checkStmt = db.prepare<[string], { id: string }>(`
      SELECT id FROM chapters WHERE id = ?
    `);

    const chapter = checkStmt.get(chapterId);
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Reset chapter
    const resetStmt = db.prepare(`
      UPDATE chapters
      SET status = 'pending', content = NULL, summary = NULL, flags = '[]', updated_at = ?
      WHERE id = ?
    `);

    resetStmt.run(new Date().toISOString(), chapterId);

    // Cancel any pending jobs for this chapter
    const cancelStmt = db.prepare(`
      UPDATE jobs
      SET status = 'failed', error = 'Cancelled for regeneration'
      WHERE target_id = ? AND status IN ('pending', 'running')
    `);

    cancelStmt.run(chapterId);

    // Queue full workflow
    const generateJobId = QueueWorker.createJob('generate_chapter', chapterId);
    const devEditJobId = QueueWorker.createJob('dev_edit', chapterId);
    const lineEditJobId = QueueWorker.createJob('line_edit', chapterId);
    const continuityJobId = QueueWorker.createJob('continuity_check', chapterId);
    const copyEditJobId = QueueWorker.createJob('copy_edit', chapterId);
    const summaryJobId = QueueWorker.createJob('generate_summary', chapterId);
    const statesJobId = QueueWorker.createJob('update_states', chapterId);

    res.json({
      success: true,
      message: 'Chapter regeneration queued',
      jobs: {
        generateJobId,
        devEditJobId,
        lineEditJobId,
        continuityJobId,
        copyEditJobId,
        summaryJobId,
        statesJobId,
      },
    });
  } catch (error: any) {
    console.error('[API] Error regenerating chapter:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/editing/chapters/:chapterId/run-editor/:editorType
 * Run a specific editor on a chapter (for testing or manual runs)
 */
router.post('/chapters/:chapterId/run-editor/:editorType', async (req, res) => {
  try {
    const { chapterId, editorType } = req.params;

    if (!['developmental', 'line', 'continuity', 'copy'].includes(editorType)) {
      return res.status(400).json({ error: 'Invalid editor type' });
    }

    let result;
    switch (editorType) {
      case 'developmental':
        result = await editingService.developmentalEdit(chapterId);
        break;
      case 'line':
        result = await editingService.lineEdit(chapterId);
        break;
      case 'continuity':
        result = await editingService.continuityEdit(chapterId);
        break;
      case 'copy':
        result = await editingService.copyEdit(chapterId);
        break;
    }

    // Apply the result
    await editingService.applyEditResult(chapterId, result!);

    res.json({
      success: true,
      result: {
        editorType: result!.editorType,
        suggestionsCount: result!.suggestions.length,
        flagsCount: result!.flags.length,
        approved: result!.approved,
      },
    });
  } catch (error: any) {
    console.error('[API] Error running editor:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/editing/books/:bookId/flags-summary
 * Get summary of all flags across all chapters in a book
 */
router.get('/books/:bookId/flags-summary', (req, res) => {
  try {
    const { bookId } = req.params;

    const stmt = db.prepare<[string], { id: string; chapter_number: number; flags: string | null }>(`
      SELECT id, chapter_number, flags
      FROM chapters
      WHERE book_id = ?
      ORDER BY chapter_number ASC
    `);

    const chapters = stmt.all(bookId);

    let totalFlags = 0;
    let unresolvedFlags = 0;
    const flagsByType: Record<string, number> = {};
    const flagsBySeverity: Record<string, number> = {};

    const chapterFlags = chapters.map((chapter) => {
      const flags = chapter.flags ? JSON.parse(chapter.flags) : [];

      flags.forEach((flag: any) => {
        totalFlags++;
        if (!flag.resolved) unresolvedFlags++;

        flagsByType[flag.type] = (flagsByType[flag.type] || 0) + 1;
        flagsBySeverity[flag.severity] = (flagsBySeverity[flag.severity] || 0) + 1;
      });

      return {
        chapterId: chapter.id,
        chapterNumber: chapter.chapter_number,
        flagCount: flags.length,
        unresolvedCount: flags.filter((f: any) => !f.resolved).length,
      };
    });

    res.json({
      totalFlags,
      unresolvedFlags,
      resolvedFlags: totalFlags - unresolvedFlags,
      flagsByType,
      flagsBySeverity,
      chapters: chapterFlags,
    });
  } catch (error: any) {
    console.error('[API] Error getting flags summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SPRINT 16: Interactive Editing Workspace
// ============================================================================

/**
 * GET /api/editing/chapters/:chapterId/edit
 * Get chapter with edit if it exists
 */
router.get('/chapters/:chapterId/edit', (req, res) => {
  try {
    const { chapterId } = req.params;

    // Get chapter
    const chapterStmt = db.prepare<[string], { content: string | null; word_count: number }>(`
      SELECT content, word_count FROM chapters WHERE id = ?
    `);
    const chapter = chapterStmt.get(chapterId);

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Get edit if exists
    const editStmt = db.prepare(`
      SELECT * FROM chapter_edits WHERE chapter_id = ?
    `);
    const edit = editStmt.get(chapterId);

    res.json({
      chapterId,
      hasEdit: !!edit,
      edit: edit || null,
      original: {
        content: chapter.content || '',
        wordCount: chapter.word_count,
      },
    });
  } catch (error: any) {
    console.error('[API] Error getting chapter edit:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/editing/chapters/:chapterId/edit
 * Save chapter edit
 */
router.post('/chapters/:chapterId/edit', (req, res) => {
  try {
    const { chapterId } = req.params;
    const { content, isLocked, editNotes } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Calculate word count
    const wordCount = content.trim().split(/\s+/).length;

    // Check if edit already exists
    const existingEdit = db.prepare(`
      SELECT id FROM chapter_edits WHERE chapter_id = ?
    `).get(chapterId);

    const now = new Date().toISOString();

    if (existingEdit) {
      // Update existing edit
      const updateStmt = db.prepare(`
        UPDATE chapter_edits
        SET edited_content = ?, word_count = ?, is_locked = ?, edit_notes = ?, updated_at = ?
        WHERE chapter_id = ?
      `);
      updateStmt.run(content, wordCount, isLocked ? 1 : 0, editNotes || null, now, chapterId);
    } else {
      // Create new edit
      const insertStmt = db.prepare(`
        INSERT INTO chapter_edits (id, chapter_id, edited_content, word_count, is_locked, edit_notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const editId = `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      insertStmt.run(editId, chapterId, content, wordCount, isLocked ? 1 : 0, editNotes || null, now, now);
    }

    // Get the updated edit
    const edit = db.prepare(`
      SELECT * FROM chapter_edits WHERE chapter_id = ?
    `).get(chapterId);

    res.json({ success: true, edit });
  } catch (error: any) {
    console.error('[API] Error saving chapter edit:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/editing/chapters/:chapterId/edit
 * Delete chapter edit (revert to original)
 */
router.delete('/chapters/:chapterId/edit', (req, res) => {
  try {
    const { chapterId } = req.params;

    const deleteStmt = db.prepare(`
      DELETE FROM chapter_edits WHERE chapter_id = ?
    `);
    deleteStmt.run(chapterId);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[API] Error deleting chapter edit:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/editing/chapters/:chapterId/comparison
 * Get side-by-side comparison of original vs edited
 */
router.get('/chapters/:chapterId/comparison', (req, res) => {
  try {
    const { chapterId } = req.params;

    // Get chapter
    const chapterStmt = db.prepare<[string], { content: string | null; word_count: number; created_at: string }>(`
      SELECT content, word_count, created_at FROM chapters WHERE id = ?
    `);
    const chapter = chapterStmt.get(chapterId);

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Get edit if exists
    const editStmt = db.prepare<[string], { edited_content: string; word_count: number; updated_at: string }>(`
      SELECT edited_content, word_count, updated_at FROM chapter_edits WHERE chapter_id = ?
    `);
    const edit = editStmt.get(chapterId);

    const originalWordCount = chapter.word_count;
    const editedWordCount = edit ? edit.word_count : originalWordCount;

    const result: any = {
      original: {
        content: chapter.content || '',
        wordCount: originalWordCount,
        generatedAt: chapter.created_at,
      },
      edited: edit ? {
        content: edit.edited_content,
        wordCount: editedWordCount,
        lastEditedAt: edit.updated_at,
      } : null,
      diff: null,
    };

    if (edit) {
      const addedWords = Math.max(0, editedWordCount - originalWordCount);
      const removedWords = Math.max(0, originalWordCount - editedWordCount);
      const percentChanged = originalWordCount > 0
        ? Math.round((Math.abs(editedWordCount - originalWordCount) / originalWordCount) * 100)
        : 0;

      result.diff = {
        addedWords,
        removedWords,
        percentChanged,
      };
    }

    res.json(result);
  } catch (error: any) {
    console.error('[API] Error getting comparison:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/editing/chapters/:chapterId/lock
 * Lock/unlock chapter from regeneration
 */
router.post('/chapters/:chapterId/lock', (req, res) => {
  try {
    const { chapterId } = req.params;
    const { isLocked } = req.body;

    if (typeof isLocked !== 'boolean') {
      return res.status(400).json({ error: 'isLocked must be a boolean' });
    }

    // Get or create edit
    const existingEdit = db.prepare(`
      SELECT id FROM chapter_edits WHERE chapter_id = ?
    `).get(chapterId);

    const now = new Date().toISOString();

    if (existingEdit) {
      const updateStmt = db.prepare(`
        UPDATE chapter_edits
        SET is_locked = ?, updated_at = ?
        WHERE chapter_id = ?
      `);
      updateStmt.run(isLocked ? 1 : 0, now, chapterId);
    } else {
      // Get chapter content to create initial edit
      const chapterStmt = db.prepare<[string], { content: string | null; word_count: number }>(`
        SELECT content, word_count FROM chapters WHERE id = ?
      `);
      const chapter = chapterStmt.get(chapterId);

      if (!chapter) {
        return res.status(404).json({ error: 'Chapter not found' });
      }

      const insertStmt = db.prepare(`
        INSERT INTO chapter_edits (id, chapter_id, edited_content, word_count, is_locked, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const editId = `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      insertStmt.run(editId, chapterId, chapter.content || '', chapter.word_count, isLocked ? 1 : 0, now, now);
    }

    res.json({ success: true, isLocked });
  } catch (error: any) {
    console.error('[API] Error toggling lock:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/editing/books/:bookId/word-count
 * Get word count statistics for all chapters in a book
 */
router.get('/books/:bookId/word-count', (req, res) => {
  try {
    const { bookId } = req.params;

    const stmt = db.prepare<[string], { id: string; chapter_number: number; word_count: number }>(`
      SELECT id, chapter_number, word_count
      FROM chapters
      WHERE book_id = ?
      ORDER BY chapter_number ASC
    `);

    const chapters = stmt.all(bookId);

    // Get edits
    const editsStmt = db.prepare<[string], { chapter_id: string; word_count: number }>(`
      SELECT ce.chapter_id, ce.word_count
      FROM chapter_edits ce
      INNER JOIN chapters c ON ce.chapter_id = c.id
      WHERE c.book_id = ?
    `);

    const edits = editsStmt.all(bookId);
    const editsMap = new Map(edits.map(e => [e.chapter_id, e.word_count]));

    const chapterStats = chapters.map(chapter => ({
      chapterId: chapter.id,
      chapterNumber: chapter.chapter_number,
      originalWordCount: chapter.word_count,
      editedWordCount: editsMap.get(chapter.id) || null,
      currentWordCount: editsMap.get(chapter.id) || chapter.word_count,
    }));

    const totalOriginal = chapters.reduce((sum, c) => sum + c.word_count, 0);
    const totalCurrent = chapterStats.reduce((sum, c) => sum + c.currentWordCount, 0);

    res.json({
      totalOriginalWordCount: totalOriginal,
      totalCurrentWordCount: totalCurrent,
      totalEdited: totalCurrent - totalOriginal,
      chapters: chapterStats,
    });
  } catch (error: any) {
    console.error('[API] Error getting word count:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
