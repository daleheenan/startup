/**
 * Barrel export file for library utilities
 *
 * Provides organised imports for key utilities in NovelForge
 */

// API utilities
export * from './api';
export * from './api-hooks';

// Authentication
export { login, logout, getToken, isAuthenticated, verifyToken } from './auth';

// Constants - exports colors, gradients, API_BASE_URL, borderRadius, shadows, spacing
export * from './constants';
export * from './navigation-constants';
export * from './plot-constants';

// Fetch utilities
export { fetchWithAuth, fetchJson, post, put, del } from './fetch-utils';

// Workflow and plot utilities
export * from './workflow-utils';
export * from './plot-recommendations';

// Progress tracking
export { useProgressStream } from './progress-stream';

// Theming and design - selective exports to avoid conflicts with constants.ts
export { typography, zIndex, transitions, breakpoints, a11y, components } from './design-tokens';
export * from './theme';
export * from './styles';
