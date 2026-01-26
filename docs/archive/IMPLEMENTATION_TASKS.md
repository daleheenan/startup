# Implementation Tasks: Sprint 18 - Database & Architecture Improvements

**Sprint**: 18
**Project**: NovelForge Backend
**Total Estimated Time**: 28 hours

---

## Phase 1: Database Migration Improvements (10 hours)

### Task 1: Create Migration 016 - Enhanced Tracking Schema

**Estimated Time**: 1 hour
**Dependencies**: None
**Files to Create/Modify**:
- `backend/src/db/migrations/016_enhanced_migration_tracking.sql`

**Description**:
Create a new migration file that enhances the schema_migrations table and adds query_performance table for slow query tracking.

**Acceptance Criteria**:
- [ ] Migration file adds columns: name, checksum, rolled_back_at to schema_migrations
- [ ] Migration file creates query_performance table with fields: id, sql, duration_ms, timestamp, params
- [ ] Indexes created for query_performance (duration_ms DESC, timestamp)
- [ ] Migration includes down SQL for rollback support (DROP TABLE, ALTER TABLE DROP COLUMN)
- [ ] SQL syntax validated (no errors when applied)

**Implementation Notes**:
```sql
-- Up migration
ALTER TABLE schema_migrations ADD COLUMN name TEXT;
ALTER TABLE schema_migrations ADD COLUMN checksum TEXT;
ALTER TABLE schema_migrations ADD COLUMN rolled_back_at TEXT;
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);

CREATE TABLE IF NOT EXISTS query_performance (
  id TEXT PRIMARY KEY,
  sql TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  timestamp TEXT DEFAULT (datetime('now')),
  params TEXT
);

-- Down migration comments for rollback strategy
-- Note: SQLite doesn't support DROP COLUMN, so rollback requires table rebuild
```

---

### Task 2: Database Backup Service

**Estimated Time**: 2 hours
**Dependencies**: None
**Files to Create**:
- `backend/src/db/backup.service.ts`
- `backend/src/db/__tests__/backup.service.test.ts`

**Description**:
Create a service that handles automated database backups using better-sqlite3's built-in backup functionality.

**Acceptance Criteria**:
- [ ] `DatabaseBackupService` class created with methods: createBackup, restoreFromBackup, listBackups, cleanOldBackups
- [ ] Backups stored in `data/backups/` directory with timestamp naming: `novelforge-YYYY-MM-DD-HHmmss.db`
- [ ] createBackup() uses better-sqlite3 `.backup()` method
- [ ] Backup retention: keeps last 10 backups, deletes older ones
- [ ] listBackups() returns array of BackupInfo (filename, size, timestamp)
- [ ] Unit tests cover backup creation, listing, and cleanup
- [ ] Error handling for disk space, permissions, corrupt backups

**Implementation Notes**:
```typescript
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

interface BackupInfo {
  filename: string;
  path: string;
  size: number;
  created: Date;
}

export class DatabaseBackupService {
  private backupDir = path.join(__dirname, '../../../data/backups');

  async createBackup(reason: string): Promise<string> {
    // Ensure backup directory exists
    // Generate timestamped filename
    // Use db.backup() to create backup
    // Log backup creation with reason
    // Return backup path
  }
}
```

---

### Task 3: Migration Registry Service

**Estimated Time**: 3 hours
**Dependencies**: Task 1, Task 2
**Files to Create**:
- `backend/src/db/migration-registry.service.ts`
- `backend/src/db/__tests__/migration-registry.service.test.ts`

**Description**:
Create a service that tracks migration metadata including checksums and supports rollback operations.

**Acceptance Criteria**:
- [ ] `MigrationRegistry` class with methods: registerMigration, getMigrationHistory, rollbackToVersion, validateIntegrationIntegrity
- [ ] MigrationMetadata interface includes: version, name, upSql, downSql, checksum, appliedAt, rolledBackAt
- [ ] Checksum calculated using SHA-256 hash of upSql
- [ ] getMigrationHistory() returns all applied migrations from schema_migrations table
- [ ] rollbackToVersion() creates backup, executes down SQL, updates schema_migrations
- [ ] validateIntegrationIntegrity() checks checksums match for all applied migrations
- [ ] Unit tests cover registration, rollback, validation
- [ ] Integration test for full rollback cycle

