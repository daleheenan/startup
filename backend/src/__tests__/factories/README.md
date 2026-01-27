# Test Data Factories

This directory contains reusable factory functions for generating test data in the NovelForge backend tests.

## Overview

Test data factories provide a consistent, maintainable way to create test objects with sensible defaults whilst allowing customisation of specific fields. This approach reduces duplication, improves test readability, and makes tests more resilient to schema changes.

## Installation

The factories are automatically available within the backend test suite. Simply import what you need:

```typescript
import { createTestProject, createTestBook, createTestChapter } from './__tests__/factories';
```

## Available Factories

### Project Factories (`project.factory.ts`)

#### `createTestProject(overrides?)`
Creates a standalone project with complete story DNA and story bible.

```typescript
const project = createTestProject();
// Or with overrides:
const project = createTestProject({
  title: 'My Fantasy Novel',
  genre: 'Epic Fantasy',
  status: 'generating',
});
```

#### `createTestTrilogyProject(overrides?)`
Creates a trilogy project with series bible and 3 books.

```typescript
const trilogy = createTestTrilogyProject({
  title: 'The Dark Tower Trilogy',
});
```

#### `createTestSeriesProject(overrides?)`
Creates a series project with series bible and 5 books.

```typescript
const series = createTestSeriesProject();
```

#### Helper Factories
- `createTestStoryDNA(overrides?)` - Story DNA configuration
- `createTestStoryBible(overrides?)` - Complete story bible
- `createTestStoryConcept(overrides?)` - Story concept/premise
- `createTestWorldElements(overrides?)` - Locations, factions, systems
- `createTestSeriesBible(overrides?)` - Series-wide tracking data
- `createTestTimelineEvent(overrides?)` - Timeline events

### Book Factories (`book.factory.ts`)

#### `createTestBook(overrides?)`
Creates a basic book in setup state.

```typescript
const book = createTestBook({
  project_id: project.id,
  book_number: 1,
});
```

#### `createTestCompletedBook(overrides?)`
Creates a completed book with ending state, summary, and word count.

```typescript
const completedBook = createTestCompletedBook({
  word_count: 95000,
});
```

#### `createTestGeneratingBook(overrides?)`
Creates a book currently being generated (35,000 words).

```typescript
const generatingBook = createTestGeneratingBook();
```

#### `createTestSeriesBook(bookNumber, overrides?)`
Creates a book for a specific position in a series.

```typescript
const book2 = createTestSeriesBook(2, {
  title: 'Book Two: The Rising Storm',
});
```

#### Helper Factories
- `createTestBookEndingState(overrides?)` - Book ending snapshot
- `createTestCharacterEndingState(overrides?)` - Character state at book end
- `createTestWorldEndingState(overrides?)` - World state at book end
- `createTestRelationshipState(overrides?)` - Relationship status

### Chapter Factories (`chapter.factory.ts`)

#### `createTestChapter(overrides?)`
Creates a pending chapter with 3 scene cards.

```typescript
const chapter = createTestChapter({
  book_id: book.id,
  chapter_number: 5,
});
```

#### `createTestCompletedChapter(overrides?)`
Creates a completed chapter with full content (~285 words).

```typescript
const chapter = createTestCompletedChapter({
  book_id: book.id,
  title: 'The Confrontation',
});
```

#### `createTestPendingChapter(overrides?)`
Creates a chapter ready to be written.

#### `createTestWritingChapter(overrides?)`
Creates a chapter currently being generated (partial content).

#### `createTestEditingChapter(overrides?)`
Creates a chapter in editing state with some flags.

#### `createTestChapterWithFlags(overrides?)`
Creates a completed chapter with minor, major, and critical flags.

#### `createTestChapters(count, bookId?)`
Creates multiple chapters for a book with varying statuses.

```typescript
const chapters = createTestChapters(10, book.id);
// Returns 10 chapters with different completion states
```

#### Helper Factories
- `createTestSceneCard(overrides?)` - Single scene card
- `createTestSceneCards(count)` - Multiple scene cards
- `createTestFlag(overrides?)` - Quality check flag
- `createTestFlags(severities)` - Multiple flags with different severities

### Character Factories (`character.factory.ts`)

#### `createTestCharacter(overrides?)`
Creates a protagonist character with full details.

```typescript
const character = createTestCharacter({
  name: 'Sarah Connor',
  role: 'protagonist',
});
```

#### `createTestMentor(overrides?)`
Creates a wise mentor character.

```typescript
const mentor = createTestMentor({
  name: 'Gandalf the Grey',
});
```

#### `createTestAntagonist(overrides?)`
Creates a compelling antagonist.

```typescript
const villain = createTestAntagonist();
```

#### `createTestAlly(overrides?)`
Creates a loyal companion character.

```typescript
const ally = createTestAlly({
  name: 'Samwise Gamgee',
});
```

