import { Router } from 'express';
import { plagiarismCheckerService } from '../services/plagiarism-checker.service.js';
import { sendBadRequest, sendNotFound, sendInternalError } from '../utils/response-helpers.js';

const router = Router();

/**
 * Check a saved concept for originality
 * POST /api/plagiarism/check/concept/:id
 */
router.post('/check/concept/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendBadRequest(res, 'Concept ID is required');
    }

    const result = await plagiarismCheckerService.checkConcept(id);
    res.json(result);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return sendNotFound(res, 'Concept');
    }
    sendInternalError(res, error, 'checking concept originality');
  }
});

/**
 * Check a concept summary for originality
 * POST /api/plagiarism/check/summary/:id
 */
router.post('/check/summary/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendBadRequest(res, 'Summary ID is required');
    }

    const result = await plagiarismCheckerService.checkConceptSummary(id);
    res.json(result);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return sendNotFound(res, 'Concept summary');
    }
    sendInternalError(res, error, 'checking summary originality');
  }
});

/**
 * Check a story idea for originality
 * POST /api/plagiarism/check/story-idea/:id
 */
router.post('/check/story-idea/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendBadRequest(res, 'Story idea ID is required');
    }

    const result = await plagiarismCheckerService.checkStoryIdea(id);
    res.json(result);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return sendNotFound(res, 'Story idea');
    }
    sendInternalError(res, error, 'checking story idea originality');
  }
});

/**
 * Check a chapter for originality
 * POST /api/plagiarism/check/chapter/:id
 */
router.post('/check/chapter/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendBadRequest(res, 'Chapter ID is required');
    }

    const result = await plagiarismCheckerService.checkChapter(id);
    res.json(result);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return sendNotFound(res, 'Chapter');
    }
    if (error.message?.includes('no content')) {
      return sendBadRequest(res, 'Chapter has no content to check');
    }
    sendInternalError(res, error, 'checking chapter originality');
  }
});

/**
 * Check all chapters in a book for originality
 * POST /api/plagiarism/check/book/:bookId
 * Query params: versionId (optional) - specific version to check
 */
router.post('/check/book/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { versionId } = req.query as { versionId?: string };

    if (!bookId) {
      return sendBadRequest(res, 'Book ID is required');
    }

    const result = await plagiarismCheckerService.checkBook(bookId, versionId);
    res.json(result);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return sendNotFound(res, 'Book');
    }
    sendInternalError(res, error, 'checking book originality');
  }
});

/**
 * Get originality summary for a book (from existing chapter check results)
 * GET /api/plagiarism/book/:bookId/summary
 * Query params: versionId (optional) - specific version to get summary for
 */
router.get('/book/:bookId/summary', (req, res) => {
  try {
    const { bookId } = req.params;
    const { versionId } = req.query as { versionId?: string };

    if (!bookId) {
      return sendBadRequest(res, 'Book ID is required');
    }

    const summary = plagiarismCheckerService.getBookOriginalitySummary(bookId, versionId);

    if (!summary) {
      return res.json({
        summary: null,
        message: 'No originality check results found for this book. Run a check first.',
      });
    }

    res.json({ summary });
  } catch (error: any) {
    sendInternalError(res, error, 'getting book originality summary');
  }
});

/**
 * Check raw content for originality (before saving)
 * POST /api/plagiarism/check/raw
 */
router.post('/check/raw', async (req, res) => {
  try {
    const { title, logline, synopsis, hook, protagonistHint, storyIdea, characterConcepts, plotElements, uniqueTwists } = req.body;

    if (!title && !logline && !synopsis && !storyIdea) {
      return sendBadRequest(res, 'At least one content field is required (title, logline, synopsis, or storyIdea)');
    }

    const result = await plagiarismCheckerService.checkRawContent({
      title,
      logline,
      synopsis,
      hook,
      protagonistHint,
      storyIdea,
      characterConcepts,
      plotElements,
      uniqueTwists,
    });

    res.json(result);
  } catch (error: any) {
    sendInternalError(res, error, 'checking raw content originality');
  }
});

/**
 * Batch check all saved concepts
 * POST /api/plagiarism/check/all-concepts
 */
router.post('/check/all-concepts', async (req, res) => {
  try {
    const result = await plagiarismCheckerService.checkAllConcepts();
    res.json(result);
  } catch (error: any) {
    sendInternalError(res, error, 'batch checking concepts');
  }
});

/**
 * Get check results for specific content
 * GET /api/plagiarism/results/:contentId
 */
router.get('/results/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;

    if (!contentId) {
      return sendBadRequest(res, 'Content ID is required');
    }

    const results = await plagiarismCheckerService.getCheckResults(contentId);
    res.json({ results });
  } catch (error: any) {
    sendInternalError(res, error, 'fetching check results');
  }
});

/**
 * Get the latest check result for specific content
 * GET /api/plagiarism/results/:contentId/latest
 */
router.get('/results/:contentId/latest', async (req, res) => {
  try {
    const { contentId } = req.params;

    if (!contentId) {
      return sendBadRequest(res, 'Content ID is required');
    }

    const result = await plagiarismCheckerService.getLatestCheckResult(contentId);

    if (!result) {
      return res.json({ result: null, message: 'No check results found for this content' });
    }

    res.json({ result });
  } catch (error: any) {
    sendInternalError(res, error, 'fetching latest check result');
  }
});

export default router;
