/**
 * Book data constants for Books Dashboard
 * Publication statuses, platforms, and related configuration
 */

export * from './platforms';
export * from './publication-statuses';

// Legacy exports for backwards compatibility
// TODO: Remove these once all components are updated to use the new interfaces
export { PUBLICATION_STATUSES as PUBLICATION_STATUSES_LEGACY } from './publication-statuses';
export { PUBLISHING_PLATFORMS as PUBLISHING_PLATFORMS_LEGACY } from './platforms';

/**
 * Helper to get status colour token from publication status value
 * @deprecated Use getStatusByValue from publication-statuses.ts instead
 */
export function getStatusColor(status: string): string {
  const { getStatusByValue } = require('./publication-statuses');
  const found = getStatusByValue(status);
  return found?.color || '#3B82F6';
}

/**
 * Helper to get status label from status value
 * @deprecated Use getStatusByValue from publication-statuses.ts instead
 */
export function getStatusLabel(status: string): string {
  const { getStatusByValue } = require('./publication-statuses');
  const found = getStatusByValue(status);
  return found?.label || status;
}
