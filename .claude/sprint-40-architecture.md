# Sprint 40: ProWritingAid-Style Reports - Technical Architecture

## Overview

Implement comprehensive prose analysis reports matching industry-standard tools, providing authors with actionable insights into their writing quality.

## Point Distribution

Total: ~50 points across 10 reports

1. Pacing Report (8 pts) - Most complex, requires chapter context
2. Echoes Report (5 pts) - Proximity matching algorithm
3. Sentence Variety Report (5 pts) - Statistical analysis
4. Dialogue Tags Report (5 pts) - Pattern recognition
5. Sticky Sentences Report (5 pts) - Glue word ratio analysis
6. Readability Report (5 pts) - Multiple metrics
7. Overused Words Report (5 pts) - Frequency comparison
8. Adverb Report (3 pts) - Pattern matching
9. Passive Voice Report (3 pts) - Grammar detection
10. Report Dashboard UI (6 pts) - Unified interface

## Architecture Pattern

Follow CLAUDE.md modular route pattern:

```
backend/src/services/prose-reports/
├── index.ts                    # Barrel exports
├── pacing.service.ts           # Pacing analysis
├── echoes.service.ts           # Repeated word detection
├── sentence-variety.service.ts # Sentence structure analysis
├── dialogue-tags.service.ts    # Dialogue tag analysis
├── sticky-sentences.service.ts # Glue word detection
├── readability.service.ts      # Readability metrics
├── overused-words.service.ts   # Word frequency analysis
├── adverbs.service.ts          # Adverb detection
├── passive-voice.service.ts    # Passive voice detection
└── types.ts                    # Shared types

backend/src/routes/prose-reports/
├── index.ts                    # Router composition
├── pacing.ts                   # GET /api/prose-reports/:bookId/pacing
├── echoes.ts                   # GET /api/prose-reports/:bookId/echoes
├── sentence-variety.ts         # GET /api/prose-reports/:bookId/sentence-variety
├── dialogue-tags.ts            # GET /api/prose-reports/:bookId/dialogue-tags
├── sticky-sentences.ts         # GET /api/prose-reports/:bookId/sticky-sentences
├── readability.ts              # GET /api/prose-reports/:bookId/readability
├── overused-words.ts           # GET /api/prose-reports/:bookId/overused-words
├── adverbs.ts                  # GET /api/prose-reports/:bookId/adverbs
├── passive-voice.ts            # GET /api/prose-reports/:bookId/passive-voice
└── dashboard.ts                # GET /api/prose-reports/:bookId/dashboard (all reports)

app/projects/[id]/reports/
├── page.tsx                    # Main dashboard page
└── components/
    ├── PacingChart.tsx
    ├── EchoesTable.tsx
    ├── SentenceVarietyChart.tsx
    ├── DialogueTagsTable.tsx
    ├── StickySentencesTable.tsx
    ├── ReadabilityMetrics.tsx
    ├── OverusedWordsTable.tsx
    ├── AdverbsTable.tsx
    └── PassiveVoiceTable.tsx
```

## Service Design Details

### 1. Pacing Service (8 pts)

**Purpose**: Analyse narrative pacing by detecting slow (description/introspection) vs fast (dialogue/action) sections.

**Algorithm**:
```typescript
interface PacingSegment {
  type: 'slow' | 'fast';
  startWord: number;
  endWord: number;
  text: string;
}

interface ChapterPacing {
  chapterId: string;
  chapterTitle: string;
  segments: PacingSegment[];
  fastPercentage: number;
  slowPercentage: number;
  pacingScore: 'balanced' | 'too-slow' | 'too-fast';
}

function analysePacing(chapterText: string): ChapterPacing {
  // 1. Split into sentences
  // 2. Classify each sentence as dialogue/action vs narrative/description
  //    - Dialogue: contains quotes
  //    - Action: short sentences, action verbs, present participles
  //    - Narrative: longer, introspective, descriptive adjectives
  // 3. Group consecutive similar sentences into segments
  // 4. Calculate percentages
  // 5. Score based on genre expectations (thriller = 65%+ fast, literary = 40-60% balanced)
}
```

**Visual Output**:
```
Chapter 1: The Beginning ████░░████░░░████████░░ (62% fast)
Chapter 2: Slow Burn    ░░░░████░░░░░████░░░░░░ (35% fast) ⚠️ Too Slow
Chapter 3: Climax       ██████████████████████ (95% fast)
```

### 2. Echoes Service (5 pts)

**Purpose**: Detect repeated words/phrases within 200-word proximity that can annoy readers.

