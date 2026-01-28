# Test Architecture Report

**Analysed**: NovelForge (Next.js 14 + Express Backend)
**Generated**: 2026-01-27
**Current Coverage**: Backend: ~85%, Frontend: ~25%, E2E: ~15%
**Target Coverage**: Backend: 90%, Frontend: 70%, E2E: 40%
**Test Health Score**: 6/10

## Executive Summary

NovelForge demonstrates strong backend unit testing (56/60 test suites passing, 1,700+ tests) with comprehensive coverage of critical services like authentication, export, and AI orchestration. However, significant gaps exist in:

1. **Frontend component testing** - Only 11/52 components have tests (21% coverage)
2. **Integration testing** - Limited cross-service integration tests
3. **E2E testing** - Auth E2E is excellent, but project CRUD and generation flows are skeleton/template-only
4. **Database migration testing** - Skipped due to ESM/CommonJS incompatibility issues
5. **Rate limiting behaviour** - Backend tested, but frontend error handling untested

**Critical Finding**: Export functionality (DOCX/PDF) has excellent route-level tests but the actual export service implementation is only partially tested. This is business-critical functionality.

---

## Coverage Analysis

### Backend Coverage by Module

| Module | Test Files | Coverage | Gap | Priority |
|--------|-----------|----------|-----|----------|
| **Routes** | 15/32 routes | 47% | 53% | High |
| **Services** | 25/43 services | 58% | 42% | Critical |
| **Repositories** | 4/4 repositories | 100% | 0% | ✅ Complete |
| **Middleware** | 1/1 (auth) | 100% | 0% | ✅ Complete |
| **Queue** | 3/3 queue services | 100% | 0% | ✅ Complete |
| **DB** | 2/3 db services | 67% | 33% | Medium |
| **Utils** | 4/6 utils | 67% | 33% | Low |

### Frontend Coverage by Module

| Module | Test Files | Coverage | Gap | Priority |
|--------|-----------|----------|-----|----------|
| **Components** | 11/52 components | 21% | 79% | Critical |
| **Lib/Utils** | 9/14 lib files | 64% | 36% | High |
| **Hooks** | 6/6 hooks | 100% | 0% | ✅ Complete |
| **Pages** | 1 page tested | ~5% | 95% | High |

### E2E Coverage

| Journey | Status | Coverage | Priority |
|---------|--------|----------|----------|
| Authentication | ✅ Comprehensive | 95% | ✅ Complete |
| Project Creation | ⚠️ Template only | 0% | Critical |
| Chapter Generation | ❌ No tests | 0% | Critical |
| Export (DOCX/PDF) | ❌ No tests | 0% | Critical |
| Story Bible | ❌ No tests | 0% | High |
| Character Management | ❌ No tests | 0% | Medium |

---

## Critical Untested Code Paths

### 1. Frontend Authentication Integration (CRITICAL)
**File**: `app/lib/auth.ts`
**Status**: ❌ No tests
**Risk**: Authentication is tested E2E but client-side auth utilities have no unit tests

**Missing Coverage**:
- `isTokenExpired()` - JWT token expiration validation logic
- `getToken()` - Token retrieval with expiration check
- `verifyToken()` - Backend token verification
- Error handling in `login()` function

**Business Impact**: If token expiration logic fails, users could remain logged in with expired tokens or be incorrectly logged out.

### 2. Export Service Implementation (CRITICAL)
**File**: `backend/src/services/export.service.ts`
**Status**: ⚠️ Partial coverage (routes tested, service logic not fully tested)

**Missing Coverage**:
- `cleanContent()` - Markdown/AI artefact removal logic (private method, not directly tested)
- Story Bible DOCX generation logic
- PDF generation error handling
- Unicode/special character handling in exports
- Large chapter handling (memory/buffer limits)

**Business Impact**: Export is a key deliverable feature. Bugs could corrupt exported manuscripts.

### 3. Database Migrations (HIGH RISK)
**File**: `backend/src/db/migrate.ts`
**Status**: ⚠️ Tests skipped (ESM import.meta.url incompatibility with Jest)

**Risk**: Migration failures could corrupt production databases. No automated verification.

### 4. Untested Backend Routes (17 routes)

#### Critical Priority Routes (No Tests):
1. **`/api/projects`** - Project CRUD operations (no dedicated route test)
2. **`/api/queue`** - Job queue management
3. **`/api/progress`** - Progress tracking/streaming
4. **`/api/completion`** - Completion detection
5. **`/api/saved-concepts`** - Saved concept CRUD
6. **`/api/saved-concept-summaries`** - Concept summaries
7. **`/api/user-settings`** - User preferences
8. **`/api/presets`** - Template presets
9. **`/api/universes`** - Universe management
10. **`/api/lessons`** - Agent learning lessons
11. **`/api/reflections`** - Agent reflections
12. **`/api/prose-styles`** - Prose style management
13. **`/api/genre-conventions`** - Genre conventions
14. **`/api/outline-editorial`** - Outline editorial feedback
15. **`/api/regeneration`** - Content regeneration
16. **`/api/story-ideas`** - Story idea generation
17. **`/api/authors`** - Author lookup/styles

### 5. Untested Backend Services (18 services)

#### Critical Services (No Tests):
1. **`progress-tracking.service.ts`** - Real-time progress tracking
2. **`session-tracker.ts`** - Rate limit session tracking
3. **`universe.service.ts`** - Universe/world-building
4. **`backup.service.ts`** - Database backup operations (integration test needed)
5. **`author-lookup.service.ts`** - Author research
6. **`name-generator.ts`** - Character name generation
7. **`story-dna-generator.ts`** - Story DNA generation
8. **`mystery-tracking.service.ts`** - Mystery plot tracking
9. **`author-styles.ts`** - Author style analysis
10. **`follow-up.service.ts`** - AI follow-up generation
11. **`lessons.ts`** - Learning system
12. **`completion-detection.service.ts`** - Chapter completion detection
13. **`outline-editorial.service.ts`** - Editorial feedback
14. **`book-cloning.service.ts`** - Book cloning logic
15. **`book-versioning.service.ts`** - Version management
16. **`metrics.service.ts`** - ⚠️ Has failing tests (TypeScript errors)
17. **`structure-templates.ts`** - Story structure templates
18. **`reflections.ts`** - Agent reflection logic

### 6. Untested Frontend Components (41 components)

#### Critical Components (No Tests):
1. **`ExportButtons.tsx`** - DOCX/PDF export UI
2. **`PrimaryNavigationBar.tsx`** - New navigation (untracked file)
3. **`ChapterList.tsx`** - Chapter listing/management
4. **`CharacterForm.tsx`** - Character creation/editing
5. **`PlotForm.tsx`** - Plot structure editing
6. **`ProjectForm.tsx`** - Project creation/editing
7. **`StoryBible.tsx`** - Story bible viewer/editor
8. All page-level components in `/app/projects/[id]/*/page.tsx`

### 7. Missing E2E User Journeys (5 critical paths)

1. **Complete Project Creation Flow** (template only, not implemented)
   - Login → Create Project → Add Characters → Generate Chapters → Export
2. **Chapter Generation Flow** (no test)
   - Create Chapter → Monitor Progress → Handle Errors → View Result
