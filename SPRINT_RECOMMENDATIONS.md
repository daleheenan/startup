# NovelForge Sprint Recommendations

Based on comprehensive code reviews by 8 specialized agents, here are the prioritized recommendations for future sprints.

---

## 🚨 HIGH PRIORITY - Next Sprint (Sprint 12)

These items were identified as critical gaps during Project Director verification:

| Item | Priority | Reason |
|------|----------|--------|
| **Automated Test Suite** | CRITICAL | Zero test coverage - build passes but no automated verification |
| **Mystery Tracking** | HIGH | Framework exists in SeriesBibleGeneratorService but not implemented |

**Estimated Points:** 40-50
**Recommended Agents:** qa-test-engineer, developer

---

## Completed in This Session

### Critical Bug Fixes (5)
- [x] **BUG-001**: Race condition in job pickup - Fixed with atomic transaction
- [x] **BUG-002**: EventSource memory leak - Fixed by using useRef instead of useState
- [x] **BUG-003**: Hardcoded localhost URLs - Fixed to use API_BASE_URL
- [x] **BUG-004**: Missing error handling in migrations - Added try/catch with rollback
- [x] **BUG-005**: Graceful shutdown not waiting - Now awaits job completion

### Security Hardening
- [x] Added `helmet` for security headers
- [x] Added `express-rate-limit` for auth and API endpoints
- [x] Added request size limits (`express.json({ limit: '1mb' })`)

### New Features
- [x] Multi-genre selection with modifiers (Political, Military, etc.)
- [x] Concept refinement with user feedback
- [x] Save concepts for later generation

---

## Sprint 12: Testing & Missing Features (HIGH PRIORITY)

> **Note:** These items were identified as gaps during Project Director verification on 2026-01-24.

### Priority 1 - Automated Test Suite (CRITICAL)
- [ ] Add Jest + Supertest as dev dependencies
- [ ] Create test configuration (jest.config.js)
- [ ] Write unit tests for core services:
  - [ ] CrossBookContinuityService
  - [ ] SeriesBibleGeneratorService
  - [ ] BookTransitionService
  - [ ] ChapterGenerationService
  - [ ] EditingPipelineService
- [ ] Write integration tests for trilogy API endpoints
- [ ] Write E2E test for complete trilogy generation workflow
- [ ] Add `npm test` script to package.json
- [ ] Target 70%+ coverage on business logic

### Priority 2 - Mystery Tracking Implementation (HIGH)
- [ ] Implement Claude-based mystery analysis in SeriesBibleGeneratorService
- [ ] Extract questions raised from chapter content
- [ ] Track answers revealed with book/chapter references
- [ ] Track outstanding mysteries at series level
- [ ] Add API endpoint for mystery tracking status
- [ ] Update series bible export to include mysteries section

### Priority 3 - TypeScript Strictness (Code Quality Review)
- [ ] Enable `noImplicitAny: true` in backend tsconfig
- [ ] Fix all 114 `any` type usages across 25 backend files
- [ ] Share types between frontend and backend (monorepo setup)

### Priority 4 - Input Validation
- [ ] Add Zod validation to all API routes
- [ ] Create validation schemas for all request bodies
- [ ] Centralize error response format

### Priority 5 - Environment Validation
- [ ] Validate all environment variables at startup
- [ ] Enforce minimum JWT_SECRET length (32 chars)
- [ ] Block startup if required vars are missing

---

## Sprint 13: Frontend Testing & Additional Backend Tests

> **Note:** Core backend testing moved to Sprint 12 (HIGH PRIORITY). This sprint extends coverage.

### Backend Test Extensions
- [ ] Write tests for auth middleware
- [ ] Write tests for queue worker state machine
- [ ] Write tests for chapter orchestration workflow
- [ ] Add tests for rate limit handling
- [ ] Add tests for checkpoint recovery

### Frontend Testing
- [ ] Add React Testing Library
- [ ] Add Vitest for frontend
- [ ] Write tests for components with useEffect
- [ ] Add error boundary tests
- [ ] Test real-time progress stream components
- [ ] Test trilogy management UI flows

