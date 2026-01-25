# NovelForge - Sprint Plan (Sprints 12-15)

## Overview

This document details the development plan for Sprints 12-15, focusing on testing infrastructure, mystery tracking, logging/observability, and performance optimization.

**Total Story Points:** 142 points
**Total Sessions:** ~6-8 Claude Max sessions
**Duration:** Approximately 1-2 weeks (calendar time)
**Team:** Solo developer + AI agents

---

## Sprint Summary

| Sprint | Focus | Points | Sessions | Priority |
|--------|-------|--------|----------|----------|
| Sprint 12 | Testing & Missing Features | 45 | 2 | CRITICAL |
| Sprint 13 | Extended Testing & Frontend | 32 | 1-2 | HIGH |
| Sprint 14 | Logging & Observability | 30 | 1-2 | MEDIUM |
| Sprint 15 | Performance Optimization | 35 | 2 | MEDIUM |
| **TOTAL** | | **142** | **6-8** | |

---

## Sprint 12: Testing & Missing Features

**Sessions:** 1-2
**Story Points:** 45
**Duration:** 1-2 days
**Dependencies:** None (post-production sprint)
**Priority:** CRITICAL

### Sprint Goal

Establish automated testing infrastructure and implement the mystery tracking feature that was identified as a gap during project verification.

### Key Deliverables

- Jest + Supertest testing framework configured
- Unit tests for 5 core services (70%+ coverage)
- Integration tests for trilogy API endpoints
- Mystery tracking implementation in SeriesBibleGeneratorService
- API endpoint for mystery tracking

### Tasks

| Task | Points | Priority | Description |
|------|--------|----------|-------------|
| 12.1 Test Framework Setup | 3 | P0 | Install Jest, Supertest, ts-jest; create jest.config.js |
| 12.2 CrossBookContinuityService Tests | 5 | P0 | Unit tests for all methods, mock Claude API |
| 12.3 SeriesBibleGeneratorService Tests | 5 | P0 | Unit tests for aggregation and generation |
| 12.4 BookTransitionService Tests | 5 | P0 | Unit tests for transition generation |
| 12.5 ChapterGenerationService Tests | 5 | P0 | Unit tests for context assembly and generation |
| 12.6 EditingPipelineService Tests | 5 | P0 | Unit tests for all 4 editing agents |
| 12.7 Trilogy API Integration Tests | 8 | P0 | E2E tests for all 9 trilogy endpoints |
| 12.8 Mystery Tracking Implementation | 8 | P1 | Claude-based mystery extraction and tracking |
| 12.9 Mystery Tracking API | 3 | P1 | GET/POST endpoints for mystery status |

### Success Criteria

- [ ] `npm test` runs successfully with 70%+ coverage on services
- [ ] All trilogy API endpoints have integration tests
- [ ] Mystery tracking extracts questions from chapter content
- [ ] Mystery tracking identifies answers with book/chapter references
- [ ] Outstanding mysteries tracked at series level
- [ ] Series bible export includes mysteries section

### Technical Requirements

```bash
# Dev dependencies to install
npm install -D jest @types/jest ts-jest supertest @types/supertest
```

