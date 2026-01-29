/**
 * Test Editing Pipeline (Sprint 6)
 *
 * This script tests the complete editing workflow:
 * 1. Create a test chapter with content
 * 2. Run developmental editor
 * 3. Run author revision (if needed)
 * 4. Run line editor
 * 5. Run continuity editor
 * 6. Run copy editor
 * 7. Verify flags are created
 */

import db from './src/db/connection.js';
import { runMigrations } from './src/db/migrate.js';
import { editingService } from './src/services/editing/index.js';
import { randomUUID } from 'crypto';

// Run migrations first
runMigrations();

async function testEditingPipeline() {
  console.log('\n=== NovelForge Editing Pipeline Test (Sprint 6) ===\n');

  try {
    // Step 1: Create test project with story bible
    console.log('Step 1: Creating test project...');
    const projectId = randomUUID();
    const now = new Date().toISOString();

    const storyDNA = {
      genre: 'Fantasy',
      subgenre: 'Epic Fantasy',
      tone: 'Dark and mysterious',
      themes: ['power', 'corruption', 'redemption'],
      proseStyle:
        'Write with vivid imagery and deep character introspection. Use literary prose with strong sensory details.',
    };

    const protagonist = {
      id: randomUUID(),
      name: 'Kael Blackwood',
      role: 'Protagonist',
      personalityTraits: ['determined', 'haunted', 'loyal'],
      voiceSample:
        "He'd seen enough death to know it never came clean. It left marks—on the body, on the soul, on everything it touched.",
      goals: ['Protect his sister', 'Uncover the truth about his past'],
      conflicts: ['Hunted by powerful enemies', 'Plagued by memories'],
      relationships: [],
      currentState: {
        location: 'The Ruined Tower',
        emotionalState: 'Desperate',
        goals: ['Find shelter'],
        conflicts: ['Injured and exhausted'],
      },
    };

    const storyBible = {
      characters: [protagonist],
      world: {
        locations: [
          {
            id: randomUUID(),
            name: 'The Darkwood',
            description: 'A vast, ancient forest where shadows move with malevolent intelligence',
            significance: 'Home to ancient magic',
          },
        ],
        factions: [],
        systems: [
          {
            id: randomUUID(),
            type: 'magic' as const,
            name: 'Shadow Magic',
            description: 'Magic drawn from darkness and shadow',
            rules: ['Requires sacrifice', 'Corrupts the user', 'More powerful in darkness'],
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
      'Editing Pipeline Test',
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
    console.log('\nStep 2: Creating book...');
    const bookId = randomUUID();

    const insertBookStmt = db.prepare(`
      INSERT INTO books (id, project_id, book_number, title, status, word_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertBookStmt.run(
      bookId,
      projectId,
      1,
      'Test Book',
      'generating',
      0,
      now,
      now
    );

    console.log(`✓ Created book: ${bookId}`);

    // Step 3: Create chapter with test content (intentionally flawed for editors to catch)
    console.log('\nStep 3: Creating chapter with test content...');
    const chapterId = randomUUID();

    const sceneCards = [
      {
        id: randomUUID(),
        order: 1,
        location: 'The Ruined Tower',
        characters: ['Kael Blackwood'],
        povCharacter: 'Kael Blackwood',
        timeOfDay: 'Dusk',
        goal: 'Find shelter and tend wounds',
        conflict: 'Tower is unstable',
        outcome: 'Discovers hidden chamber',
        emotionalBeat: 'Fear gives way to curiosity',
      },
    ];

    // Test chapter content with intentional issues:
    // - Grammar errors for copy editor
    // - Weak prose for line editor
    // - Pacing issues for developmental editor
    // - Name inconsistency for continuity editor
    const testContent = `Kael walked into the tower. It was dark. He was scared.

The tower was very old and falling apart. Stones were falling. He thought it was dangerous but he went in anyway because he needed shelter.

Inside the tower Kael saw some markings on the wall. The markings was glowing faintly in the darkness. He walked closer to examine them.

"What is this" he said out loud even though no one was their to hear him.

The markings showed pictures of people and shadows and something that looked like a ritual. Kale wondered what it meant. He touched the wall and suddenly he felt dizzy.

Visions flashed through his mind. He saw his past, his sister, and the Shadow Council. He realized that he was connected to all of this somehow.

Then he heard footsteps outside. The Shadow Guards had found him.`;

    const insertChapterStmt = db.prepare(`
      INSERT INTO chapters (id, book_id, chapter_number, title, scene_cards, content, status, word_count, flags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const wordCount = testContent.split(/\s+/).length;

    insertChapterStmt.run(
      chapterId,
      bookId,
      1,
      'The Discovery',
      JSON.stringify(sceneCards),
      testContent,
      'editing', // Status: ready for editing
      wordCount,
      '[]', // No flags yet
      now,
      now
    );

    console.log(`✓ Created chapter with ${wordCount} words`);
    console.log(`  (Content has intentional issues for editors to catch)`);

    // Step 4: Run Developmental Editor
    console.log('\n=== Step 4: Running Developmental Editor ===');
    const devEditStart = Date.now();
    const devResult = await editingService.developmentalEdit(chapterId);
    const devEditTime = Date.now() - devEditStart;

    console.log(`✓ Developmental edit complete (${(devEditTime / 1000).toFixed(1)}s)`);
    console.log(`  - Suggestions: ${devResult.suggestions.length}`);
    console.log(`  - Flags: ${devResult.flags.length}`);
    console.log(`  - Needs revision: ${!devResult.approved}`);

    if (devResult.suggestions.length > 0) {
      console.log('\n  Top suggestions:');
      devResult.suggestions.slice(0, 3).forEach((s, i) => {
        console.log(`    ${i + 1}. [${s.severity}] ${s.type}: ${s.issue}`);
      });
    }

    // Apply dev edit result
    await editingService.applyEditResult(chapterId, devResult);

    // Step 5: Run Author Revision (if needed)
    if (!devResult.approved) {
      console.log('\n=== Step 5: Running Author Revision ===');
      const revisionStart = Date.now();
      const revisedContent = await editingService.authorRevision(chapterId, devResult);
      const revisionTime = Date.now() - revisionStart;

      console.log(`✓ Author revision complete (${(revisionTime / 1000).toFixed(1)}s)`);
      console.log(`  - Original length: ${testContent.length} chars`);
      console.log(`  - Revised length: ${revisedContent.length} chars`);

      // Update chapter with revised content
      const updateStmt = db.prepare(`
        UPDATE chapters SET content = ?, updated_at = ? WHERE id = ?
      `);
      updateStmt.run(revisedContent, new Date().toISOString(), chapterId);
    } else {
      console.log('\n=== Step 5: Author Revision ===');
      console.log('  Skipped - developmental editor approved the chapter');
    }

    // Step 6: Run Line Editor
    console.log('\n=== Step 6: Running Line Editor ===');
    const lineEditStart = Date.now();
    const lineResult = await editingService.lineEdit(chapterId);
    const lineEditTime = Date.now() - lineEditStart;

    console.log(`✓ Line edit complete (${(lineEditTime / 1000).toFixed(1)}s)`);
    console.log(`  - Flags: ${lineResult.flags.length}`);
    console.log(`  - Content length: ${lineResult.editedContent.length} chars`);

    await editingService.applyEditResult(chapterId, lineResult);

    // Step 7: Run Continuity Editor
    console.log('\n=== Step 7: Running Continuity Editor ===');
    const continuityStart = Date.now();
    const continuityResult = await editingService.continuityEdit(chapterId);
    const continuityTime = Date.now() - continuityStart;

    console.log(`✓ Continuity check complete (${(continuityTime / 1000).toFixed(1)}s)`);
    console.log(`  - Issues found: ${continuityResult.suggestions.length}`);
    console.log(`  - Flags: ${continuityResult.flags.length}`);

    if (continuityResult.suggestions.length > 0) {
      console.log('\n  Continuity issues:');
      continuityResult.suggestions.forEach((s, i) => {
        console.log(`    ${i + 1}. [${s.severity}] ${s.issue}`);
      });
    }

    await editingService.applyEditResult(chapterId, continuityResult);

    // Step 8: Run Copy Editor
    console.log('\n=== Step 8: Running Copy Editor ===');
    const copyEditStart = Date.now();
    const copyResult = await editingService.copyEdit(chapterId);
    const copyEditTime = Date.now() - copyEditStart;

    console.log(`✓ Copy edit complete (${(copyEditTime / 1000).toFixed(1)}s)`);
    console.log(`  - Flags: ${copyResult.flags.length}`);

    await editingService.applyEditResult(chapterId, copyResult);

    // Step 9: Review final chapter state
    console.log('\n=== Step 9: Final Chapter Review ===');
    const finalStmt = db.prepare<[string], any>(`
      SELECT content, flags FROM chapters WHERE id = ?
    `);
    const finalChapter = finalStmt.get(chapterId);

    const allFlags = JSON.parse(finalChapter.flags);
    const unresolvedFlags = allFlags.filter((f: any) => !f.resolved);

    console.log(`✓ Chapter editing complete`);
    console.log(`  - Total flags: ${allFlags.length}`);
    console.log(`  - Unresolved flags: ${unresolvedFlags.length}`);
    console.log(`  - Final word count: ${finalChapter.content.split(/\s+/).length}`);

    if (allFlags.length > 0) {
      console.log('\n  All flags by type:');
      const flagsByType = allFlags.reduce((acc: any, f: any) => {
        acc[f.type] = (acc[f.type] || 0) + 1;
        return acc;
      }, {});
      Object.entries(flagsByType).forEach(([type, count]) => {
        console.log(`    - ${type}: ${count}`);
      });

      console.log('\n  Flags by severity:');
      const flagsBySeverity = allFlags.reduce((acc: any, f: any) => {
        acc[f.severity] = (acc[f.severity] || 0) + 1;
        return acc;
      }, {});
      Object.entries(flagsBySeverity).forEach(([severity, count]) => {
        console.log(`    - ${severity}: ${count}`);
      });
    }

    // Step 10: Performance summary
    const totalTime = devEditTime + (devResult.approved ? 0 : Date.now() - Date.now()) + lineEditTime + continuityTime + copyEditTime;
    console.log('\n=== Performance Summary ===');
    console.log(`  - Developmental edit: ${(devEditTime / 1000).toFixed(1)}s`);
    console.log(`  - Line edit: ${(lineEditTime / 1000).toFixed(1)}s`);
    console.log(`  - Continuity check: ${(continuityTime / 1000).toFixed(1)}s`);
    console.log(`  - Copy edit: ${(copyEditTime / 1000).toFixed(1)}s`);
    console.log(`  - Total pipeline time: ${(totalTime / 1000).toFixed(1)}s`);

    console.log('\n=== Test Complete ===');
    console.log('\nTest data IDs:');
    console.log(`  Project ID: ${projectId}`);
    console.log(`  Book ID: ${bookId}`);
    console.log(`  Chapter ID: ${chapterId}`);

    console.log('\nView results:');
    console.log(`  - Chapter: GET /api/chapters/${chapterId}`);
    console.log(`  - Flags: GET /api/editing/chapters/${chapterId}/flags`);
    console.log(`  - Book summary: GET /api/editing/books/${bookId}/flags-summary`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testEditingPipeline()
  .then(() => {
    console.log('\n✅ Editing pipeline test successful\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Editing pipeline test failed\n');
    process.exit(1);
  });
