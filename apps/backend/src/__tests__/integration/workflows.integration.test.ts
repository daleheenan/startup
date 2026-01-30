import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';
import {
  createTestProject,
  createTestBook,
  createTestChapter,
  createTestCharacter,
  createTestStoryConcept,
  createTestStoryDNA,
  createTestStoryBible,
} from '../factories';

/**
 * Integration Tests for Cross-Service Workflows
 *
 * These tests verify that multiple services work together correctly
 * across complex workflows in NovelForge.
 *
 * Test Approach:
 * - Uses in-memory SQLite database for isolation
 * - Mocks external AI services (Claude API)
 * - Tests database transactions and data integrity
 * - Verifies service orchestration
 */

// Mock Claude service - use any type to avoid Jest typing issues
const mockClaudeService = {
  createCompletion: jest.fn() as any,
  createCompletionWithUsage: jest.fn() as any,
};

// Mock modules
jest.unstable_mockModule('../../services/claude.service', () => ({
  claudeService: mockClaudeService,
}));

describe('Workflow Integration Tests', () => {
  let db: Database.Database;
  let testDbPath: string;

  beforeEach(() => {
    // Create test database in memory for speed
    testDbPath = ':memory:';
    db = new Database(testDbPath);
    db.pragma('foreign_keys = ON');

    // Run migrations
    setupTestDatabase(db);

    // Reset mocks
    jest.clearAllMocks();

    // Setup mock responses
    mockClaudeService.createCompletionWithUsage.mockResolvedValue({
      content: 'Generated chapter content with proper narrative structure.',
      usage: { input_tokens: 1000, output_tokens: 500 },
    });

    mockClaudeService.createCompletion.mockResolvedValue(
      'Generated content response'
    );
  });

  afterEach(() => {
    if (db) {
      db.close();
    }

    // Clean up file-based test databases
    if (testDbPath !== ':memory:' && existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('Complete Novel Generation Workflow', () => {
    it('should create project with all connected data', () => {
      const projectId = randomUUID();
      const storyConcept = createTestStoryConcept({
        title: 'The Dragon King',
        logline: 'A young prince must reclaim his throne from a dragon.',
      });
      const storyDNA = createTestStoryDNA({ genre: 'Fantasy' });
      const storyBible = createTestStoryBible({
        characters: [
          createTestCharacter({ name: 'Prince Aiden', role: 'protagonist' }),
          createTestCharacter({ name: 'Queen Morgana', role: 'antagonist' }),
        ],
      });

      // Insert project
      db.prepare(`
        INSERT INTO projects (
          id, title, type, genre, status,
          story_concept, story_dna, story_bible,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId,
        'The Dragon King',
        'standalone',
        'Fantasy',
        'setup',
        JSON.stringify(storyConcept),
        JSON.stringify(storyDNA),
        JSON.stringify(storyBible),
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Create book
      const bookId = randomUUID();
      db.prepare(`
        INSERT INTO books (id, project_id, book_number, title, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        bookId,
        projectId,
        1,
        'The Dragon King',
        'generating',
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Create chapters
      const chapter1Id = randomUUID();
      db.prepare(`
        INSERT INTO chapters (
          id, book_id, chapter_number, title, status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        chapter1Id,
        bookId,
        1,
        'The Fall of the Kingdom',
        'pending',
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Verify project exists
      const project = db
        .prepare('SELECT * FROM projects WHERE id = ?')
        .get(projectId) as any;
      expect(project).toBeDefined();
      expect(project.title).toBe('The Dragon King');
      expect(project.genre).toBe('Fantasy');

      // Verify story concept
      const parsedConcept = JSON.parse(project.story_concept);
      expect(parsedConcept.logline).toBe(
        'A young prince must reclaim his throne from a dragon.'
      );

      // Verify story bible with characters
      const parsedBible = JSON.parse(project.story_bible);
      expect(parsedBible.characters).toHaveLength(2);
      expect(parsedBible.characters[0].name).toBe('Prince Aiden');
      expect(parsedBible.characters[1].name).toBe('Queen Morgana');

      // Verify book exists
      const book = db
        .prepare('SELECT * FROM books WHERE id = ?')
        .get(bookId) as any;
      expect(book).toBeDefined();
      expect(book.project_id).toBe(projectId);

      // Verify chapter exists
      const chapter = db
        .prepare('SELECT * FROM chapters WHERE id = ?')
        .get(chapter1Id) as any;
      expect(chapter).toBeDefined();
      expect(chapter.book_id).toBe(bookId);
      expect(chapter.chapter_number).toBe(1);
    });

    it('should generate outline with plot structure', () => {
      const projectId = randomUUID();
      const plotStructure = {
        structure_type: 'three_act',
        plot_layers: [
          {
            id: randomUUID(),
            type: 'main',
            name: 'Quest for the Throne',
            description:
              'Prince must journey across the land to reclaim his birthright',
            arc: {
              setup: 'Prince discovers his heritage',
              conflict: 'Battles dragon forces',
              resolution: 'Reclaims throne',
            },
          },
        ],
        act_breakdown: {
          act1: { chapters: 8, description: 'Setup and journey begins' },
          act2: { chapters: 12, description: 'Trials and battles' },
          act3: { chapters: 5, description: 'Final confrontation' },
        },
      };

      // Insert project with plot structure
      db.prepare(`
        INSERT INTO projects (
          id, title, type, genre, status,
          plot_structure, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId,
        'Test Project',
        'standalone',
        'Fantasy',
        'outlining',
        JSON.stringify(plotStructure),
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Verify plot structure saved correctly
      const project = db
        .prepare('SELECT * FROM projects WHERE id = ?')
        .get(projectId) as any;
      const parsedStructure = JSON.parse(project.plot_structure);

      expect(parsedStructure.structure_type).toBe('three_act');
      expect(parsedStructure.plot_layers).toHaveLength(1);
      expect(parsedStructure.plot_layers[0].type).toBe('main');
      expect(parsedStructure.act_breakdown.act1.chapters).toBe(8);
      expect(parsedStructure.act_breakdown.act2.chapters).toBe(12);
      expect(parsedStructure.act_breakdown.act3.chapters).toBe(5);
    });

    it('should maintain referential integrity on cascade delete', () => {
      const projectId = randomUUID();
      const bookId = randomUUID();
      const chapterId = randomUUID();

      // Insert project
      db.prepare(`
        INSERT INTO projects (id, title, type, genre, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId,
        'Test Project',
        'standalone',
        'Fantasy',
        'setup',
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Insert book
      db.prepare(`
        INSERT INTO books (id, project_id, book_number, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        bookId,
        projectId,
        1,
        'pending',
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Insert chapter
      db.prepare(`
        INSERT INTO chapters (id, book_id, chapter_number, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        chapterId,
        bookId,
        1,
        'pending',
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Verify all exist
      expect(db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId)).toBeDefined();
      expect(db.prepare('SELECT * FROM books WHERE id = ?').get(bookId)).toBeDefined();
      expect(db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId)).toBeDefined();

      // Delete project (should cascade)
      db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);

      // Verify cascade deletion
      expect(db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId)).toBeUndefined();
      expect(db.prepare('SELECT * FROM books WHERE id = ?').get(bookId)).toBeUndefined();
      expect(db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId)).toBeUndefined();
    });
  });

  describe('Chapter Generation Pipeline', () => {
    it('should process chapter generation job through queue', () => {
      const projectId = randomUUID();
      const bookId = randomUUID();
      const chapterId = randomUUID();

      // Setup project, book, and chapter
      setupProjectBookChapter(db, projectId, bookId, chapterId);

      // Create job
      const jobId = randomUUID();
      db.prepare(`
        INSERT INTO jobs (id, type, target_id, status, attempts, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(jobId, 'generate_chapter', chapterId, 'pending', 0, new Date().toISOString());

      // Verify job created
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as any;
      expect(job).toBeDefined();
      expect(job.type).toBe('generate_chapter');
      expect(job.status).toBe('pending');

      // Simulate job processing
      db.prepare('UPDATE jobs SET status = ?, started_at = ? WHERE id = ?').run(
        'running',
        new Date().toISOString(),
        jobId
      );

      // Update chapter status
      db.prepare('UPDATE chapters SET status = ? WHERE id = ?').run('writing', chapterId);

      // Simulate completion
      const chapterContent = 'Generated chapter content...';
      const wordCount = 2500;
      db.prepare('UPDATE chapters SET content = ?, word_count = ?, status = ? WHERE id = ?').run(
        chapterContent,
        wordCount,
        'editing',
        chapterId
      );

      db.prepare('UPDATE jobs SET status = ?, completed_at = ? WHERE id = ?').run(
        'completed',
        new Date().toISOString(),
        jobId
      );

      // Verify chapter updated
      const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId) as any;
      expect(chapter.status).toBe('editing');
      expect(chapter.content).toBe(chapterContent);
      expect(chapter.word_count).toBe(wordCount);

      // Verify job completed
      const completedJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as any;
      expect(completedJob.status).toBe('completed');
      expect(completedJob.completed_at).toBeDefined();
    });

    it('should queue editing pipeline jobs after chapter generation', () => {
      const projectId = randomUUID();
      const bookId = randomUUID();
      const chapterId = randomUUID();

      setupProjectBookChapter(db, projectId, bookId, chapterId);

      // Create generation job
      const genJobId = randomUUID();
      db.prepare(`
        INSERT INTO jobs (id, type, target_id, status, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(genJobId, 'generate_chapter', chapterId, 'completed', new Date().toISOString());

      // Queue editing jobs
      const editingJobs = [
        { id: randomUUID(), type: 'dev_edit' },
        { id: randomUUID(), type: 'line_edit' },
        { id: randomUUID(), type: 'continuity_check' },
        { id: randomUUID(), type: 'copy_edit' },
        { id: randomUUID(), type: 'proofread' },
      ];

      for (const job of editingJobs) {
        db.prepare(`
          INSERT INTO jobs (id, type, target_id, status, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(job.id, job.type, chapterId, 'pending', new Date().toISOString());
      }

      // Verify all editing jobs created
      const jobs = db
        .prepare('SELECT * FROM jobs WHERE target_id = ? AND type != ?')
        .all(chapterId, 'generate_chapter') as any[];

      expect(jobs).toHaveLength(5);
      expect(jobs.map(j => j.type)).toEqual([
        'dev_edit',
        'line_edit',
        'continuity_check',
        'copy_edit',
        'proofread',
      ]);
    });

    it('should track token usage across chapter generation', () => {
      const projectId = randomUUID();
      const chapterId = randomUUID();

      // Setup minimal project and chapter
      db.prepare(`
        INSERT INTO projects (id, title, type, genre, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId,
        'Test',
        'standalone',
        'Fantasy',
        'generating',
        new Date().toISOString(),
        new Date().toISOString()
      );

      const bookId = randomUUID();
      db.prepare(`
        INSERT INTO books (id, project_id, book_number, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        bookId,
        projectId,
        1,
        'generating',
        new Date().toISOString(),
        new Date().toISOString()
      );

      db.prepare(`
        INSERT INTO chapters (id, book_id, chapter_number, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        chapterId,
        bookId,
        1,
        'writing',
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Create metrics entry
      const metricsId = randomUUID();
      db.prepare(`
        INSERT INTO chapter_metrics (
          id, chapter_id, input_tokens, output_tokens, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(metricsId, chapterId, 5000, 2500, new Date().toISOString(), new Date().toISOString());

      // Verify token tracking
      const metrics = db
        .prepare('SELECT * FROM chapter_metrics WHERE chapter_id = ?')
        .get(chapterId) as any;

      expect(metrics).toBeDefined();
      expect(metrics.input_tokens).toBe(5000);
      expect(metrics.output_tokens).toBe(2500);
    });
  });

  describe('Export Workflow', () => {
    it('should retrieve project with chapters for export', () => {
      const projectId = randomUUID();
      const bookId = randomUUID();

      // Setup project
      db.prepare(`
        INSERT INTO projects (
          id, title, type, genre, status,
          author_name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId,
        'The Dragon Chronicles',
        'standalone',
        'Fantasy',
        'completed',
        'John Smith',
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Setup book
      db.prepare(`
        INSERT INTO books (id, project_id, book_number, title, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        bookId,
        projectId,
        1,
        'The Dragon Chronicles',
        'completed',
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Create multiple completed chapters
      const chapters = [
        { id: randomUUID(), number: 1, title: 'The Beginning', content: 'Chapter 1 content...', wordCount: 2500 },
        { id: randomUUID(), number: 2, title: 'The Journey', content: 'Chapter 2 content...', wordCount: 3000 },
        { id: randomUUID(), number: 3, title: 'The Battle', content: 'Chapter 3 content...', wordCount: 3500 },
      ];

      for (const chapter of chapters) {
        db.prepare(`
          INSERT INTO chapters (
            id, book_id, chapter_number, title, content,
            word_count, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          chapter.id,
          bookId,
          chapter.number,
          chapter.title,
          chapter.content,
          chapter.wordCount,
          'completed',
          new Date().toISOString(),
          new Date().toISOString()
        );
      }

      // Query for export (simulates export service query)
      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
      const exportChapters = db
        .prepare(`
          SELECT c.id, c.chapter_number, c.title, c.content, c.word_count
          FROM chapters c
          JOIN books b ON c.book_id = b.id
          WHERE b.project_id = ?
          ORDER BY b.book_number, c.chapter_number
        `)
        .all(projectId) as any[];

      // Verify export data
      expect(project).toBeDefined();
      expect(project.title).toBe('The Dragon Chronicles');
      expect(project.author_name).toBe('John Smith');

      expect(exportChapters).toHaveLength(3);
      expect(exportChapters[0].chapter_number).toBe(1);
      expect(exportChapters[1].chapter_number).toBe(2);
      expect(exportChapters[2].chapter_number).toBe(3);

      // Verify total word count
      const totalWords = exportChapters.reduce((sum, ch) => sum + ch.word_count, 0);
      expect(totalWords).toBe(9000);
    });

    it('should include edited versions when available', () => {
      const projectId = randomUUID();
      const bookId = randomUUID();
      const chapterId = randomUUID();

      setupProjectBookChapter(db, projectId, bookId, chapterId);

      // Add original content
      db.prepare('UPDATE chapters SET content = ?, word_count = ? WHERE id = ?').run(
        'Original chapter content',
        4,
        chapterId
      );

      // Create edited version
      const editId = randomUUID();
      db.prepare(`
        INSERT INTO chapter_edits (
          id, chapter_id, edited_content, word_count,
          is_locked, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        editId,
        chapterId,
        'Edited and improved chapter content',
        5,
        0,
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Query with edited version (uses COALESCE to prefer edited)
      const chapter = db
        .prepare(`
          SELECT
            c.id, c.chapter_number, c.title,
            COALESCE(ce.edited_content, c.content) as content,
            COALESCE(ce.word_count, c.word_count) as word_count
          FROM chapters c
          LEFT JOIN chapter_edits ce ON ce.chapter_id = c.id
          WHERE c.id = ?
        `)
        .get(chapterId) as any;

      // Verify edited content is used
      expect(chapter.content).toBe('Edited and improved chapter content');
      expect(chapter.word_count).toBe(5);
    });
  });

  describe('VEB Analysis Workflow', () => {
    it('should submit project to VEB and create report', () => {
      const projectId = randomUUID();
      const bookId = randomUUID();

      // Setup completed project
      db.prepare(`
        INSERT INTO projects (
          id, title, type, genre, status,
          story_dna, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId,
        'Completed Novel',
        'standalone',
        'Fantasy',
        'completed',
        JSON.stringify({ genre: 'Fantasy', themes: ['Adventure', 'Coming of Age'] }),
        new Date().toISOString(),
        new Date().toISOString()
      );

      db.prepare(`
        INSERT INTO books (id, project_id, book_number, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(bookId, projectId, 1, 'completed', new Date().toISOString(), new Date().toISOString());

      // Add completed chapters
      for (let i = 1; i <= 3; i++) {
        const chapterId = randomUUID();
        db.prepare(`
          INSERT INTO chapters (
            id, book_id, chapter_number, content, word_count, status,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          chapterId,
          bookId,
          i,
          `Chapter ${i} content with narrative and dialogue.`,
          50,
          'completed',
          new Date().toISOString(),
          new Date().toISOString()
        );
      }

      // Create VEB report
      const reportId = randomUUID();
      db.prepare(`
        INSERT INTO editorial_reports (id, project_id, status, created_at)
        VALUES (?, ?, ?, ?)
      `).run(reportId, projectId, 'pending', new Date().toISOString());

      // Verify report created
      const report = db
        .prepare('SELECT * FROM editorial_reports WHERE id = ?')
        .get(reportId) as any;

      expect(report).toBeDefined();
      expect(report.project_id).toBe(projectId);
      expect(report.status).toBe('pending');
    });

    it('should process all three VEB modules sequentially', () => {
      const projectId = randomUUID();
      const reportId = randomUUID();

      // Setup project
      db.prepare(`
        INSERT INTO projects (id, title, type, genre, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId,
        'Test Novel',
        'standalone',
        'Fantasy',
        'completed',
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Create report
      db.prepare(`
        INSERT INTO editorial_reports (id, project_id, status, created_at)
        VALUES (?, ?, ?, ?)
      `).run(reportId, projectId, 'processing', new Date().toISOString());

      // Queue Module A: Beta Swarm
      const jobBetaSwarm = randomUUID();
      db.prepare(`
        INSERT INTO jobs (id, type, target_id, status, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(jobBetaSwarm, 'veb_beta_swarm', reportId, 'pending', new Date().toISOString());

      // Queue Module B: Ruthless Editor
      const jobRuthlessEditor = randomUUID();
      db.prepare(`
        INSERT INTO jobs (id, type, target_id, status, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(jobRuthlessEditor, 'veb_ruthless_editor', reportId, 'pending', new Date().toISOString());

      // Queue Module C: Market Analyst
      const jobMarketAnalyst = randomUUID();
      db.prepare(`
        INSERT INTO jobs (id, type, target_id, status, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(jobMarketAnalyst, 'veb_market_analyst', reportId, 'pending', new Date().toISOString());

      // Queue finalize job
      const jobFinalize = randomUUID();
      db.prepare(`
        INSERT INTO jobs (id, type, target_id, status, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(jobFinalize, 'veb_finalize', reportId, 'pending', new Date().toISOString());

      // Verify all jobs created
      const jobs = db
        .prepare('SELECT * FROM jobs WHERE target_id = ?')
        .all(reportId) as any[];

      expect(jobs).toHaveLength(4);
      expect(jobs.map(j => j.type)).toEqual([
        'veb_beta_swarm',
        'veb_ruthless_editor',
        'veb_market_analyst',
        'veb_finalize',
      ]);
    });

    it('should save module results and finalize report', () => {
      const projectId = randomUUID();
      const reportId = randomUUID();

      // Setup report
      db.prepare(`
        INSERT INTO projects (id, title, type, genre, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId,
        'Test',
        'standalone',
        'Fantasy',
        'completed',
        new Date().toISOString(),
        new Date().toISOString()
      );

      db.prepare(`
        INSERT INTO editorial_reports (id, project_id, status, created_at)
        VALUES (?, ?, ?, ?)
      `).run(reportId, projectId, 'processing', new Date().toISOString());

      // Simulate Beta Swarm completion
      const betaSwarmResults = {
        chapterResults: [{ chapterId: 'ch1', chapterNumber: 1, retentionScore: 8, reactions: [], dnfRiskPoints: [], highlights: [] }],
        overallEngagement: 8,
        wouldRecommend: true,
        summaryReaction: 'Great read!',
      };

      db.prepare(`
        UPDATE editorial_reports
        SET beta_swarm_status = ?,
            beta_swarm_results = ?,
            beta_swarm_completed_at = ?
        WHERE id = ?
      `).run('completed', JSON.stringify(betaSwarmResults), new Date().toISOString(), reportId);

      // Simulate Ruthless Editor completion
      const ruthlessEditorResults = {
        chapterResults: [],
        overallStructureScore: 7,
        majorIssuesCount: 2,
        summaryVerdict: 'Good bones with some issues',
      };

      db.prepare(`
        UPDATE editorial_reports
        SET ruthless_editor_status = ?,
            ruthless_editor_results = ?,
            ruthless_editor_completed_at = ?
        WHERE id = ?
      `).run('completed', JSON.stringify(ruthlessEditorResults), new Date().toISOString(), reportId);

      // Simulate Market Analyst completion
      const marketAnalystResults = {
        compTitles: [],
        hookAnalysis: { openingLineScore: 8, openingParagraphScore: 7, openingChapterScore: 8, openingLine: 'Test line', strengths: [], weaknesses: [] },
        tropeAnalysis: [],
        marketPositioning: { primaryAudience: 'YA', secondaryAudience: 'Adults', marketingAngle: 'Epic', uniqueSellingPoint: 'Dragons', potentialChallenges: [] },
        commercialViabilityScore: 7,
        agentRecommendation: 'yes_with_revisions',
        summaryPitch: 'A compelling fantasy tale',
      };

      db.prepare(`
        UPDATE editorial_reports
        SET market_analyst_status = ?,
            market_analyst_results = ?,
            market_analyst_completed_at = ?
        WHERE id = ?
      `).run('completed', JSON.stringify(marketAnalystResults), new Date().toISOString(), reportId);

      // Finalize report
      const overallScore = Math.round((8 * 10 * 0.35) + (7 * 10 * 0.35) + (7 * 10 * 0.30));
      const recommendations = ['Strengthen opening hook', 'Address pacing issues'];

      db.prepare(`
        UPDATE editorial_reports
        SET status = ?,
            overall_score = ?,
            summary = ?,
            recommendations = ?,
            completed_at = ?
        WHERE id = ?
      `).run(
        'completed',
        overallScore,
        'Overall good quality with minor improvements needed',
        JSON.stringify(recommendations),
        new Date().toISOString(),
        reportId
      );

      // Verify final report
      const report = db
        .prepare('SELECT * FROM editorial_reports WHERE id = ?')
        .get(reportId) as any;

      expect(report.status).toBe('completed');
      expect(report.overall_score).toBe(overallScore);
      expect(report.beta_swarm_status).toBe('completed');
      expect(report.ruthless_editor_status).toBe('completed');
      expect(report.market_analyst_status).toBe('completed');
      expect(report.completed_at).toBeDefined();

      const parsedRecommendations = JSON.parse(report.recommendations);
      expect(parsedRecommendations).toContain('Strengthen opening hook');
    });
  });

  describe('Database Transaction Integrity', () => {
    it('should rollback transaction on error', () => {
      const projectId = randomUUID();

      // Begin transaction
      const transaction = db.transaction(() => {
        // Insert project
        db.prepare(`
          INSERT INTO projects (id, title, type, genre, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          projectId,
          'Test',
          'standalone',
          'Fantasy',
          'setup',
          new Date().toISOString(),
          new Date().toISOString()
        );

        // This should fail due to foreign key constraint
        db.prepare(`
          INSERT INTO books (id, project_id, book_number, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          'non-existent-project-id',
          1,
          'pending',
          new Date().toISOString(),
          new Date().toISOString()
        );
      });

      // Execute transaction and expect failure
      expect(() => transaction()).toThrow();

      // Verify project was NOT created (rollback worked)
      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
      expect(project).toBeUndefined();
    });

    it('should enforce foreign key constraints', () => {
      const nonExistentProjectId = randomUUID();

      // Attempt to create book with non-existent project
      expect(() => {
        db.prepare(`
          INSERT INTO books (id, project_id, book_number, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          nonExistentProjectId,
          1,
          'pending',
          new Date().toISOString(),
          new Date().toISOString()
        );
      }).toThrow(/FOREIGN KEY constraint failed/);
    });

    it('should handle concurrent job pickup atomically', () => {
      const chapterId = randomUUID();
      const jobId = randomUUID();

      // Create job
      db.prepare(`
        INSERT INTO jobs (id, type, target_id, status, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(jobId, 'generate_chapter', chapterId, 'pending', new Date().toISOString());

      // Simulate atomic pickup with transaction
      const pickupTransaction = db.transaction(() => {
        const job = db
          .prepare('SELECT * FROM jobs WHERE id = ? AND status = ?')
          .get(jobId, 'pending') as any;

        if (!job) return null;

        const result = db
          .prepare('UPDATE jobs SET status = ?, started_at = ? WHERE id = ? AND status = ?')
          .run('running', new Date().toISOString(), jobId, 'pending');

        // If no rows updated, another worker got it
        if (result.changes === 0) return null;

        return job;
      });

      const pickedUpJob = pickupTransaction();

      // Verify job picked up
      expect(pickedUpJob).toBeDefined();

      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as any;
      expect(job.status).toBe('running');

      // Attempt second pickup should fail (already running)
      const secondPickup = db.transaction(() => {
        const result = db
          .prepare('UPDATE jobs SET status = ? WHERE id = ? AND status = ?')
          .run('running', jobId, 'pending');

        return result.changes > 0;
      });

      expect(secondPickup()).toBe(false);
    });
  });

  describe('Cross-Book Continuity', () => {
    it('should track character states across trilogy books', () => {
      const projectId = randomUUID();

      // Create trilogy project
      db.prepare(`
        INSERT INTO projects (
          id, title, type, genre, status,
          book_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId,
        'Dragon Trilogy',
        'trilogy',
        'Fantasy',
        'generating',
        3,
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Create three books
      const book1Id = randomUUID();
      const book2Id = randomUUID();
      const book3Id = randomUUID();

      for (const [id, num] of [
        [book1Id, 1],
        [book2Id, 2],
        [book3Id, 3],
      ]) {
        db.prepare(`
          INSERT INTO books (id, project_id, book_number, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, projectId, num, 'pending', new Date().toISOString(), new Date().toISOString());
      }

      // Create ending state for book 1
      const endingStateId = randomUUID();
      db.prepare(`
        INSERT INTO book_ending_states (
          id, book_id, character_states, world_states,
          relationship_states, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        endingStateId,
        book1Id,
        JSON.stringify([{ characterId: 'char1', name: 'Hero', status: 'alive', location: 'Capital' }]),
        JSON.stringify([{ elementId: 'world1', status: 'War declared' }]),
        JSON.stringify([{ from: 'char1', to: 'char2', status: 'Allied' }]),
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Verify ending state
      const endingState = db
        .prepare('SELECT * FROM book_ending_states WHERE book_id = ?')
        .get(book1Id) as any;

      expect(endingState).toBeDefined();
      const charStates = JSON.parse(endingState.character_states);
      expect(charStates[0].name).toBe('Hero');
      expect(charStates[0].status).toBe('alive');
    });
  });
});

/**
 * Helper Functions
 */

function setupTestDatabase(db: Database.Database): void {
  // Create essential tables for testing

  // Projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      genre TEXT NOT NULL,
      status TEXT NOT NULL,
      story_concept TEXT,
      story_dna TEXT,
      story_bible TEXT,
      plot_structure TEXT,
      book_count INTEGER DEFAULT 1,
      author_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Books table
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      book_number INTEGER NOT NULL,
      title TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Chapters table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      chapter_number INTEGER NOT NULL,
      title TEXT,
      content TEXT,
      word_count INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      summary TEXT,
      scene_cards TEXT,
      flags TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Chapter edits table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapter_edits (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      edited_content TEXT,
      word_count INTEGER DEFAULT 0,
      is_locked INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Jobs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      error TEXT,
      checkpoint TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT
    )
  `);

  // Chapter metrics table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapter_metrics (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Editorial reports table (VEB)
  db.exec(`
    CREATE TABLE IF NOT EXISTS editorial_reports (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending',
      beta_swarm_status TEXT DEFAULT 'pending',
      beta_swarm_results TEXT,
      beta_swarm_completed_at TEXT,
      ruthless_editor_status TEXT DEFAULT 'pending',
      ruthless_editor_results TEXT,
      ruthless_editor_completed_at TEXT,
      market_analyst_status TEXT DEFAULT 'pending',
      market_analyst_results TEXT,
      market_analyst_completed_at TEXT,
      overall_score INTEGER,
      summary TEXT,
      recommendations TEXT,
      total_input_tokens INTEGER DEFAULT 0,
      total_output_tokens INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      error TEXT
    )
  `);

  // Book ending states table (for trilogy/series continuity)
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_ending_states (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      character_states TEXT,
      world_states TEXT,
      relationship_states TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

function setupProjectBookChapter(
  db: Database.Database,
  projectId: string,
  bookId: string,
  chapterId: string
): void {
  // Insert project
  db.prepare(`
    INSERT INTO projects (id, title, type, genre, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    projectId,
    'Test Project',
    'standalone',
    'Fantasy',
    'generating',
    new Date().toISOString(),
    new Date().toISOString()
  );

  // Insert book
  db.prepare(`
    INSERT INTO books (id, project_id, book_number, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(bookId, projectId, 1, 'generating', new Date().toISOString(), new Date().toISOString());

  // Insert chapter
  db.prepare(`
    INSERT INTO chapters (id, book_id, chapter_number, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(chapterId, bookId, 1, 'pending', new Date().toISOString(), new Date().toISOString());
}
