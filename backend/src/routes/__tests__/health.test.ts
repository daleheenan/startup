import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import healthRouter from '../health';

describe('Health Router', () => {
  let app: express.Application;

  beforeEach(() => {
    // Setup Express app
    app = express();
    app.use('/api/health', healthRouter);
  });

  describe('GET /api/health', () => {
    it('should return 200 with ok status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should return valid ISO 8601 timestamp', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('GET /api/health/claude', () => {
    it('should return unhealthy when API key is not configured', async () => {
      const originalApiKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const response = await request(app)
        .get('/api/health/claude')
        .expect(503);

      expect(response.body).toHaveProperty('status', 'unhealthy');
      expect(response.body).toHaveProperty('error', 'API key not configured');

      // Restore
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    });

    it('should return unhealthy when API key is placeholder', async () => {
      const originalApiKey = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = 'placeholder-key-will-be-set-later';

      const response = await request(app)
        .get('/api/health/claude')
        .expect(503);

      expect(response.body).toHaveProperty('status', 'unhealthy');
      expect(response.body).toHaveProperty('error', 'API key not configured');

      // Restore
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    });

    it('should return 503 status code when unhealthy', async () => {
      const originalApiKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      await request(app)
        .get('/api/health/claude')
        .expect(503);

      // Restore
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    });

    it('should include status field in response', async () => {
      const response = await request(app)
        .get('/api/health/claude');

      expect(response.body).toHaveProperty('status');
      expect(['healthy', 'unhealthy']).toContain(response.body.status);
    });
  });
});
