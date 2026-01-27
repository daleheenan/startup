import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Response } from 'express';
import {
  sendError,
  sendBadRequest,
  sendNotFound,
  sendInternalError,
  sendRateLimitError,
  isRateLimitError,
} from '../response-helpers.js';

// Mock the logger service
jest.mock('../../services/logger.service.js', () => ({
  createLogger: () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('response-helpers', () => {
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock as any,
    };
  });

  describe('sendError', () => {
    it('should send error response with correct status and structure', () => {
      // Arrange
      const status = 400;
      const code = 'TEST_ERROR';
      const message = 'Test error message';

      // Act
      sendError(mockResponse as Response, status, code, message);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message',
        },
      });
    });

    it('should handle different status codes', () => {
      // Arrange & Act
      sendError(mockResponse as Response, 500, 'SERVER_ERROR', 'Internal error');

      // Assert
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal error',
        },
      });
    });
  });

  describe('sendBadRequest', () => {
    it('should send 400 status with INVALID_REQUEST code', () => {
      // Arrange
      const message = 'Missing required field';

      // Act
      sendBadRequest(mockResponse as Response, message);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field',
        },
      });
    });

    it('should handle validation error messages', () => {
      // Arrange
      const message = 'Email format is invalid';

      // Act
      sendBadRequest(mockResponse as Response, message);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Email format is invalid',
        },
      });
    });
  });

  describe('sendNotFound', () => {
    it('should send 404 status with NOT_FOUND code', () => {
      // Arrange
      const resource = 'User';

      // Act
      sendNotFound(mockResponse as Response, resource);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    });

    it('should format message with resource name', () => {
      // Arrange
      const resource = 'Project';

      // Act
      sendNotFound(mockResponse as Response, resource);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: 'Project not found',
        },
      });
    });
  });

  describe('sendInternalError', () => {
    it('should send 500 status with error message from Error instance', () => {
      // Arrange
      const error = new Error('Database connection failed');
      const context = 'fetch user data';

      // Act
      sendInternalError(mockResponse as Response, error, context);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database connection failed',
        },
      });
    });

    it('should handle unknown error type', () => {
      // Arrange
      const error = 'String error';
      const context = 'process data';

      // Act
      sendInternalError(mockResponse as Response, error, context);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unknown error',
        },
      });
    });

    it('should use context when error message is empty', () => {
      // Arrange
      const error = new Error('');
      const context = 'validate input';

      // Act
      sendInternalError(mockResponse as Response, error, context);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate input',
        },
      });
    });

    it('should handle null error', () => {
      // Arrange
      const error = null;
      const context = 'save data';

      // Act
      sendInternalError(mockResponse as Response, error, context);

      // Assert
      // Note: null error returns 'Unknown error' not the fallback context message
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unknown error',
        },
      });
    });
  });

  describe('sendRateLimitError', () => {
    it('should send 429 status with RATE_LIMIT_EXCEEDED code', () => {
      // Arrange & Act
      sendRateLimitError(mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Claude API rate limit reached. Please try again in a few minutes.',
        },
      });
    });
  });

  describe('isRateLimitError', () => {
    it('should return true for Error with rate limit in message', () => {
      // Arrange
      const error = new Error('API rate limit exceeded');

      // Act
      const result = isRateLimitError(error);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for object with status 429', () => {
      // Arrange
      const error = { status: 429, message: 'Too many requests' };

      // Act
      const result = isRateLimitError(error);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for Error without rate limit in message', () => {
      // Arrange
      const error = new Error('Database connection failed');

      // Act
      const result = isRateLimitError(error);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for object with different status code', () => {
      // Arrange
      const error = { status: 500, message: 'Internal error' };

      // Act
      const result = isRateLimitError(error);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for string error', () => {
      // Arrange
      const error = 'Something went wrong';

      // Act
      const result = isRateLimitError(error);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      // Arrange & Act
      const result = isRateLimitError(null);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      // Arrange & Act
      const result = isRateLimitError(undefined);

      // Assert
      expect(result).toBe(false);
    });

    it('should be case-sensitive for rate limit check', () => {
      // Arrange
      const errorLower = new Error('rate limit exceeded');
      const errorMixed = new Error('Rate Limit Exceeded');

      // Act & Assert
      expect(isRateLimitError(errorLower)).toBe(true);
      // Note: Implementation is case-sensitive, so 'Rate Limit' won't match 'rate limit'
      expect(isRateLimitError(errorMixed)).toBe(false);
    });

    it('should return false for object without status property', () => {
      // Arrange
      const error = { message: 'Error occurred' };

      // Act
      const result = isRateLimitError(error);

      // Assert
      expect(result).toBe(false);
    });
  });
});
