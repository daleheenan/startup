import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../services/logger.service.js';

const logger = createLogger('middleware:validate-uuid');

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that specified route parameters are valid UUIDs.
 *
 * Returns 400 Bad Request if any parameter fails UUID validation.
 *
 * @param paramNames - Array of parameter names to validate (e.g., ['id', 'projectId'])
 * @returns Express middleware function
 *
 * @example
 * // Validate single parameter
 * router.get('/:id', validateUuidParams(['id']), handler);
 *
 * // Validate multiple parameters
 * router.get('/:projectId/books/:bookId', validateUuidParams(['projectId', 'bookId']), handler);
 */
export function validateUuidParams(paramNames: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: string[] = [];

      for (const paramName of paramNames) {
        const value = req.params[paramName];

        if (!value) {
          errors.push(`Missing required parameter: ${paramName}`);
          continue;
        }

        if (!UUID_REGEX.test(value)) {
          errors.push(`Invalid UUID format for ${paramName}: ${value}`);
        }
      }

      if (errors.length > 0) {
        logger.warn({ errors, params: req.params, path: req.path }, 'UUID validation failed');
        res.status(400).json({
          error: 'Invalid request parameters',
          code: 'INVALID_UUID',
          details: errors,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : error }, 'UUID validation middleware error');
      res.status(500).json({
        error: 'Request validation error',
        code: 'VALIDATION_ERROR',
      });
    }
  };
}

/**
 * Validates a single string is a valid UUID.
 * Useful for validating IDs from request body or query params.
 *
 * @param value - String to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}
