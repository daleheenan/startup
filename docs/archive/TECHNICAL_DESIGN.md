# Technical Design: Sprint 18 - Database & Architecture Improvements

**Author**: Dr. James Okafor, Principal Software Architect
**Date**: 2026-01-25
**Sprint**: 18
**Project**: NovelForge Backend

---

## Executive Summary

Sprint 18 focuses on improving the robustness and maintainability of the NovelForge backend through three key architectural improvements:

1. **Database Migration System Enhancements** - Add proper tracking, rollback support, and automated backups
2. **Repository Layer Abstraction** - Separate data access concerns from business logic
3. **Circuit Breaker Pattern** - Add resilience to external API calls (Claude API)

These improvements follow SOLID principles and prepare the system for production-grade reliability.

---

## 1. Architecture Overview

### Current State

```
┌─────────────┐
│   Routes    │ → Direct DB access via db.prepare()
└─────────────┘
       ↓
┌─────────────┐
│  Services   │ → Direct DB access via db.prepare()
└─────────────┘
       ↓
┌─────────────┐
│  Database   │ → SQLite with basic migrations
└─────────────┘
```

**Issues**:
- Business logic mixed with SQL queries
- No rollback mechanism for failed migrations
- No backup strategy before schema changes
- Claude API calls have no circuit breaker protection
- SQL queries repeated across multiple files

### Target State

```
┌─────────────┐
│   Routes    │ → Parse/validate requests, call services
└─────────────┘
       ↓
┌─────────────┐
│  Services   │ → Business logic only
└─────────────┘
       ↓
┌──────────────────┐
│  Repositories    │ → Data access abstraction
└──────────────────┘
       ↓
┌─────────────────────┐
│  Database Layer     │ → Query monitoring, backups
└─────────────────────┘

External API Calls (Claude):
┌─────────────┐
│  Services   │
└─────────────┘
       ↓
┌──────────────────────┐
│  Circuit Breaker     │ → Fail fast, automatic recovery
└──────────────────────┘
       ↓
┌─────────────────────┐
│  Claude API         │
└─────────────────────┘
```

