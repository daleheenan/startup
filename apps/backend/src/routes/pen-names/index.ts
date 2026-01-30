/**
 * Pen Names Routes Index
 * Aggregates all pen name-related route modules into a single router
 *
 * Route modules:
 * - crud.ts: Basic CRUD operations (GET, POST, PUT, DELETE /api/pen-names)
 * - portfolio.ts: Portfolio management (/api/pen-names/:id/books, /api/pen-names/:id/stats)
 */

import { Router } from 'express';

// Import all route modules
import crudRouter from './crud.js';
import portfolioRouter from './portfolio.js';

const router = Router();

// Mount all route modules
// CRUD routes (base routes like GET /, POST /, GET /:id, PUT /:id, DELETE /:id)
router.use('/', crudRouter);

// Portfolio routes (/api/pen-names/:id/books, /api/pen-names/:id/stats)
router.use('/', portfolioRouter);

export default router;
