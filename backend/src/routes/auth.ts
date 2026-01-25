import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createLogger } from '../services/logger.service.js';

const router = express.Router();
const logger = createLogger('routes:auth');

/**
 * POST /api/auth/login
 *
 * Authenticates the owner with a password and returns a JWT token.
 *
 * Request body:
 * {
 *   "password": "string"
 * }
 *
 * Response:
 * {
 *   "token": "jwt-token-string"
 * }
 */
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Password is required'
      });
    }

    const passwordHash = process.env.OWNER_PASSWORD_HASH;
    const jwtSecret = process.env.JWT_SECRET;

    if (!passwordHash || !jwtSecret) {
      logger.error('Missing environment variables: OWNER_PASSWORD_HASH or JWT_SECRET');
      return res.status(500).json({
        error: 'Server configuration error'
      });
    }

    // Validate password
    const valid = await bcrypt.compare(password, passwordHash);

    if (!valid) {
      logger.warn('Invalid login attempt');
      return res.status(401).json({
        error: 'Invalid password'
      });
    }

    // Generate JWT token (7-day expiration)
    const token = jwt.sign(
      { user: 'owner', type: 'auth' },
      jwtSecret,
      { expiresIn: '7d' }
    );

    logger.info('Successful login');
    res.json({ token });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error }, 'Login error');
    res.status(500).json({
      error: 'Authentication failed'
    });
  }
});

/**
 * GET /api/auth/verify
 *
 * Verifies if the provided JWT token is valid.
 * Requires Authorization header with Bearer token.
 *
 * Response:
 * {
 *   "valid": true,
 *   "user": "owner"
 * }
 */
router.get('/verify', (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        valid: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return res.status(500).json({
        valid: false,
        error: 'Server configuration error'
      });
    }

    const decoded = jwt.verify(token, jwtSecret) as { user: string };

    res.json({
      valid: true,
      user: decoded.user
    });
  } catch (error) {
    res.status(401).json({
      valid: false,
      error: 'Invalid token'
    });
  }
});

export default router;
