import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Create mock functions at module scope with proper typing
const mockCompare = jest.fn<() => Promise<boolean>>();
const mockSign = jest.fn<() => string>();
const mockVerify = jest.fn<() => any>();

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: mockCompare,
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: mockSign,
  verify: mockVerify,
}));

// Mock logger to prevent console output
jest.mock('../../services/logger.service.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Import after mocks are set up
import authRouter from '../auth.js';

describe('Auth Router', () => {
  let app: express.Application;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset all mocks
    mockCompare.mockReset();
    mockSign.mockReset();
    mockVerify.mockReset();

    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.OWNER_PASSWORD_HASH = '$2b$10$testhashedpassword';

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('POST /api/auth/login', () => {
    describe('Successful login', () => {
      it('should return 200 with token when password is valid', async () => {
        mockCompare.mockResolvedValue(true);
        mockSign.mockReturnValue('mock-jwt-token');

        const response = await request(app)
          .post('/api/auth/login')
          .send({ password: 'correctpassword' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token', 'mock-jwt-token');
        expect(mockCompare).toHaveBeenCalledWith('correctpassword', '$2b$10$testhashedpassword');
        expect(mockSign).toHaveBeenCalledWith(
          { user: 'owner', type: 'auth' },
          'test-secret-key',
          { expiresIn: '7d' }
        );
      });

      it('should call bcrypt.compare with correct arguments', async () => {
        mockCompare.mockResolvedValue(true);
        mockSign.mockReturnValue('token');

        await request(app)
          .post('/api/auth/login')
          .send({ password: 'mypassword' });

        expect(mockCompare).toHaveBeenCalledTimes(1);
        expect(mockCompare).toHaveBeenCalledWith('mypassword', '$2b$10$testhashedpassword');
      });

      it('should generate JWT with 7-day expiration', async () => {
        mockCompare.mockResolvedValue(true);
        mockSign.mockReturnValue('token');

        await request(app)
          .post('/api/auth/login')
          .send({ password: 'test' });

        expect(mockSign).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(String),
          { expiresIn: '7d' }
        );
      });
    });

    describe('Invalid credentials', () => {
      it('should return 401 when password is incorrect', async () => {
        mockCompare.mockResolvedValue(false);

        const response = await request(app)
          .post('/api/auth/login')
          .send({ password: 'wrongpassword' });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Invalid password');
        expect(mockSign).not.toHaveBeenCalled();
      });

      it('should not generate token when password is invalid', async () => {
        mockCompare.mockResolvedValue(false);

        await request(app)
          .post('/api/auth/login')
          .send({ password: 'wrong' });

        expect(mockSign).not.toHaveBeenCalled();
      });
    });

    describe('Input validation', () => {
      it('should return 400 when password is missing', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(mockCompare).not.toHaveBeenCalled();
      });

      it('should return 400 when password is empty string', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ password: '' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(mockCompare).not.toHaveBeenCalled();
      });

      it('should return 400 when request body is not JSON', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send('not json');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });

      it('should accept valid password string', async () => {
        mockCompare.mockResolvedValue(true);
        mockSign.mockReturnValue('token');

        const response = await request(app)
          .post('/api/auth/login')
          .send({ password: 'valid-password-123' });

        expect(response.status).toBe(200);
        expect(mockCompare).toHaveBeenCalledWith('valid-password-123', expect.any(String));
      });
    });

    describe('Environment configuration errors', () => {
      it('should return 500 when OWNER_PASSWORD_HASH is missing', async () => {
        delete process.env.OWNER_PASSWORD_HASH;

        const response = await request(app)
          .post('/api/auth/login')
          .send({ password: 'test' });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Server configuration error');
        expect(mockCompare).not.toHaveBeenCalled();
      });

      it('should return 500 when JWT_SECRET is missing', async () => {
        delete process.env.JWT_SECRET;

        const response = await request(app)
          .post('/api/auth/login')
          .send({ password: 'test' });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Server configuration error');
        expect(mockCompare).not.toHaveBeenCalled();
      });

      it('should return 500 when both environment variables are missing', async () => {
        delete process.env.OWNER_PASSWORD_HASH;
        delete process.env.JWT_SECRET;

        const response = await request(app)
          .post('/api/auth/login')
          .send({ password: 'test' });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Server configuration error');
      });
    });

    describe('Error handling', () => {
      it('should return 500 when bcrypt.compare throws error', async () => {
        mockCompare.mockRejectedValue(new Error('Bcrypt error'));

        const response = await request(app)
          .post('/api/auth/login')
          .send({ password: 'test' });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Authentication failed');
      });

      it('should return 500 when jwt.sign throws error', async () => {
        mockCompare.mockResolvedValue(true);
        mockSign.mockImplementation(() => {
          throw new Error('JWT signing error');
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({ password: 'test' });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Authentication failed');
      });

      it('should handle non-Error exceptions', async () => {
        mockCompare.mockRejectedValue('String error');

        const response = await request(app)
          .post('/api/auth/login')
          .send({ password: 'test' });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Authentication failed');
      });
    });
  });

  describe('GET /api/auth/verify', () => {
    describe('Successful token verification', () => {
      it('should return valid=true when token is valid', async () => {
        mockVerify.mockReturnValue({ user: 'owner', type: 'auth' });

        const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', 'Bearer valid-token');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('valid', true);
        expect(response.body).toHaveProperty('user', 'owner');
        expect(mockVerify).toHaveBeenCalledWith('valid-token', 'test-secret-key');
      });

      it('should extract token from Authorization header correctly', async () => {
        mockVerify.mockReturnValue({ user: 'owner' });

        await request(app)
          .get('/api/auth/verify')
          .set('Authorization', 'Bearer my-test-token');

        expect(mockVerify).toHaveBeenCalledWith('my-test-token', expect.any(String));
      });

      it('should call jwt.verify with correct secret', async () => {
        mockVerify.mockReturnValue({ user: 'owner' });

        await request(app)
          .get('/api/auth/verify')
          .set('Authorization', 'Bearer token');

        expect(mockVerify).toHaveBeenCalledWith(expect.any(String), 'test-secret-key');
      });
    });

    describe('Invalid token scenarios', () => {
      it('should return 401 when Authorization header is missing', async () => {
        const response = await request(app)
          .get('/api/auth/verify');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('valid', false);
        expect(response.body).toHaveProperty('error', 'No token provided');
        expect(mockVerify).not.toHaveBeenCalled();
      });

      it('should return 401 when Authorization header does not start with Bearer', async () => {
        const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', 'Basic token123');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('valid', false);
        expect(response.body).toHaveProperty('error', 'No token provided');
        expect(mockVerify).not.toHaveBeenCalled();
      });

      it('should return 401 when Authorization header is malformed', async () => {
        const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', 'Bearertoken');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('valid', false);
        expect(response.body).toHaveProperty('error', 'No token provided');
      });

      it('should return 401 when jwt.verify throws error', async () => {
        mockVerify.mockImplementation(() => {
          throw new Error('Token expired');
        });

        const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', 'Bearer expired-token');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('valid', false);
        expect(response.body).toHaveProperty('error', 'Invalid token');
      });

      it('should return 401 when token signature is invalid', async () => {
        mockVerify.mockImplementation(() => {
          throw new Error('Invalid signature');
        });

        const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', 'Bearer invalid-signature');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('valid', false);
        expect(response.body).toHaveProperty('error', 'Invalid token');
      });
    });

    describe('Environment configuration errors', () => {
      it('should return 500 when JWT_SECRET is missing', async () => {
        delete process.env.JWT_SECRET;

        const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', 'Bearer token');

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('valid', false);
        expect(response.body).toHaveProperty('error', 'Server configuration error');
        expect(mockVerify).not.toHaveBeenCalled();
      });

      it('should not attempt verification when JWT_SECRET is missing', async () => {
        delete process.env.JWT_SECRET;

        await request(app)
          .get('/api/auth/verify')
          .set('Authorization', 'Bearer token');

        expect(mockVerify).not.toHaveBeenCalled();
      });
    });

    describe('Token format variations', () => {
      it('should handle token with spaces after Bearer', async () => {
        mockVerify.mockReturnValue({ user: 'owner' });

        const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', 'Bearer  token-with-spaces');

        // The substring(7) should capture " token-with-spaces" (with leading space)
        expect(response.status).toBe(200);
      });

      it('should handle empty token after Bearer', async () => {
        mockVerify.mockImplementation(() => {
          throw new Error('jwt malformed');
        });

        const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', 'Bearer ');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('valid', false);
      });

      it('should handle very long tokens', async () => {
        const longToken = 'a'.repeat(1000);
        mockVerify.mockReturnValue({ user: 'owner' });

        const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', `Bearer ${longToken}`);

        expect(response.status).toBe(200);
        expect(mockVerify).toHaveBeenCalledWith(longToken, expect.any(String));
      });
    });

    describe('Response structure', () => {
      it('should return user field from decoded token', async () => {
        mockVerify.mockReturnValue({ user: 'owner', type: 'auth', iat: 123, exp: 456 });

        const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', 'Bearer token');

        expect(response.body.user).toBe('owner');
      });

      it('should only include valid and user fields on success', async () => {
        mockVerify.mockReturnValue({ user: 'owner' });

        const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', 'Bearer token');

        expect(Object.keys(response.body).sort()).toEqual(['user', 'valid']);
      });

      it('should include valid and error fields on failure', async () => {
        const response = await request(app)
          .get('/api/auth/verify');

        expect(Object.keys(response.body).sort()).toEqual(['error', 'valid']);
      });
    });
  });

  describe('Security considerations', () => {
    it('should not leak password hash in error messages', async () => {
      mockCompare.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'test' });

      expect(response.body.error).not.toContain('$2b$10$');
      expect(response.body.error).toBe('Authentication failed');
    });

    it('should not leak JWT_SECRET in error messages', async () => {
      delete process.env.JWT_SECRET;

      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'test' });

      expect(JSON.stringify(response.body)).not.toContain('test-secret-key');
    });

    it('should use constant-time comparison for passwords', async () => {
      mockCompare.mockResolvedValue(false);

      await request(app)
        .post('/api/auth/login')
        .send({ password: 'test' });

      // bcrypt.compare is inherently constant-time, just verify it's being used
      expect(mockCompare).toHaveBeenCalled();
    });

    it('should not differentiate between invalid password and missing user', async () => {
      mockCompare.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'test' });

      // Should return same error regardless of reason
      expect(response.body.error).toBe('Invalid password');
      expect(response.status).toBe(401);
    });
  });

  describe('Integration scenarios', () => {
    it('should allow login and then verify with the same token', async () => {
      const testToken = 'integrated-test-token';
      mockCompare.mockResolvedValue(true);
      mockSign.mockReturnValue(testToken);
      mockVerify.mockReturnValue({ user: 'owner', type: 'auth' });

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ password: 'correctpassword' });

      expect(loginResponse.status).toBe(200);
      const { token } = loginResponse.body;

      // Verify
      const verifyResponse = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`);

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.valid).toBe(true);
      expect(verifyResponse.body.user).toBe('owner');
    });

    it('should reject verification after failed login', async () => {
      mockCompare.mockResolvedValue(false);

      // Failed login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ password: 'wrongpassword' });

      expect(loginResponse.status).toBe(401);
      expect(loginResponse.body).not.toHaveProperty('token');

      // Attempt to verify with fake token
      mockVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const verifyResponse = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer fake-token');

      expect(verifyResponse.status).toBe(401);
      expect(verifyResponse.body.valid).toBe(false);
    });
  });
});
