/**
 * Images Routes Index
 * Sprint 24: Visual Enhancements
 *
 * Aggregates all image-related route modules into a single router
 *
 * Route modules:
 * - crud.ts: Basic CRUD operations (GET, DELETE /api/images)
 * - generate.ts: Image generation endpoints (POST /api/images/character, location, cover, scene)
 * - serve.ts: Image serving (GET /api/images/file/:path)
 */

import { Router } from 'express';

// Import all route modules
import crudRouter from './crud.js';
import generateRouter from './generate.js';
import serveRouter from './serve.js';

const router = Router();

// Mount all route modules
router.use('/', crudRouter);
router.use('/', generateRouter);
router.use('/', serveRouter);

export default router;