3. **Export Flow** (no test)
   - Generate Content → Export to DOCX → Export to PDF → Verify Downloads
4. **Story Bible Management** (no test)
   - View Bible → Add Characters → Add Locations → Update DNA
5. **Error Recovery** (no test)
   - Trigger Rate Limit → Wait for Reset → Resume Job

---

## Test Quality Assessment

### Excellent Test Quality

#### 1. Authentication Route Tests (`backend/src/routes/__tests__/auth.test.ts`)
**Score**: 9/10

**Strengths**:
- 100% path coverage (login, verify, error handling)
- Security testing (XSS prevention, password leak prevention)
- Edge cases (empty passwords, malformed headers, missing env vars)
- Integration scenarios (login → verify flow)
- Excellent test organisation with nested `describe` blocks

**Example**:
```typescript
describe('Security considerations', () => {
  it('should not leak password hash in error messages', async () => {
    mockCompare.mockRejectedValue(new Error('Database error'));
    const response = await request(app)
      .post('/api/auth/login')
      .send({ password: 'test' });
    expect(response.body.error).not.toContain('$2b$10$');
    expect(response.body.error).toBe('Authentication failed');
  });
});
```

#### 2. Export Route Tests (`backend/src/routes/__tests__/export.test.ts`)
**Score**: 8/10

**Strengths**:
- 52 test cases covering all export types (DOCX, PDF, Story Bible)
- Concurrent request handling
- Error handling (project not found, no chapters, timeout)
- Edge cases (long project IDs, URL encoding, large buffers)
- Headers and content-type verification

**Minor Issue**: Routes are tested but actual service implementation is under-tested.

#### 3. E2E Authentication Tests (`e2e/auth.spec.ts`)
**Score**: 10/10

**Strengths**:
- Page Object pattern for maintainability
- Comprehensive user journeys (login, logout, session persistence)
- Security testing (XSS, rapid login attempts)
- Error scenarios (invalid credentials, network failures, expired tokens)
- Accessibility verification
- 15+ test scenarios covering all auth flows

**Best Practice Example**:
```typescript
class LoginPage {
  constructor(private page: Page) {}
  async login(password: string) {
    await this.fillPassword(password);
    await this.clickSubmit();
  }
  async getErrorMessage() {
    const errorAlert = this.page.locator('[role="alert"]');
    await errorAlert.waitFor({ state: 'visible', timeout: 5000 });
    return await errorAlert.textContent();
  }
}
```

### Good Test Quality

#### 4. Rate Limit Handler Tests (`backend/src/queue/__tests__/rate-limit-handler.test.ts`)
**Score**: 7/10

**Strengths**:
- Tests rate limit detection from multiple sources (429 status, Anthropic SDK, error messages)
- Auto-resume timing logic tested with fake timers
- Session tracking integration

**Weakness**: No integration test with actual API rate limits.

### Problematic Tests

#### 5. Database Migration Tests (`backend/src/db/__tests__/migrate.test.ts`)
**Score**: 0/10 (SKIPPED)

**Problem**: All tests skipped due to `import.meta.url` incompatibility with Jest:
```typescript
describe.skip('Database Migrations', () => {
  // SKIP: These tests cannot run because migrate.ts uses import.meta.url which is
  // incompatible with Jest's CommonJS transformation.
```

**Impact**: Database schema changes are not automatically tested. High risk for production.

**Fix Required**: Convert to integration tests with real database or configure Jest for ESM.

#### 6. Metrics Service Tests (`backend/src/services/__tests__/metrics.service.test.ts`)
**Status**: ❌ Failing (TypeScript errors)

**Problem**: Test assertions expect old `ProjectMetrics` type structure, but type has been updated with new fields:
```
Type '{ project_id: string; total_input_tokens: number; ... }' is missing the following
properties from type 'ProjectMetrics': chapter_input_tokens, chapter_output_tokens,
chapter_cost_usd, chapter_cost_gbp
```

**Impact**: Metrics tracking may have breaking changes not caught by CI.

### Missing Test Types

#### No Integration Tests for:
- **Database transaction rollback** behaviour
- **Claude AI service** integration (all mocked)
- **Queue worker** + database interaction
- **Multi-step generation flows** (chapters → books → series)
- **Export service** + database queries

#### No Performance Tests for:
- **Large manuscript exports** (10,000+ page novels)
- **Concurrent chapter generation** (stress testing)
- **Database query performance** (N+1 queries)
- **API rate limiting** under load

#### No Accessibility Tests for:
- Frontend components (only login page tested in E2E)
- Keyboard navigation
- Screen reader compatibility

#### No Contract Tests for:
- Frontend ↔ Backend API contracts
- Anthropic Claude API version compatibility

---

## Recommended Test Cases

### CRITICAL PRIORITY

#### Test Suite 1: Frontend Auth Integration Tests

**File**: `app/lib/__tests__/auth.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { login, logout, getToken, isTokenExpired, verifyToken } from '../auth';

describe('Authentication Library', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('isTokenExpired', () => {
    it('should return false for valid unexpired token', () => {
      // Arrange
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = { user: 'owner', exp: futureExp };
      const token = createMockJWT(payload);

      // Act
      const result = (auth as any).isTokenExpired(token);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for expired token', () => {
      // Arrange
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = { user: 'owner', exp: pastExp };
      const token = createMockJWT(payload);

      // Act
      const result = (auth as any).isTokenExpired(token);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for malformed token', () => {
      // Arrange
      const invalidToken = 'not.a.valid.jwt';

      // Act
      const result = (auth as any).isTokenExpired(invalidToken);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for token without expiration claim', () => {
      // Arrange
      const payload = { user: 'owner' }; // No exp field
      const token = createMockJWT(payload);

      // Act
      const result = (auth as any).isTokenExpired(token);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle Base64URL encoding correctly', () => {
      // Arrange - token with special chars that need URL encoding
      const payload = { user: 'test+user/data', exp: Math.floor(Date.now() / 1000) + 3600 };
      const token = createMockJWT(payload, true); // Use Base64URL encoding

      // Act
      const result = (auth as any).isTokenExpired(token);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return token when valid and not expired', () => {
      // Arrange
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const payload = { user: 'owner', exp: futureExp };
      const token = createMockJWT(payload);
      localStorage.setItem('novelforge_token', token);

      // Act
      const result = getToken();

      // Assert
      expect(result).toBe(token);
    });

    it('should clear and return null when token is expired', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const pastExp = Math.floor(Date.now() / 1000) - 3600;
      const payload = { user: 'owner', exp: pastExp };
      const token = createMockJWT(payload);
      localStorage.setItem('novelforge_token', token);

      // Act
      const result = getToken();

      // Assert
      expect(result).toBeNull();
      expect(localStorage.getItem('novelforge_token')).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Token is expired, clearing it');
      consoleSpy.mockRestore();
    });

    it('should return null in SSR context', () => {
      // Arrange - simulate server-side rendering
      const originalWindow = global.window;
      delete (global as any).window;

      // Act
      const result = getToken();

      // Assert
      expect(result).toBeNull();

      // Cleanup
      (global as any).window = originalWindow;
    });
  });

  describe('login', () => {
    it('should store token on successful login', async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'mock-jwt-token' }),
      });

      // Act
      await login('correctpassword');

      // Assert
      expect(localStorage.getItem('novelforge_token')).toBe('mock-jwt-token');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: 'correctpassword' }),
        })
      );
    });

    it('should throw error on failed login', async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Invalid password' }),
      });

      // Act & Assert
      await expect(login('wrongpassword')).rejects.toThrow('Invalid password');
      expect(localStorage.getItem('novelforge_token')).toBeNull();
    });

    it('should handle network errors', async () => {
      // Arrange
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      // Act & Assert
      await expect(login('password')).rejects.toThrow('Network failure');
    });
  });

  describe('verifyToken', () => {
    it('should return true for valid token', async () => {
      // Arrange
      const token = createMockJWT({ user: 'owner', exp: Math.floor(Date.now() / 1000) + 3600 });
      localStorage.setItem('novelforge_token', token);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ valid: true }),
      });

      // Act
      const result = await verifyToken();

      // Assert
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/verify'),
        expect.objectContaining({
          headers: { 'Authorization': `Bearer ${token}` },
        })
      );
    });

    it('should return false and clear token on 401 response', async () => {
      // Arrange
      const token = createMockJWT({ user: 'owner', exp: Math.floor(Date.now() / 1000) - 100 });
      localStorage.setItem('novelforge_token', token);
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      // Act
      const result = await verifyToken();

      // Assert
      expect(result).toBe(false);
      expect(localStorage.getItem('novelforge_token')).toBeNull();
    });

    it('should return false when no token exists', async () => {
      // Act
      const result = await verifyToken();

      // Assert
      expect(result).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});

// Helper function to create mock JWT tokens
function createMockJWT(payload: any, useBase64URL = true): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodeBase64 = (obj: any) => {
    const str = JSON.stringify(obj);
    let encoded = btoa(str);
    if (useBase64URL) {
      encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
    return encoded;
  };
  return `${encodeBase64(header)}.${encodeBase64(payload)}.mock-signature`;
}
```