**jest.config.js:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/services/**/*.ts'],
  coverageThreshold: {
    global: { branches: 70, functions: 70, lines: 70, statements: 70 }
  }
};
```

### Mystery Tracking Data Structure

```typescript
interface SeriesMystery {
  id: string;
  question: string;           // "Who killed the king?"
  raisedIn: {
    bookNumber: number;
    chapterNumber: number;
    context: string;          // Excerpt where question is raised
  };
  answeredIn?: {
    bookNumber: number;
    chapterNumber: number;
    answer: string;           // How it was resolved
  };
  status: 'open' | 'resolved' | 'red_herring';
  importance: 'major' | 'minor' | 'subplot';
}
```

### Recommended Agents

- **qa-test-engineer** - Create test suite and configuration
- **developer** - Implement mystery tracking feature

### End-of-Sprint Demo

- Run `npm test` showing all tests passing
- Show coverage report at 70%+
- Generate series bible with mysteries section
- View mystery tracking API response

---

## Sprint 13: Extended Testing & Frontend

**Sessions:** 1-2
**Story Points:** 32
**Duration:** 1 day
**Dependencies:** Sprint 12 (test framework must be configured)
**Priority:** HIGH

### Sprint Goal

Extend test coverage to authentication, queue worker, and frontend components.

### Key Deliverables

- Auth middleware tests with JWT validation
- Queue worker state machine tests
- Frontend testing with React Testing Library
- Real-time progress component tests

### Tasks

| Task | Points | Priority | Description |
|------|--------|----------|-------------|
| 13.1 Auth Middleware Tests | 5 | P0 | JWT validation, expired tokens, invalid tokens |
| 13.2 Queue Worker Tests | 8 | P0 | State transitions, pause/resume, checkpoint recovery |
| 13.3 Rate Limit Handler Tests | 3 | P0 | Rate limit detection, auto-resume timing |
| 13.4 Checkpoint Recovery Tests | 3 | P0 | Crash recovery, partial completion handling |
| 13.5 Frontend Test Setup | 3 | P1 | Install React Testing Library, Vitest |
| 13.6 Progress Stream Tests | 5 | P1 | SSE connection, real-time updates, reconnection |
| 13.7 Trilogy UI Tests | 5 | P1 | Book management, series bible display |

### Success Criteria

- [ ] Auth middleware has 90%+ coverage
- [ ] Queue worker state machine fully tested
- [ ] Rate limit handling verified with mock timers
- [ ] Checkpoint recovery tested with crash simulation
- [ ] Frontend components render without errors
- [ ] Progress stream handles disconnection gracefully

### Test Examples

**Auth Middleware Test:**
```typescript
describe('requireAuth middleware', () => {
  it('rejects requests without token', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });

  it('rejects expired tokens', async () => {
    const expiredToken = jwt.sign({ userId: 1 }, SECRET, { expiresIn: '-1h' });
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });

  it('accepts valid tokens', async () => {
    const validToken = jwt.sign({ userId: 1 }, SECRET, { expiresIn: '1h' });
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
  });
});
```

### Recommended Agents

- **qa-test-engineer** - Backend test extensions
- **frontend-agent** - Frontend testing setup

### End-of-Sprint Demo

- Show auth middleware test suite
- Demonstrate queue worker state transitions in tests
- Run frontend tests with React Testing Library

---

## Sprint 14: Logging & Observability

**Sessions:** 1-2
**Story Points:** 30
**Duration:** 1 day
**Dependencies:** None
**Priority:** MEDIUM

### Sprint Goal

Replace console.log statements with structured logging and add production monitoring capabilities.

### Key Deliverables

- Structured logging with pino
- Request correlation IDs
- Error tracking with Sentry
- Claude API health check endpoint

### Tasks

| Task | Points | Priority | Description |
|------|--------|----------|-------------|
| 14.1 Install Pino Logger | 3 | P0 | Configure pino with pretty-print for dev |
| 14.2 Create Logger Service | 5 | P0 | Centralized logger with context support |
| 14.3 Replace Console.log (Routes) | 5 | P0 | Update all 15 route files |
| 14.4 Replace Console.log (Services) | 5 | P0 | Update all 18 service files |
| 14.5 Request Correlation IDs | 3 | P1 | Add X-Request-ID middleware |
| 14.6 Sentry Integration | 5 | P1 | Error tracking and alerting |
| 14.7 Claude API Health Check | 3 | P1 | `/health/claude` endpoint |
| 14.8 Log Level Configuration | 1 | P2 | Environment-based log levels |

### Success Criteria

- [ ] All 290 console.log statements replaced
- [ ] Logs are JSON-formatted in production
- [ ] Logs are pretty-printed in development
- [ ] Every request has a correlation ID
- [ ] Errors automatically reported to Sentry
- [ ] Claude API status visible in health check
- [ ] Log levels configurable via LOG_LEVEL env var

### Logger Service Structure

```typescript
// src/services/logger.service.ts
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
});

export const createLogger = (context: string) => logger.child({ context });

// Usage:
// const log = createLogger('ChapterGenerationService');
// log.info({ chapterId }, 'Starting chapter generation');
// log.error({ error, chapterId }, 'Chapter generation failed');
```

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2026-01-24T12:00:00Z",
  "services": {
    "database": { "status": "up", "latency": 2 },
    "claude": { "status": "up", "model": "claude-opus-4-5-20251101" },
    "queue": { "status": "running", "pending": 5, "active": 1 }
  }
}
```

### Recommended Agents

- **developer** - Logger implementation
- **code-optimizer** - Efficient log replacement

### End-of-Sprint Demo

- Show structured logs in production format
- Demonstrate correlation ID tracking across request
- View Sentry error dashboard
- Check Claude API health endpoint

---

## Sprint 15: Performance Optimization

**Sessions:** 2
**Story Points:** 35
**Duration:** 1-2 days
**Dependencies:** Sprint 14 (logging helps identify bottlenecks)
**Priority:** MEDIUM

### Sprint Goal

Optimize database queries, implement caching, and improve frontend rendering performance.

### Key Deliverables