**Benefits**:
- Testable business logic (services don't touch DB directly)
- Reusable data access patterns
- Safe migrations with rollback
- Automatic database backups
- Resilient external API integration

---

## 2. Component Design

### 2.1 Database Migration System

#### Migration Registry Service

**Purpose**: Track all migrations with metadata, enable rollback support

**Location**: `backend/src/db/migration-registry.service.ts`

**Responsibilities**:
- Register migration metadata (version, name, up/down SQL)
- Track migration history with checksums
- Execute rollback procedures
- Validate migration integrity

**Interface**:
```typescript
interface MigrationMetadata {
  version: number;
  name: string;
  upSql: string;      // Forward migration
  downSql?: string;   // Rollback SQL (optional)
  checksum: string;   // SHA-256 hash of upSql
  appliedAt?: string;
  rolledBackAt?: string;
}

class MigrationRegistry {
  registerMigration(metadata: MigrationMetadata): void;
  getMigrationHistory(): MigrationMetadata[];
  rollbackToVersion(version: number): Promise<void>;
  validateMigrationIntegrity(): boolean;
}
```

**Database Schema Addition**:
```sql
-- Enhanced schema_migrations table
ALTER TABLE schema_migrations ADD COLUMN name TEXT;
ALTER TABLE schema_migrations ADD COLUMN checksum TEXT;
ALTER TABLE schema_migrations ADD COLUMN rolled_back_at TEXT;
```

#### Database Backup Service

**Purpose**: Automated backups before migrations, manual backups on demand

**Location**: `backend/src/db/backup.service.ts`

**Responsibilities**:
- Create timestamped database backups
- Verify backup integrity
- Restore from backup
- Manage backup retention (keep last 10)

**Interface**:
```typescript
class DatabaseBackupService {
  createBackup(reason: string): Promise<string>; // Returns backup path
  restoreFromBackup(backupPath: string): Promise<void>;
  listBackups(): BackupInfo[];
  cleanOldBackups(keepCount: number): void;
}
```

**Backup Strategy**:
- Automatic: Before every migration
- Manual: CLI command for on-demand backups
- Retention: Keep last 10 backups, delete older ones
- Location: `data/backups/novelforge-YYYY-MM-DD-HHmmss.db`

#### Query Performance Monitor

**Purpose**: Log slow queries, identify performance bottlenecks

**Location**: `backend/src/db/query-monitor.service.ts`

**Responsibilities**:
- Intercept database queries via better-sqlite3 verbose mode
- Measure query execution time
- Log queries exceeding threshold (default: 100ms)
- Aggregate slow query statistics

**Interface**:
```typescript
class QueryMonitor {
  startMonitoring(threshold?: number): void;
  stopMonitoring(): void;
  getSlowQueries(): SlowQuery[];
  clearStats(): void;
}

interface SlowQuery {
  sql: string;
  duration: number;
  timestamp: string;
  params?: any[];
}
```

**Implementation**:
- Hook into `verbose` callback in connection.ts
- Parse SQL and timing data
- Store last 100 slow queries in memory
- Expose stats via admin endpoint

---

### 2.2 Repository Layer Abstraction

#### Base Repository

**Purpose**: Generic CRUD operations with type safety

**Location**: `backend/src/repositories/base.repository.ts`

**Responsibilities**:
- Generic CRUD methods (findById, findAll, create, update, delete)
- Query building helpers
- Transaction support
- Error handling

**Interface**:
```typescript
abstract class BaseRepository<T> {
  protected tableName: string;

  findById(id: string): T | null;
  findAll(filters?: Record<string, any>): T[];
  create(data: Partial<T>): T;
  update(id: string, data: Partial<T>): T;
  delete(id: string): void;

  // Transaction support
  transaction<R>(callback: () => R): R;
}
```

#### Domain Repositories

**Purpose**: Encapsulate data access for each domain entity

**Locations**:
- `backend/src/repositories/project.repository.ts`
- `backend/src/repositories/book.repository.ts`
- `backend/src/repositories/chapter.repository.ts`
- `backend/src/repositories/mystery.repository.ts`

**Pattern**:
```typescript
class ProjectRepository extends BaseRepository<Project> {
  constructor() {
    super('projects');
  }

  // Domain-specific queries
  findByStatus(status: string): Project[];
  findWithBooks(projectId: string): ProjectWithBooks;
  updateStoryDNA(projectId: string, storyDna: any): void;
}
```

#### Service Integration

**Changes to Services**:
- Remove direct `db.prepare()` calls
- Inject repositories via constructor
- Services become pure business logic

**Example Refactor**:
```typescript
// Before
class MysteryTrackingService {
  getSeriesMysteries(seriesId: string): SeriesMystery[] {
    const stmt = db.prepare(`SELECT * FROM series_mysteries WHERE series_id = ?`);
    const rows = stmt.all(seriesId);
    return rows.map(row => this.rowToMystery(row));
  }
}

// After
class MysteryTrackingService {
  constructor(private mysteryRepo: MysteryRepository) {}

  getSeriesMysteries(seriesId: string): SeriesMystery[] {
    return this.mysteryRepo.findBySeriesId(seriesId);
  }
}
```

---

### 2.3 Circuit Breaker Pattern for Claude API

#### Circuit Breaker Implementation

**Purpose**: Protect system from cascading failures when Claude API is down

**Location**: `backend/src/services/circuit-breaker.service.ts`

**Responsibilities**:
- Track success/failure rates of external calls
- Automatically open circuit when failure threshold exceeded
- Half-open state to test recovery
- Closed state for normal operation

**States**:
```
CLOSED (Normal) → OPEN (Failing) → HALF_OPEN (Testing) → CLOSED
       ↓              ↓                    ↓
   Success        Failures           Test Request
                  (5 in 1min)         (Success/Fail)
```

**Interface**:
```typescript
enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, reject immediately
  HALF_OPEN = 'half_open' // Testing recovery
}

interface CircuitBreakerOptions {
  failureThreshold: number;    // Open circuit after N failures
  successThreshold: number;    // Close after N successes in half-open
  timeout: number;             // Time to wait before half-open (ms)
  windowSize: number;          // Rolling window for failure tracking (ms)
}

class CircuitBreaker<T> {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number[] = []; // Timestamps of failures
  private lastFailureTime?: number;

  async execute(fn: () => Promise<T>): Promise<T>;
  getState(): CircuitState;
  getStats(): CircuitBreakerStats;
  reset(): void;
}
```

**Configuration** (in .env):
```
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=2
CIRCUIT_BREAKER_TIMEOUT=60000  # 1 minute
CIRCUIT_BREAKER_WINDOW=60000   # 1 minute
```

#### Integration with ClaudeService

**Changes to claude.service.ts**:
```typescript
class ClaudeService {
  private circuitBreaker: CircuitBreaker<ClaudeResponse>;

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      windowSize: 60000,
    });
  }

  async createCompletionWithUsage(params: {...}): Promise<ClaudeResponse> {
    return this.circuitBreaker.execute(async () => {
      // Existing API call logic
      const response = await this.client.messages.create(...);
      return { content: ..., usage: ... };
    });
  }
}
```

**Error Handling**:
- Open circuit: Throw `CircuitOpenError` immediately (fail fast)
- Closed circuit: Normal error handling (rate limits, API errors)
- Half-open circuit: Test request, open or close based on result

**Monitoring**:
- Expose circuit state via health endpoint: `GET /health`
- Log state transitions (closed→open, half-open→closed)
- Track failure rates in metrics

---

## 3. Data Model Changes

### 3.1 Enhanced schema_migrations Table

```sql
-- Migration 016: Enhanced migration tracking
ALTER TABLE schema_migrations ADD COLUMN name TEXT;
ALTER TABLE schema_migrations ADD COLUMN checksum TEXT;
ALTER TABLE schema_migrations ADD COLUMN rolled_back_at TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);
```

### 3.2 New query_performance Table

```sql
-- Migration 016: Query performance monitoring
CREATE TABLE IF NOT EXISTS query_performance (
  id TEXT PRIMARY KEY,
  sql TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  timestamp TEXT DEFAULT (datetime('now')),
  params TEXT -- JSON array of parameters
);

CREATE INDEX IF NOT EXISTS idx_query_performance_duration ON query_performance(duration_ms DESC);
CREATE INDEX IF NOT EXISTS idx_query_performance_timestamp ON query_performance(timestamp);
```

**Retention**: Keep last 1000 slow queries, auto-delete older ones.

---

## 4. Technology Choices

### 4.1 Database Backups

**Technology**: Native SQLite `.backup` command via better-sqlite3

**Rationale**:
- SQLite's built-in backup is atomic and crash-safe
- better-sqlite3 exposes this via `.backup()` method
- No external dependencies needed
- Faster than file copy (handles WAL mode correctly)

### 4.2 Query Monitoring

**Technology**: better-sqlite3 `verbose` callback + in-memory storage

**Rationale**:
- Zero overhead when disabled
- Minimal overhead when enabled (already logging in dev)
- No external APM tools needed for MVP
- Can migrate to full APM (Datadog, New Relic) later

### 4.3 Circuit Breaker

**Technology**: Custom implementation (no external library)

**Rationale**:
- Opossum/cockatiel libraries add 200KB+ dependencies
- Our needs are simple (one external API)
- Custom implementation is <100 lines, easier to maintain
- Educational value for team

---

## 5. Security Considerations

### 5.1 Migration Security

**Threats**:
- Malicious SQL in migration files
- Accidental data loss from bad migrations
- Unauthorized rollbacks

**Mitigations**:
- Migration files are version-controlled (code review)
- Automatic backups before every migration
- Rollback requires explicit version number (no auto-rollback)
- Migration checksums detect tampering

### 5.2 Backup Security

**Threats**:
- Backups contain sensitive data (user passwords, API keys)
- Backup files readable by unauthorized users

**Mitigations**:
- Backups stored in `data/backups/` (same permissions as main DB)
- Add to .gitignore (never commit backups)
- Railway deployment: Backups in volume (not in container)
- Future: Encrypt backups at rest (Phase 2)

### 5.3 Circuit Breaker Security

**Threats**:
- Circuit state manipulation
- DoS by forcing circuit open

**Mitigations**:
- Circuit state not exposed to clients (internal only)
- Health endpoint shows state but doesn't allow modification
- Reset endpoint requires admin auth (future enhancement)

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Migration Registry** (`migration-registry.service.test.ts`):
- Test migration registration
- Test rollback logic
- Test checksum validation
- Test error handling (duplicate versions, invalid SQL)

**Backup Service** (`backup.service.test.ts`):
- Test backup creation
- Test restore functionality
- Test backup retention (auto-delete old backups)
- Test error handling (disk full, permissions)

**Query Monitor** (`query-monitor.service.test.ts`):
- Test slow query detection
- Test stats aggregation
- Test memory limits (max 100 queries)

**Circuit Breaker** (`circuit-breaker.service.test.ts`):
- Test state transitions (closed→open→half-open→closed)
- Test failure threshold
- Test timeout behavior
- Test success recovery

**Repositories** (`*.repository.test.ts`):
- Test CRUD operations
- Test domain-specific queries
- Test transaction support
- Use in-memory database for isolation

### 6.2 Integration Tests

**Migration System** (`migrate.integration.test.ts`):
- Test full migration cycle (up + down)
- Test backup creation before migration
- Test rollback from backup
- Use temporary database

**Circuit Breaker + Claude** (`claude-circuit-breaker.integration.test.ts`):
- Test circuit opening on repeated failures
- Test circuit recovery
- Mock Claude API responses
- Verify rate limit interaction

### 6.3 Manual Testing Scenarios

**Migration Rollback**:
1. Apply migration 016
2. Verify schema changes
3. Rollback to version 015
4. Verify schema restored
5. Verify backup exists

**Circuit Breaker**:
1. Disable Claude API (invalid key)
2. Trigger 5 chapter generation jobs
3. Verify circuit opens
4. Verify subsequent jobs fail fast
5. Restore API key
6. Verify circuit closes after timeout

**Query Monitoring**:
1. Enable verbose mode
2. Run slow query (e.g., full table scan)
3. Check `/api/admin/slow-queries` endpoint
4. Verify query logged with duration

---

## 7. Performance Considerations

### 7.1 Repository Layer Overhead

**Concern**: Extra function calls might slow down queries

**Analysis**:
- Repository methods are thin wrappers (~5 lines)
- JavaScript function call overhead: <0.1ms
- Database query time: 1-100ms (dominates)
- **Overhead: <1%** - negligible

**Optimization**: None needed at this scale.

### 7.2 Query Monitoring Overhead

**Concern**: Logging every query might slow down the system

**Analysis**:
- Verbose mode already enabled in development
- Only logs queries exceeding threshold (100ms)
- In-memory storage (no disk I/O)
- Production: Disable verbose mode (only log slow queries)

**Configuration**:
```
NODE_ENV=production  # Disables verbose mode
SLOW_QUERY_THRESHOLD=100  # Only log queries >100ms
```

### 7.3 Circuit Breaker Overhead

**Concern**: Checking circuit state on every API call

**Analysis**:
- State check is O(1) operation (enum comparison)
- Failure tracking: Array filter (~5 elements)
- Overhead: <0.01ms per call
- **Negligible impact**

---

## 8. Deployment Strategy

### 8.1 Migration Path

**Phase 1: Database Improvements (Non-breaking)**
1. Deploy migration 016 (enhanced schema_migrations)
2. Deploy backup service
3. Deploy query monitoring

**Phase 2: Repository Layer (Breaking for services)**
1. Create base repository
2. Create domain repositories
3. Refactor one service at a time (start with simplest)
4. Deploy incrementally

**Phase 3: Circuit Breaker (Non-breaking)**
1. Deploy circuit breaker service
2. Integrate with ClaudeService
3. Monitor circuit state in production

### 8.2 Rollback Plan

**If migration 016 fails**:
- Automatic rollback via transaction
- Restore from auto-backup

**If repository refactor causes issues**:
- Feature flag: `USE_REPOSITORY_LAYER=true/false`
- Gradual rollout: One service at a time
- Rollback: Revert to previous service implementation

**If circuit breaker causes issues**:
- Disable via feature flag: `CIRCUIT_BREAKER_ENABLED=false`
- Falls back to existing error handling

### 8.3 Monitoring

**Key Metrics**:
- Migration success/failure rate
- Backup creation time
- Slow query count per hour
- Circuit breaker state transitions
- Circuit breaker failure rate

**Alerts**:
- Migration failure → Slack notification
- Circuit open for >5 minutes → Slack notification
- >10 slow queries per hour → Warning

---

## 9. Future Enhancements (Out of Scope)

These are intentionally deferred to keep Sprint 18 focused:

1. **Read Replicas**: Separate read/write databases for scaling
2. **Connection Pooling**: Currently using single connection (fine for SQLite)
3. **Distributed Tracing**: Full request tracing (OpenTelemetry)
4. **Advanced Query Optimization**: Query planner hints, materialized views
5. **Multi-Region Backups**: Offsite backup storage (S3, GCS)
6. **Circuit Breaker Dashboard**: Real-time visualization (Grafana)

---

## 10. Success Criteria

Sprint 18 is successful when:

1. **Database Migrations**:
   - [ ] Migration registry tracks all migrations with checksums
   - [ ] Automatic backups created before every migration
   - [ ] Rollback command works (tested manually)
   - [ ] Slow queries logged to query_performance table

2. **Repository Layer**:
   - [ ] Base repository implemented with CRUD operations
   - [ ] At least 3 domain repositories created (Project, Book, Chapter)
   - [ ] At least 1 service refactored to use repositories
   - [ ] All existing tests pass

3. **Circuit Breaker**:
   - [ ] Circuit breaker service implemented and tested
   - [ ] ClaudeService integrated with circuit breaker
   - [ ] Circuit state visible in health endpoint
   - [ ] Circuit opens after 5 failures, closes after recovery

4. **Testing**:
   - [ ] 90%+ code coverage for new services
   - [ ] Integration tests for critical paths
   - [ ] No regressions in existing functionality

5. **Documentation**:
   - [ ] README updated with new architecture
   - [ ] CLI commands documented (backup, rollback)
   - [ ] Repository pattern examples in docs

---

## 11. Open Questions & Risks

### Open Questions

1. **Q**: Should repositories use prepared statements or query builders?
   - **A**: Prepared statements (simpler, already used everywhere)

2. **Q**: Should circuit breaker be per-service or global?
   - **A**: Global for Claude API (only one external service)

3. **Q**: How to handle migrations in development vs production?
   - **A**: Same process, but dev can rollback freely

### Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Migration rollback fails | Low | High | Extensive testing, automatic backups |
| Repository layer breaks existing code | Medium | High | Gradual refactor, feature flags |
| Circuit breaker false positives | Low | Medium | Tune thresholds in production |
| Performance regression | Low | Low | Benchmark before/after |

---

## 12. Architecture Principles Applied

This design follows these architectural principles:

1. **Separation of Concerns** (SRP):
   - Services: Business logic only
   - Repositories: Data access only
   - Routes: Request/response handling only

2. **Open/Closed Principle**:
   - Base repository is open for extension (subclasses)
   - Closed for modification (stable interface)

3. **Dependency Inversion**:
   - Services depend on repository interfaces, not concrete implementations
   - Easy to swap SQLite for PostgreSQL later

4. **Fail Fast**:
   - Circuit breaker rejects requests immediately when open
   - No cascading timeouts

5. **Defense in Depth**:
   - Multiple layers of protection (backups + rollback + transactions)

---

## Conclusion

Sprint 18 transforms NovelForge from a prototype to a production-ready system. The migration improvements ensure database safety. The repository layer enables testability and maintainability. The circuit breaker adds resilience to external dependencies.

Total estimated effort: **24-32 hours** (3-4 developer days)

This is a solid investment in technical foundation that will pay dividends in future sprints.