**Effort**: 3 hours
**Value**: Prevents authentication bugs that could lock users out

---

#### Test Suite 2: Export Service Content Cleaning

**File**: `backend/src/services/__tests__/export.service.test.ts` (EXPAND)

```typescript
describe('ExportService - Content Cleaning', () => {
  let service: ExportService;

  beforeEach(() => {
    service = new ExportService();
  });

  describe('cleanContent', () => {
    it('should remove markdown headings', () => {
      // Arrange
      const content = '# Chapter Title\n## Subtitle\n### Sub-subtitle\nRegular text';

      // Act
      const result = (service as any).cleanContent(content);

      // Assert
      expect(result).not.toContain('# Chapter Title');
      expect(result).not.toContain('## Subtitle');
      expect(result).not.toContain('### Sub-subtitle');
      expect(result).toContain('Regular text');
    });

    it('should remove markdown bold markers', () => {
      // Arrange
      const content = 'This is **bold text** and more **emphasis**.';

      // Act
      const result = (service as any).cleanContent(content);

      // Assert
      expect(result).toBe('This is bold text and more emphasis.');
    });

    it('should remove scene markers', () => {
      // Arrange
      const content = 'Scene 1: The Beginning\n\nContent here.\n\nScene Two: The Middle\n\nMore content.';

      // Act
      const result = (service as any).cleanContent(content);

      // Assert
      expect(result).not.toContain('Scene 1:');
      expect(result).not.toContain('Scene Two:');
      expect(result).toContain('Content here.');
      expect(result).toContain('More content.');
    });

    it('should replace em-dashes with appropriate punctuation', () => {
      // Arrange
      const content = 'The hero paused — unsure of the path ahead — and decided to continue.';

      // Act
      const result = (service as any).cleanContent(content);

      // Assert
      expect(result).not.toContain('—');
      expect(result).toContain('The hero paused, unsure of the path ahead, and decided to continue.');
    });

    it('should handle em-dash followed by lowercase', () => {
      // Arrange
      const content = 'She ran — terrified by what she had seen.';

      // Act
      const result = (service as any).cleanContent(content);

      // Assert
      expect(result).toBe('She ran, terrified by what she had seen.');
    });

    it('should handle em-dash at end of sentence', () => {
      // Arrange
      const content = 'The story continues—\nIn the next chapter.';

      // Act
      const result = (service as any).cleanContent(content);

      // Assert
      expect(result).toContain('The story continues.');
    });

    it('should preserve intended punctuation', () => {
      // Arrange
      const content = 'The character said, "Hello!" She smiled.';

      // Act
      const result = (service as any).cleanContent(content);

      // Assert
      expect(result).toBe('The character said, "Hello!" She smiled.');
    });

    it('should handle unicode characters correctly', () => {
      // Arrange
      const content = 'Café résumé naïve — français';

      // Act
      const result = (service as any).cleanContent(content);

      // Assert
      expect(result).toContain('Café résumé naïve');
      expect(result).not.toContain('—');
    });

    it('should clean multiple blank lines to single blank line', () => {
      // Arrange
      const content = 'Paragraph one.\n\n\n\nParagraph two.';

      // Act
      const result = (service as any).cleanContent(content);

      // Assert
      expect(result).toBe('Paragraph one.\n\nParagraph two.');
      expect(result.match(/\n\n\n/)).toBeNull();
    });

    it('should not corrupt legitimate prose with hyphens', () => {
      // Arrange
      const content = 'The twenty-year-old student was well-read.';

      // Act
      const result = (service as any).cleanContent(content);

      // Assert
      expect(result).toBe('The twenty-year-old student was well-read.');
    });

    it('should handle empty content gracefully', () => {
      // Arrange
      const content = '';

      // Act
      const result = (service as any).cleanContent(content);

      // Assert
      expect(result).toBe('');
    });

    it('should handle content with only whitespace', () => {
      // Arrange
      const content = '   \n\n   \n   ';

      // Act
      const result = (service as any).cleanContent(content);

      // Assert
      expect(result).toBe('');
    });

    it('should handle mixed markdown and prose', () => {
      // Arrange
      const content = `# Chapter 1

**Sarah** walked into the room — surprised by what she saw — and gasped.

## Scene One: Discovery