**Algorithm**:
```typescript
interface Echo {
  word: string;
  positions: number[]; // Word indices
  proximity: number; // Words between repetitions
  severity: 'minor' | 'moderate' | 'severe';
  context: { position: number; sentence: string }[];
}

function findEchoes(text: string, proximityThreshold = 200): Echo[] {
  // 1. Tokenize into words with positions
  // 2. Create sliding window of 200 words
  // 3. Count word frequencies in each window
  // 4. Flag words repeated 3+ times in same window
  // 5. Ignore common words (the, and, of, etc.)
  // 6. Group consecutive echoes of same word
  // 7. Calculate severity based on proximity (closer = worse)
}
```

**Severity Levels**:
- Severe: Same word within 50 words
- Moderate: Same word within 100 words
- Minor: Same word within 200 words

### 3. Sentence Variety Service (5 pts)

**Purpose**: Analyse sentence structure patterns for monotony.

**Algorithm**:
```typescript
interface SentenceVarietyReport {
  lengthDistribution: {
    short: number; // < 10 words
    medium: number; // 10-20 words
    long: number; // 20-30 words
    veryLong: number; // 30+ words
  };
  avgLength: number;
  variance: number;
  structurePatterns: {
    simple: number; // No conjunctions
    compound: number; // One conjunction
    complex: number; // Multiple clauses
  };
  startPatterns: string[]; // Most common first words
  varietyScore: number; // 0-100
}
```

### 4. Dialogue Tags Service (5 pts)

**Purpose**: Identify overused dialogue tags and suggest alternatives.

**Algorithm**:
```typescript
interface DialogueTag {
  tag: string;
  count: number;
  percentage: number; // Of all dialogue
  severity: 'good' | 'overused' | 'excessive';
  alternatives?: string[];
}

function analyseDialogueTags(text: string): DialogueTag[] {
  // 1. Extract all dialogue with surrounding context
  // 2. Identify dialogue tags (said, asked, shouted, etc.)
  // 3. Count frequencies
  // 4. "said" is good up to 60%, others should be < 10% each
  // 5. Suggest alternatives for overused tags
}
```

**Tag Guidelines**:
- "said": 40-60% is optimal (invisible to readers)
- "asked": 20-30% is fine
- Others (whispered, shouted, etc.): < 10% each

### 5. Sticky Sentences Service (5 pts)

**Purpose**: Flag sentences with too many glue words (of, to, for, a, an, the, etc.).

**Algorithm**:
```typescript
interface StickySentence {
  sentence: string;
  glueWordCount: number;
  glueWordPercentage: number;
  totalWords: number;
  position: number;
  severity: 'minor' | 'moderate' | 'severe';
  suggestion: string;
}

const GLUE_WORDS = ['of', 'to', 'for', 'a', 'an', 'the', 'in', 'on', 'at',
                     'by', 'with', 'from', 'as', 'is', 'was', 'are', 'were'];

function findStickySentences(text: string): StickySentence[] {
  // 1. Split into sentences
  // 2. Count glue words in each sentence
  // 3. Calculate percentage
  // 4. Flag if > 40% glue words
  // 5. Severity: 40-50% moderate, 50%+ severe
}
```

### 6. Readability Service (5 pts)

**Purpose**: Comprehensive readability metrics.

**Algorithm**:
```typescript
interface ReadabilityReport {
  fleschKincaidGradeLevel: number;
  fleschReadingEase: number;
  gunningFogIndex: number;
  automatedReadabilityIndex: number;
  complexWordPercentage: number;
  avgSentenceLength: number;
  avgWordLength: number;
  interpretation: string;
  targetAudience: string;
}

// Use existing ProseAnalyzer.calculateTextMetrics + additional metrics
```

**Formulas**:
- Flesch-Kincaid Grade: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
- Flesch Reading Ease: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
- Gunning Fog: 0.4 * [(words/sentences) + 100 * (complex words/words)]

### 7. Overused Words Service (5 pts)

**Purpose**: Identify personally overused words compared to genre averages.

**Algorithm**:
```typescript
interface OverusedWord {
  word: string;
  count: number;
  frequency: number; // Per 10,000 words
  genreAverage: number;
  overuseRatio: number; // Your freq / genre avg
  severity: 'minor' | 'moderate' | 'severe';
}

function findOverusedWords(text: string, genre: string): OverusedWord[] {
  // 1. Tokenize and count all words
  // 2. Calculate frequency per 10k words
  // 3. Compare against genre baselines (from corpus analysis)
  // 4. Flag words used 2x+ more than genre average
  // 5. Exclude dialogue tags and character names
}
```

### 8. Adverbs Service (3 pts)

**Purpose**: Flag -ly adverbs and suggest stronger verb alternatives.

**Algorithm**:
```typescript
interface AdverbIssue {
  adverb: string;
  context: string; // Sentence containing adverb
  position: number;
  suggestion: string; // Stronger verb alternative
}

function findAdverbs(text: string): AdverbIssue[] {
  // 1. Match all -ly words
  // 2. Filter out non-adverbs (lovely, friendly, etc.)
  // 3. Extract context sentence
  // 4. Suggest verb alternatives (e.g., "walked quickly" → "hurried")
}
```

