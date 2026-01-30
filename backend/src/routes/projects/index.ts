/**
 * Project Routes Index
 * Aggregates all project-related route modules into a single router
 *
 * Route modules:
 * - crud.ts: Basic CRUD operations (GET, POST, PUT, DELETE /api/projects)
 * - progress.ts: Progress tracking (/api/projects/:id/progress)
 * - characters.ts: Character management (/api/projects/:id/characters)
 * - world.ts: World building elements (/api/projects/:id/world)
 * - plot.ts: Plot structure and coherence (/api/projects/:id/plot-structure, coherence-check, etc.)
 * - editorial.ts: Editorial assistant (/api/projects/:id/editorial-assistant, refine-story)
 * - metrics.ts: Project metrics (/api/projects/:id/metrics)
 * - story-dna.ts: Story DNA generation (/api/projects/:id/story-dna)
 * - search-replace.ts: Global search/replace (/api/projects/:id/search-replace)
 */

import { Router } from 'express';

// Import all route modules
import crudRouter from './crud.js';
import progressRouter from './progress.js';
import charactersRouter from './characters.js';
import worldRouter from './world.js';
import plotRouter from './plot.js';
import editorialRouter from './editorial.js';
import metricsRouter from './metrics.js';
import storyDnaRouter from './story-dna.js';
import searchReplaceRouter from './search-replace.js';
import romanceRouter from './romance.js';
import thrillerRouter from './thriller.js';
import scifiRouter from './scifi.js';

const router = Router();

// Mount all route modules
// CRUD routes (base routes like GET /, POST /, GET /:id, PUT /:id, DELETE /:id)
router.use('/', crudRouter);

// Progress routes (/api/projects/:id/progress)
router.use('/', progressRouter);

// Character routes (/api/projects/:id/characters)
router.use('/', charactersRouter);

// World building routes (/api/projects/:id/world)
router.use('/', worldRouter);

// Plot structure routes (/api/projects/:id/plot-structure, coherence-check, etc.)
router.use('/', plotRouter);

// Editorial routes (/api/projects/:id/editorial-assistant, refine-story)
router.use('/', editorialRouter);

// Metrics routes (/api/projects/:id/metrics)
router.use('/', metricsRouter);

// Story DNA routes (/api/projects/:id/story-dna)
router.use('/', storyDnaRouter);

// Search/Replace routes (/api/projects/:id/search-replace)
router.use('/', searchReplaceRouter);

// Commercial genre routes (Romance, Thriller, Sci-Fi)
router.use('/', romanceRouter);
router.use('/', thrillerRouter);
router.use('/', scifiRouter);

export default router;