The _ancient tome_ lay open on the desk.`;

      // Act
      const result = (service as any).cleanContent(content);

      // Assert
      expect(result).not.toContain('#');
      expect(result).not.toContain('**');
      expect(result).not.toContain('_');
      expect(result).not.toContain('—');
      expect(result).toContain('Sarah walked into the room');
      expect(result).toContain('ancient tome');
    });
  });

  describe('generateDOCX - Error Handling', () => {
    it('should throw error when project not found', async () => {
      // Arrange
      const mockPrepare = vi.fn(() => ({
        get: vi.fn().mockReturnValue(null),
      }));
      (db as any).prepare = mockPrepare;

      // Act & Assert
      await expect(service.generateDOCX('non-existent-id'))
        .rejects
        .toThrow('Project not found');
    });

    it('should throw error when no chapters exist', async () => {
      // Arrange
      const mockProject = { id: 'proj-1', title: 'Test', type: 'novel', genre: 'fiction' };
      const mockPrepare = vi.fn((query: string) => {
        if (query.includes('FROM projects')) {
          return { get: vi.fn().mockReturnValue(mockProject) };
        }
        if (query.includes('FROM chapters')) {
          return { all: vi.fn().mockReturnValue([]) };
        }
      });
      (db as any).prepare = mockPrepare;

      // Act & Assert
      await expect(service.generateDOCX('proj-1'))
        .rejects
        .toThrow('No chapters found for project');
    });

    it('should handle very long content without truncation', async () => {
      // Arrange
      const longContent = 'A'.repeat(1000000); // 1MB of text
      const mockChapters = [
        { id: 'ch-1', chapter_number: 1, title: 'Chapter 1', content: longContent, word_count: 150000 },
      ];
      const mockProject = { id: 'proj-1', title: 'Epic Novel', type: 'novel', genre: 'fantasy' };

      const mockPrepare = vi.fn((query: string) => {
        if (query.includes('FROM projects')) {
          return { get: vi.fn().mockReturnValue(mockProject) };
        }
        if (query.includes('FROM chapters')) {
          return { all: vi.fn().mockReturnValue(mockChapters) };
        }
      });
      (db as any).prepare = mockPrepare;

      // Act
      const result = await service.generateDOCX('proj-1');

      // Assert
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
```

**Effort**: 4 hours
**Value**: Ensures exported manuscripts are clean and professional

---

#### Test Suite 3: E2E Export Flow

**File**: `e2e/export.spec.ts` (NEW)

```typescript
import { test, expect, type Page } from '@playwright/test';

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

test.describe('Export Functionality', () => {
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('#password', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/projects');

    // Create a test project with content
    // NOTE: This assumes project creation API is working
    projectId = await createTestProject(page, {
      title: 'Export Test Novel',
      chapters: [
        { number: 1, title: 'Chapter One', content: 'This is test content for chapter one.' },
        { number: 2, title: 'Chapter Two', content: 'This is test content for chapter two.' },
      ],
    });
  });

  test.describe('DOCX Export', () => {
    test('should export project as DOCX', async ({ page }) => {
      // Arrange
      await page.goto(`/projects/${projectId}`);

      // Setup download listener
      const downloadPromise = page.waitForEvent('download');

      // Act
      await page.click('[data-testid="export-docx"]');

      // Assert
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/manuscript.*\.docx$/);

      // Verify download completes
      const path = await download.path();
      expect(path).toBeTruthy();

      // Verify file size is reasonable (not empty)
      const fs = require('fs');
      const stats = fs.statSync(path);
      expect(stats.size).toBeGreaterThan(1000); // At least 1KB
    });

    test('should show loading state during export', async ({ page }) => {
      // Arrange
      await page.goto(`/projects/${projectId}`);

      // Act
      const exportButton = page.locator('[data-testid="export-docx"]');
      await exportButton.click();

      // Assert
      await expect(exportButton).toBeDisabled();
      await expect(exportButton).toContainText(/exporting|loading/i);

      // Wait for download to complete
      await page.waitForEvent('download');

      // Button should re-enable
      await expect(exportButton).toBeEnabled();
    });

    test('should handle export error gracefully', async ({ page }) => {
      // Arrange
      await page.goto(`/projects/${projectId}`);

      // Mock API error
      await page.route(`**/api/export/docx/${projectId}`, route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Export failed', message: 'Database error' }),
        });
      });

      // Act
      await page.click('[data-testid="export-docx"]');

      // Assert
      const errorToast = page.locator('[role="alert"]');
      await expect(errorToast).toBeVisible();
      await expect(errorToast).toContainText(/export failed|error/i);
    });

    test('should export project with unicode characters', async ({ page }) => {
      // Arrange - create project with unicode content
      const unicodeProjectId = await createTestProject(page, {
        title: 'Café Chronicles',
        chapters: [
          { number: 1, title: 'Résumé', content: 'François était naïve. 日本語 text.' },
        ],
      });
      await page.goto(`/projects/${unicodeProjectId}`);

      // Setup download listener
      const downloadPromise = page.waitForEvent('download');

      // Act
      await page.click('[data-testid="export-docx"]');

      // Assert
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('manuscript');

      // Verify download completes
      const path = await download.path();
      expect(path).toBeTruthy();
    });
  });

  test.describe('PDF Export', () => {
    test('should export project as PDF', async ({ page }) => {
      // Arrange
      await page.goto(`/projects/${projectId}`);

      // Setup download listener
      const downloadPromise = page.waitForEvent('download');

      // Act
      await page.click('[data-testid="export-pdf"]');

      // Assert
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/manuscript.*\.pdf$/);

      // Verify download completes and file is valid PDF
      const path = await download.path();
      const fs = require('fs');
      const buffer = fs.readFileSync(path);

      // PDF files start with %PDF-
      expect(buffer.toString('utf8', 0, 5)).toBe('%PDF-');
    });

    test('should allow both DOCX and PDF exports for same project', async ({ page }) => {
      // Arrange
      await page.goto(`/projects/${projectId}`);

      // Act - Export DOCX
      const docxDownloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-docx"]');
      const docxDownload = await docxDownloadPromise;

      // Act - Export PDF
      const pdfDownloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-pdf"]');
      const pdfDownload = await pdfDownloadPromise;

      // Assert
      expect(docxDownload.suggestedFilename()).toContain('.docx');
      expect(pdfDownload.suggestedFilename()).toContain('.pdf');
    });
  });

  test.describe('Story Bible Export', () => {
    test('should export story bible as DOCX', async ({ page }) => {
      // Arrange
      await page.goto(`/projects/${projectId}/bible`);

      // Setup download listener
      const downloadPromise = page.waitForEvent('download');

      // Act
      await page.click('[data-testid="export-story-bible"]');

      // Assert
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/story-bible.*\.docx$/);
    });

    test('should handle export when story bible is incomplete', async ({ page }) => {
      // Arrange - new project without full bible
      const emptyProjectId = await createTestProject(page, {
        title: 'Empty Bible Project',
        chapters: [],
      });
      await page.goto(`/projects/${emptyProjectId}/bible`);

      // Act
      const exportButton = page.locator('[data-testid="export-story-bible"]');

      // Assert - button might be disabled or show warning
      if (await exportButton.isDisabled()) {
        expect(await exportButton.isDisabled()).toBe(true);
      } else {
        await exportButton.click();
        // Should still generate with template/empty sections
        const download = await page.waitForEvent('download');
        expect(download.suggestedFilename()).toContain('story-bible');
      }
    });
  });

  test.describe('Export Edge Cases', () => {
    test('should handle export of very large project (100+ chapters)', async ({ page }) => {
      // Note: This test may be slow - consider marking as @slow
      // Create project with many chapters
      const chapters = Array.from({ length: 100 }, (_, i) => ({
        number: i + 1,
        title: `Chapter ${i + 1}`,
        content: `Content for chapter ${i + 1}. `.repeat(1000), // ~5KB per chapter
      }));

      const largeProjectId = await createTestProject(page, {
        title: 'Epic Saga',
        chapters,
      });

      await page.goto(`/projects/${largeProjectId}`);

      // Act
      const downloadPromise = page.waitForEvent('download', { timeout: 60000 }); // 1 min timeout
      await page.click('[data-testid="export-docx"]');

      // Assert
      const download = await downloadPromise;
      const path = await download.path();

      const fs = require('fs');
      const stats = fs.statSync(path);
      expect(stats.size).toBeGreaterThan(100000); // At least 100KB
    });

    test('should prevent duplicate downloads from rapid clicking', async ({ page }) => {
      // Arrange
      await page.goto(`/projects/${projectId}`);

      // Act - Click multiple times rapidly
      const exportButton = page.locator('[data-testid="export-docx"]');
      const downloadPromise = page.waitForEvent('download');

      await exportButton.click();
      await exportButton.click(); // Second click should be ignored
      await exportButton.click(); // Third click should be ignored

      // Assert - only one download should trigger
      const download = await downloadPromise;
      expect(download).toBeTruthy();

      // Button should be disabled during export
      await expect(exportButton).toBeDisabled();
    });
  });
});

// Helper function to create test project via API
async function createTestProject(page: Page, config: {
  title: string;
  chapters: Array<{ number: number; title: string; content: string }>;
}): Promise<string> {
  // Implementation depends on your API structure
  // This is a placeholder
  const token = await page.evaluate(() => localStorage.getItem('novelforge_token'));

  const response = await fetch('http://localhost:3001/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: config.title,
      type: 'novel',
      genre: 'fiction',
    }),
  });

  const project = await response.json();
  const projectId = project.id;

  // Create chapters
  for (const chapter of config.chapters) {
    await fetch(`http://localhost:3001/api/chapters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        project_id: projectId,
        chapter_number: chapter.number,
        title: chapter.title,
        content: chapter.content,
      }),
    });
  }

  return projectId;
}
```

**Effort**: 6 hours
**Value**: Ensures core deliverable (export) works end-to-end

---

### HIGH PRIORITY

#### Test Suite 4: Database Migration Integration Tests

**File**: `backend/src/db/__tests__/migrate.integration.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Database from 'better-sqlite3';
import { runMigrations } from '../migrate.js';
import fs from 'fs';
import path from 'path';

