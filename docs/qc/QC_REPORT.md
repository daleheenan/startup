# Quality Control Report - NovelForge

**Target**: Full Application (Frontend + Backend)
**Date**: 2026-01-27
**Overall Health Score**: 6.5/10

---

## Executive Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | 2 | 3 | 4 | 3 |
| Bugs | 5 | 10 | 8 | 5 |
| Tests | 2 | 4 | 3 | 2 |
| Performance | 2 | 3 | 4 | 2 |

**Total Issues Found**: 62
**Recommendation**: Fix critical issues immediately (estimated 8-12 hours), then address high priority items over next sprint.

---

## Critical Issues (Immediate Action Required)

### 1. Failing Backend Tests - Metrics Service Types
**File**: `backend/src/services/__tests__/metrics.service.test.ts`
**Issue**: Test mocks missing new required fields (`chapter_input_tokens`, `chapter_output_tokens`, `chapter_cost_usd`, `chapter_cost_gbp`)
**Impact**: CI/CD build failures, tests not validating current implementation

### 2. Security: JWT Secret Not Enforced in Development
**File**: `backend/src/server.ts:25-35`
**Issue**: `JWT_SECRET` only required in production, allowing weak/missing secrets in development
**Impact**: Complete authentication bypass possible in non-production environments

### 3. Bug: Race Condition in Queue Worker Job Pickup
**File**: `backend/src/queue/worker.ts:130-165`
**Issue**: TOCTOU vulnerability between checking `is_locked = 0` and updating job status
**Impact**: Duplicate job processing, wasted API costs, database inconsistencies

### 4. Bug: Memory Leak in GenerationProgress Component
**File**: `app/components/GenerationProgress.tsx:52-90`
**Issue**: Multiple timers created on prop changes, old timers not cleared
**Impact**: Browser memory growth, UI sluggishness, mobile crashes

### 5. Bug: Unsafe JSON Parsing Without Try-Catch
**Files**: `backend/src/queue/worker.ts:953, 1016, 1219`
**Issue**: `JSON.parse()` called without error handling on database columns
**Impact**: Worker crashes on malformed data, all background jobs halt

### 6. Performance: N+1 Query in Chapters Page
**File**: `app/projects/[id]/chapters/page.tsx:82-89`
**Issue**: Sequential API calls for each book's chapters instead of using optimised endpoint
**Impact**: 75% slower page loads for trilogy/series projects

### 7. Performance: N+1 Query in Progress Page
**File**: `app/projects/[id]/progress/page.tsx:194-204`
**Issue**: Same N+1 pattern as chapters page
**Impact**: Significant performance degradation for multi-book projects

---

## Feature Requests for Development

### Feature 1: Fix All Failing Tests
**Priority**: Critical
**Estimated Effort**: 2-3 hours
**Issues Addressed**: TEST-001 through TEST-004

**Description**:
Fix all failing tests to restore CI/CD pipeline health.

**Acceptance Criteria**:
- [ ] Update metrics.service.test.ts mocks with new required fields
- [ ] Fix frontend constants.test.ts borderRadius assertions
- [ ] Fix frontend api.test.ts 401 handling tests
- [ ] Fix useProjects.test.ts error handling tests
- [ ] All 890 frontend tests pass
- [ ] All 1718 backend tests pass

---

### Feature 2: Critical Bug Fixes
**Priority**: Critical
**Estimated Effort**: 4-5 hours
**Issues Addressed**: BUG-001, BUG-004, BUG-005

**Description**:
Fix race conditions, memory leaks, and unsafe JSON parsing that could cause production issues.

**Acceptance Criteria**:
- [ ] Add `safeJsonParse` helper to queue worker
- [ ] Fix GenerationProgress timer cleanup
- [ ] Add proper interval cleanup to 6 pages with polling
- [ ] Queue worker handles malformed JSON gracefully

---

### Feature 3: Security Hardening
**Priority**: Critical
**Estimated Effort**: 2-3 hours
**Issues Addressed**: VULN-001, VULN-004, VULN-007

**Description**:
Address critical security vulnerabilities.

**Acceptance Criteria**:
- [ ] Enforce JWT_SECRET in all environments
- [ ] Add minimum entropy check for JWT_SECRET (32+ chars)
- [ ] Update Next.js to 15.5.10+ to fix CVE
- [ ] Add security headers to Next.js frontend
- [ ] Add column name whitelisting to dynamic UPDATE queries