- N+1 query fix for books/chapters
- Database indexes on frequently queried columns
- Project-level caching layer
- React Query for frontend data fetching
- Virtualized chapter lists

### Tasks

| Task | Points | Priority | Description |
|------|--------|----------|-------------|
| 15.1 Books-With-Chapters Endpoint | 5 | P0 | Single query with JOINs for project data |
| 15.2 Database Index: jobs.target_id | 2 | P0 | Add index for job lookups |
| 15.3 Database Index: jobs(status, created_at) | 2 | P0 | Composite index for queue queries |
| 15.4 Database Index: chapters(book_id, chapter_number) | 2 | P0 | Composite index for chapter ordering |
| 15.5 Project Cache Layer | 8 | P1 | In-memory cache with TTL for project data |
| 15.6 Batch Claude API Calls | 5 | P1 | Combine editing agent calls where possible |
| 15.7 React Query Setup | 5 | P1 | Install and configure for data fetching |
| 15.8 Fix useProgressStream Re-renders | 3 | P1 | Optimize state updates |
| 15.9 Virtualized Chapter List | 3 | P2 | react-window for long chapter lists |

### Success Criteria

- [ ] Project load time reduced by 50%+
- [ ] N+1 query eliminated (1 query instead of N+1)
- [ ] Database indexes verified with EXPLAIN QUERY PLAN
- [ ] Cache hit rate > 80% for project data
- [ ] Frontend re-renders reduced by 50%+
- [ ] Chapter list renders 100+ chapters smoothly

### Database Index Migrations

```sql
-- 005_performance_indexes.sql
CREATE INDEX IF NOT EXISTS idx_jobs_target_id ON jobs(target_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_chapters_book_order ON chapters(book_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_books_project_order ON books(project_id, book_number);
```

### Cache Service Structure

```typescript
// src/services/cache.service.ts
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T, ttl = this.defaultTTL): void {
    this.cache.set(key, { data, expiresAt: Date.now() + ttl });
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) this.cache.delete(key);
    }
  }
}
```

### Recommended Agents

- **code-optimizer** - Performance optimization
- **developer** - Cache and query implementation

### End-of-Sprint Demo

- Compare project load times before/after
- Show EXPLAIN QUERY PLAN using indexes
- Demonstrate cache hit/miss logging
- Show smooth scrolling through 100+ chapters

---

## Cross-Sprint Dependencies

```
Sprint 12 (Testing & Features)
  ↓
Sprint 13 (Extended Testing) ← depends on Sprint 12 test framework
  ↓
Sprint 14 (Logging) ← independent, can run in parallel with 13
  ↓
Sprint 15 (Performance) ← benefits from Sprint 14 logging for profiling
```

**Parallel Execution Option:** Sprints 13 and 14 can run in parallel if resources allow.

---

## Definition of Done (All Sprints)

A sprint is considered complete when:

- [ ] All P0 tasks are completed
- [ ] Success criteria met
- [ ] Tests written and passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] No critical bugs
- [ ] Demo successful

---

## Session Budget Tracking

| Sprint | Planned Sessions | Actual Sessions | Variance | Notes |
|--------|-----------------|-----------------|----------|-------|
| Sprint 12 | 2 | | | |
| Sprint 13 | 1-2 | | | |
| Sprint 14 | 1-2 | | | |
| Sprint 15 | 2 | | | |
| **TOTAL** | **6-8** | | | |

---

## Risk Register

| Sprint | Risk | Probability | Impact | Mitigation |
|--------|------|-------------|--------|------------|
| Sprint 12 | Mock Claude API complexity | Medium | Medium | Use jest.mock with realistic responses |
| Sprint 12 | Mystery extraction accuracy | Medium | Low | Start with simple pattern matching, iterate |
| Sprint 13 | Queue worker test isolation | Medium | Medium | Use separate test database |
| Sprint 14 | Log replacement breaks functionality | Low | High | Incremental replacement with tests |
| Sprint 15 | Cache invalidation bugs | Medium | Medium | Conservative TTL, explicit invalidation |

---

## Agent Allocation

| Sprint | Primary Agent | Secondary Agent |
|--------|---------------|-----------------|
| Sprint 12 | qa-test-engineer | developer |
| Sprint 13 | qa-test-engineer | frontend-agent |
| Sprint 14 | developer | code-optimizer |
| Sprint 15 | code-optimizer | developer |

---

## Quick Reference: Story Point Totals

| Category | Points |
|----------|--------|
| Testing Infrastructure | 45 |
| Extended Testing | 32 |
| Logging & Observability | 30 |
| Performance | 35 |
| **TOTAL** | **142** |

---

**Created:** 2026-01-24
**Version:** 1.0
**Status:** Ready for Execution