**Implementation Notes**:
```typescript
import crypto from 'crypto';

interface MigrationMetadata {
  version: number;
  name: string;
  upSql: string;
  downSql?: string;
  checksum: string;
  appliedAt?: string;
  rolledBackAt?: string;
}

export class MigrationRegistry {
  private calculateChecksum(sql: string): string {
    return crypto.createHash('sha256').update(sql).digest('hex');
  }

  async rollbackToVersion(targetVersion: number): Promise<void> {
    // 1. Create backup
    // 2. Get migrations to rollback (current > target)
    // 3. Execute down SQL in reverse order
    // 4. Update schema_migrations table
    // 5. Verify rollback success
  }
}
```

---

### Task 4: Query Performance Monitor

**Estimated Time**: 2 hours
**Dependencies**: Task 1
**Files to Create**:
- `backend/src/db/query-monitor.service.ts`
- `backend/src/db/__tests__/query-monitor.service.test.ts`

**Description**:
Create a service that monitors database query performance and logs slow queries.

**Acceptance Criteria**:
- [ ] `QueryMonitor` class with methods: startMonitoring, stopMonitoring, getSlowQueries, clearStats
- [ ] Hooks into better-sqlite3 verbose callback to measure query duration
- [ ] Default threshold: 100ms (configurable via SLOW_QUERY_THRESHOLD env var)
- [ ] Stores last 100 slow queries in memory (circular buffer)
- [ ] Persists slow queries to query_performance table
- [ ] getSlowQueries() returns array sorted by duration DESC
- [ ] Unit tests cover query logging, threshold filtering, memory limits
- [ ] Production mode: Only logs slow queries (no verbose output)

**Implementation Notes**:
```typescript
interface SlowQuery {
  sql: string;
  duration: number;
  timestamp: string;
  params?: any[];
}

export class QueryMonitor {
  private slowQueries: SlowQuery[] = [];
  private threshold: number = 100; // ms
  private maxEntries: number = 100;

  startMonitoring(threshold?: number): void {
    // Hook into db.verbose callback
    // Parse SQL and measure duration
    // If duration > threshold, store query
  }

  private pruneOldEntries(): void {
    // Keep only last 100 queries
    // Delete older entries from query_performance table
  }
}
```

---

### Task 5: Update migrate.ts to Use New Services

**Estimated Time**: 2 hours
**Dependencies**: Task 2, Task 3
**Files to Modify**:
- `backend/src/db/migrate.ts`

**Description**:
Integrate backup and registry services into the existing migration system.

**Acceptance Criteria**:
- [ ] Import DatabaseBackupService and MigrationRegistry
- [ ] Create backup before applying each migration
- [ ] Register migration metadata with checksum
- [ ] Validate migration integrity on startup
- [ ] Enhanced error messages with rollback instructions
- [ ] Log migration progress with structured logging
- [ ] Existing migrations (001-015) still work correctly
- [ ] All existing tests pass

**Implementation Notes**:
```typescript
// Add at top of runMigrations()
const backupService = new DatabaseBackupService();
const registry = new MigrationRegistry();

// Before each migration:
const backupPath = await backupService.createBackup(`Before migration ${version}`);
logger.info({ version, backupPath }, 'Backup created');

// After migration:
registry.registerMigration({
  version,
  name: filename,
  upSql: migration,
  checksum: calculateChecksum(migration),
  appliedAt: new Date().toISOString(),
});
```

---

## Phase 2: Repository Layer Abstraction (12 hours)

### Task 6: Base Repository Implementation

**Estimated Time**: 3 hours
**Dependencies**: None
**Files to Create**:
- `backend/src/repositories/base.repository.ts`
- `backend/src/repositories/__tests__/base.repository.test.ts`

**Description**:
Create an abstract base repository class with generic CRUD operations.

**Acceptance Criteria**:
- [ ] Abstract BaseRepository<T> class created
- [ ] Generic methods: findById, findAll, create, update, delete
- [ ] Transaction support via transaction<R>(callback) method
- [ ] Query builder helpers: buildWhereClause, buildInsertQuery, buildUpdateQuery
- [ ] Type-safe interfaces using TypeScript generics
- [ ] Error handling with custom RepositoryError class
- [ ] Unit tests using in-memory test database
- [ ] Test coverage >90%

