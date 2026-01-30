# Unified Analysis Engine - Architecture Document

## Executive Summary

The Unified Analysis Engine integrates all analysis capabilities added in Sprints 39-44 into a cohesive system that provides comprehensive manuscript analysis through a single orchestrated workflow.

## Analysis Capabilities Integrated

### 1. Prose Analysis (ProWritingAid-Style Reports - Sprint 40)
- **Readability Analysis**: Flesch-Kincaid, sentence length, word complexity
- **Sentence Variety**: Detects monotonous patterns, analyses structure diversity
- **Passive Voice Detection**: Identifies passive constructions with suggestions
- **Adverb Analysis**: Flags weak adverbs, suggests stronger alternatives

**Services**:
- `ReadabilityService`
- `SentenceVarietyService`
- `PassiveVoiceService`
- `AdverbsService`

### 2. Genre Convention Validation (Sprint 41)
- Validates manuscript against genre-specific conventions
- Checks for required tropes and story beats
- Identifies missing or misplaced genre elements

**Services**:
- `genreConventionsService`
- `genreTropesService`

### 3. Bestseller Formula Validation (Sprints 43-44)
- **Opening Hook Analysis**: Detects weak opening patterns (weather, waking, mirror, info dumps)
- **Tension Arc Analysis**: Tracks tension levels across chapters, identifies plateaus
- **Character Arc Analysis**: Validates protagonist WANT/NEED/LIE structure
- **Commercial Beat Validation**: Ensures Save the Cat beats are properly placed

**Services**:
- `OpeningHookValidatorService`
- `TensionArcValidatorService`
- `CharacterArcValidatorService`
- `BestsellerModeService`

### 4. Genre-Specific Commercial Analysis (Sprint 42)
- **Romance**: Heat level classification, emotional beat tracking (meet-cute → HEA/HFN)
- **Thriller**: Pacing analysis, clue tracking, red herrings, escalation validation
- **Sci-Fi**: Worldbuilding consistency, tech coherence, hard vs soft sci-fi classification

**Services**:
- `RomanceCommercialService`
- `ThrillerCommercialService`
- `SciFiCommercialService`

### 5. Publishing Readiness (Sprint 39)
- Query letter generation
- Synopsis generation
- Traditional publishing package preparation

**Services**:
- `generateQueryLetter`
- Publishing templates and generators

---

## Unified Analysis Engine Design

### Architecture Principles

1. **Single Entry Point**: One service orchestrates all analysis types
2. **Intelligent Caching**: Results cached by analysis type + content hash to avoid redundant AI calls
3. **Parallel Execution**: Independent analyses run concurrently for speed
4. **Incremental Results**: Return partial results as analyses complete
5. **Version-Aware**: All analyses respect active book versions
6. **Genre-Adaptive**: Automatically selects relevant genre-specific analyses

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   Unified Analysis Request                      │
│  { bookId, analysisTypes[], options, forceRefresh? }           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               UnifiedAnalysisService.analyse()                  │
│  1. Fetch book metadata (genre, version, chapter count)        │
│  2. Check cache for existing results                            │
│  3. Determine which analyses to run based on genre              │
│  4. Execute analyses in parallel batches                        │
│  5. Aggregate results into unified report                       │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
     │ Prose        │ │ Bestseller   │ │ Genre-       │
     │ Analysis     │ │ Formula      │ │ Specific     │
     │ (Parallel)   │ │ (Sequential) │ │ (Conditional)│
     └──────────────┘ └──────────────┘ └──────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Unified Analysis Result                       │
