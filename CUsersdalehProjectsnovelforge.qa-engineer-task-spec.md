# QA Test Engineer Task Specification

## Mission
Create comprehensive unit and integration tests for Phase 3B/4 NovelForge features that were recently implemented but lack test coverage.

## Context
The Project Director has completed 2 critical test files:
1. bestseller-mode.service.test.ts (26KB, ~680 lines, 90% coverage target)
2. opening-hook-validator.service.test.ts (21KB, ~540 lines, 85% coverage target)

You need to create the remaining 11 test files following the same high-quality patterns.

## Files to Create

### CRITICAL Priority (Complete First)

#### 1. tension-arc-validator.service.test.ts
**Source**: `backend/src/services/tension-arc-validator.service.ts` (250 lines)
**Target Coverage**: 85%
**Location**: `backend/src/services/__tests__/tension-arc-validator.service.test.ts`

Must test:
- `analyseTensionArc()` method with various chapter counts
- Tension scoring per chapter (1-10 scale)
- Plateau detection (2+ consecutive chapters at same tension)
- Arc shape analysis (upward trend detection)
- Pacing recommendations based on plateaus
- Graph data generation
- Overall arc score calculation
- Edge cases: single chapter, no chapters, empty content
- Version-aware chapter filtering

Test scenarios:
- Proper escalating arc (scores increasing towards climax)
- Flat arc (all same tension - should flag as pacing issue)
- Erratic arc (random ups and downs)
- Low tension plateau (3+ chapters at tension 1-3)
- High tension plateau (3+ chapters at tension 8-10)
- Standard deviation calculation for variation score
- First third vs last third comparison for trend score

#### 2. character-arc-validator.service.test.ts
**Source**: `backend/src/services/character-arc-validator.service.ts` (351 lines)
**Target Coverage**: 85%
**Location**: `backend/src/services/__tests__/character-arc-validator.service.test.ts`

Must test:
- `analyseCharacterArc()` method
- WANT (external goal) identification
- NEED (internal growth) identification
- LIE to TRUTH transformation tracking
- Arc completeness scoring (0-100%)
- Inciting incident detection
- Inciting incident timing validation (should be by Chapter 3)
- Multi-character handling
- Manuscript excerpt building (first 3, middle, last 2 chapters)
- Edge cases: no characters, missing character data, incomplete arc

Test scenarios:
- Complete arc: WANT + NEED + LIE/TRUTH all identified, arc completeness 90%+
- Partial arc: WANT identified but missing NEED
- Flat arc: no transformation visible
- Multiple characters with different arc qualities
- Inciting incident in Chapter 1 vs Chapter 5 (warn if after Chapter 3)
- Missing character description handling
- Protagonist vs supporting character role handling

### HIGH Priority

#### 3-6. Prose Reports Service Tests
**Location**: `backend/src/services/prose-reports/__tests__/`

Create 4 test files:
- `readability.service.test.ts`
- `sentence-variety.service.test.ts`
- `passive-voice.service.test.ts`
- `adverbs.service.test.ts`

Each must test:
- Static `generateReport()` method
- Analysis with various text samples (simple, complex, mixed)
- Score calculation accuracy
- Recommendation generation based on scores
- Edge cases: empty text, single sentence, single word
- Performance with large text (10,000+ words)
- Proper score ranges (0-100 or 1-10 depending on service)
- Issue detection and highlighting
- British spelling in all outputs

Sample test structures:
- Simple text (short sentences, basic vocabulary)
- Complex text (long sentences, advanced vocabulary)
- Mixed text (variety of sentence structures)
- Empty string
- Very long text (performance test)

#### 7. query-letter-generator.test.ts
**Source**: `backend/src/services/publishing/query-letter-generator.ts`
**Location**: `backend/src/services/publishing/__tests__/query-letter-generator.test.ts`

Must test:
- `generateQueryLetter()` function
- Complete input data handling
- Partial data handling (fallbacks)
- Different genre query letter generation
- Template variable substitution
- Word count formatting
- Agent personalization
- Edge cases: missing fields, invalid genre

#### 8-10. Route Tests

Create 3 route test files:
- `backend/src/routes/__tests__/prose-reports.test.ts`
- `backend/src/routes/__tests__/bestseller.test.ts`
- `backend/src/routes/__tests__/publishing.test.ts`

Use `supertest` for HTTP testing. Each must test:
- All endpoint HTTP methods (GET, POST, etc.)
- Success responses (200, 201)
- Error responses (400, 404, 500)
- Request validation
- Database interactions
- Service layer integration
- Missing resource handling

Specific endpoints:
**prose-reports.ts**:
- GET /:projectId/book/:bookId (book-level reports)
- GET /:projectId/chapter/:chapterId (chapter-level reports)

**bestseller.ts**:
- GET /:bookId/analysis (full bestseller analysis)
- POST /:projectId/enable (enable mode)
- POST /:projectId/disable (disable mode)

**publishing.ts**:
- POST /:projectId/query-letter (generate query letter)

#### 11. Integration Test
**Location**: `backend/src/__tests__/integration/phase3b-phase4.integration.test.ts`

Test complete workflows:
1. Full analysis workflow:
   - Create test project and book
   - Add test chapters with content
   - Run prose reports analysis
   - Run bestseller analysis
   - Verify unified results
   - Clean up test data

2. Export workflows:
   - EPUB export with metadata
   - PDF export with formatting  
   - Submission package (DOCX + synopsis + query letter)

3. Bestseller mode validation:
   - Enable bestseller mode
   - Create incomplete checklist
   - Attempt generation (should block)
   - Complete checklist
   - Generation succeeds
   - Run bestseller analysis
   - Verify score and recommendations

## Standards

### Test Structure
- Use Jest testing framework (@jest/globals imports)
- Use TypeScript
- Mock all external dependencies (database, Claude API, logger)
- Group tests with `describe` blocks
- Use `beforeEach` and `afterEach` for setup/cleanup
- Clear and restore mocks properly

### Naming Conventions
- Test files: `*.test.ts`
- Describe blocks: Service/method name
- Test cases: "should [expected behaviour] when [condition]"

### Coverage Requirements
- Services: 85% minimum
- Routes: 90% minimum
- All edge cases covered
- All error paths tested

### UK British Spelling
- Use "analyse" not "analyze"
- Use "behaviour" not "behavior"
- Use "organise" not "organize"
- Use "colour" not "color"

## Patterns to Follow

Look at the completed tests for reference:
- `backend/src/services/__tests__/bestseller-mode.service.test.ts`
- `backend/src/services/__tests__/opening-hook-validator.service.test.ts`

Key patterns:
1. Mock setup in beforeEach
2. Mock cleanup in afterEach  
3. Test happy paths first
4. Then test error cases
5. Then test edge cases
6. Use descriptive test names
7. Assert on specific values, not just truthy/falsy
8. Test database interactions with proper mocking
9. Test validation logic thoroughly

## Deliverables

13 test files total:
- 2 ✅ completed (bestseller-mode, opening-hook-validator)
- 11 ⏳ to create (tension-arc, character-arc, 4x prose-reports, query-letter, 3x routes, integration)

All files must:
- Pass lint checks
- Follow project code style
- Have comprehensive test coverage
- Use proper mocking
- Handle all edge cases
- Use UK British spelling

## Timeline
Create tests in priority order:
1. CRITICAL: tension-arc and character-arc validators
2. HIGH: Prose reports services (4 files)
3. HIGH: Publishing and routes (4 files)
4. HIGH: Integration test (1 file)

Ready to proceed?