**Implementation Notes**:
```typescript
import db from '../db/connection.js';

export abstract class BaseRepository<T> {
  constructor(protected tableName: string) {}

  findById(id: string): T | null {
    const stmt = db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
    const row = stmt.get(id);
    return row ? this.mapRowToEntity(row) : null;
  }

  findAll(filters?: Record<string, any>): T[] {
    const { sql, params } = this.buildSelectQuery(filters);
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return rows.map(row => this.mapRowToEntity(row));
  }

  create(data: Partial<T>): T {
    const { sql, params } = this.buildInsertQuery(data);
    const stmt = db.prepare(sql);
    stmt.run(...params);
    return this.findById((data as any).id)!;
  }

  transaction<R>(callback: () => R): R {
    db.exec('BEGIN TRANSACTION');
    try {
      const result = callback();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  protected abstract mapRowToEntity(row: any): T;
}
```

---

### Task 7: Project Repository

**Estimated Time**: 2 hours
**Dependencies**: Task 6
**Files to Create**:
- `backend/src/repositories/project.repository.ts`
- `backend/src/repositories/__tests__/project.repository.test.ts`

**Description**:
Create ProjectRepository with domain-specific queries for projects.

**Acceptance Criteria**:
- [ ] ProjectRepository extends BaseRepository<Project>
- [ ] Domain-specific methods: findByStatus, findWithBooks, updateStoryDNA, updateSeriesBible
- [ ] findWithBooks uses JOIN to fetch project with all books in single query
- [ ] mapRowToEntity parses JSON fields (story_dna, story_bible)
- [ ] Unit tests cover all methods
- [ ] Type definitions match Project interface from shared/types

**Implementation Notes**:
```typescript
import { BaseRepository } from './base.repository.js';
import type { Project } from '../shared/types/index.js';

export class ProjectRepository extends BaseRepository<Project> {
  constructor() {
    super('projects');
  }

  findByStatus(status: string): Project[] {
    return this.findAll({ status });
  }

  findWithBooks(projectId: string): ProjectWithBooks {
    // Use JOIN query to fetch project + books
  }

  protected mapRowToEntity(row: any): Project {
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      genre: row.genre,
      status: row.status,
      storyDna: row.story_dna ? JSON.parse(row.story_dna) : null,
      storyBible: row.story_bible ? JSON.parse(row.story_bible) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
```

---

### Task 8: Book and Chapter Repositories

**Estimated Time**: 2 hours
**Dependencies**: Task 6
**Files to Create**:
- `backend/src/repositories/book.repository.ts`
- `backend/src/repositories/chapter.repository.ts`
- `backend/src/repositories/__tests__/book.repository.test.ts`
- `backend/src/repositories/__tests__/chapter.repository.test.ts`

**Description**:
Create BookRepository and ChapterRepository with domain-specific queries.

**Acceptance Criteria**:
- [ ] BookRepository methods: findByProject, findWithChapters, updateWordCount
- [ ] ChapterRepository methods: findByBook, findByStatus, updateContent, updateStatus
- [ ] Both extend BaseRepository with proper type parameters
- [ ] JSON parsing for scene_cards and flags fields
- [ ] Unit tests for all methods
- [ ] Test data uses realistic book/chapter structures

**Implementation Notes**:
```typescript
// book.repository.ts
export class BookRepository extends BaseRepository<Book> {
  constructor() {
    super('books');
  }

  findByProject(projectId: string): Book[] {
    return this.findAll({ project_id: projectId });
  }

  findWithChapters(bookId: string): BookWithChapters {
    // JOIN query to fetch book + chapters
  }
}

// chapter.repository.ts
export class ChapterRepository extends BaseRepository<Chapter> {
  constructor() {
    super('chapters');
  }

  findByBook(bookId: string): Chapter[] {
    return this.findAll({ book_id: bookId });
  }

  findByStatus(status: string): Chapter[] {
    return this.findAll({ status });
  }
}
```

---

### Task 9: Mystery Repository

**Estimated Time**: 2 hours
**Dependencies**: Task 6
**Files to Create**:
- `backend/src/repositories/mystery.repository.ts`
- `backend/src/repositories/__tests__/mystery.repository.test.ts`

