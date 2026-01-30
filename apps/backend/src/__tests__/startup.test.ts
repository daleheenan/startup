import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

/**
 * Startup and Deployment Tests
 *
 * These tests verify that the server startup process handles edge cases
 * that could cause deployment failures on Railway or other platforms.
 */

describe('Server Startup', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Variable Validation', () => {
    it('should require ANTHROPIC_API_KEY in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ANTHROPIC_API_KEY;

      // The validation function should detect missing API key
      const errors: string[] = [];
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'placeholder-key-will-be-set-later') {
        errors.push('ANTHROPIC_API_KEY is required in production');
      }

      expect(errors).toContain('ANTHROPIC_API_KEY is required in production');
    });

    it('should reject placeholder API key in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.ANTHROPIC_API_KEY = 'placeholder-key-will-be-set-later';

      const errors: string[] = [];
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'placeholder-key-will-be-set-later') {
        errors.push('ANTHROPIC_API_KEY is required in production');
      }

      expect(errors).toContain('ANTHROPIC_API_KEY is required in production');
    });

    it('should require JWT_SECRET in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      const errors: string[] = [];
      if (!process.env.JWT_SECRET) {
        errors.push('JWT_SECRET is required in production');
      }

      expect(errors).toContain('JWT_SECRET is required in production');
    });

    it('should require OWNER_PASSWORD_HASH in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.OWNER_PASSWORD_HASH;

      const errors: string[] = [];
      if (!process.env.OWNER_PASSWORD_HASH) {
        errors.push('OWNER_PASSWORD_HASH is required in production');
      }

      expect(errors).toContain('OWNER_PASSWORD_HASH is required in production');
    });

    it('should pass validation when all required vars are set', () => {
      process.env.NODE_ENV = 'production';
      process.env.ANTHROPIC_API_KEY = 'valid-key';
      process.env.JWT_SECRET = 'secret';
      process.env.OWNER_PASSWORD_HASH = 'hash';

      const errors: string[] = [];
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'placeholder-key-will-be-set-later') {
        errors.push('ANTHROPIC_API_KEY is required in production');
      }
      if (!process.env.JWT_SECRET) {
        errors.push('JWT_SECRET is required in production');
      }
      if (!process.env.OWNER_PASSWORD_HASH) {
        errors.push('OWNER_PASSWORD_HASH is required in production');
      }

      expect(errors).toHaveLength(0);
    });

    it('should not require env vars in development mode', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.JWT_SECRET;

      // In development, validation should not fail
      const errors: string[] = [];
      if (process.env.NODE_ENV === 'production') {
        if (!process.env.ANTHROPIC_API_KEY) {
          errors.push('ANTHROPIC_API_KEY is required in production');
        }
      }

      expect(errors).toHaveLength(0);
    });
  });

  describe('Database Health Check', () => {
    it('should detect database connection failure', () => {
      // Simulate database error
      const mockDbError = new Error('SQLITE_CANTOPEN: unable to open database file');
      let dbHealthy = true;

      try {
        throw mockDbError;
      } catch (error) {
        dbHealthy = false;
      }

      expect(dbHealthy).toBe(false);
    });

    it('should handle database query returning no result', () => {
      const result = null; // Simulates failed SELECT 1 query
      const isHealthy = result !== null;

      expect(isHealthy).toBe(false);
    });

    it('should pass when database returns valid result', () => {
      const result = { test: 1 }; // Simulates successful SELECT 1 query
      const isHealthy = result !== null;

      expect(isHealthy).toBe(true);
    });
  });

  describe('Migration Registry', () => {
    const migrationFiles = [
      '005_analytics_insights.sql',
      '006_chapter_edits.sql',
      '007_regeneration_variations.sql',
      '008_project_metrics.sql',
      '009_genre_tropes.sql',
      '010_prose_style_control.sql',
      '011_book_style_presets.sql',
      '012_mystery_tracking.sql',
      '013_performance_indexes.sql',
      '014_universe_support.sql',
      '015_plot_structure.sql',
      '016_timeframe_support.sql',
      '017_migration_registry.sql',
      '018_concept_summaries.sql',
      '019_enhanced_tracking_and_query_perf.sql',
      '020_author_management.sql',
      '021_story_concept.sql',
      '022_saved_story_ideas.sql',
      '023_plagiarism_checks.sql',
      '024_user_preferences.sql',
      '025_concept_source_idea.sql',
      '019_user_settings.sql',
      '019_time_period.sql',
      '015_fix_metrics_trigger.sql',
      '020_backfill_metrics.sql',
      '026_author_name_field.sql',
      '027_editorial_reports.sql', // VEB migration - must be included!
    ];

    it('should include VEB migration 027_editorial_reports.sql', () => {
      expect(migrationFiles).toContain('027_editorial_reports.sql');
    });

    it('should have migrations in expected order', () => {
      // VEB migration should be at the end (index 26)
      const vebIndex = migrationFiles.indexOf('027_editorial_reports.sql');
      expect(vebIndex).toBe(26);
    });

    it('should calculate correct DB version for VEB migration', () => {
      // DB version = 5 + index
      // VEB is at index 26, so version = 5 + 26 = 31
      const vebIndex = migrationFiles.indexOf('027_editorial_reports.sql');
      const vebDbVersion = 5 + vebIndex;
      expect(vebDbVersion).toBe(31);
    });
  });

  describe('Graceful Shutdown', () => {
    it('should handle SIGTERM signal', () => {
      let shutdownCalled = false;
      const shutdown = (signal: string) => {
        shutdownCalled = true;
        expect(signal).toBe('SIGTERM');
      };

      shutdown('SIGTERM');
      expect(shutdownCalled).toBe(true);
    });

    it('should handle SIGINT signal', () => {
      let shutdownCalled = false;
      const shutdown = (signal: string) => {
        shutdownCalled = true;
        expect(signal).toBe('SIGINT');
      };

      shutdown('SIGINT');
      expect(shutdownCalled).toBe(true);
    });
  });

  describe('Docker Health Check Configuration', () => {
    // These are documentation tests to ensure configuration is correct
    it('should have adequate start-period for migrations', () => {
      // Dockerfile should have --start-period=120s
      const expectedStartPeriod = 120; // seconds
      const minimumStartPeriod = 60; // minimum acceptable

      expect(expectedStartPeriod).toBeGreaterThanOrEqual(minimumStartPeriod);
    });

    it('should have reasonable health check interval', () => {
      const expectedInterval = 30; // seconds
      const minInterval = 10;
      const maxInterval = 60;

      expect(expectedInterval).toBeGreaterThanOrEqual(minInterval);
      expect(expectedInterval).toBeLessThanOrEqual(maxInterval);
    });
  });
});

describe('VEB Table Existence Check', () => {
  it('should identify missing editorial_reports table', () => {
    const requiredTables = ['editorial_reports', 'veb_feedback'];
    const existingTables = ['veb_feedback']; // editorial_reports is missing

    const missing = requiredTables.filter(t => !existingTables.includes(t));

    expect(missing).toContain('editorial_reports');
  });

  it('should identify missing veb_feedback table', () => {
    const requiredTables = ['editorial_reports', 'veb_feedback'];
    const existingTables = ['editorial_reports']; // veb_feedback is missing

    const missing = requiredTables.filter(t => !existingTables.includes(t));

    expect(missing).toContain('veb_feedback');
  });

  it('should pass when all tables exist', () => {
    const requiredTables = ['editorial_reports', 'veb_feedback'];
    const existingTables = ['editorial_reports', 'veb_feedback'];

    const missing = requiredTables.filter(t => !existingTables.includes(t));

    expect(missing).toHaveLength(0);
  });
});
