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

export default router;