**Description**:
Create MysteryRepository to replace direct DB access in MysteryTrackingService.

**Acceptance Criteria**:
- [ ] MysteryRepository extends BaseRepository<SeriesMystery>
- [ ] Methods: findBySeriesId, findOpenMysteries, updateStatus, markResolved
- [ ] markResolved atomically updates status, answer, answered_book, answered_chapter
- [ ] Complex mapping for raisedIn and answeredIn nested objects
- [ ] Unit tests cover status updates and nested object mapping
- [ ] Integration test with mystery-tracking.service.ts

**Implementation Notes**:
```typescript
export class MysteryRepository extends BaseRepository<SeriesMystery> {
  constructor() {
    super('series_mysteries');
  }

  findBySeriesId(seriesId: string): SeriesMystery[] {
    return this.findAll({ series_id: seriesId });
  }

  findOpenMysteries(seriesId: string): SeriesMystery[] {
    const stmt = db.prepare(`
      SELECT * FROM series_mysteries
      WHERE series_id = ? AND status = 'open'
      ORDER BY raised_book, raised_chapter
    `);
    const rows = stmt.all(seriesId);
    return rows.map(row => this.mapRowToEntity(row));
  }

  markResolved(
    mysteryId: string,
    answer: string,
    answeredBook: number,
    answeredChapter: number
  ): SeriesMystery {
    const stmt = db.prepare(`
      UPDATE series_mysteries
      SET status = 'resolved', answer = ?, answered_book = ?, answered_chapter = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(answer, answeredBook, answeredChapter, new Date().toISOString(), mysteryId);
    return this.findById(mysteryId)!;
  }

  protected mapRowToEntity(row: any): SeriesMystery {
    return {
      id: row.id,
      question: row.question,
      raisedIn: {
        bookNumber: row.raised_book,
        chapterNumber: row.raised_chapter,
        context: row.context,
      },
      answeredIn: row.answered_book ? {
        bookNumber: row.answered_book,
        chapterNumber: row.answered_chapter,
        answer: row.answer,
      } : undefined,
      status: row.status,
      importance: row.importance,
      seriesId: row.series_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
```

---

### Task 10: Refactor MysteryTrackingService to Use Repository

**Estimated Time**: 3 hours
**Dependencies**: Task 9
**Files to Modify**:
- `backend/src/services/mystery-tracking.service.ts`
- `backend/src/services/__tests__/mystery-tracking.service.test.ts`

**Description**:
Refactor MysteryTrackingService to use MysteryRepository instead of direct DB access.

**Acceptance Criteria**:
- [ ] Remove all direct db.prepare() calls from MysteryTrackingService
- [ ] Inject MysteryRepository via constructor
- [ ] Update all methods to use repository methods
- [ ] Service now contains only business logic (Claude integration, parsing)
- [ ] Update tests to mock MysteryRepository
- [ ] All existing tests pass
- [ ] No changes to public API (routes still work)

**Implementation Notes**:
```typescript
// Before
export class MysteryTrackingService {
  getSeriesMysteries(seriesId: string): SeriesMystery[] {
    const stmt = db.prepare(`SELECT * FROM series_mysteries WHERE series_id = ?`);
    const rows = stmt.all(seriesId);
    return rows.map(row => this.rowToMystery(row));
  }
}

// After
export class MysteryTrackingService {
  constructor(
    private mysteryRepo: MysteryRepository = new MysteryRepository()
  ) {}

  getSeriesMysteries(seriesId: string): SeriesMystery[] {
    return this.mysteryRepo.findBySeriesId(seriesId);
  }

  // extractMysteriesFromChapter now uses repo.create()
  // findMysteryResolutions now uses repo.markResolved()
}

// Update tests
describe('MysteryTrackingService', () => {
  let service: MysteryTrackingService;
  let mockRepo: jest.Mocked<MysteryRepository>;

  beforeEach(() => {
    mockRepo = {
      findBySeriesId: jest.fn(),
      markResolved: jest.fn(),
      // ...
    } as any;
    service = new MysteryTrackingService(mockRepo);
  });
});
```

---

## Phase 3: Circuit Breaker Pattern (6 hours)

### Task 11: Circuit Breaker Service Implementation

**Estimated Time**: 3 hours
**Dependencies**: None
**Files to Create**:
- `backend/src/services/circuit-breaker.service.ts`
- `backend/src/services/__tests__/circuit-breaker.service.test.ts`

**Description**:
Implement a generic circuit breaker pattern for external API calls.

**Acceptance Criteria**:
- [ ] CircuitBreaker<T> class with state machine (CLOSED, OPEN, HALF_OPEN)
- [ ] execute<T>(fn: () => Promise<T>) method wraps function calls
- [ ] Configuration: failureThreshold, successThreshold, timeout, windowSize
- [ ] State transitions: CLOSED→OPEN after N failures in window, OPEN→HALF_OPEN after timeout
- [ ] HALF_OPEN→CLOSED after M successes, HALF_OPEN→OPEN on failure
- [ ] getState() and getStats() methods for monitoring
- [ ] Custom CircuitOpenError thrown when circuit is open
- [ ] Unit tests cover all state transitions
- [ ] Test with mock async functions (success, failure, timeout)

**Implementation Notes**:
```typescript
export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export class CircuitOpenError extends Error {
  constructor(message: string, public nextAttemptTime: Date) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

interface CircuitBreakerOptions {
  failureThreshold: number;    // Default: 5
  successThreshold: number;    // Default: 2
  timeout: number;             // Default: 60000 (1 minute)
  windowSize: number;          // Default: 60000 (1 minute)
}

export class CircuitBreaker<T = any> {
  private state: CircuitState = CircuitState.CLOSED;
  private failureTimestamps: number[] = [];
  private successCount: number = 0;
  private openedAt?: number;

  constructor(private options: CircuitBreakerOptions) {}

  async execute(fn: () => Promise<T>): Promise<T> {
    // Check state
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.openedAt! >= this.options.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new CircuitOpenError(
          'Circuit breaker is open',
          new Date(this.openedAt! + this.options.timeout)
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureTimestamps = [];
      }
    }
  }

  private onFailure(): void {
    const now = Date.now();
    this.failureTimestamps.push(now);

    // Remove failures outside window
    this.failureTimestamps = this.failureTimestamps.filter(
      ts => now - ts < this.options.windowSize
    );

    // Check if threshold exceeded
    if (this.failureTimestamps.length >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.openedAt = now;
      this.successCount = 0;
    }
  }
}
```

---

### Task 12: Integrate Circuit Breaker with ClaudeService

**Estimated Time**: 2 hours
**Dependencies**: Task 11
**Files to Modify**:
- `backend/src/services/claude.service.ts`
- `backend/src/services/__tests__/claude.service.test.ts`

**Description**:
Integrate circuit breaker into ClaudeService to protect against API failures.

**Acceptance Criteria**:
- [ ] Import CircuitBreaker and wrap API calls with circuitBreaker.execute()
- [ ] Configuration from environment variables (CIRCUIT_BREAKER_* prefix)
- [ ] CircuitOpenError caught and logged with next retry time
- [ ] Existing error handling preserved (RateLimitError still works)
- [ ] getCircuitState() method added to expose state
- [ ] Unit tests mock circuit breaker behavior
- [ ] Integration test: Simulate 5 failures, verify circuit opens
- [ ] All existing claude.service tests pass

**Implementation Notes**:
```typescript
import { CircuitBreaker, CircuitOpenError, CircuitState } from './circuit-breaker.service.js';

export class ClaudeService {
  private circuitBreaker: CircuitBreaker<ClaudeResponse>;

  constructor() {
    // ... existing constructor code ...

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5'),
      successThreshold: parseInt(process.env.CIRCUIT_BREAKER_SUCCESS_THRESHOLD || '2'),
      timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000'),
      windowSize: parseInt(process.env.CIRCUIT_BREAKER_WINDOW || '60000'),
    });
  }

  async createCompletionWithUsage(params: {...}): Promise<ClaudeResponse> {
    try {
      return await this.circuitBreaker.execute(async () => {
        // Existing API call logic
        sessionTracker.trackRequest();
        const response = await this.client.messages.create({...});
        // ... existing code ...
        return { content, usage };
      });
    } catch (error: any) {
      if (error instanceof CircuitOpenError) {
        logger.warn(
          { nextAttempt: error.nextAttemptTime },
          'Circuit breaker open, Claude API unavailable'
        );
        throw new Error(`Claude API temporarily unavailable. Retry after ${error.nextAttemptTime.toISOString()}`);
      }
      // Existing error handling (RateLimitError, etc.)
      throw error;
    }
  }

  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }
}
```

---

### Task 13: Update Health Endpoint with Circuit Breaker Status

**Estimated Time**: 1 hour
**Dependencies**: Task 12
**Files to Modify**:
- `backend/src/routes/health.ts`
- `backend/src/routes/__tests__/health.test.ts`

**Description**:
Enhance the health endpoint to include circuit breaker status.

**Acceptance Criteria**:
- [ ] Health endpoint returns claude_api_circuit_state field
- [ ] Field values: 'closed' (healthy), 'open' (unhealthy), 'half_open' (degraded)
- [ ] Health check returns 503 when circuit is open
- [ ] Health check returns 200 when circuit is closed or half-open
- [ ] Response includes next_retry_time when circuit is open
- [ ] Unit tests verify status codes for each circuit state
- [ ] Integration test simulates circuit opening

**Implementation Notes**:
```typescript
// health.ts
import { claudeService } from '../services/claude.service.js';
import { CircuitState } from '../services/circuit-breaker.service.js';