---

## Sprint 14: Logging & Observability

### Structured Logging (Code Quality Review)
- [ ] Replace 290 console.log statements with structured logger
- [ ] Install pino or winston
- [ ] Add request correlation IDs
- [ ] Configure log levels by environment

### Monitoring
- [ ] Add Sentry for error tracking
- [ ] Add performance monitoring (APM)
- [ ] Create health check for Claude API status

---

## Sprint 15: Performance Optimization

### Critical (Performance Review - Score 7/10)
- [ ] Create `/api/projects/:id/books-with-chapters` endpoint to fix N+1 query
- [ ] Add database index on `jobs.target_id`
- [ ] Implement project cache layer
- [ ] Batch Claude API calls in editing pipeline

### React Performance
- [ ] Fix useProgressStream excessive re-renders
- [ ] Add React Query for data fetching with caching
- [ ] Implement virtualization for long chapter lists

---

## Sprint 16: Security Enhancements

### Authentication (Security Audit - HIGH Risk)
- [ ] Implement short-lived access tokens (15min) with refresh tokens
- [ ] Add token revocation mechanism
- [ ] Fix SSE token exposure (use single-use tokens)
- [ ] Add password complexity requirements to setup script

### Additional Security
- [ ] Add CSRF protection for cookie-based sessions
- [ ] Implement authorization framework for future multi-user
- [ ] Add regular dependency vulnerability scans (`npm audit`)

---

## Sprint 17: UX Improvements

### Fire-and-Forget Dashboard (UX Review - 6.5/10)
- [ ] Create prominent fire-and-forget status dashboard
- [ ] Show real-time progress without user intervention
- [ ] Add email/notification when novel complete

### Accessibility
- [ ] Improve color contrast ratios
- [ ] Add ARIA labels to interactive elements
- [ ] Ensure keyboard navigation works

### Design System
- [ ] Move from inline styles to CSS Modules or Tailwind
- [ ] Create reusable component library
- [ ] Implement consistent design tokens

---

## Sprint 18: Database & Architecture

### Database Improvements (Architecture Review)
- [ ] Add proper migration tracking with rollback support
- [ ] Consider better-sqlite3-migrator
- [ ] Add database backup strategy
- [ ] Add query performance monitoring

### Code Architecture
- [ ] Create repository layer abstraction
- [ ] Add service layer for Claude API
- [ ] Implement circuit breaker for external calls

---

## Bug Backlog (From Bug Hunting Review)

### High Priority
- [ ] BUG-006: SSE endpoint authentication improvements
- [ ] BUG-007: Unbounded array growth in progress stream
- [ ] BUG-008: Missing null checks in context assembly
- [ ] BUG-009: React hook dependency warnings

### Medium Priority
- [ ] BUG-010: SQL injection risk in dynamic query building
- [ ] BUG-012: No timeout on fetch requests
- [ ] BUG-013: EventEmitter max listeners warning
- [ ] BUG-014: Database query without composite index

### Low Priority
- [ ] BUG-016: Console.log in production code
- [ ] BUG-017: Magic numbers throughout
- [ ] BUG-018: Missing input validation

---

## Agent Review Scores Summary

| Agent | Score | Focus |
|-------|-------|-------|
| UX Design | 6.5/10 | UI/Accessibility |
| Architecture | Solid | Single-user ready |
| Competitor | Unique | Fire-and-forget differentiator |
| Performance | 7/10 | 15 issues identified |
| Code Quality | B- | Needs TypeScript strictness |
| Security | HIGH Risk | 11 vulnerabilities |
| Bug Hunting | 8/10 Risk | 18 bugs found |
| Test Strategy | - | Zero test coverage |

---

## Quick Wins (Can be done anytime)

1. Add database index on `jobs.target_id`
2. Add composite index on `jobs(status, created_at)`
3. Enable TypeScript strict mode
4. Replace console.log with logger
5. Add request timeout to all fetch calls
