import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createLogger } from '../services/logger.service.js';

const log = createLogger('AuthMiddleware');

/**
 * Error codes for authentication failures
 */
export const AuthErrorCodes = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  AUTH_ERROR: 'AUTH_ERROR',
} as const;

/**
 * JWT payload interface - extend with your user fields
 */
export interface JwtPayload {
  userId: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * Extend Express Request to include user
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * JWT authentication middleware
 *
 * Validates Bearer token in Authorization header.
 * Attaches decoded user to req.user on success.
 *
 * @example
 * ```typescript
 * // Protect all routes
 * app.use('/api/protected', requireAuth, protectedRouter);
 *
 * // Protect single route
 * router.get('/me', requireAuth, (req, res) => {
 *   res.json({ user: req.user });
 * });
 * ```
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: 'Authentication required',
      code: AuthErrorCodes.AUTH_REQUIRED,
    });
    return;
  }

  // Check Bearer format
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Invalid authorization format. Use: Bearer <token>',
      code: AuthErrorCodes.TOKEN_INVALID,
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      log.error('JWT_SECRET not configured');
      res.status(500).json({
        error: 'Server configuration error',
        code: AuthErrorCodes.AUTH_ERROR,
      });
      return;
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'Token expired',
        code: AuthErrorCodes.TOKEN_EXPIRED,
      });
    } else if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        error: 'Invalid token',
        code: AuthErrorCodes.TOKEN_INVALID,
      });
    } else {
      log.error({ error: error.message }, 'Authentication error');
      res.status(401).json({
        error: 'Authentication failed',
        code: AuthErrorCodes.AUTH_ERROR,
      });
    }
  }
}

/**
 * Optional authentication middleware
 *
 * Attempts to authenticate but doesn't fail if no token.
 * Use for routes that work differently for authenticated users.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);

  try {
    const secret = process.env.JWT_SECRET;
    if (secret) {
      const decoded = jwt.verify(token, secret) as JwtPayload;
      req.user = decoded;
    }
  } catch {
    // Ignore errors for optional auth
  }

  next();
}

/**
 * Generate a JWT token
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiresIn = '24h'): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(payload, secret, { expiresIn });
}