#### `createTestLoveInterest(overrides?)`
Creates a romantic interest character.

```typescript
const loveInterest = createTestLoveInterest();
```

#### `createTestMinorCharacter(overrides?)`
Creates a background/minor character.

```typescript
const innkeeper = createTestMinorCharacter({
  name: 'Bob the Bartender',
});
```

#### `createTestCharacterCast()`
Creates a complete cast of 5 diverse characters:
- Protagonist
- Mentor
- Antagonist
- Ally
- Love interest

```typescript
const cast = createTestCharacterCast();
// Returns array of 5 characters
```

#### Helper Factories
- `createTestRelationship(overrides?)` - Character relationship
- `createTestRelationships(count)` - Multiple relationships
- `createTestCharacterState(overrides?)` - Current character state

## Usage Patterns

### Basic Usage

```typescript
import { createTestProject, createTestBook } from './__tests__/factories';

describe('Book Service', () => {
  it('should create a new book', () => {
    const project = createTestProject();
    const book = createTestBook({ project_id: project.id });

    expect(book.project_id).toBe(project.id);
  });
});
```

### Creating Related Entities

```typescript
const project = createTestProject({ id: 'project-123' });
const book = createTestBook({
  project_id: project.id,
  id: 'book-456'
});
const chapter = createTestChapter({
  book_id: book.id,
  chapter_number: 1
});
```

### Overriding Nested Properties

```typescript
const project = createTestProject({
  story_dna: createTestStoryDNA({
    genre: 'Science Fiction',
    tone: 'Optimistic and adventurous',
  }),
});
```

### Creating Multiple Test Instances

```typescript
const chapters = Array.from({ length: 5 }, (_, i) =>
  createTestChapter({
    chapter_number: i + 1,
    book_id: book.id,
  })
);
```

Or use the helper:

```typescript
const chapters = createTestChapters(5, book.id);
```

### Testing Different States

```typescript
describe('Chapter Generation', () => {
  it('should handle pending chapters', () => {
    const chapter = createTestPendingChapter();
    expect(chapter.status).toBe('pending');
  });

  it('should handle writing chapters', () => {
    const chapter = createTestWritingChapter();
    expect(chapter.status).toBe('writing');
    expect(chapter.content).toBeDefined();
  });

  it('should handle completed chapters', () => {
    const chapter = createTestCompletedChapter();
    expect(chapter.status).toBe('completed');
    expect(chapter.word_count).toBeGreaterThan(0);
  });
});
```

## Best Practices

### 1. Use Defaults When Possible

Only override fields that matter to your specific test:

```typescript
// Good: Only override what matters
const book = createTestBook({ status: 'completed' });

// Avoid: Specifying everything manually
const book = {
  id: 'test-id',
  project_id: 'project-id',
  book_number: 1,
  title: 'Test',
  status: 'completed',
  word_count: 0,
  // ... many more fields
};
```

### 2. Create Helper Functions for Complex Scenarios

```typescript
function createBookWithChapters(chapterCount: number) {
  const project = createTestProject();
  const book = createTestBook({ project_id: project.id });
  const chapters = createTestChapters(chapterCount, book.id);

  return { project, book, chapters };
}
```

### 3. Use Type Safety

The factories leverage TypeScript's `Partial<T>` for type-safe overrides:

```typescript
// TypeScript will catch typos and invalid fields
const book = createTestBook({
  statuss: 'completed', // Error: typo caught at compile time
  invalid_field: 'value', // Error: field doesn't exist on Book type
});
```

### 4. Keep Tests Readable

Use factory helpers to make test intent clear:

```typescript
// Clear intent
const completedBook = createTestCompletedBook();

// Less clear
const book = createTestBook({
  status: 'completed',
  word_count: 85000,
  ending_state: { /* complex object */ },
  // ...
});
```

### 5. Maintain Consistency

When adding new entity types, follow the established patterns:
- Provide sensible defaults
- Support partial overrides via `Partial<T>`
- Include variant factories for common scenarios
- Add helper factories for nested objects
- Write tests for your factories

## Testing the Factories

The factories themselves have comprehensive tests in `factories.test.ts`. Run them with:

```bash
npm test -- factories.test.ts
```

## Contributing

When adding new factories:

1. Follow the existing naming convention: `createTest[EntityName]`
2. Provide realistic default values
3. Support partial overrides using `Partial<T>`
4. Create variant factories for common use cases
5. Add JSDoc comments explaining the factory's purpose
6. Add tests to verify the factory works correctly
7. Export the factory from `index.ts`
8. Update this README with usage examples

## Schema Changes

When backend types change:

1. Update the relevant factory files
2. Run factory tests to catch breaking changes: `npm test -- factories.test.ts`
3. Fix any failing tests
4. Update dependent test files as needed

The factories help isolate tests from schema changes, making maintenance easier.
