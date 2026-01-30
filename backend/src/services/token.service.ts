/**
 * Token Management Service
 * Sprint 16: Security Enhancements
 *
 * Handles all token operations:
 * - Refresh tokens (7-day, database-stored, rotated on use)
 * - CSRF tokens (1-hour, database-validated)
 * - SSE tokens (30-second, single-use)
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';

const logger = createLogger('services:token');

const BCRYPT_ROUNDS = 10;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const CSRF_TOKEN_EXPIRY_HOURS = 1;
const SSE_TOKEN_EXPIRY_SECONDS = 30;

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate ISO 8601 timestamp for future date
 */
function getFutureTimestamp(seconds: number): string {
  const date = new Date();
  date.setTime(date.getTime() + seconds * 1000);
  return date.toISOString();
}

/**
 * Check if timestamp is in the past (expired)
 */
function isExpired(timestamp: string): boolean {
  return new Date(timestamp) < new Date();
}

// ============================================================================
// REFRESH TOKEN MANAGEMENT
// ============================================================================

export interface RefreshTokenData {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  lastUsedAt: string;
  revoked: number;
  revokedAt: string | null;
  userAgent: string | null;
  ipAddress: string | null;
}

/**
 * Create a new refresh token
 *
 * @param userId - User identifier (e.g., 'owner')
 * @param userAgent - Optional browser/client identifier
 * @param ipAddress - Optional request IP address
 * @returns The unhashed refresh token (send to client)
 */
