/**
 * Base Repository
 *
 * Abstract base class providing common CRUD operations for database entities.
 * Follows the Repository pattern to separate data access logic from business logic.
 *
 * Features:
 * - Generic type support for type-safe operations
 * - Common CRUD operations (create, read, update, delete)
 * - Query monitoring integration
 * - Consistent error handling
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Handles only data access
 * - Open/Closed: Extendable through inheritance without modification
 * - Liskov Substitution: Subclasses can be used interchangeably
 * - Dependency Inversion: Depends on abstractions (interfaces)
 */

import type Database from 'better-sqlite3';
import { queryMonitor } from '../db/query-monitor.js';
import { createLogger } from '../services/logger.service.js';

const logger = createLogger('repositories:base');

/**
 * Base entity interface - all entities must have an id
 */
export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Query options for find operations
 */
export interface FindOptions {
  /** Columns to select */
  columns?: string[];
  /** ORDER BY clause */
  orderBy?: string;
  /** LIMIT clause */
  limit?: number;
  /** OFFSET clause */
  offset?: number;
}

/**
 * Result of a paginated query
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Abstract Base Repository
 *
 * Provides common CRUD operations that can be inherited by specific repositories.
 * Subclasses should implement entity-specific queries.
 */
export abstract class BaseRepository<T extends BaseEntity> {
  protected db: Database.Database;
  protected tableName: string;
  protected entityName: string;

  constructor(db: Database.Database, tableName: string, entityName: string) {
    this.db = db;
    this.tableName = tableName;
    this.entityName = entityName;
  }

  /**
   * Find entity by ID
   */
  findById(id: string): T | null {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;

    const { result } = queryMonitor.wrapSync(sql, () => {
      const stmt = this.db.prepare<[string], T>(sql);
      return stmt.get(id) || null;
    });

    return result;
  }

  /**
   * Find all entities
   */
  findAll(options: FindOptions = {}): T[] {
    let sql = `SELECT ${options.columns?.join(', ') || '*'} FROM ${this.tableName}`;

    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    if (options.offset) {
      sql += ` OFFSET ${options.offset}`;
    }

    const { result } = queryMonitor.wrapSync(sql, () => {
      const stmt = this.db.prepare<[], T>(sql);
      return stmt.all();
    });

    return result;
  }

  /**
   * Find entities by a single column value
   */
  findBy(column: string, value: string | number, options: FindOptions = {}): T[] {
    let sql = `SELECT ${options.columns?.join(', ') || '*'} FROM ${this.tableName} WHERE ${column} = ?`;

    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    const { result } = queryMonitor.wrapSync(sql, () => {
      const stmt = this.db.prepare<[typeof value], T>(sql);
      return stmt.all(value);
    });

    return result;
  }

  /**
   * Find first entity matching a column value
   */
  findOneBy(column: string, value: string | number): T | null {
    const sql = `SELECT * FROM ${this.tableName} WHERE ${column} = ? LIMIT 1`;

    const { result } = queryMonitor.wrapSync(sql, () => {
      const stmt = this.db.prepare<[typeof value], T>(sql);
      return stmt.get(value) || null;
    });

    return result;
  }

  /**
   * Count all entities
   */
  count(): number {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;

    const { result } = queryMonitor.wrapSync(sql, () => {
      const stmt = this.db.prepare<[], { count: number }>(sql);
      return stmt.get()?.count || 0;
    });

    return result;
  }

  /**
   * Count entities matching a condition
   */
  countBy(column: string, value: string | number): number {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${column} = ?`;

    const { result } = queryMonitor.wrapSync(sql, () => {
      const stmt = this.db.prepare<[typeof value], { count: number }>(sql);
      return stmt.get(value)?.count || 0;
    });

    return result;
  }

  /**
   * Check if entity exists by ID
   */
  exists(id: string): boolean {
    const sql = `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`;

    const { result } = queryMonitor.wrapSync(sql, () => {
      const stmt = this.db.prepare<[string], { 1: number }>(sql);
      return stmt.get(id) !== undefined;
    });

    return result;
  }

  /**
   * Create a new entity
   */
  create(data: Omit<T, 'created_at' | 'updated_at'>): T {
    const now = new Date().toISOString();
    const columns = Object.keys(data);
    const values = Object.values(data);

    // Add timestamps
    columns.push('created_at', 'updated_at');
    values.push(now, now);

    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

    const { result } = queryMonitor.wrapSync(sql, () => {
      const stmt = this.db.prepare(sql);
      stmt.run(...values);
      return this.findById((data as any).id);
    });

    if (!result) {
      throw new Error(`Failed to create ${this.entityName}`);
    }

    logger.info({ id: (data as any).id }, `${this.entityName} created`);
    return result;
  }

  /**
   * Update an entity by ID
   */
  update(id: string, data: Partial<Omit<T, 'id' | 'created_at'>>): T | null {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (key !== 'id' && key !== 'created_at') {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    // Always update timestamp
    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const sql = `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`;

    const { result } = queryMonitor.wrapSync(sql, () => {
      const stmt = this.db.prepare(sql);
      const updateResult = stmt.run(...values);
      return updateResult.changes > 0 ? this.findById(id) : null;
    });

    if (result) {
      logger.info({ id }, `${this.entityName} updated`);
    }

    return result;
  }

  /**
   * Delete an entity by ID
   */
  delete(id: string): boolean {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;

    const { result } = queryMonitor.wrapSync(sql, () => {
      const stmt = this.db.prepare(sql);
      const deleteResult = stmt.run(id);
      return deleteResult.changes > 0;
    });

    if (result) {
      logger.info({ id }, `${this.entityName} deleted`);
    }

    return result;
  }

  /**
   * Delete entities matching a condition
   */
  deleteBy(column: string, value: string | number): number {
    const sql = `DELETE FROM ${this.tableName} WHERE ${column} = ?`;

    const { result } = queryMonitor.wrapSync(sql, () => {
      const stmt = this.db.prepare(sql);
      const deleteResult = stmt.run(value);
      return deleteResult.changes;
    });

    logger.info({ column, value, count: result }, `${this.entityName}s deleted`);
    return result;
  }

  /**
   * Execute a custom query with monitoring
   */
  protected executeQuery<R>(sql: string, params: any[] = []): R[] {
    const { result } = queryMonitor.wrapSync(sql, () => {
      const stmt = this.db.prepare<typeof params, R>(sql);
      return stmt.all(...params);
    });

    return result;
  }

  /**
   * Execute a custom query returning a single result
   */
  protected executeQuerySingle<R>(sql: string, params: any[] = []): R | null {
    const { result } = queryMonitor.wrapSync(sql, () => {
      const stmt = this.db.prepare<typeof params, R>(sql);
      return stmt.get(...params) || null;
    });

    return result;
  }

  /**
   * Execute a custom statement (INSERT, UPDATE, DELETE)
   */
  protected executeStatement(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number | bigint } {
    const { result } = queryMonitor.wrapSync(sql, () => {
      const stmt = this.db.prepare(sql);
      return stmt.run(...params);
    });

    return result;
  }

  /**
   * Run a transaction
   */
  protected transaction<R>(operation: () => R): R {
    return this.db.transaction(operation)();
  }

  /**
   * Get paginated results
   */
  paginate(page: number, pageSize: number, options: Omit<FindOptions, 'limit' | 'offset'> = {}): PaginatedResult<T> {
    const total = this.count();
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;

    const items = this.findAll({
      ...options,
      limit: pageSize,
      offset,
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }
}