---

### Feature 4: Performance Optimisations
**Priority**: High
**Estimated Effort**: 2-3 hours
**Issues Addressed**: PERF-001, PERF-002

**Description**:
Fix N+1 query patterns causing slow page loads.

**Acceptance Criteria**:
- [ ] Chapters page uses `useBooksWithChapters` hook instead of sequential fetches
- [ ] Progress page uses optimised `/api/projects/:id/books-with-chapters` endpoint
- [ ] Network tab shows 1 request instead of N+1 for multi-book projects
- [ ] Page load time reduced by 75%+ for trilogy projects

---

### Feature 5: Test Coverage Improvements
**Priority**: High
**Estimated Effort**: 15-20 hours (can be done incrementally)
**Issues Addressed**: TEST-005 through TEST-010

**Description**:
Add missing tests for critical paths.

**Acceptance Criteria**:
- [ ] Frontend auth library tests added
- [ ] Export service content cleaning tests added
- [ ] Database migration integration tests added
- [ ] E2E export flow tests added
- [ ] Test coverage reporting configured

---

## Detailed Reports

- [01_OPTIMIZATION_REPORT.md](./01_OPTIMIZATION_REPORT.md) - Performance analysis
- [02_TEST_REPORT.md](./02_TEST_REPORT.md) - Test coverage analysis
- [03_BUG_REPORT.md](./03_BUG_REPORT.md) - Bug detection report
- [04_SECURITY_REPORT.md](./04_SECURITY_REPORT.md) - Security audit report

---

## Test Results Summary

### Frontend Tests (Vitest)
- **Total**: 890 tests
- **Passing**: 846
- **Failing**: 23
- **Skipped**: 21
- **Files Failing**: 4

### Backend Tests (Jest)
- **Total**: 1718 tests
- **Passing**: 1700
- **Failing**: 3 suites (TypeScript compilation errors)
- **Skipped**: 18

### Failing Test Files

**Frontend**:
1. `app/lib/__tests__/constants.test.ts` (3 failures) - borderRadius validation
2. `app/lib/__tests__/api.test.ts` (3 failures) - 401 handling
3. `app/hooks/__tests__/useProjects.test.ts` (2 failures) - error handling
4. `app/projects/[id]/series/__tests__/page.test.ts` (15 failures) - series page

**Backend**:
1. `src/services/__tests__/metrics.service.test.ts` - Missing type fields

---

## Implementation Priority Order

### Phase 1: Fix Failing Tests (Day 1)
1. Fix metrics.service.test.ts type errors
2. Fix frontend test assertions
3. Verify all tests pass

### Phase 2: Critical Fixes (Day 1-2)
1. Add safeJsonParse to queue worker
2. Fix GenerationProgress memory leak
3. Add interval cleanup to polling pages
4. Enforce JWT_SECRET in all environments
5. Add security headers to Next.js

### Phase 3: Performance (Day 2)
1. Fix N+1 queries in chapters page
2. Fix N+1 queries in progress page
3. Create database migration for job indexes

### Phase 4: Security (Day 2-3)
1. Update Next.js version
2. Add column whitelisting to UPDATE queries
3. Path validation in backup service

### Phase 5: Test Coverage (Ongoing)
1. Add auth library tests
2. Add export service tests
3. Add E2E export tests

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Queue worker crash on bad data | High | Critical | Add safeJsonParse |
| Authentication bypass in dev | Medium | Critical | Enforce JWT_SECRET |
| Memory leak causing mobile crashes | Medium | High | Fix timer cleanup |
| Slow page loads frustrating users | High | Medium | Fix N+1 queries |
| Security vulnerability exploitation | Low | Critical | Update Next.js |

---

## Conclusion

NovelForge has solid architectural foundations but requires immediate attention to:
1. **Test failures** - 26 failing tests blocking CI/CD
2. **Critical bugs** - Race conditions and memory leaks affecting stability
3. **Security gaps** - JWT secret enforcement and dependency updates

Addressing all critical issues requires approximately **8-12 hours** of focused work. The application will reach a **health score of 8/10** after implementing the recommended fixes.

---

**Report Generated**: 2026-01-27
**QC Pipeline**: Code Optimizer + Test Architect + Bug Hunter + Security Hardener
**Review Status**: Ready for Implementation