router.get('/health', (req, res) => {
  const circuitState = claudeService.getCircuitState();

  const health = {
    status: circuitState === CircuitState.OPEN ? 'unhealthy' : 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected',
    claude_api_circuit_state: circuitState,
    next_retry_time: circuitState === CircuitState.OPEN
      ? new Date(Date.now() + 60000).toISOString() // Approximate
      : undefined,
  };

  const statusCode = circuitState === CircuitState.OPEN ? 503 : 200;
  res.status(statusCode).json(health);
});
```

---

## Phase 4: Documentation & CLI Commands (Optional - 2 hours)

### Task 14: Add CLI Commands for Backup and Rollback

**Estimated Time**: 1 hour
**Dependencies**: Task 2, Task 3
**Files to Modify**:
- `backend/src/cli.ts`
- `backend/package.json`

**Description**:
Add CLI commands for database backup and migration rollback.

**Acceptance Criteria**:
- [ ] `npm run cli backup` creates manual backup
- [ ] `npm run cli rollback <version>` rolls back to specified version
- [ ] `npm run cli migrations:list` shows migration history
- [ ] Commands have --help documentation
- [ ] Error messages are clear and actionable
- [ ] Test commands manually in development

**Implementation Notes**:
```typescript
// cli.ts
import { program } from 'commander';
import { DatabaseBackupService } from './db/backup.service.js';
import { MigrationRegistry } from './db/migration-registry.service.js';

