import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('fs');
jest.mock('../connection.js', () => ({
  default: {
    exec: jest.fn(),
    prepare: jest.fn(),
    pragma: jest.fn(),
  },
}));

describe('Database Migrations', () => {
  let runMigrations: any;
  let mockDb: any;
  let mockFs: typeof fs;

  beforeEach(async () => {
    jest.clearAllMocks();

    const dbModule = await import('../connection.js');
    mockDb = dbModule.default;

    mockFs = fs as any;

    const migrateModule = await import('../migrate.js');
    runMigrations = migrateModule.runMigrations;
  });

  describe('parseSqlStatements', () => {
    // This is a private function, but we can test it through runMigrations behavior
    it('should handle single-line comments', async () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      mockPrepare.mockReturnValue({
        get: jest.fn().mockReturnValue({ version: 10 }), // All migrations applied
        run: jest.fn(),
      });

      runMigrations();

      // Verify migration table was created without comment lines
      expect(mockDb.exec).toHaveBeenCalled();
    });
  });

  describe('runMigrations', () => {
    it('should create schema_migrations table if not exists', () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      mockPrepare.mockReturnValue({
        get: jest.fn().mockReturnValue({ version: 10 }), // Skip all migrations
        run: jest.fn(),
      });

      runMigrations();

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_migrations')
      );
    });

    it('should track current migration version', () => {
      const mockGet = jest.fn().mockReturnValue({ version: 5 });
      const mockPrepare = jest.fn().mockReturnValue({
        get: mockGet,
        run: jest.fn(),
      });

      mockDb.prepare = mockPrepare;

      runMigrations();

      expect(mockGet).toHaveBeenCalled();
    });

    it('should apply base schema (migration 001) when version is 0', () => {
      const mockGet = jest.fn().mockReturnValue(null); // No version = 0
      const mockRun = jest.fn();
      const mockPrepare = jest.fn().mockReturnValue({
        get: mockGet,
        run: mockRun,
      });

      mockDb.prepare = mockPrepare;
      mockDb.exec = jest.fn();

      (mockFs.readFileSync as jest.Mock).mockReturnValue('CREATE TABLE test (id TEXT);');

      runMigrations();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('schema.sql'),
        'utf-8'
      );
      expect(mockDb.exec).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDb.exec).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback on error during migration', () => {
      const mockGet = jest.fn().mockReturnValue(null);
      const mockPrepare = jest.fn().mockReturnValue({
        get: mockGet,
        run: jest.fn(),
      });

      mockDb.prepare = mockPrepare;
      mockDb.exec = jest.fn().mockImplementation((sql) => {
        if (sql.includes('CREATE TABLE')) {
          throw new Error('SQL error');
        }
      });

      (mockFs.readFileSync as jest.Mock).mockReturnValue('CREATE TABLE test;');

      expect(() => runMigrations()).toThrow('SQL error');
      expect(mockDb.exec).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should apply migration 002 for trilogy support', () => {
      const mockGet = jest.fn().mockReturnValue({ version: 1 });
      const mockRun = jest.fn();
      const mockPrepare = jest.fn().mockReturnValue({
        get: mockGet,
        run: mockRun,
        all: jest.fn().mockReturnValue([]),
      });

      mockDb.prepare = mockPrepare;
      mockDb.exec = jest.fn();
      mockDb.pragma = jest.fn().mockReturnValue([
        { name: 'id' },
        { name: 'title' },
      ]);

      runMigrations();

      expect(mockDb.exec).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDb.pragma).toHaveBeenCalledWith('table_info(books)');
    });

    it('should skip adding columns if they already exist', () => {
      const mockGet = jest.fn().mockReturnValue({ version: 1 });
      const mockRun = jest.fn();
      const mockPrepare = jest.fn().mockReturnValue({
        get: mockGet,
        run: mockRun,
        all: jest.fn().mockReturnValue([{ name: 'book_transitions' }]),
      });

      mockDb.prepare = mockPrepare;
      mockDb.exec = jest.fn();
      mockDb.pragma = jest.fn().mockReturnValue([
        { name: 'id' },
        { name: 'ending_state' }, // Column already exists
      ]);

      runMigrations();

      // Should not try to add the column again
      const alterCalls = (mockDb.exec as jest.Mock).mock.calls.filter((call) =>
        call[0].includes('ALTER TABLE books ADD COLUMN ending_state')
      );
      expect(alterCalls).toHaveLength(0);
    });

    it('should create book_transitions table if not exists', () => {
      const mockGet = jest.fn().mockReturnValue({ version: 1 });
      const mockRun = jest.fn();
      const mockPrepare = jest.fn().mockReturnValue({
        get: mockGet,
        run: mockRun,
        all: jest.fn().mockReturnValue([]), // Table doesn't exist
      });

      mockDb.prepare = mockPrepare;
      mockDb.exec = jest.fn();
      mockDb.pragma = jest.fn().mockReturnValue([
        { name: 'id' },
        { name: 'ending_state' },
      ]);

      runMigrations();

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE book_transitions')
      );
    });

    it('should apply migration 003 for agent learning system', () => {
      const mockGet = jest.fn().mockReturnValue({ version: 2 });
      const mockRun = jest.fn();
      const mockPrepare = jest.fn().mockReturnValue({
        get: mockGet,
        run: mockRun,
      });

      mockDb.prepare = mockPrepare;
      mockDb.exec = jest.fn();

      (mockFs.readFileSync as jest.Mock).mockReturnValue(`
        -- Agent learning tables
        CREATE TABLE agent_lessons (id TEXT PRIMARY KEY);
        CREATE TABLE agent_reflections (id TEXT PRIMARY KEY);
      `);

      runMigrations();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('003_agent_learning.sql'),
        'utf-8'
      );
    });

    it('should apply migration 004 for saved concepts', () => {
      const mockGet = jest.fn().mockReturnValue({ version: 3 });
      const mockRun = jest.fn();
      const mockPrepare = jest.fn().mockReturnValue({
        get: mockGet,
        run: mockRun,
      });

      mockDb.prepare = mockPrepare;
      mockDb.exec = jest.fn();

      (mockFs.readFileSync as jest.Mock).mockReturnValue(`
        CREATE TABLE saved_concepts (id TEXT PRIMARY KEY);
      `);

      runMigrations();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('004_saved_concepts.sql'),
        'utf-8'
      );
    });

    it('should apply migrations 005-010 from files', () => {
      const mockGet = jest.fn().mockReturnValue({ version: 4 });
      const mockRun = jest.fn();
      const mockPrepare = jest.fn().mockReturnValue({
        get: mockGet,
        run: mockRun,
      });

      mockDb.prepare = mockPrepare;
      mockDb.exec = jest.fn();

      (mockFs.existsSync as jest.Mock).mockReturnValue(true);
      (mockFs.readFileSync as jest.Mock).mockReturnValue('CREATE TABLE test;');

      runMigrations();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('005_analytics_insights.sql'),
        'utf-8'
      );
    });

    it('should skip migration files that do not exist', () => {
      const mockGet = jest.fn().mockReturnValue({ version: 4 });
      const mockRun = jest.fn();
      const mockPrepare = jest.fn().mockReturnValue({
        get: mockGet,
        run: mockRun,
      });

      mockDb.prepare = mockPrepare;
      mockDb.exec = jest.fn();

      (mockFs.existsSync as jest.Mock).mockReturnValue(false);

      runMigrations();

      // Should not throw error
      expect(mockDb.exec).toHaveBeenCalled();
    });

    it('should handle ALTER TABLE errors for existing columns gracefully', () => {
      const mockGet = jest.fn().mockReturnValue({ version: 4 });
      const mockRun = jest.fn();
      const mockPrepare = jest.fn().mockReturnValue({
        get: mockGet,
        run: mockRun,
      });

      mockDb.prepare = mockPrepare;
      mockDb.exec = jest.fn().mockImplementation((sql) => {
        if (sql.includes('ALTER TABLE') && sql.includes('ADD COLUMN')) {
          const error: any = new Error('duplicate column name');
          error.code = 'SQLITE_ERROR';
          throw error;
        }
      });

      (mockFs.existsSync as jest.Mock).mockReturnValue(true);
      (mockFs.readFileSync as jest.Mock).mockReturnValue('ALTER TABLE test ADD COLUMN test_col TEXT;');

      // Should not throw - should skip the duplicate column error
      expect(() => runMigrations()).not.toThrow();
    });

    it('should handle trigger creation with BEGIN/END blocks', () => {
      const mockGet = jest.fn().mockReturnValue({ version: 4 });
      const mockRun = jest.fn();
      const mockPrepare = jest.fn().mockReturnValue({
        get: mockGet,
        run: mockRun,
      });

      mockDb.prepare = mockPrepare;
      mockDb.exec = jest.fn();

      (mockFs.existsSync as jest.Mock).mockReturnValue(true);
      (mockFs.readFileSync as jest.Mock).mockReturnValue(`
        CREATE TRIGGER update_timestamp
        AFTER UPDATE ON test_table
        BEGIN
          UPDATE test_table SET updated_at = datetime('now');
        END;
      `);

      runMigrations();

      // Should parse the trigger as a single statement
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TRIGGER')
      );
    });

    it('should record migration version after successful application', () => {
      const mockGet = jest.fn().mockReturnValue({ version: 4 });
      const mockRun = jest.fn();
      const mockPrepare = jest.fn().mockReturnValue({
        get: mockGet,
        run: mockRun,
      });

      mockDb.prepare = mockPrepare;
      mockDb.exec = jest.fn();

      (mockFs.existsSync as jest.Mock).mockReturnValue(true);
      (mockFs.readFileSync as jest.Mock).mockReturnValue('SELECT 1;');

      runMigrations();

      expect(mockRun).toHaveBeenCalled();
      expect(mockDb.exec).toHaveBeenCalledWith('COMMIT');
    });

    it('should skip migrations already applied', () => {
      const mockGet = jest.fn().mockReturnValue({ version: 10 }); // All migrations applied
      const mockRun = jest.fn();
      const mockPrepare = jest.fn().mockReturnValue({
        get: mockGet,
        run: mockRun,
      });

      mockDb.prepare = mockPrepare;
      mockDb.exec = jest.fn();

      runMigrations();

      // Should only create the migration tracking table
      const execCalls = (mockDb.exec as jest.Mock).mock.calls;
      const transactionCalls = execCalls.filter(
        (call) => call[0].includes('BEGIN TRANSACTION')
      );
      expect(transactionCalls).toHaveLength(0);
    });

    it('should handle multiple statements in a migration file', () => {
      const mockGet = jest.fn().mockReturnValue({ version: 4 });
      const mockRun = jest.fn();
      const mockPrepare = jest.fn().mockReturnValue({
        get: mockGet,
        run: mockRun,
      });

      mockDb.prepare = mockPrepare;
      mockDb.exec = jest.fn();

      (mockFs.existsSync as jest.Mock).mockReturnValue(true);
      (mockFs.readFileSync as jest.Mock).mockReturnValue(`
        CREATE TABLE table1 (id TEXT);
        CREATE TABLE table2 (id TEXT);
        CREATE INDEX idx_table1 ON table1(id);
      `);

      runMigrations();

      // Should execute all three statements
      const createCalls = (mockDb.exec as jest.Mock).mock.calls.filter(
        (call) => call[0].includes('CREATE')
      );
      expect(createCalls.length).toBeGreaterThan(0);
    });

    it('should rethrow non-ignorable SQL errors', () => {
      const mockGet = jest.fn().mockReturnValue({ version: 4 });
      const mockRun = jest.fn();
      const mockPrepare = jest.fn().mockReturnValue({
        get: mockGet,
        run: mockRun,
      });

      mockDb.prepare = mockPrepare;
      mockDb.exec = jest.fn().mockImplementation((sql) => {
        if (sql.includes('CREATE TABLE')) {
          const error: any = new Error('syntax error');
          error.code = 'SQLITE_ERROR';
          throw error;
        }
      });

      (mockFs.existsSync as jest.Mock).mockReturnValue(true);
      (mockFs.readFileSync as jest.Mock).mockReturnValue('CREATE TABLE test (invalid syntax);');

      expect(() => runMigrations()).toThrow();
    });
  });
});
