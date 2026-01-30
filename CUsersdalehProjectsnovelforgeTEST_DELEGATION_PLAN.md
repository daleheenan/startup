# Test Creation Delegation Plan

## Objective
Create comprehensive unit and integration tests for Phase 3B/4 NovelForge features

## Completed Tests (Project Director)
- ✅ bestseller-mode.service.test.ts (620 lines, 90% coverage target)
- ✅ opening-hook-validator.service.test.ts (540 lines, 85% coverage target)

## Delegation to qa-test-engineer Agent

### Batch 1: Remaining Bestseller Validators
**Agent**: qa-test-engineer
**Priority**: CRITICAL
**Files**:
1. `backend/src/services/__tests__/tension-arc-validator.service.test.ts`
   - Test tension scoring per chapter
   - Test plateau detection (2+ chapters same tension)
   - Test arc shape analysis
   - Test pacing recommendations
   - Coverage target: 85%

2. `backend/src/services/__tests__/character-arc-validator.service.test.ts`
   - Test WANT/NEED identification
   - Test LIE/TRUTH transformation
   - Test arc completeness scoring
   - Test inciting incident detection
   - Test multi-character handling
   - Coverage target: 85%

### Batch 2: Prose Reports Services
**Agent**: qa-test-engineer
**Priority**: HIGH
**Files**:
1. `backend/src/services/prose-reports/__tests__/readability.service.test.ts`
2. `backend/src/services/prose-reports/__tests__/sentence-variety.service.test.ts`
3. `backend/src/services/prose-reports/__tests__/passive-voice.service.test.ts`
4. `backend/src/services/prose-reports/__tests__/adverbs.service.test.ts`

Each should test:
- Analysis with various text samples
- Score calculation accuracy
- Recommendation generation
- Edge cases (empty, single sentence, very long)
- Performance with 10k+ words
- Coverage target: 80%

### Batch 3: Publishing & Routes
**Agent**: qa-test-engineer  
**Priority**: HIGH
**Files**:
1. `backend/src/services/publishing/__tests__/query-letter-generator.test.ts`
2. `backend/src/routes/__tests__/prose-reports.test.ts`
3. `backend/src/routes/__tests__/bestseller.test.ts`
4. `backend/src/routes/__tests__/publishing.test.ts`

### Batch 4: Integration Tests
**Agent**: qa-test-engineer
**Priority**: HIGH
**File**: `backend/src/__tests__/integration/phase3b-phase4.integration.test.ts`

Test workflows:
1. Full analysis workflow (manuscript → all reports → unified)
2. Export workflows (EPUB, PDF, submission package)
3. Bestseller mode validation flow

## Success Criteria
- All tests pass
- Coverage targets met (85% services, 90% routes)
- All tests use UK British spelling
- All edge cases handled
- Performance tests included where applicable