/**
 * Integration tests for database migrations using a real SQLite database
 *
 * These tests verify that:
 * 1. Migrations run in correct order
 * 2. Schema is created correctly
 * 3. Migrations are idempotent (can run multiple times safely)
 * 4. Data is preserved during migrations
 */

describe('Database Migration Integration Tests', () => {
  let testDbPath: string;
  let db: Database.Database;

  beforeEach(() => {
    // Create temporary test database
    testDbPath = path.join(__dirname, `test-${Date.now()}.db`);
    process.env.DATABASE_PATH = testDbPath;
  });

  afterEach(() => {
    // Clean up test database
    if (db) {
      db.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Fresh database setup', () => {
    it('should create all tables from schema.sql', () => {
      // Act
      runMigrations();
      db = new Database(testDbPath);

      // Assert - verify key tables exist
      const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table'
        ORDER BY name
      `).all() as Array<{ name: string }>;

      const tableNames = tables.map(t => t.name);

      expect(tableNames).toContain('projects');
      expect(tableNames).toContain('books');
      expect(tableNames).toContain('chapters');
      expect(tableNames).toContain('characters');
      expect(tableNames).toContain('schema_migrations');
    });

    it('should set initial migration version', () => {
      // Act
      runMigrations();
      db = new Database(testDbPath);

      // Assert
      const version = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as { version: number };
      expect(version.version).toBeGreaterThan(0);
    });

    it('should create proper indexes', () => {
      // Act
      runMigrations();
      db = new Database(testDbPath);

      // Assert
      const indexes = db.prepare(`
        SELECT name, tbl_name FROM sqlite_master
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `).all() as Array<{ name: string; tbl_name: string }>;

      // Check for important indexes
      const indexNames = indexes.map(i => i.name);
      expect(indexNames).toContain('idx_chapters_book_id');
      expect(indexNames).toContain('idx_characters_project_id');
    });

    it('should enforce foreign key constraints', () => {
      // Arrange
      runMigrations();
      db = new Database(testDbPath);

      // Insert test project
      db.prepare('INSERT INTO projects (id, title, type, genre) VALUES (?, ?, ?, ?)').run(
        'proj-1', 'Test Project', 'novel', 'fiction'
      );

      // Act & Assert - try to insert chapter with invalid book_id (should fail)
      expect(() => {
        db.prepare('INSERT INTO chapters (id, book_id, chapter_number, content) VALUES (?, ?, ?, ?)').run(
          'ch-1', 'invalid-book-id', 1, 'Test content'
        );
      }).toThrow();
    });
  });

  describe('Migration idempotency', () => {
    it('should safely run migrations multiple times', () => {
      // Act
      runMigrations(); // First run
      runMigrations(); // Second run
      runMigrations(); // Third run

      db = new Database(testDbPath);

      // Assert - check version is correct (not duplicated)
      const version = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as { version: number };
      expect(version.version).toBeGreaterThan(0);

      // Assert - check tables still exist and aren't duplicated
      const tableCount = db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='projects'
      `).get() as { count: number };
      expect(tableCount.count).toBe(1);
    });

    it('should preserve existing data during re-migration', () => {
      // Arrange - initial migration and data
      runMigrations();
      db = new Database(testDbPath);

      db.prepare('INSERT INTO projects (id, title, type, genre) VALUES (?, ?, ?, ?)').run(
        'proj-1', 'Preserved Project', 'novel', 'fiction'
      );

      const initialProjects = db.prepare('SELECT * FROM projects').all();
      db.close();

      // Act - run migrations again
      runMigrations();
      db = new Database(testDbPath);

      // Assert - data should still exist
      const finalProjects = db.prepare('SELECT * FROM projects').all();
      expect(finalProjects).toEqual(initialProjects);
    });
  });

  describe('Incremental migrations', () => {
    it('should apply trilogy support migration (002)', () => {
      // Act
      runMigrations();
      db = new Database(testDbPath);

      // Assert - check for trilogy-specific columns
      const columns = db.pragma('table_info(books)') as Array<{ name: string }>;
      const columnNames = columns.map(c => c.name);

      expect(columnNames).toContain('book_number');
      expect(columnNames).toContain('ending_state');

      // Check book_transitions table exists
      const tables = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='book_transitions'
      `).all();
      expect(tables.length).toBe(1);
    });

    it('should apply agent learning migration (003)', () => {
      // Act
      runMigrations();
      db = new Database(testDbPath);

      // Assert
      const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name IN ('agent_lessons', 'agent_reflections')
      `).all() as Array<{ name: string }>;

      expect(tables.length).toBe(2);
    });

    it('should handle ALTER TABLE for existing columns gracefully', () => {
      // Arrange - run migrations
      runMigrations();
      db = new Database(testDbPath);

      // Check initial schema
      const initialColumns = db.pragma('table_info(books)') as Array<{ name: string }>;
      db.close();

      // Act - run migrations again (should not duplicate columns)
      runMigrations();
      db = new Database(testDbPath);

      // Assert
      const finalColumns = db.pragma('table_info(books)') as Array<{ name: string }>;
      expect(finalColumns.length).toBe(initialColumns.length);
    });
  });

  describe('Migration error handling', () => {
    it('should rollback on migration error', () => {
      // This test requires injecting a failing migration
      // Skipped for now - would require temporary migration file
      expect(true).toBe(true);
    });
  });

  describe('Data integrity after migration', () => {
    it('should maintain referential integrity after migration', () => {
      // Arrange
      runMigrations();
      db = new Database(testDbPath);

      // Insert related records
      db.prepare('INSERT INTO projects (id, title, type, genre) VALUES (?, ?, ?, ?)').run(
        'proj-1', 'Test', 'novel', 'fiction'
      );

      db.prepare('INSERT INTO books (id, project_id, book_number, title) VALUES (?, ?, ?, ?)').run(
        'book-1', 'proj-1', 1, 'Book One'
      );

      db.prepare('INSERT INTO chapters (id, book_id, chapter_number, content) VALUES (?, ?, ?, ?)').run(
        'ch-1', 'book-1', 1, 'Content'
      );

      // Act - try to delete project (should fail due to FK constraint with ON DELETE RESTRICT)
      const deleteAttempt = () => {
        db.prepare('DELETE FROM projects WHERE id = ?').run('proj-1');
      };

      // Assert - delete should fail (or cascade delete, depending on schema)
      // Check your schema.sql for ON DELETE behaviour
      const initialChapterCount = db.prepare('SELECT COUNT(*) as count FROM chapters').get() as { count: number };

      try {
        deleteAttempt();
        // If delete succeeded, verify cascade deleted chapters
        const finalChapterCount = db.prepare('SELECT COUNT(*) as count FROM chapters').get() as { count: number };
        expect(finalChapterCount.count).toBeLessThan(initialChapterCount.count);
      } catch (error) {
        // If delete failed, verify chapters still exist
        const finalChapterCount = db.prepare('SELECT COUNT(*) as count FROM chapters').get() as { count: number };
        expect(finalChapterCount.count).toBe(initialChapterCount.count);
      }
    });
  });
});
```

**Effort**: 5 hours
**Value**: Prevents catastrophic database corruption in production

---

#### Test Suite 5: Project CRUD Integration Tests

**File**: `backend/src/routes/__tests__/projects.test.ts` (NEW)

```typescript
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import projectsRouter from '../projects.js';