program
  .command('backup')
  .description('Create a manual database backup')
  .action(async () => {
    const backupService = new DatabaseBackupService();
    const path = await backupService.createBackup('manual');
    console.log(`Backup created: ${path}`);
  });

program
  .command('rollback <version>')
  .description('Rollback migrations to specified version')
  .action(async (version) => {
    const registry = new MigrationRegistry();
    await registry.rollbackToVersion(parseInt(version));
    console.log(`Rolled back to version ${version}`);
  });

program
  .command('migrations:list')
  .description('List all applied migrations')
  .action(() => {
    const registry = new MigrationRegistry();
    const history = registry.getMigrationHistory();
    console.table(history);
  });
```

**Package.json Updates**:
```json
{
  "scripts": {
    "cli:backup": "tsx src/cli.ts backup",
    "cli:rollback": "tsx src/cli.ts rollback",
    "cli:migrations": "tsx src/cli.ts migrations:list"
  }
}
```

---

### Task 15: Update Documentation

**Estimated Time**: 1 hour
**Dependencies**: All previous tasks
**Files to Modify**:
- `backend/README.md`
- Create: `backend/docs/REPOSITORY_PATTERN.md`
- Create: `backend/docs/DATABASE_OPERATIONS.md`

**Description**:
Document the new architecture patterns and operational procedures.

**Acceptance Criteria**:
- [ ] README.md updated with new CLI commands
- [ ] REPOSITORY_PATTERN.md explains how to create new repositories
- [ ] DATABASE_OPERATIONS.md covers backup, rollback, and migration procedures
- [ ] Architecture diagrams included (text-based)
- [ ] Examples of using repositories in services
- [ ] Troubleshooting guide for common issues

**Content Structure**:

**backend/README.md** additions:
```markdown
## Database Operations

