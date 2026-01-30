/**
 * Test Chapter Generation Workflow
 *
 * This script tests the complete chapter generation system:
 * 1. Create a test project with Story DNA and characters
 * 2. Create a book with chapters
 * 3. Queue chapter generation
 * 4. Monitor progress
 */

import db from './src/db/connection.js';
import { runMigrations } from './src/db/migrate.js';
import { chapterOrchestratorService, contextAssemblyService } from './src/services/chapter/index.js';
import { progressTrackingService } from './src/services/progress-tracking.service.js';
import { randomUUID } from 'crypto';

// Run migrations first
runMigrations();

async function testChapterGeneration() {
  console.log('\n=== NovelForge Chapter Generation Test ===\n');

  try {
    // Step 1: Create test project
    console.log('Step 1: Creating test project...');
    const projectId = randomUUID();
    const now = new Date().toISOString();

    const storyDNA = {
      genre: 'Fantasy',
      subgenre: 'Epic Fantasy',
      tone: 'Dark and mysterious',
      themes: ['power', 'corruption', 'redemption'],
      proseStyle:
        'Write with vivid imagery and deep character introspection. Use literary prose with strong sensory details. Show emotions through physical sensations and character actions.',
    };

    const protagonist = {
      id: randomUUID(),
      name: 'Kael Blackwood',
      role: 'Protagonist',
      physicalDescription: 'Tall, dark-haired man with piercing blue eyes and a scarred face',
      personalityTraits: ['determined', 'haunted', 'fiercely loyal', 'quick-tempered'],
      voiceSample:
        "He'd seen enough death to know it never came clean. It left marks—on the body, on the soul, on everything it touched. And now it had come for him again.",
      goals: ['Protect his sister from the Shadow Council', 'Uncover the truth about his past'],
      conflicts: ['Hunted by powerful enemies', 'Plagued by traumatic memories'],
      relationships: [],
      currentState: {
        location: 'The Ruined Tower on the edge of the Darkwood',
        emotionalState: 'Desperate and haunted',
        goals: ['Find shelter before nightfall', 'Escape the pursuing Shadow Guards'],
        conflicts: ['Injured and exhausted', 'Running out of supplies'],
      },
    };

    const antagonist = {
      id: randomUUID(),
      name: 'Lord Malachar',
      role: 'Antagonist',
      physicalDescription:
        'An imposing figure in dark robes, with silver eyes that seem to see through souls',
      personalityTraits: ['calculating', 'ruthless', 'charismatic', 'patient'],
      voiceSample:
        'Power is not taken; it is accepted. Those who resist merely delay the inevitable.',
      goals: ['Control the Shadow Council', 'Harness the ancient power beneath the city'],
      conflicts: ['Opposition from other council members', 'The prophecy of his downfall'],
      relationships: [],
      currentState: {
        location: 'The Shadow Council chambers in the capital',
        emotionalState: 'Confident and calculating',
        goals: ['Eliminate Kael Blackwood', 'Complete the ritual'],
        conflicts: ['Time running out before the celestial alignment'],
      },
    };

    const storyBible = {
      characters: [protagonist, antagonist],
      world: {
        locations: [
          {
            id: randomUUID(),
            name: 'The Darkwood',
            description:
              'A vast, ancient forest where shadows move with malevolent intelligence',
            significance: 'Home to ancient magic and dangerous creatures',
          },
        ],
        factions: [
          {
            id: randomUUID(),
            name: 'The Shadow Council',
            description: 'Secret organization of powerful mages ruling from the shadows',
            goals: ['Maintain control over the kingdom', 'Harness forbidden magic'],
          },
        ],
        systems: [
          {
            id: randomUUID(),
            type: 'magic' as const,
            name: 'Shadow Magic',
            description: 'Magic drawn from darkness and shadow, powerful but corrupting',
            rules: [
              'Requires sacrifice to use',
              'Corrupts the user over time',
              'More powerful in darkness',
            ],
          },
        ],
      },
      timeline: [],
    };

    const insertProjectStmt = db.prepare(`
      INSERT INTO projects (id, title, type, genre, status, story_dna, story_bible, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProjectStmt.run(
      projectId,
      'The Shadow Rising (TEST)',
      'standalone',
      'Fantasy',
      'setup',
      JSON.stringify(storyDNA),
      JSON.stringify(storyBible),
      now,
      now
    );

    console.log(`✓ Created project: ${projectId}`);

    // Step 2: Create book
    console.log('\nStep 2: Creating test book...');
    const bookId = randomUUID();

    const insertBookStmt = db.prepare(`
      INSERT INTO books (id, project_id, book_number, title, status, word_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertBookStmt.run(
      bookId,
      projectId,
      1,
      'The Shadow Rising',
      'generating',
      0,
      now,
      now
    );

    console.log(`✓ Created book: ${bookId}`);

    // Step 3: Create test chapter with scene cards
    console.log('\nStep 3: Creating test chapter...');
    const chapterId = randomUUID();

    const sceneCards = [
      {
        id: randomUUID(),
        order: 1,
        location: 'The Ruined Tower',
        characters: ['Kael Blackwood'],
        povCharacter: 'Kael Blackwood',
        timeOfDay: 'Dusk',
        goal: 'Find shelter and tend to his wounds',
        conflict: 'The tower is unstable and dangerous',
        outcome: 'Discovers a hidden chamber with ancient markings',
        emotionalBeat: 'Fear gives way to curiosity',
        notes: 'First hint of the ancient prophecy',
      },
      {
        id: randomUUID(),
        order: 2,
        location: 'Hidden Chamber beneath the tower',
        characters: ['Kael Blackwood'],
        povCharacter: 'Kael Blackwood',
        timeOfDay: 'Night',
        goal: 'Understand the ancient markings',
        conflict: 'The markings trigger visions of his forgotten past',
        outcome: 'Realizes he has a connection to the Shadow Council',
        emotionalBeat: 'Horror and revelation',
        notes: 'End with a cliffhanger - Shadow Guards arrive',
      },
    ];

    const insertChapterStmt = db.prepare(`
      INSERT INTO chapters (id, book_id, chapter_number, title, scene_cards, status, word_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertChapterStmt.run(
      chapterId,
      bookId,
      1,
      'The Ruined Tower',
      JSON.stringify(sceneCards),
      'pending',
      0,
      now,
      now
    );

    console.log(`✓ Created chapter: ${chapterId}`);

    // Step 4: Test context assembly
    console.log('\nStep 4: Testing context assembly...');
    const context = contextAssemblyService.assembleChapterContext(chapterId);

    console.log(`✓ Context assembled:`);
    console.log(`  - Estimated tokens: ${context.estimatedTokens}`);
    console.log(`  - System prompt length: ${context.system.length} chars`);
    console.log(`  - User prompt length: ${context.userPrompt.length} chars`);

    if (context.estimatedTokens > 3000) {
      console.warn(
        `  ⚠ Warning: Context is larger than expected (${context.estimatedTokens} tokens)`
      );
    }

    // Display the prompts for review
    console.log('\n--- SYSTEM PROMPT ---');
    console.log(context.system.substring(0, 500) + '...\n');

    console.log('--- USER PROMPT (first 800 chars) ---');
    console.log(context.userPrompt.substring(0, 800) + '...\n');

    // Step 5: Queue chapter workflow
    console.log('\nStep 5: Queueing chapter generation workflow...');
    const jobIds = chapterOrchestratorService.queueChapterWorkflow(chapterId);

    console.log(`✓ Jobs queued:`);
    console.log(`  - Generate: ${jobIds.generateJobId}`);
    console.log(`  - Summary: ${jobIds.summaryJobId}`);
    console.log(`  - States: ${jobIds.statesJobId}`);

    // Step 6: Check progress
    console.log('\nStep 6: Checking initial progress...');
    const progress = progressTrackingService.getBookProgress(bookId);

    console.log(`✓ Progress:`);
    console.log(`  - Chapters: ${progress.chaptersCompleted}/${progress.chaptersTotal}`);
    console.log(`  - Percentage: ${progress.percentComplete}%`);
    console.log(`  - Word count: ${progress.wordCount}/${progress.targetWordCount}`);

    // Step 7: Check workflow status
    console.log('\nStep 7: Checking workflow status...');
    const workflowStatus = chapterOrchestratorService.getChapterWorkflowStatus(chapterId);

    console.log(`✓ Workflow status:`);
    console.log(`  - Chapter status: ${workflowStatus.chapterStatus}`);
    console.log(`  - Jobs:`);
    workflowStatus.jobs.forEach((job) => {
      console.log(`    - ${job.type}: ${job.status}`);
    });

    console.log('\n=== Test Complete ===');
    console.log('\nNext steps:');
    console.log('1. Start the backend server: npm run dev');
    console.log('2. The queue worker will automatically process the queued jobs');
    console.log('3. Monitor progress at: GET /api/generation/book/' + bookId + '/progress');
    console.log('4. View chapter when complete: GET /api/chapters/' + chapterId);

    console.log('\nTest data IDs:');
    console.log(`  Project ID: ${projectId}`);
    console.log(`  Book ID: ${bookId}`);
    console.log(`  Chapter ID: ${chapterId}`);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testChapterGeneration()
  .then(() => {
    console.log('\n✅ Test setup successful\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test setup failed\n');
    process.exit(1);
  });
