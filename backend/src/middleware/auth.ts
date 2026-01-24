import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Authentication middleware
 *
 * Verifies JWT token from Authorization header.
 * If valid, allows request to proceed.
 * If invalid or missing, returns 401 Unauthorized.
 *
 * Usage:
 * app.use('/api/projects', requireAuth, projectsRouter);
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        code: 'AUTH_REQUIRED'
      });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error('[Auth] JWT_SECRET not configured');
      return res.status(500).json({
        error: 'Server configuration error',
        code: 'CONFIG_ERROR'
      });
    }

    // Verify token
    jwt.verify(token, jwtSecret);

    // Token is valid, proceed with request
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }

    console.error('[Auth] Unexpected error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
}
