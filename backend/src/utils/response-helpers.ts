import type { Response } from 'express';
import { createLogger } from '../services/logger.service.js';

const logger = createLogger('utils:response');

export interface ErrorResponse {
  code: string;
  message: string;
}

/**
 * Send standard error response
 */
export function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

/**
 * Send 400 Bad Request with validation error
 */
export function sendBadRequest(res: Response, message: string): void {
  sendError(res, 400, 'INVALID_REQUEST', message);
}

/**
 * Send 404 Not Found
 */
export function sendNotFound(res: Response, resource: string): void {
  sendError(res, 404, 'NOT_FOUND', `${resource} not found`);
}

/**
 * Send 500 Internal Server Error
 */
export function sendInternalError(res: Response, error: any, context: string): void {
  logger.error({ error, context }, 'Internal error');
  sendError(res, 500, 'INTERNAL_ERROR', error.message || `Failed to ${context}`);
}

/**
 * Send 429 Rate Limit Error
 */
export function sendRateLimitError(res: Response): void {
  sendError(res, 429, 'RATE_LIMIT_EXCEEDED', 'Claude API rate limit reached. Please try again in a few minutes.');
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: any): boolean {
  return error.message?.includes('rate limit') || error.status === 429;
}