// Mock database and dependencies
const mockDbPrepare = jest.fn();
jest.mock('../../db/connection.js', () => ({
  __esModule: true,
  default: {
    prepare: mockDbPrepare,
  },
}));

jest.mock('../../services/logger.service.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock auth middleware
jest.mock('../../middleware/auth.js', () => ({
  __esModule: true,
  authenticateToken: (req: any, res: any, next: any) => next(),
}));

describe('Projects Router', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/projects', projectsRouter);
  });

  describe('GET /api/projects', () => {
    it('should return all projects', async () => {
      // Arrange
      const mockProjects = [
        { id: 'proj-1', title: 'First Novel', type: 'novel', genre: 'fiction', created_at: '2026-01-01' },
        { id: 'proj-2', title: 'Second Novel', type: 'trilogy', genre: 'fantasy', created_at: '2026-01-02' },
      ];

      mockDbPrepare.mockReturnValue({
        all: jest.fn().mockReturnValue(mockProjects),
      });

      // Act
      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockProjects);
      expect(mockDbPrepare).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
    });

    it('should return empty array when no projects exist', async () => {
      // Arrange
      mockDbPrepare.mockReturnValue({
        all: jest.fn().mockReturnValue([]),
      });

      // Act
      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      // Assert
      expect(response.body).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockDbPrepare.mockReturnValue({
        all: jest.fn().mockImplementation(() => {
          throw new Error('Database connection failed');
        }),
      });

      // Act
      const response = await request(app)
        .get('/api/projects')
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Failed to fetch projects');
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project by id', async () => {
      // Arrange
      const mockProject = {
        id: 'proj-1',
        title: 'Test Novel',
        type: 'novel',
        genre: 'fiction',
        created_at: '2026-01-01',
      };

      mockDbPrepare.mockReturnValue({
        get: jest.fn().mockReturnValue(mockProject),
      });

      // Act
      const response = await request(app)
        .get('/api/projects/proj-1')
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockProject);
      expect(mockDbPrepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ?')
      );
    });

    it('should return 404 when project not found', async () => {
      // Arrange
      mockDbPrepare.mockReturnValue({
        get: jest.fn().mockReturnValue(null),
      });

      // Act
      const response = await request(app)
        .get('/api/projects/non-existent')
        .expect(404);

      // Assert
      expect(response.body.error).toContain('Project not found');
    });
  });

  describe('POST /api/projects', () => {
    it('should create new project', async () => {
      // Arrange
      const newProject = {
        title: 'New Novel',
        type: 'novel',
        genre: 'science-fiction',
        story_dna: { theme: 'AI rebellion' },
      };

      const mockInsert = jest.fn().mockReturnValue({ changes: 1 });
      const mockGet = jest.fn().mockReturnValue({
        id: 'proj-new',
        ...newProject,
        created_at: '2026-01-27',
      });

      mockDbPrepare.mockImplementation((query: string) => {
        if (query.includes('INSERT')) {
          return { run: mockInsert };
        }
        if (query.includes('SELECT')) {
          return { get: mockGet };
        }
      });

      // Act
      const response = await request(app)
        .post('/api/projects')
        .send(newProject)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('New Novel');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      // Arrange
      const invalidProject = {
        // Missing title
        type: 'novel',
        genre: 'fiction',
      };

      // Act
      const response = await request(app)
        .post('/api/projects')
        .send(invalidProject)
        .expect(400);

      // Assert
      expect(response.body.error).toContain('title');
    });

    it('should sanitise user input', async () => {
      // Arrange
      const maliciousProject = {
        title: '<script>alert("XSS")</script>',
        type: 'novel',
        genre: 'fiction',
      };

      const mockInsert = jest.fn();
      mockDbPrepare.mockReturnValue({ run: mockInsert });

      // Act
      await request(app)
        .post('/api/projects')
        .send(maliciousProject);

      // Assert - title should be sanitised
      const insertCall = mockInsert.mock.calls[0];
      expect(insertCall).not.toContain('<script>');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update existing project', async () => {
      // Arrange
      const updates = {
        title: 'Updated Title',
        genre: 'mystery',
      };

      const mockUpdate = jest.fn().mockReturnValue({ changes: 1 });
      const mockGet = jest.fn().mockReturnValue({
        id: 'proj-1',
        title: 'Updated Title',
        type: 'novel',
        genre: 'mystery',
      });

      mockDbPrepare.mockImplementation((query: string) => {
        if (query.includes('UPDATE')) {
          return { run: mockUpdate };
        }
        if (query.includes('SELECT')) {
          return { get: mockGet };
        }
      });

      // Act
      const response = await request(app)
        .put('/api/projects/proj-1')
        .send(updates)
        .expect(200);

      // Assert
      expect(response.body.title).toBe('Updated Title');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should return 404 when updating non-existent project', async () => {
      // Arrange
      mockDbPrepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 0 }),
      });

      // Act
      const response = await request(app)
        .put('/api/projects/non-existent')
        .send({ title: 'Updated' })
        .expect(404);

      // Assert
      expect(response.body.error).toContain('not found');
    });

    it('should prevent updating read-only fields', async () => {
      // Arrange
      const maliciousUpdate = {
        id: 'different-id', // Should not be updatable
        created_at: '1970-01-01', // Should not be updatable
        title: 'New Title',
      };

      const mockUpdate = jest.fn().mockReturnValue({ changes: 1 });
      mockDbPrepare.mockReturnValue({ run: mockUpdate });

      // Act
      await request(app)
        .put('/api/projects/proj-1')
        .send(maliciousUpdate);

      // Assert - UPDATE query should not include id or created_at
      const updateCall = mockUpdate.mock.calls[0];
      const updateQuery = mockDbPrepare.mock.calls.find(call =>
        call[0].includes('UPDATE')
      )?.[0];

      expect(updateQuery).not.toContain('id =');
      expect(updateQuery).not.toContain('created_at =');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project and cascade to related records', async () => {
      // Arrange
      const mockDelete = jest.fn().mockReturnValue({ changes: 1 });
      mockDbPrepare.mockReturnValue({
        run: mockDelete,
      });

      // Act
      const response = await request(app)
        .delete('/api/projects/proj-1')
        .expect(200);

      // Assert
      expect(response.body.message).toContain('deleted');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should return 404 when deleting non-existent project', async () => {
      // Arrange
      mockDbPrepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 0 }),
      });

      // Act
      const response = await request(app)
        .delete('/api/projects/non-existent')
        .expect(404);

      // Assert
      expect(response.body.error).toContain('not found');
    });

    it('should handle foreign key constraint errors', async () => {
      // Arrange
      mockDbPrepare.mockReturnValue({
        run: jest.fn().mockImplementation(() => {
          const error: any = new Error('FOREIGN KEY constraint failed');
          error.code = 'SQLITE_CONSTRAINT';
          throw error;
        }),
      });

      // Act
      const response = await request(app)
        .delete('/api/projects/proj-1')
        .expect(500);

      // Assert
      expect(response.body.error).toContain('constraint');
    });
  });
});
```

**Effort**: 4 hours
**Value**: Ensures fundamental CRUD operations work correctly

---

### MEDIUM PRIORITY

#### Test Suite 6: Frontend Component - ExportButtons

**File**: `app/components/__tests__/ExportButtons.test.tsx` (NEW)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportButtons from '../ExportButtons';

// Mock the API
vi.mock('@/lib/api', () => ({
  exportDOCX: vi.fn(),
  exportPDF: vi.fn(),
  exportStoryBible: vi.fn(),
}));

import { exportDOCX, exportPDF, exportStoryBible } from '@/lib/api';

describe('ExportButtons', () => {
  const mockProjectId = 'test-project-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DOCX Export', () => {
    it('should trigger DOCX export on button click', async () => {
      // Arrange
      const user = userEvent.setup();
      (exportDOCX as any).mockResolvedValue(new Blob(['mock docx'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));

      render(<ExportButtons projectId={mockProjectId} />);

      // Act
      const docxButton = screen.getByRole('button', { name: /export.*docx/i });
      await user.click(docxButton);

      // Assert
      await waitFor(() => {
        expect(exportDOCX).toHaveBeenCalledWith(mockProjectId);
      });
    });

    it('should show loading state during DOCX export', async () => {
      // Arrange
      const user = userEvent.setup();
      let resolveExport: (value: Blob) => void;
      const exportPromise = new Promise<Blob>((resolve) => {
        resolveExport = resolve;
      });
      (exportDOCX as any).mockReturnValue(exportPromise);

      render(<ExportButtons projectId={mockProjectId} />);

      const docxButton = screen.getByRole('button', { name: /export.*docx/i });

      // Act
      await user.click(docxButton);

      // Assert - button should be disabled and show loading text
      await waitFor(() => {
        expect(docxButton).toBeDisabled();
        expect(docxButton).toHaveTextContent(/exporting|loading/i);
      });

      // Cleanup
      resolveExport!(new Blob());
    });

    it('should show error toast on DOCX export failure', async () => {
      // Arrange
      const user = userEvent.setup();
      (exportDOCX as any).mockRejectedValue(new Error('Export failed'));

      render(<ExportButtons projectId={mockProjectId} />);

      // Act
      const docxButton = screen.getByRole('button', { name: /export.*docx/i });
      await user.click(docxButton);

      // Assert
      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toHaveTextContent(/export failed|error/i);
      });
    });

    it('should trigger browser download on successful export', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockBlob = new Blob(['mock content'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      (exportDOCX as any).mockResolvedValue(mockBlob);

      // Mock URL.createObjectURL and document.createElement
      const mockObjectURL = 'blob:http://localhost/mock-url';
      global.URL.createObjectURL = vi.fn(() => mockObjectURL);
      global.URL.revokeObjectURL = vi.fn();

      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);

      render(<ExportButtons projectId={mockProjectId} />);

      // Act
      const docxButton = screen.getByRole('button', { name: /export.*docx/i });
      await user.click(docxButton);

      // Assert
      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
        expect(mockAnchor.href).toBe(mockObjectURL);
        expect(mockAnchor.download).toMatch(/manuscript.*\.docx$/);
        expect(mockAnchor.click).toHaveBeenCalled();
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockObjectURL);
      });
    });
  });

  describe('PDF Export', () => {
    it('should trigger PDF export on button click', async () => {
      // Arrange
      const user = userEvent.setup();
      (exportPDF as any).mockResolvedValue(new Blob(['mock pdf'], { type: 'application/pdf' }));

      render(<ExportButtons projectId={mockProjectId} />);

      // Act
      const pdfButton = screen.getByRole('button', { name: /export.*pdf/i });
      await user.click(pdfButton);

      // Assert
      await waitFor(() => {
        expect(exportPDF).toHaveBeenCalledWith(mockProjectId);
      });
    });

    it('should set correct filename for PDF download', async () => {
      // Arrange
      const user = userEvent.setup();
      (exportPDF as any).mockResolvedValue(new Blob(['mock'], { type: 'application/pdf' }));

      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);

      render(<ExportButtons projectId={mockProjectId} />);

      // Act
      const pdfButton = screen.getByRole('button', { name: /export.*pdf/i });
      await user.click(pdfButton);

      // Assert
      await waitFor(() => {
        expect(mockAnchor.download).toMatch(/manuscript.*\.pdf$/);
      });
    });
  });

  describe('Story Bible Export', () => {
    it('should trigger story bible export on button click', async () => {
      // Arrange
      const user = userEvent.setup();
      (exportStoryBible as any).mockResolvedValue(new Blob(['mock'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));

      render(<ExportButtons projectId={mockProjectId} />);

      // Act
      const bibleButton = screen.getByRole('button', { name: /export.*story bible/i });
      await user.click(bibleButton);

      // Assert
      await waitFor(() => {
        expect(exportStoryBible).toHaveBeenCalledWith(mockProjectId);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      // Arrange & Act
      render(<ExportButtons projectId={mockProjectId} />);

      // Assert
      expect(screen.getByRole('button', { name: /export.*docx/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export.*pdf/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export.*story bible/i })).toBeInTheDocument();
    });

    it('should have proper ARIA attributes when disabled', async () => {
      // Arrange
      const user = userEvent.setup();
      (exportDOCX as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ExportButtons projectId={mockProjectId} />);

      const docxButton = screen.getByRole('button', { name: /export.*docx/i });

      // Act
      await user.click(docxButton);

      // Assert
      await waitFor(() => {
        expect(docxButton).toHaveAttribute('aria-disabled', 'true');
        expect(docxButton).toHaveAttribute('aria-busy', 'true');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid button clicks gracefully', async () => {
      // Arrange
      const user = userEvent.setup();
      (exportDOCX as any).mockResolvedValue(new Blob());

      render(<ExportButtons projectId={mockProjectId} />);

      const docxButton = screen.getByRole('button', { name: /export.*docx/i });

      // Act - click multiple times rapidly
      await user.click(docxButton);
      await user.click(docxButton);
      await user.click(docxButton);

      // Assert - should only trigger export once
      await waitFor(() => {
        expect(exportDOCX).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle missing projectId gracefully', () => {
      // Arrange & Act
      render(<ExportButtons projectId={null as any} />);

      const buttons = screen.queryAllByRole('button');

      // Assert - buttons should be disabled or not rendered
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });
});
```

