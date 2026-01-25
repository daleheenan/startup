import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Import the middleware
import { requireAuth } from '../auth.js';

describe('requireAuth middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jwtSecret: string;

  beforeEach(() => {
    // Set up JWT secret
    jwtSecret = 'test-secret-key-for-testing-only';
    process.env.JWT_SECRET = jwtSecret;

    // Create mock request and response objects
    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
    };

    mockNext = jest.fn() as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Validation', () => {
    it('should accept valid token and call next()', () => {
      // Create a valid token
      const token = jwt.sign({ userId: 'test-user-123' }, jwtSecret, {
        expiresIn: '1h',
      });

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should accept token with different payload structure', () => {
      const token = jwt.sign(
        {
          userId: 'user-456',
          email: 'test@example.com',
          role: 'admin',
        },
        jwtSecret,
        { expiresIn: '2h' }
      );

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('Missing Token Handling', () => {
    it('should reject requests without Authorization header', () => {
      mockRequest.headers = {};

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'No token provided',
        code: 'AUTH_REQUIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests with empty Authorization header', () => {
      mockRequest.headers = {
        authorization: '',
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'No token provided',
        code: 'AUTH_REQUIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests without "Bearer " prefix', () => {
      const token = jwt.sign({ userId: 'test-user' }, jwtSecret);

      mockRequest.headers = {
        authorization: token, // Missing "Bearer " prefix
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'No token provided',
        code: 'AUTH_REQUIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests with wrong auth scheme', () => {
      mockRequest.headers = {
        authorization: 'Basic dXNlcjpwYXNz', // Basic auth instead of Bearer
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'No token provided',
        code: 'AUTH_REQUIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Expired Token Rejection', () => {
    it('should reject expired tokens', () => {
      // Create a token that's already expired
      const expiredToken = jwt.sign(
        { userId: 'test-user-123' },
        jwtSecret,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject tokens expired just 1 second ago', () => {
      const expiredToken = jwt.sign(
        { userId: 'test-user' },
        jwtSecret,
        { expiresIn: '-1s' }
      );

      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Invalid Token Rejection', () => {
    it('should reject tokens with invalid signature', () => {
      // Create token with different secret
      const invalidToken = jwt.sign(
        { userId: 'test-user' },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );

      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`,
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'TOKEN_INVALID',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject malformed tokens', () => {
      mockRequest.headers = {
        authorization: 'Bearer not-a-valid-jwt-token',
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'TOKEN_INVALID',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject tokens with invalid structure', () => {
      mockRequest.headers = {
        authorization: 'Bearer abc.def.ghi', // Looks like JWT but isn't valid
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'TOKEN_INVALID',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject empty token after Bearer', () => {
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'TOKEN_INVALID',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Error Handling', () => {
    it('should return 500 if JWT_SECRET is not configured', () => {
      delete process.env.JWT_SECRET;

      const token = jwt.sign({ userId: 'test-user' }, 'any-secret');
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Server configuration error',
        code: 'CONFIG_ERROR',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 if JWT_SECRET is empty string', () => {
      process.env.JWT_SECRET = '';

      const token = jwt.sign({ userId: 'test-user' }, 'any-secret');
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Server configuration error',
        code: 'CONFIG_ERROR',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle tokens with extra whitespace in Bearer prefix', () => {
      const token = jwt.sign({ userId: 'test-user' }, jwtSecret, {
        expiresIn: '1h',
      });

      mockRequest.headers = {
        authorization: `Bearer  ${token}`, // Extra space
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Should fail because of extra space
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle lowercase bearer prefix', () => {
      const token = jwt.sign({ userId: 'test-user' }, jwtSecret);

      mockRequest.headers = {
        authorization: `bearer ${token}`, // lowercase
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Should fail - expects "Bearer" with capital B
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle very long valid tokens', () => {
      const token = jwt.sign(
        {
          userId: 'test-user',
          metadata: 'x'.repeat(1000), // Large payload
        },
        jwtSecret,
        { expiresIn: '1h' }
      );

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle tokens with special characters in payload', () => {
      const token = jwt.sign(
        {
          userId: 'test-user',
          email: 'test+special@example.com',
          name: "O'Brien",
        },
        jwtSecret,
        { expiresIn: '1h' }
      );

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('Coverage: Error Branches', () => {
    it('should handle unexpected errors gracefully', () => {
      // Mock jwt.verify to throw an unexpected error
      const originalVerify = jwt.verify;
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const token = jwt.sign({ userId: 'test-user' }, jwtSecret);
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        code: 'AUTH_ERROR',
      });
      expect(mockNext).not.toHaveBeenCalled();

      // Restore original function
      (jwt.verify as any) = originalVerify;
    });
  });
});