### Backups
- Automatic: Created before every migration
- Manual: `npm run cli:backup`
- Location: `data/backups/`

### Migrations
- Apply: `npm run migrate`
- List: `npm run cli:migrations`
- Rollback: `npm run cli:rollback <version>`

### Circuit Breaker
- Monitor: `GET /api/health` shows circuit state
- Reset: Automatic after 1 minute timeout
```

**backend/docs/REPOSITORY_PATTERN.md**:
```markdown
# Repository Pattern Guide

## Creating a New Repository

1. Extend BaseRepository<T>
2. Define table name in constructor
3. Implement mapRowToEntity
4. Add domain-specific methods

## Example
[Include full code example from Task 7]
```

**backend/docs/DATABASE_OPERATIONS.md**:
```markdown
# Database Operations Manual

## Migration Rollback Procedure
1. Check current version: `npm run cli:migrations`
2. Identify target version
3. Create manual backup: `npm run cli:backup`
4. Execute rollback: `npm run cli:rollback <version>`
5. Verify application starts correctly

## Recovery from Failed Migration
[Step-by-step recovery procedure]
```

---

## Testing Checklist

Before marking Sprint 18 complete, verify:

### Unit Tests
- [ ] All new services have >90% coverage
- [ ] Repository tests use in-memory database
- [ ] Circuit breaker tests cover all state transitions
- [ ] Mock dependencies properly isolated

### Integration Tests
- [ ] Migration rollback end-to-end test
- [ ] Repository + service integration test
- [ ] Circuit breaker + Claude API integration test
- [ ] Backup + restore integration test

### Manual Testing
- [ ] Apply migration 016 in development
- [ ] Create manual backup via CLI
- [ ] Rollback migration via CLI
- [ ] Trigger circuit breaker (invalid API key)
- [ ] Verify health endpoint shows circuit state
- [ ] Generate chapter with circuit breaker active

### Regression Testing
- [ ] All existing tests pass
- [ ] No performance regression (benchmark key operations)
- [ ] All API endpoints still work
- [ ] Queue system still processes jobs
- [ ] Frontend still connects to backend

---

## Deployment Order

Deploy in this order to minimize risk:

1. **Phase 1: Database Improvements** (Deploy first)
   - Tasks 1-5
   - Non-breaking changes
   - Can rollback easily

2. **Phase 3: Circuit Breaker** (Deploy second)
   - Tasks 11-13
   - Non-breaking changes
   - Can disable via feature flag

3. **Phase 2: Repository Layer** (Deploy last)
   - Tasks 6-10
   - Breaking changes for services
   - Deploy one service at a time
   - Monitor for issues between deployments

4. **Phase 4: Documentation** (Anytime)
   - Tasks 14-15
   - No code changes to production

---

## Success Metrics

Sprint 18 is successful when:

- [ ] Migration 016 applied in production
- [ ] Automatic backups created before every migration
- [ ] Circuit breaker prevents cascading Claude API failures
- [ ] At least 1 service refactored to use repositories
- [ ] All tests pass with >90% coverage
- [ ] No production incidents related to changes
- [ ] Documentation complete and reviewed

**Total Estimated Time**: 28 hours (3.5 developer days)

---

## Notes for Developer

### Key Principles
1. **Start with tests**: Write tests before implementation (TDD)
2. **Small commits**: Commit after each task completion
3. **Run tests frequently**: After every significant change
4. **Use existing patterns**: Follow mystery-tracking.service.ts as reference
5. **Ask questions**: If design is unclear, flag for architect review

### Common Pitfalls to Avoid
1. Don't modify existing migrations (001-015)
2. Don't skip backup creation before migrations
3. Don't forget to update TypeScript interfaces when adding DB columns
4. Don't use `any` type - find proper types
5. Don't swallow errors - always log with context

### Helpful Commands
```bash
# Run specific test file
npm test -- backup.service.test.ts

# Watch mode during development
npm run test:watch

# Type check without running
npx tsc --noEmit

# Run migration manually
npm run migrate

# Start dev server
npm run dev
```

Good luck! This is solid architectural work that will pay dividends for months.