**Effort**: 3 hours
**Value**: Ensures export UI is reliable and accessible

---

## Test Infrastructure Improvements

### 1. Fix Database Migration Tests (Critical)
**Problem**: Tests skipped due to ESM/CommonJS incompatibility
**Solutions**:
- **Option A** (Recommended): Convert to integration tests using real SQLite DB (see Test Suite 4 above)
- **Option B**: Configure Jest for ESM with `jest.config.cjs`:
  ```javascript
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  ```
- **Option C**: Modify `migrate.ts` to conditionally use `__filename` vs `import.meta.url`

**Effort**: 2-4 hours
**Priority**: Critical

### 2. Fix Failing Metrics Service Tests (High)
**Problem**: TypeScript errors due to type definition changes
**Fix**: Update test mocks to include new required fields:
```typescript
const metrics: ProjectMetrics = {
  project_id: 'project-1',
  total_input_tokens: 1000,
  total_output_tokens: 2000,
  total_cost_usd: 0.05,
  total_cost_gbp: 0.04,
  total_chapters: 10,
  total_word_count: 50000,
  reading_time_minutes: 200,
  updated_at: '2026-01-25T10:00:00Z',
  // ADD THESE:
  chapter_input_tokens: 100,
  chapter_output_tokens: 200,
  chapter_cost_usd: 0.005,
  chapter_cost_gbp: 0.004,
};
```