### 9. Passive Voice Service (3 pts)

**Purpose**: Detect passive voice constructions.

**Algorithm**:
```typescript
interface PassiveVoiceInstance {
  sentence: string;
  passivePhrase: string;
  position: number;
  activeSuggestion: string;
}

function findPassiveVoice(text: string): PassiveVoiceInstance[] {
  // 1. Match patterns: [be verb] + [past participle]
  //    - is/are/was/were/been/being + [verb]ed/en
  // 2. Exclude legitimate uses (passive in dialogue, emphasis)
  // 3. Suggest active alternatives
}
```

**Patterns**:
- "was written" → "wrote"
- "is being considered" → "considers"
- "had been forgotten" → "forgot"

## API Endpoints

All endpoints support optional `?versionId=` parameter for analysing specific versions.

### Individual Reports

```
GET /api/prose-reports/:bookId/pacing?versionId=
GET /api/prose-reports/:bookId/echoes?versionId=
GET /api/prose-reports/:bookId/sentence-variety?versionId=
GET /api/prose-reports/:bookId/dialogue-tags?versionId=
GET /api/prose-reports/:bookId/sticky-sentences?versionId=
GET /api/prose-reports/:bookId/readability?versionId=
GET /api/prose-reports/:bookId/overused-words?versionId=
GET /api/prose-reports/:bookId/adverbs?versionId=
GET /api/prose-reports/:bookId/passive-voice?versionId=
```

### Dashboard

```
GET /api/prose-reports/:bookId/dashboard?versionId=

Returns:
{
  pacing: { chapters: [...], overallScore: ... },
  echoes: { issues: [...], totalEchoes: ... },
  sentenceVariety: { distribution: {...}, score: ... },
  dialogueTags: { tags: [...] },
  stickySentences: { sentences: [...], count: ... },
  readability: { metrics: {...} },
  overusedWords: { words: [...], count: ... },
  adverbs: { instances: [...], count: ... },
  passiveVoice: { instances: [...], percentage: ... },
  summary: {
    overallScore: number,
    criticalIssues: number,
    warnings: number,
    suggestions: number
  }
}
```

## Frontend Integration

### Reports Page

```typescript
// app/projects/[id]/reports/page.tsx
export default function ReportsPage() {
  // Similar structure to AnalyticsPage
  // Fetch all reports via /dashboard endpoint
  // Display tabs for each report type
  // Include summary cards showing issue counts
  // "Fix with AI" button for each flagged issue
}
```

### Navigation Integration

Update Analytics page to include "Reports" tab alongside existing analytics tabs.

## AI Fix Integration

Each report type should support "Fix with AI" action:

```typescript
POST /api/prose-reports/fix
{
  bookId: string,
  reportType: 'echoes' | 'sticky-sentences' | 'adverbs' | ...,
  issueId: string,
  context: { ... }
}

Returns:
{
  original: string,
  suggested: string,
  applied: boolean
}
```

Use existing Claude service for generating fixes.

## Database Schema

No new tables required. Reports are calculated on-demand from chapter content.

Optional: Add caching table for expensive calculations:

```sql
CREATE TABLE IF NOT EXISTS prose_report_cache (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  version_id TEXT,
  report_type TEXT NOT NULL,
  report_data TEXT NOT NULL, -- JSON
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX idx_prose_report_cache_book_version
  ON prose_report_cache(book_id, version_id, report_type);
```

## Performance Considerations

1. **Lazy Loading**: Only calculate reports when requested
2. **Caching**: Cache results for 24 hours unless content changes
3. **Streaming**: For large books, stream results chapter-by-chapter
4. **Worker Threads**: Consider using worker threads for CPU-intensive analysis
5. **Pagination**: Limit results (e.g., top 100 echoes) to avoid overwhelming UI

## Testing Strategy

1. **Unit Tests**: Each service with sample text fixtures
2. **Integration Tests**: API endpoints with mock book data
3. **Performance Tests**: Measure analysis time for 100k word book
4. **UI Tests**: Playwright tests for dashboard interactions

## Rollout Plan

Phase 1: Backend Services
- Implement all 9 report services
- Add comprehensive tests
- Verify performance

Phase 2: API Routes
- Create modular route structure
- Add authentication/authorisation
- Add caching layer

Phase 3: Frontend Dashboard
- Build report visualisations
- Add navigation integration
- Implement "Fix with AI" actions

Phase 4: Polish
- Add loading states
- Add error handling
- Add user preferences (severity thresholds)

## Success Criteria

1. All 9 reports generate accurate results
2. Analysis completes in < 5 seconds for 100k word book
3. Reports match ProWritingAid quality standards
4. UI is intuitive and actionable
5. "Fix with AI" successfully improves flagged issues
6. All tests pass
7. Code follows CLAUDE.md standards
8. UK British spelling throughout
