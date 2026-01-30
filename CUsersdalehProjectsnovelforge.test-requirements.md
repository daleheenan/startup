# Test Requirements for Phase 3B/4 Features

## Backend Services to Test

### 1. Bestseller Mode Service (`bestseller-mode.service.ts`)
**Priority**: CRITICAL
**Lines**: 620
**Test Coverage Target**: 90%

Key Methods to Test:
- `toggleBestsellerMode()` - Enable/disable bestseller mode
- `isEnabled()` - Check if enabled
- `getOrCreateCriteria()` - Get/create criteria record
- `getCriteria()` - Retrieve criteria
- `updateCriteria()` - Update criteria with validation
- `validateChecklist()` - Comprehensive checklist validation
- `canStartGeneration()` - Pre-generation validation
- `getBestsellerPromptEnhancements()` - Prompt enhancement generation
- `mapRowToCriteria()` - Database mapping

Test Scenarios:
1. Toggle mode on/off
2. Create new criteria when enabling
3. Validate checklist with various completion states
4. Test each validation requirement (15 items)
5. Test generation blocking when checklist incomplete
6. Test prompt enhancement generation
7. Test database CRUD operations
8. Edge cases: missing data, partial completion, warnings vs errors

### 2. Opening Hook Validator (`opening-hook-validator.service.ts`)
**Priority**: CRITICAL
**Lines**: 172
**Test Coverage Target**: 85%

Key Methods to Test:
- `analyseOpeningHook()` - Analyse first chapter opening
- Hook scoring algorithm
- Feedback generation

Test Scenarios:
1. Strong opening hook (score 8-10)
2. Weak opening hook (score 1-3)
3. Medium opening hook (score 4-7)
4. Missing first chapter
5. Empty content
6. Various hook patterns

### 3. Tension Arc Validator (`tension-arc-validator.service.ts`)
**Priority**: CRITICAL
**Lines**: 268
**Test Coverage Target**: 85%

Key Methods to Test:
- `analyseTensionArc()` - Analyse tension across chapters
- Tension scoring per chapter
- Arc shape analysis
- Pacing recommendations

Test Scenarios:
1. Proper escalating tension arc
2. Flat tension (pacing issue)
3. Erratic tension (inconsistent)
4. Missing chapters
5. Single chapter book
6. Recommendation generation

### 4. Character Arc Validator (`character-arc-validator.service.ts`)
**Priority**: CRITICAL
**Lines**: 376
**Test Coverage Target**: 85%

Key Methods to Test:
- `analyseCharacterArc()` - Analyse character development
- Arc completeness scoring
- Growth trajectory analysis
- Multi-character handling

Test Scenarios:
1. Complete character arc (lie to truth)
2. Flat arc (no growth)
3. Partial arc
4. Multiple characters
5. Missing character data
6. Edge cases

### 5. Prose Reports Services
**Priority**: HIGH

Files to Test:
- `readability.service.ts` - Readability analysis
- `sentence-variety.service.ts` - Sentence structure analysis
- `passive-voice.service.ts` - Passive voice detection
- `adverbs.service.ts` - Adverb usage analysis

Each service Test Coverage Target: 80%

Test Scenarios:
1. Analysis with sample text
2. Edge cases: empty text, single sentence, very long text
3. Score calculation accuracy
4. Recommendation generation
5. Performance with large text (10,000+ words)

### 6. Publishing Services
**Priority**: HIGH

File: `publishing/query-letter-generator.ts`
Test Coverage Target: 80%

Test Scenarios:
1. Generate query letter with complete data
2. Partial data handling
3. Different genres
4. Template variations
5. Edge cases

## Backend Routes to Test

### 1. Prose Reports Routes (`routes/prose-reports.ts`)
Test all endpoints:
- `GET /:projectId/book/:bookId` - Book-level reports
- `GET /:projectId/chapter/:chapterId` - Chapter-level reports

Test Scenarios:
1. Successful report generation
2. Missing project/book/chapter
3. Empty content
4. Multiple chapters
5. Error handling

### 2. Bestseller Routes (`routes/bestseller.ts`)
Test all endpoints:
- `GET /:bookId/analysis` - Full bestseller analysis
- `POST /:projectId/enable` - Enable mode
- `POST /:projectId/disable` - Disable mode

Test Scenarios:
1. Complete analysis flow
2. Enable/disable mode
3. Missing book
4. Partial data
5. Error handling

### 3. Publishing Routes (`routes/publishing.ts`)
Test all endpoints:
- `POST /:projectId/query-letter` - Generate query letter

Test Scenarios:
1. Successful generation
2. Missing project
3. Partial data
4. Different genres
5. Error handling

## Integration Tests

### 1. Full Analysis Workflow
Test the complete flow:
1. Create project/book
2. Add chapters
3. Run all analyses (prose reports, bestseller, genre conventions)
4. Verify unified results
5. Export analysis package

### 2. Export Workflows
Test complete export flows:
1. EPUB export with metadata
2. PDF export with formatting
3. Submission package (DOCX + synopsis + query letter)
4. Multiple format export

### 3. Bestseller Mode Validation Flow
Test complete bestseller flow:
1. Enable bestseller mode
2. Fill out checklist (incomplete)
3. Attempt generation (should block)
4. Complete checklist
5. Generate successfully
6. Run bestseller analysis
7. Review score and recommendations

## Coverage Targets

- Backend services: 85%
- Backend routes: 90%
- Integration tests: Full workflow coverage
- All tests must use UK British spelling
- All tests must handle edge cases and errors
