/**
 * Base Repository Tests
 *
 * Tests for the BaseRepository abstract class to ensure
 * common CRUD operations work correctly.
 */

import { jest } from '@jest/globals';

// Mock the database connection
jest.mock('../../db/connection.js', () => ({
  default: {
    prepare: jest.fn(),
    exec: jest.fn(),
    transaction: jest.fn(),
  },
}));

// Mock the query monitor
jest.mock('../../db/query-monitor.js', () => ({
  queryMonitor: {
    wrapSync: jest.fn((sql: string, operation: () => any) => ({
      result: operation(),
      executionTimeMs: 0,
      isSlow: false,
    })),
  },
}));

// Mock the logger
jest.mock('../../services/logger.service.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

import { BaseRepository, type BaseEntity } from '../base.repository.js';
import db from '../../db/connection.js';

// Concrete implementation for testing
interface TestEntity extends BaseEntity {
  name: string;
  value: number;
}

class TestRepository extends BaseRepository<TestEntity> {
  constructor(database: any) {
    super(database, 'test_table', 'TestEntity');
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let mockDb: any;
  let mockPrepare: jest.Mock;
  let mockStatement: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStatement = {
      get: jest.fn(),
      all: jest.fn(),
      run: jest.fn(),
    };

    mockPrepare = jest.fn().mockReturnValue(mockStatement);

    mockDb = {
      prepare: mockPrepare,
      exec: jest.fn(),
      transaction: jest.fn((fn: () => any) => () => fn()),
    };

    repository = new TestRepository(mockDb);
  });

  describe('findById', () => {
    it('should return entity when found', () => {
      const entity = { id: '123', name: 'Test', value: 42, created_at: '2024-01-01', updated_at: '2024-01-01' };
      mockStatement.get.mockReturnValue(entity);

      const result = repository.findById('123');

      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM test_table WHERE id = ?');
      expect(mockStatement.get).toHaveBeenCalledWith('123');
      expect(result).toEqual(entity);
    });

    it('should return null when not found', () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all entities', () => {
      const entities = [
        { id: '1', name: 'Test 1', value: 1 },
        { id: '2', name: 'Test 2', value: 2 },
      ];
      mockStatement.all.mockReturnValue(entities);

      const result = repository.findAll();

      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM test_table');
      expect(result).toEqual(entities);
    });

    it('should apply orderBy option', () => {
      mockStatement.all.mockReturnValue([]);

      repository.findAll({ orderBy: 'name ASC' });

      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM test_table ORDER BY name ASC');
    });

    it('should apply limit option', () => {
      mockStatement.all.mockReturnValue([]);

      repository.findAll({ limit: 10 });

      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM test_table LIMIT 10');
    });

    it('should apply offset option', () => {
      mockStatement.all.mockReturnValue([]);

      repository.findAll({ limit: 10, offset: 20 });

      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM test_table LIMIT 10 OFFSET 20');
    });

    it('should apply columns option', () => {
      mockStatement.all.mockReturnValue([]);

      repository.findAll({ columns: ['id', 'name'] });

      expect(mockPrepare).toHaveBeenCalledWith('SELECT id, name FROM test_table');
    });

    it('should combine multiple options', () => {
      mockStatement.all.mockReturnValue([]);

      repository.findAll({
        columns: ['id', 'name'],
        orderBy: 'name DESC',
        limit: 5,
        offset: 10,
      });

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT id, name FROM test_table ORDER BY name DESC LIMIT 5 OFFSET 10'
      );
    });
  });

  describe('findBy', () => {
    it('should find entities by column value', () => {
      const entities = [{ id: '1', name: 'Test', value: 42 }];
      mockStatement.all.mockReturnValue(entities);

      const result = repository.findBy('name', 'Test');

      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM test_table WHERE name = ?');
      expect(mockStatement.all).toHaveBeenCalledWith('Test');
      expect(result).toEqual(entities);
    });

    it('should apply options with findBy', () => {
      mockStatement.all.mockReturnValue([]);

      repository.findBy('name', 'Test', { orderBy: 'value ASC', limit: 5 });

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE name = ? ORDER BY value ASC LIMIT 5'
      );
    });
  });

  describe('findOneBy', () => {
    it('should return single entity', () => {
      const entity = { id: '1', name: 'Test', value: 42 };
      mockStatement.get.mockReturnValue(entity);

      const result = repository.findOneBy('name', 'Test');

      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM test_table WHERE name = ? LIMIT 1');
      expect(result).toEqual(entity);
    });

    it('should return null when not found', () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = repository.findOneBy('name', 'Nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('count', () => {
    it('should return total count', () => {
      mockStatement.get.mockReturnValue({ count: 42 });

      const result = repository.count();

      expect(mockPrepare).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM test_table');
      expect(result).toBe(42);
    });

    it('should return 0 when empty', () => {
      mockStatement.get.mockReturnValue({ count: 0 });

      const result = repository.count();

      expect(result).toBe(0);
    });
  });

  describe('countBy', () => {
    it('should return count by column value', () => {
      mockStatement.get.mockReturnValue({ count: 5 });

      const result = repository.countBy('name', 'Test');

      expect(mockPrepare).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM test_table WHERE name = ?');
      expect(mockStatement.get).toHaveBeenCalledWith('Test');
      expect(result).toBe(5);
    });
  });

  describe('exists', () => {
    it('should return true when entity exists', () => {
      mockStatement.get.mockReturnValue({ 1: 1 });

      const result = repository.exists('123');

      expect(mockPrepare).toHaveBeenCalledWith('SELECT 1 FROM test_table WHERE id = ? LIMIT 1');
      expect(result).toBe(true);
    });

    it('should return false when entity does not exist', () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = repository.exists('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create entity with timestamps', () => {
      const input = { id: '123', name: 'Test', value: 42 };
      const created = { ...input, created_at: expect.any(String), updated_at: expect.any(String) };

      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(created);

      const result = repository.create(input);

      expect(mockStatement.run).toHaveBeenCalledWith(
        '123',
        'Test',
        42,
        expect.any(String),
        expect.any(String)
      );
      expect(result).toEqual(created);
    });

    it('should throw error when creation fails', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(null);

      expect(() => repository.create({ id: '123', name: 'Test', value: 42 })).toThrow(
        'Failed to create TestEntity'
      );
    });
  });

  describe('update', () => {
    it('should update entity with new timestamp', () => {
      const updated = { id: '123', name: 'Updated', value: 100, updated_at: expect.any(String) };

      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(updated);

      const result = repository.update('123', { name: 'Updated', value: 100 });

      expect(mockStatement.run).toHaveBeenCalledWith('Updated', 100, expect.any(String), '123');
      expect(result).toEqual(updated);
    });

    it('should return null when entity not found', () => {
      mockStatement.run.mockReturnValue({ changes: 0 });
      mockStatement.get.mockReturnValue(null);

      const result = repository.update('nonexistent', { name: 'Updated' });

      expect(result).toBeNull();
    });

    it('should not update id or created_at fields', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue({ id: '123', name: 'Test' });

      repository.update('123', { id: 'new-id', created_at: 'new-date', name: 'Updated' } as any);

      // Verify that id and created_at are not in the SET clause
      // The SET clause is between 'SET' and 'WHERE'
      const prepareCall = mockPrepare.mock.calls.find((call: unknown[]) =>
        (call[0] as string).includes('UPDATE test_table SET')
      );
      expect(prepareCall).toBeDefined();
      const sql = (prepareCall as unknown[])[0] as string;
      const setClause = sql.substring(sql.indexOf('SET'), sql.indexOf('WHERE'));
      expect(setClause).not.toContain('id =');
      expect(setClause).not.toContain('created_at =');
      expect(setClause).toContain('name =');
    });
  });

  describe('delete', () => {
    it('should delete entity by id', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = repository.delete('123');

      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM test_table WHERE id = ?');
      expect(mockStatement.run).toHaveBeenCalledWith('123');
      expect(result).toBe(true);
    });

    it('should return false when entity not found', () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('deleteBy', () => {
    it('should delete entities by column value', () => {
      mockStatement.run.mockReturnValue({ changes: 3 });

      const result = repository.deleteBy('name', 'Test');

      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM test_table WHERE name = ?');
      expect(mockStatement.run).toHaveBeenCalledWith('Test');
      expect(result).toBe(3);
    });
  });

  describe('paginate', () => {
    it('should return paginated results', () => {
      const entities = [
        { id: '1', name: 'Test 1', value: 1 },
        { id: '2', name: 'Test 2', value: 2 },
      ];

      // First call for count
      mockStatement.get.mockReturnValueOnce({ count: 10 });
      // Second call for items
      mockStatement.all.mockReturnValue(entities);

      const result = repository.paginate(2, 2);

      expect(result).toEqual({
        items: entities,
        total: 10,
        page: 2,
        pageSize: 2,
        totalPages: 5,
      });
    });

    it('should calculate correct offset', () => {
      mockStatement.get.mockReturnValue({ count: 100 });
      mockStatement.all.mockReturnValue([]);

      repository.paginate(3, 10);

      // Should use offset 20 for page 3 with pageSize 10
      // Note: BaseRepository only adds OFFSET when > 0
      const prepareCalls = mockPrepare.mock.calls.map((call: unknown[]) => call[0] as string);
      const selectCall = prepareCalls.find((sql: string) => sql.includes('SELECT *'));
      expect(selectCall).toContain('LIMIT 10');
      expect(selectCall).toContain('OFFSET 20');
    });

    it('should apply orderBy option', () => {
      mockStatement.get.mockReturnValue({ count: 10 });
      mockStatement.all.mockReturnValue([]);

      repository.paginate(1, 5, { orderBy: 'name ASC' });

      // For page 1, offset is 0, so BaseRepository doesn't add OFFSET clause
      const prepareCalls = mockPrepare.mock.calls.map((call: unknown[]) => call[0] as string);
      const selectCall = prepareCalls.find((sql: string) => sql.includes('SELECT *'));
      expect(selectCall).toContain('ORDER BY name ASC');
      expect(selectCall).toContain('LIMIT 5');
    });
  });
});