│  {                                                               │
│    bookId, timestamp, version,                                  │
│    prose: { readability, sentenceVariety, passiveVoice, ... },  │
│    bestseller: { openingHook, tensionArc, characterArc, ... },  │
│    genre: { conventions, tropes, commercialBeats, ... },        │
│    overallScore: number,                                         │
│    recommendations: string[],                                    │
│    warnings: string[]                                            │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Analysis Type Categories

```typescript
export type AnalysisType =
  // Prose quality
  | 'readability'
  | 'sentence-variety'
  | 'passive-voice'
  | 'adverbs'
  | 'prose-full'  // All prose analyses

  // Bestseller formula
  | 'opening-hook'
  | 'tension-arc'
  | 'character-arc'
  | 'bestseller-full'  // All bestseller validations

  // Genre conventions
  | 'genre-conventions'
  | 'genre-tropes'
  | 'romance-beats'      // Romance-specific
  | 'thriller-pacing'    // Thriller-specific
  | 'scifi-consistency'  // Sci-Fi-specific

  // Publishing
  | 'publishing-readiness'

  // Comprehensive
  | 'comprehensive';  // Everything applicable to the genre
```

### Caching Strategy

**Cache Keys**: `analysis:{bookId}:{analysisType}:{contentHash}`

**Content Hash**: Hash of all chapter content + version IDs (to detect changes)

**TTL**:
- Prose analyses: 7 days (text-based, deterministic)
- Bestseller analyses: 3 days (AI-based, may improve with prompt updates)
- Genre analyses: 7 days (rule-based with AI enhancement)

**Invalidation**:
- Any chapter content change invalidates all analyses for that book
- Version switch invalidates all analyses
- Manual force refresh available via API

### Unified Report Format

```typescript
export interface UnifiedAnalysisReport {
  // Metadata
  bookId: string;
  projectId: string;
  bookTitle: string;
  genre: string;
  analysisTimestamp: string;
  versionId: string | null;
  contentHash: string;

  // Overall scoring
  overallScore: number;  // 0-100, weighted average of all applicable scores
  scoreBreakdown: {
    prose: number;
    bestseller: number;
    genreConventions: number;
  };

  // Prose quality results
  prose?: {
    readability: ReadabilityReport;
    sentenceVariety: SentenceVarietyReport;
    passiveVoice: PassiveVoiceReport;
    adverbs: AdverbsReport;
  };

  // Bestseller formula results
  bestseller?: {
    openingHook: OpeningHookResult;
    tensionArc: TensionArcResult;
    characterArc: CharacterArcResult;
  };

  // Genre-specific results
  genre?: {
    conventions: GenreConventionValidation;
    tropes: GenreTropeAnalysis;
    commercialBeats?: RomanceBeatValidation | ThrillerPacingAnalysis | SciFiConsistencyReport;
  };

  // Publishing readiness
  publishing?: {
    queryLetterReady: boolean;
    synopsisReady: boolean;
    recommendedActions: string[];
  };

  // Aggregated insights
  topIssues: Issue[];  // Top 10 most critical issues across all analyses
  quickWins: Recommendation[];  // Easy improvements with high impact
  warnings: string[];
  recommendations: string[];

  // Execution metadata
  executionTimeMs: number;
  cachedResults: string[];  // Which analyses used cache
  freshResults: string[];   // Which analyses ran fresh
}

export interface Issue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'prose' | 'structure' | 'genre' | 'character';
  description: string;
  location?: string;  // Chapter/page reference
  recommendation: string;
  effort: 'low' | 'medium' | 'high';  // Effort to fix
  impact: 'low' | 'medium' | 'high';  // Impact of fixing
}

export interface Recommendation {
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  category: string;
}
```

---

## Implementation Plan

### Phase 1: Core Service (Priority 1)
✅ File: `backend/src/services/unified-analysis.service.ts`

- Implements `UnifiedAnalysisService` class
- Orchestrates all analysis types
- Manages caching and content hashing
- Aggregates results into unified report
- Calculates overall scores and prioritises recommendations

### Phase 2: Route Module (Priority 1)
✅ Files: `backend/src/routes/analysis/` (modularised)
- `index.ts` - Router composition
- `unified.ts` - Unified analysis endpoints
- `prose.ts` - Prose analysis endpoints (already exists as prose-reports.ts, integrate)
- `bestseller.ts` - Bestseller validation endpoints (already exists, integrate)
- `genre.ts` - Genre convention endpoints (already exists as genre-conventions.ts, integrate)

### Phase 3: Integration (Priority 2)
✅ Update `backend/src/services/index.ts` - Export unified service
✅ Update `backend/src/server.ts` - Mount `/api/analysis` routes
✅ Ensure existing routes remain functional (backwards compatibility)

### Phase 4: Testing (Priority 3)
- End-to-end test for comprehensive analysis
- Cache invalidation tests
- Genre-specific analysis selection tests
- Performance benchmarks

---

## API Endpoints

### Unified Analysis Endpoints

#### `POST /api/analysis/:bookId/comprehensive`
Runs all applicable analyses for a book based on its genre.

**Request Body**:
```json
{
  "forceRefresh": false,
  "options": {
    "includeChapterBreakdown": true,
    "detailLevel": "standard"  // "minimal" | "standard" | "detailed"
  }
}
```

**Response**: `UnifiedAnalysisReport`

#### `POST /api/analysis/:bookId/custom`
Runs specific analyses selected by the user.

**Request Body**:
```json
{
  "analysisTypes": ["prose-full", "opening-hook", "genre-conventions"],
  "forceRefresh": false
}
```

**Response**: `UnifiedAnalysisReport` (partial)

#### `GET /api/analysis/:bookId/status`
Gets cached analysis status and freshness.

**Response**:
```json
{
  "bookId": "...",
  "hasCache": true,
  "lastAnalysis": "2026-01-30T10:30:00Z",
  "contentChanged": false,
  "availableAnalyses": ["prose-full", "bestseller-full"],
  "staleAnalyses": ["genre-conventions"]
}
```

#### `DELETE /api/analysis/:bookId/cache`
Invalidates all cached analyses for a book.

### Backwards Compatibility

All existing endpoints remain functional:
- `/api/prose-reports/:projectId/book/:bookId` → Delegates to unified engine
- `/api/bestseller/:bookId/analysis` → Delegates to unified engine
- `/api/genre-conventions/validate` → Delegates to unified engine

---

## Performance Considerations

### Parallel Execution Strategy

**Batch 1 (Prose - Text-based, fast, no AI)**:
- Readability analysis
- Sentence variety analysis
- Passive voice detection
- Adverb analysis

**Batch 2 (Bestseller - AI-based, slower)**:
- Opening hook validation (first chapter only)
- Character arc analysis (lightweight scan)

**Batch 3 (Heavy AI - Sequential to avoid rate limits)**:
- Tension arc analysis (all chapters)
- Genre convention validation
- Commercial beat analysis

### Estimated Execution Times

| Analysis Type | Without Cache | With Cache |
|---------------|---------------|------------|
| Prose Full | 2-3s | <100ms |
| Opening Hook | 5-8s | <100ms |
| Tension Arc | 15-25s (depends on chapter count) | <100ms |
| Character Arc | 8-12s | <100ms |
| Genre Conventions | 5-10s | <100ms |
| **Comprehensive (all)** | **35-50s** | **<500ms** |

### Cache Hit Rate Targets

- **First analysis**: 0% (cold start)
- **Subsequent reads**: 95%+ (until content changes)
- **Partial changes**: 70%+ (only changed chapters invalidated)

---

## Success Metrics

1. **Single Entry Point**: All analyses accessible via one unified service
2. **Sub-second cached responses**: <500ms for comprehensive cached report
3. **Efficient fresh analysis**: <60s for full comprehensive analysis on typical 30-chapter novel
4. **High cache hit rate**: >90% on repeated analyses
5. **Actionable insights**: Top 10 issues correctly prioritised by impact/effort

---

## Future Enhancements

1. **Incremental Analysis**: Analyse only changed chapters
2. **Real-time Analysis**: Stream results as they complete
3. **Historical Tracking**: Track score improvements over time
4. **Comparative Analysis**: Compare against bestsellers in same genre
5. **AI-Powered Prioritisation**: Use AI to rank recommendations by likelihood of commercial success
6. **Batch Analysis**: Analyse entire series in one request
7. **Export Reports**: PDF/Word export of analysis reports for sharing with editors

---

## Dependencies

### Existing Services (No Changes Required)
- All prose-reports services (Sprint 40)
- Opening/Tension/Character arc validators (Sprint 43-44)
- Genre conventions/tropes services (Sprint 41)
- Bestseller mode service (Sprint 44)
- Romance/Thriller/Sci-Fi commercial services (Sprint 42)

### New Dependencies
- Content hashing utility (for cache key generation)
- Result aggregation utilities (for score calculation and prioritisation)

### Infrastructure
- Cache service (already exists, will use existing implementation)
- Logger service (already exists)
- Database connection (already exists)

---

## Implementation Notes

1. **UK British Spelling**: All generated text uses British spelling conventions
2. **Route File Size Limit**: Analysis routes module must follow <600 line limit per file
3. **Barrel Exports**: Import services via `services/index.ts` where possible
4. **Error Handling**: Graceful degradation if individual analyses fail
5. **Version Awareness**: All DB queries filter by active version using `VERSION_AWARE_CHAPTER_FILTER`
6. **Type Safety**: Full TypeScript typing for all interfaces and responses
