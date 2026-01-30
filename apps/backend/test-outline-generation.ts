/**
 * Integration test for Sprint 4: Outline Generation
 *
 * Tests the complete workflow from concept to outline
 */

import { generateOutline, type OutlineContext } from './src/services/outline-generator.js';
import type { StoryDNA, Character, WorldElements } from '../shared/types/index.js';

async function testOutlineGeneration() {
  console.log('🧪 Testing Sprint 4: Outline Generation\n');

  // Mock data from a typical project
  const testConcept = {
    title: 'The Shadow of Betrayal',
    logline: 'A disgraced knight must uncover a conspiracy that threatens to destroy the kingdom she once served.',
    synopsis: 'Former royal guard captain Elena discovers that her exile was orchestrated by someone within the palace. As she investigates, she uncovers a dark plot that could plunge the kingdom into civil war.',
  };

  const testStoryDNA: StoryDNA = {
    genre: 'Fantasy',
    subgenre: 'Epic Fantasy',
    tone: 'Dark and morally complex',
    themes: ['Redemption', 'Loyalty vs Truth', 'Power Corruption'],
    proseStyle: 'Close third-person with gritty, visceral descriptions',
  };

  const testCharacters: Character[] = [
    {
      id: 'char-1',
      name: 'Elena Stormborn',
      role: 'protagonist',
      physicalDescription: 'Tall warrior with scarred arms and steely gray eyes',
      personalityTraits: ['Honorable', 'Stubborn', 'Haunted by past'],
      voiceSample: 'I\'ve spent my life serving a lie. Now I\'ll spend what\'s left uncovering the truth, no matter the cost.',
      goals: ['Clear her name', 'Expose the conspiracy', 'Protect the innocent'],
      conflicts: ['Exiled from her order', 'Trust issues', 'Inner rage'],
      relationships: [],
      characterArc: 'From rigid honor to understanding that true justice requires flexibility',
    },
    {
      id: 'char-2',
      name: 'Lord Marcus Vale',
      role: 'antagonist',
      physicalDescription: 'Elegant nobleman with calculating eyes',
      personalityTraits: ['Charismatic', 'Ruthless', 'Strategic thinker'],
      voiceSample: 'Power isn\'t taken, Captain. It\'s cultivated, nurtured, and when the moment is right... harvested.',
      goals: ['Seize the throne', 'Eliminate opposition', 'Build new order'],
      conflicts: ['Hidden identity', 'Multiple conspirators', 'Time pressure'],
      relationships: [],
    },
    {
      id: 'char-3',
      name: 'Brother Aldric',
      role: 'mentor',
      physicalDescription: 'Elderly priest with kind eyes and weary shoulders',
      personalityTraits: ['Wise', 'Conflicted', 'Protective'],
      voiceSample: 'The truth you seek, child, may be darker than the lies you\'ve lived. Are you certain you wish to know?',
      goals: ['Guide Elena', 'Prevent bloodshed', 'Atone for silence'],
      conflicts: ['Knows more than he reveals', 'Loyalty to church vs morality'],
      relationships: [],
    },
  ];

  const testWorld: WorldElements = {
    locations: [
      {
        id: 'loc-1',
        name: 'The Citadel',
        description: 'Massive fortress-palace where the kingdom is ruled',
        significance: 'Center of power and conspiracy',
      },
      {
        id: 'loc-2',
        name: 'The Exiled Quarters',
        description: 'Slums beyond the city walls where outcasts gather',
        significance: 'Where Elena now lives and gathers information',
      },
      {
        id: 'loc-3',
        name: 'The Silent Chapel',
        description: 'Ancient monastery holding forbidden records',
        significance: 'Contains evidence of the conspiracy',
      },
    ],
    factions: [
      {
        id: 'fac-1',
        name: 'The Royal Guard',
        description: 'Elite warriors sworn to protect the crown',
        goals: ['Maintain order', 'Protect the royal family'],
      },
      {
        id: 'fac-2',
        name: 'The Shadow Council',
        description: 'Secret group of nobles plotting to seize power',
        goals: ['Overthrow current regime', 'Install puppet king'],
      },
    ],
    systems: [
      {
        id: 'sys-1',
        type: 'magic',
        name: 'Blood Oaths',
        description: 'Magical binding contracts enforced by ancient power',
        rules: ['Cannot be broken without severe consequences', 'Visible as glowing marks'],
      },
    ],
  };

  const context: OutlineContext = {
    concept: testConcept,
    storyDNA: testStoryDNA,
    characters: testCharacters,
    world: testWorld,
    structureType: 'save_the_cat',
    targetWordCount: 80000,
  };

  try {
    console.log('📝 Generating outline with Save the Cat structure...\n');
    console.log(`   Title: ${testConcept.title}`);
    console.log(`   Structure: Save the Cat (15 beats)`);
    console.log(`   Target: 80,000 words (~36 chapters)\n`);

    const startTime = Date.now();
    const outline = await generateOutline(context);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ Outline generated successfully in ${duration}s\n`);

    // Validate outline structure
    console.log('🔍 Validating outline structure...\n');

    let totalChapters = 0;
    let totalScenes = 0;

    for (const act of outline.acts) {
      console.log(`\n📖 ${act.name}`);
      console.log(`   Description: ${act.description}`);
      console.log(`   Beats: ${act.beats.length}`);
      console.log(`   Chapters: ${act.chapters.length}`);
      console.log(`   Target Words: ${act.targetWordCount.toLocaleString()}`);

      totalChapters += act.chapters.length;

      // Show first chapter as sample
      if (act.chapters.length > 0) {
        const ch = act.chapters[0];
        console.log(`\n   Sample Chapter ${ch.number}: "${ch.title}"`);
        console.log(`   - POV: ${ch.povCharacter}`);
        console.log(`   - Summary: ${ch.summary.substring(0, 100)}...`);
        console.log(`   - Scenes: ${ch.scenes.length}`);

        totalScenes += ch.scenes.length;

        if (ch.scenes.length > 0) {
          const sc = ch.scenes[0];
          console.log(`\n      Scene 1 @ ${sc.location}`);
          console.log(`      - Goal: ${sc.goal}`);
          console.log(`      - Conflict: ${sc.conflict}`);
          console.log(`      - Outcome: ${sc.outcome}`);
        }
      }
    }

    console.log(`\n\n📊 OUTLINE SUMMARY`);
    console.log(`   ✓ Structure Type: ${outline.type}`);
    console.log(`   ✓ Total Acts: ${outline.acts.length}`);
    console.log(`   ✓ Total Chapters: ${totalChapters}`);
    console.log(`   ✓ Total Scenes: ${totalScenes}`);
    console.log(`   ✓ Avg Scenes/Chapter: ${(totalScenes / totalChapters).toFixed(1)}`);

    // Validate chapter numbering
    const chapterNumbers = outline.acts.flatMap(act => act.chapters.map(ch => ch.number));
    const isSequential = chapterNumbers.every((num, idx) => num === idx + 1);
    console.log(`   ${isSequential ? '✓' : '✗'} Chapter Numbering: ${isSequential ? 'Sequential' : 'BROKEN'}`);

    // Validate scene cards
    const allSceneCards = outline.acts.flatMap(act =>
      act.chapters.flatMap(ch => ch.scenes)
    );
    const hasRequiredFields = allSceneCards.every(sc =>
      sc.id && sc.location && sc.goal && sc.conflict && sc.outcome && sc.emotionalBeat
    );
    console.log(`   ${hasRequiredFields ? '✓' : '✗'} Scene Cards: ${hasRequiredFields ? 'Valid' : 'MISSING FIELDS'}`);

    console.log('\n✅ Sprint 4 Outline Generation: ALL TESTS PASSED\n');

    return outline;

  } catch (error: any) {
    console.error('\n❌ Test Failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  testOutlineGeneration()
    .then(() => {
      console.log('🎉 Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testOutlineGeneration };