export async function createRefreshToken(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const token = generateSecureToken();
  const tokenHash = await bcrypt.hash(token, BCRYPT_ROUNDS);
  const id = crypto.randomUUID();
  const expiresAt = getFutureTimestamp(REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60);

  db.prepare(
    `INSERT INTO refresh_tokens
     (id, user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, userId, tokenHash, expiresAt, userAgent || null, ipAddress || null);

  logger.info({ userId, id, expiresAt }, 'Created refresh token');

  // Clean up expired tokens (async, non-blocking)
  setImmediate(() => cleanupExpiredTokens());

  return token;
}

/**
 * Validate a refresh token
 *
 * @param token - The unhashed refresh token from client
 * @returns Object with valid flag and userId if valid
 */
export async function validateRefreshToken(
  token: string
): Promise<{ valid: boolean; userId?: string; tokenId?: string }> {
  // Get all non-revoked, non-expired tokens
  const tokens = db
    .prepare<unknown[], RefreshTokenData>(
      `SELECT * FROM refresh_tokens
       WHERE revoked = 0 AND expires_at > datetime('now')`
    )
    .all();

  // Check each token hash (constant-time to prevent timing attacks)
  for (const row of tokens) {
    try {
      const matches = await bcrypt.compare(token, row.tokenHash);

      if (matches) {
        // Update last_used_at
        db.prepare('UPDATE refresh_tokens SET last_used_at = datetime(\'now\') WHERE id = ?').run(
          row.id
        );

        logger.info({ userId: row.userId, tokenId: row.id }, 'Validated refresh token');

        return { valid: true, userId: row.userId, tokenId: row.id };
      }
    } catch (error) {
      logger.error({ error, tokenId: row.id }, 'Error comparing token hash');
    }
  }

  logger.warn('Invalid refresh token attempt');
  return { valid: false };
}

/**
 * Rotate a refresh token (invalidate old, create new)
 *
 * @param oldToken - The current refresh token
 * @param userAgent - Optional browser/client identifier
 * @param ipAddress - Optional request IP address
 * @returns New refresh token, or null if old token invalid
 */
export async function rotateRefreshToken(
  oldToken: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string | null> {
  const validation = await validateRefreshToken(oldToken);

  if (!validation.valid || !validation.userId || !validation.tokenId) {
    logger.warn('Cannot rotate invalid refresh token');
    return null;
  }

  // Revoke old token
  db.prepare(
    `UPDATE refresh_tokens
     SET revoked = 1, revoked_at = datetime('now')
     WHERE id = ?`
  ).run(validation.tokenId);

  logger.info({ oldTokenId: validation.tokenId, userId: validation.userId }, 'Revoked old refresh token');

  // Create new token
  const newToken = await createRefreshToken(validation.userId, userAgent, ipAddress);

  return newToken;
}

/**
 * Revoke a specific refresh token
 *
 * @param token - The refresh token to revoke
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  const validation = await validateRefreshToken(token);

  if (!validation.valid || !validation.tokenId) {
    logger.warn('Attempted to revoke invalid token');
    return;
  }

  db.prepare(
    `UPDATE refresh_tokens
     SET revoked = 1, revoked_at = datetime('now')
     WHERE id = ?`
  ).run(validation.tokenId);

  logger.info({ tokenId: validation.tokenId, userId: validation.userId }, 'Revoked refresh token');
}

/**
 * Revoke all refresh tokens for a user
 *
 * @param userId - User identifier
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  const result = db
    .prepare(
      `UPDATE refresh_tokens
       SET revoked = 1, revoked_at = datetime('now')
       WHERE user_id = ? AND revoked = 0`
    )
    .run(userId);

  logger.info({ userId, count: result.changes }, 'Revoked all user tokens');
}

/**
 * Clean up expired and revoked tokens
 * Called automatically during token operations
 */
export async function cleanupExpiredTokens(): Promise<void> {
  const refreshResult = db
    .prepare(
      `DELETE FROM refresh_tokens
       WHERE expires_at < datetime('now') OR revoked = 1`
    )
    .run();

  const csrfResult = db
    .prepare(
      `DELETE FROM csrf_tokens
       WHERE expires_at < datetime('now')`
    )
    .run();

  const sseResult = db
    .prepare(
      `DELETE FROM sse_tokens
       WHERE expires_at < datetime('now') OR used = 1`
    )
    .run();

  if (refreshResult.changes > 0 || csrfResult.changes > 0 || sseResult.changes > 0) {
    logger.info(
      {
        refreshTokens: refreshResult.changes,
        csrfTokens: csrfResult.changes,
        sseTokens: sseResult.changes,
      },
      'Cleaned up expired tokens'
    );
  }
}

// ============================================================================
// CSRF TOKEN MANAGEMENT
// ============================================================================

export interface CsrfTokenData {
  token: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * Create a new CSRF token
 *
 * @returns CSRF token (send to client in response header)
 */
export async function createCsrfToken(): Promise<string> {
  const token = generateSecureToken();
  const expiresAt = getFutureTimestamp(CSRF_TOKEN_EXPIRY_HOURS * 60 * 60);

  db.prepare(
    `INSERT INTO csrf_tokens (token, expires_at)
     VALUES (?, ?)`
  ).run(token, expiresAt);

  logger.debug({ token: token.substring(0, 8) + '...', expiresAt }, 'Created CSRF token');

  return token;
}

/**
 * Validate a CSRF token
 *
 * @param token - CSRF token from request header
 * @returns True if valid and not expired
 */
export async function validateCsrfToken(token: string): Promise<boolean> {
  const row = db
    .prepare<string, CsrfTokenData>(
      `SELECT * FROM csrf_tokens
       WHERE token = ? AND expires_at > datetime('now')`
    )
    .get(token);

  const valid = !!row;

  if (valid) {
    logger.debug({ token: token.substring(0, 8) + '...' }, 'Validated CSRF token');
  } else {
    logger.warn({ token: token.substring(0, 8) + '...' }, 'Invalid or expired CSRF token');
  }

  return valid;
}

// ============================================================================
// SSE TOKEN MANAGEMENT
// ============================================================================

export interface SseTokenData {
  token: string;
  userId: string;
  used: number;
  expiresAt: string;
  createdAt: string;
}

/**
 * Create a single-use SSE authentication token
 *
 * @param userId - User identifier
 * @returns SSE token (send to client, use once in SSE connection)
 */
export async function createSseToken(userId: string): Promise<string> {
  const token = generateSecureToken();
  const expiresAt = getFutureTimestamp(SSE_TOKEN_EXPIRY_SECONDS);

  db.prepare(
    `INSERT INTO sse_tokens (token, user_id, expires_at)
     VALUES (?, ?, ?)`
  ).run(token, userId, expiresAt);

  logger.info({ userId, token: token.substring(0, 8) + '...', expiresAt }, 'Created SSE token');

  return token;
}

/**
 * Validate and consume an SSE token (single-use)
 *
 * @param token - SSE token from query string
 * @returns Object with valid flag and userId if valid
 */
export async function validateSseToken(
  token: string
): Promise<{ valid: boolean; userId?: string }> {
  const row = db
    .prepare<string, SseTokenData>(
      `SELECT * FROM sse_tokens
       WHERE token = ? AND used = 0 AND expires_at > datetime('now')`
    )
    .get(token);

  if (!row) {
    logger.warn({ token: token.substring(0, 8) + '...' }, 'Invalid or expired SSE token');
    return { valid: false };
  }

  // Mark token as used (single-use enforcement)
  db.prepare('UPDATE sse_tokens SET used = 1 WHERE token = ?').run(token);

  logger.info({ userId: row.userId, token: token.substring(0, 8) + '...' }, 'Validated and consumed SSE token');

  return { valid: true, userId: row.userId };
}

// ============================================================================
// PERIODIC CLEANUP (Optional: Call from cron or scheduled task)
// ============================================================================

/**
 * Run periodic cleanup of all expired tokens
 * Call this from a scheduled task if needed
 */
export async function periodicCleanup(): Promise<void> {
  logger.info('Running periodic token cleanup');
  await cleanupExpiredTokens();
}
