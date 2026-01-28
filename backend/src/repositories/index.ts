/**
 * Repository Layer Index
 *
 * Exports all repository classes and factory functions.
 * The Repository pattern separates data access logic from business logic.
 *
 * Usage:
 * ```typescript
 * import { createProjectsRepository, createBooksRepository } from './repositories';
 * import db from './db/connection';
 *
 * const projectsRepo = createProjectsRepository(db);
 * const booksRepo = createBooksRepository(db);
 * ```
 */

// Base repository
export { BaseRepository, type BaseEntity, type FindOptions, type PaginatedResult } from './base.repository.js';

// Projects repository
export {
  ProjectsRepository,
  createProjectsRepository,
  type ParsedProject,
} from './projects.repository.js';

// Books repository
export {
  BooksRepository,
  createBooksRepository,
  type ParsedBook,
  type BookWithChapters,
} from './books.repository.js';

// Chapters repository
export {
  ChaptersRepository,
  createChaptersRepository,
  type ParsedChapter,
  type ChapterWithContext,
} from './chapters.repository.js';

// Mysteries repository
export {
  MysteriesRepository,
  createMysteriesRepository,
  type ParsedMystery,
  type MysteryWithTimeline,
  type MysteryStats,
  type MysteryStatus,
  type MysteryImportance,
} from './mysteries.repository.js';

// Series repository
export {
  SeriesRepository,
  createSeriesRepository,
  type ParsedSeries,
  type SeriesWithProjects,
} from './series.repository.js';