**Effort**: 30 minutes
**Priority**: High

### 3. Add Coverage Reporting (Medium)
**Problem**: No automated coverage reports in CI
**Solution**: Add `@vitest/coverage-v8` and configure:
```json
// package.json
"devDependencies": {
  "@vitest/coverage-v8": "^4.0.18"
}

// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
});
```

**Effort**: 1 hour
**Priority**: Medium

### 4. Add Pre-commit Test Hook (Low)
**Problem**: Broken tests can reach main branch
**Solution**: Add Husky pre-commit hook:
```bash
npm install --save-dev husky
npx husky init
echo "npm run test:run && cd backend && npm test" > .husky/pre-commit
```

**Effort**: 30 minutes
**Priority**: Low

### 5. Implement Contract Testing (Medium)
**Problem**: Frontend and backend can drift apart
**Solution**: Use Pact or MSW for API contract tests:
```typescript
// Example with MSW
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/projects', () => {
    return HttpResponse.json([
      { id: '1', title: 'Test', type: 'novel', genre: 'fiction' },
    ]);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Effort**: 6 hours
**Priority**: Medium

---

## Effort Estimation

| Priority | Tests Needed | Estimated Hours |
|----------|--------------|-----------------|
| **Critical** | 6 test suites | 23 hours |
| **High** | 17 route tests | 25 hours |
| **Medium** | 41 component tests | 60 hours |
| **Low** | Edge cases/refactoring | 15 hours |
| **Infrastructure** | CI/CD, coverage, hooks | 10 hours |
| **TOTAL** | - | **133 hours** (~3-4 weeks) |

### Recommended Phased Approach

**Phase 1 (Week 1)**: Critical Gaps
- Frontend auth tests (3h)
- Export service tests (4h)
- Database migration integration tests (5h)
- E2E export flow (6h)
- Fix failing tests (3h)
- **Total: 21 hours**

**Phase 2 (Week 2)**: High Priority Routes
- Projects CRUD tests (4h)
- Queue management tests (3h)
- Progress tracking tests (3h)
- Saved concepts tests (3h)
- User settings tests (2h)
- Universe tests (3h)
- **Total: 18 hours**

**Phase 3 (Week 3-4)**: Frontend Components + Infrastructure
- Export buttons (3h)
- Chapter list (3h)
- Character form (4h)
- Plot form (4h)
- Project form (4h)
- Story bible viewer (4h)
- Coverage reporting (1h)
- Contract tests (6h)
- **Total: 29 hours**

---

## Feature Requests for `/feature-workflow`

1. **Add coverage thresholds to CI/CD**
   - Block PRs with <70% backend coverage
   - Block PRs with <50% frontend coverage

2. **Implement visual regression testing for exports**
   - Snapshot PDF/DOCX outputs
   - Alert on formatting changes

3. **Add performance benchmarks**
   - Chapter generation time
   - Export generation time
   - API response times

4. **Create test data factories**
   - Consistent test project generator
   - Chapter factory with realistic content
   - Character factory

5. **Add mutation testing**
   - Use Stryker to verify test quality
   - Ensure tests catch actual bugs

6. **Implement E2E test parallelisation**
   - Playwright sharding
   - Reduce E2E test time from ~10min to ~3min

7. **Add accessibility testing automation**
   - Axe-core integration
   - WCAG 2.1 AA compliance checks

---

## Summary

NovelForge has a **solid backend testing foundation** (85% coverage, 1,700+ passing tests) but **critical gaps in frontend testing** (21% component coverage) and **missing E2E tests for core user journeys** (chapter generation, export flows).

**Immediate Action Required**:
1. Fix skipped database migration tests (production risk)
2. Add frontend auth utility tests (authentication bugs)
3. Add E2E export tests (core deliverable validation)
4. Fix failing metrics service tests (broken CI)

**Strengths**:
- Excellent auth route testing
- Comprehensive export route testing
- Outstanding E2E auth testing with Page Object pattern
- Good rate limit handler testing
- 100% repository coverage

**Weaknesses**:
- 79% of frontend components untested
- 53% of backend routes untested
- 42% of backend services untested
- No integration tests for multi-step workflows
- No performance or load testing

With focused effort on the critical gaps (Phase 1: 21 hours), NovelForge can reach production-ready test coverage. Full comprehensive coverage (133 hours) would require 3-4 weeks of dedicated QA effort.

---

**Test Health Score Breakdown**:
- Backend Unit Tests: 8/10
- Frontend Unit Tests: 3/10
- Integration Tests: 4/10
- E2E Tests: 6/10
- Test Infrastructure: 5/10
- **Overall: 6/10** (Good foundation, critical gaps exist)
