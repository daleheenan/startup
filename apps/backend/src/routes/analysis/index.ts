/**
 * Analysis Routes Module - Router Composition
 *
 * Unified analysis endpoints that integrate all manuscript analysis capabilities:
 * - Prose quality analysis
 * - Bestseller formula validation
 * - Genre convention validation
 * - Publishing readiness assessment
 */

import { Router } from 'express';
import unifiedRouter from './unified.js';

const router = Router();

// Mount sub-routers
router.use('/', unifiedRouter);

export default router;
