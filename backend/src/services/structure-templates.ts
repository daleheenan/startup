import type { StructureTemplate, Beat } from '../../shared/types/index.js';

/**
 * Story Structure Templates
 * Define the fundamental narrative structures that can guide novel generation
 */

// 3-Act Structure (Classic)
export const THREE_ACT_TEMPLATE: StructureTemplate = {
  type: 'three_act',
  name: 'Three-Act Structure',
  description: 'Classic narrative structure with setup, confrontation, and resolution',
  acts: [
    {
      number: 1,
      name: 'Act I: Setup',
      description: 'Introduce the protagonist, their world, and the inciting incident that disrupts their normal life',
      percentageOfStory: 25,
      beats: [
        {
          name: 'Opening Image',
          description: 'Snapshot of protagonist\'s life before the journey begins',
          percentagePoint: 0,
        },
        {
          name: 'Setup',
          description: 'Establish normal world, character, and stakes',
          percentagePoint: 5,
        },
        {
          name: 'Inciting Incident',
          description: 'Event that disrupts the normal world and presents the central problem',
          percentagePoint: 12,
        },
        {
          name: 'First Plot Point',
          description: 'Protagonist commits to the journey and enters Act II',
          percentagePoint: 25,
        },
      ],
    },
    {
      number: 2,
      name: 'Act II: Confrontation',
      description: 'Protagonist faces obstacles, learns lessons, and builds toward the climax',
      percentageOfStory: 50,
      beats: [
        {
          name: 'Rising Action',
          description: 'Protagonist pursues goal, faces escalating obstacles',
          percentagePoint: 30,
        },
        {
          name: 'Midpoint',
          description: 'Major revelation or reversal that raises the stakes',
          percentagePoint: 50,
        },
        {
          name: 'Rising Stakes',
          description: 'Complications increase, pressure mounts',
          percentagePoint: 60,
        },
        {
          name: 'Second Plot Point',
          description: 'All seems lost, protagonist at lowest point',
          percentagePoint: 75,
        },
      ],
    },
    {
      number: 3,
      name: 'Act III: Resolution',
      description: 'Protagonist confronts the antagonist and resolves the central conflict',
      percentageOfStory: 25,
      beats: [
        {
          name: 'Dark Night of the Soul',
          description: 'Protagonist doubts themselves, must find inner strength',
          percentagePoint: 76,
        },
        {
          name: 'Climax',
          description: 'Final confrontation, protagonist faces their greatest challenge',
          percentagePoint: 85,
        },
        {
          name: 'Resolution',
          description: 'Loose ends tied up, new status quo established',
          percentagePoint: 95,
        },
        {
          name: 'Closing Image',
          description: 'Snapshot showing how protagonist has changed',
          percentagePoint: 100,
        },
      ],
    },
  ],
};

// Save the Cat (Blake Snyder's 15 Beats)
export const SAVE_THE_CAT_TEMPLATE: StructureTemplate = {
  type: 'save_the_cat',
  name: 'Save the Cat',
  description: 'Blake Snyder\'s 15-beat structure for commercial storytelling',
  acts: [
    {
      number: 1,
      name: 'Act I: Setup',
      description: 'Set up the world and protagonist before they commit to the adventure',
      percentageOfStory: 25,
      beats: [
        {
          name: 'Opening Image',
          description: 'A snapshot of the protagonist\'s "before" life',
          percentagePoint: 0,
        },
        {
          name: 'Theme Stated',
          description: 'The theme of the story is hinted at',
          percentagePoint: 5,
        },
        {
          name: 'Setup',
          description: 'Establish protagonist, world, stakes, what\'s missing',
          percentagePoint: 10,
        },
        {
          name: 'Catalyst',
          description: 'Inciting incident that disrupts the status quo',
          percentagePoint: 12,
        },
        {
          name: 'Debate',
          description: 'Protagonist hesitates, debates whether to act',
          percentagePoint: 18,
        },
        {
          name: 'Break Into Two',
          description: 'Protagonist commits and enters the upside-down world',
          percentagePoint: 25,
        },
      ],
    },
    {
      number: 2,
      name: 'Act II: Confrontation',
      description: 'Fun and games turn serious as stakes escalate',
      percentageOfStory: 50,
      beats: [
        {
          name: 'B Story',
          description: 'Secondary storyline begins, often involving helper/love interest',
          percentagePoint: 30,
        },
        {
          name: 'Fun and Games',
          description: 'The promise of the premise, things go well (or hilariously wrong)',
          percentagePoint: 35,
        },
        {
          name: 'Midpoint',
          description: 'False victory or false defeat, stakes are raised',
          percentagePoint: 50,
        },
        {
          name: 'Bad Guys Close In',
          description: 'Opposition intensifies, problems multiply',
          percentagePoint: 60,
        },
        {
          name: 'All Is Lost',
          description: 'Lowest point, something or someone dies (literally or metaphorically)',
          percentagePoint: 75,
        },
        {
          name: 'Dark Night of the Soul',
          description: 'Protagonist wallows in despair, seems hopeless',
          percentagePoint: 78,
        },
      ],
    },
    {
      number: 3,
      name: 'Act III: Resolution',
      description: 'Protagonist uses lessons learned to win the day',
      percentageOfStory: 25,
      beats: [
        {
          name: 'Break Into Three',
          description: 'Solution found, protagonist gets second wind',
          percentagePoint: 80,
        },
        {
          name: 'Finale',
          description: 'Protagonist executes plan, defeats antagonist, proves transformation',
          percentagePoint: 90,
        },
        {
          name: 'Final Image',
          description: 'Mirror of opening image showing how protagonist has changed',
          percentagePoint: 100,
        },
      ],
    },
  ],
};

// Hero's Journey (Joseph Campbell / Christopher Vogler)
export const HEROS_JOURNEY_TEMPLATE: StructureTemplate = {
  type: 'heros_journey',
  name: 'Hero\'s Journey',
  description: 'Joseph Campbell\'s monomyth adapted for modern storytelling',
  acts: [
    {
      number: 1,
      name: 'Act I: Departure',
      description: 'Hero is called from the ordinary world to adventure',
      percentageOfStory: 25,
      beats: [
        {
          name: 'Ordinary World',
          description: 'Hero in their normal life, establishing what\'s at stake',
          percentagePoint: 0,
        },
        {
          name: 'Call to Adventure',
          description: 'Hero is presented with a problem, challenge, or adventure',
          percentagePoint: 10,
        },
        {
          name: 'Refusal of the Call',
          description: 'Hero hesitates or refuses, expressing fear or doubt',
          percentagePoint: 15,
        },
        {
          name: 'Meeting the Mentor',
          description: 'Hero encounters someone who provides wisdom, training, or gifts',
          percentagePoint: 20,
        },
        {
          name: 'Crossing the Threshold',
          description: 'Hero commits to the adventure and enters the special world',
          percentagePoint: 25,
        },
      ],
    },
    {
      number: 2,
      name: 'Act II: Initiation',
      description: 'Hero faces tests, allies, and enemies in the special world',
      percentageOfStory: 50,
      beats: [
        {
          name: 'Tests, Allies, and Enemies',
          description: 'Hero learns the rules of the special world',
          percentagePoint: 35,
        },
        {
          name: 'Approach to the Inmost Cave',
          description: 'Hero approaches the dangerous place where the object of the quest is hidden',
          percentagePoint: 50,
        },
        {
          name: 'Ordeal',
          description: 'Hero faces greatest fear or most difficult challenge',
          percentagePoint: 60,
        },
        {
          name: 'Reward',
          description: 'Hero survives and claims the reward (object, knowledge, reconciliation)',
          percentagePoint: 70,
        },
      ],
    },
    {
      number: 3,
      name: 'Act III: Return',
      description: 'Hero returns home transformed with newfound wisdom',
      percentageOfStory: 25,
      beats: [
        {
          name: 'The Road Back',
          description: 'Hero must return to ordinary world with the reward',
          percentagePoint: 75,
        },
        {
          name: 'Resurrection',
          description: 'Final test where hero is purified by a last sacrifice or ordeal',
          percentagePoint: 85,
        },
        {
          name: 'Return with the Elixir',
          description: 'Hero returns home transformed, with gift that benefits their world',
          percentagePoint: 100,
        },
      ],
    },
  ],
};

// Seven-Point Story Structure (Dan Wells)
export const SEVEN_POINT_TEMPLATE: StructureTemplate = {
  type: 'seven_point',
  name: 'Seven-Point Structure',
  description: 'Dan Wells\' structure designed backward from the resolution',
  acts: [
    {
      number: 1,
      name: 'Act I: Beginning',
      description: 'Establish the starting point before the journey',
      percentageOfStory: 25,
      beats: [
        {
          name: 'Hook',
          description: 'Protagonist in a state of stasis, but something is wrong',
          percentagePoint: 0,
        },
        {
          name: 'Plot Turn 1',
          description: 'Event that gets protagonist moving, call to action',
          percentagePoint: 25,
        },
      ],
    },
    {
      number: 2,
      name: 'Act II: Middle',
      description: 'Protagonist struggles toward their goal',
      percentageOfStory: 50,
      beats: [
        {
          name: 'Pinch Point 1',
          description: 'Reminder of antagonist\'s power, raises stakes',
          percentagePoint: 37,
        },
        {
          name: 'Midpoint',
          description: 'Protagonist moves from reaction to action, gains new information',
          percentagePoint: 50,
        },
        {
          name: 'Pinch Point 2',
          description: 'Antagonist\'s power at full strength, seems insurmountable',
          percentagePoint: 62,
        },
        {
          name: 'Plot Turn 2',
          description: 'Final piece of information protagonist needs to resolve the story',
          percentagePoint: 75,
        },
      ],
    },
    {
      number: 3,
      name: 'Act III: Ending',
      description: 'Protagonist achieves transformation',
      percentageOfStory: 25,
      beats: [
        {
          name: 'Resolution',
          description: 'Protagonist in new state of equilibrium, mirror of hook',
          percentagePoint: 100,
        },
      ],
    },
  ],
};

// Freytag's Pyramid
export const FREYTAG_TEMPLATE: StructureTemplate = {
  type: 'freytag',
  name: 'Freytag\'s Pyramid',
  description: 'Classic five-act dramatic structure',
  acts: [
    {
      number: 1,
      name: 'Exposition',
      description: 'Introduction of characters, setting, and situation',
      percentageOfStory: 15,
      beats: [
        {
          name: 'Exposition',
          description: 'Establish characters, setting, and initial situation',
          percentagePoint: 0,
        },
        {
          name: 'Inciting Moment',
          description: 'Event that starts the conflict',
          percentagePoint: 15,
        },
      ],
    },
    {
      number: 2,
      name: 'Rising Action',
      description: 'Conflict develops and intensifies',
      percentageOfStory: 35,
      beats: [
        {
          name: 'Rising Action',
          description: 'Series of events that build tension and develop conflict',
          percentagePoint: 30,
        },
      ],
    },
    {
      number: 3,
      name: 'Climax',
      description: 'Turning point of maximum tension',
      percentageOfStory: 10,
      beats: [
        {
          name: 'Climax',
          description: 'Turning point, moment of greatest tension',
          percentagePoint: 50,
        },
      ],
    },
    {
      number: 4,
      name: 'Falling Action',
      description: 'Events that follow the climax',
      percentageOfStory: 25,
      beats: [
        {
          name: 'Falling Action',
          description: 'Consequences of the climax unfold',
          percentagePoint: 70,
        },
      ],
    },
    {
      number: 5,
      name: 'Denouement',
      description: 'Resolution and restoration of equilibrium',
      percentageOfStory: 15,
      beats: [
        {
          name: 'Resolution',
          description: 'Conflicts are resolved, new equilibrium established',
          percentagePoint: 90,
        },
        {
          name: 'Conclusion',
          description: 'Final wrap-up and closing image',
          percentagePoint: 100,
        },
      ],
    },
  ],
};

// Export all templates as a map for easy lookup
export const STRUCTURE_TEMPLATES: Record<string, StructureTemplate> = {
  three_act: THREE_ACT_TEMPLATE,
  save_the_cat: SAVE_THE_CAT_TEMPLATE,
  heros_journey: HEROS_JOURNEY_TEMPLATE,
  seven_point: SEVEN_POINT_TEMPLATE,
  freytag: FREYTAG_TEMPLATE,
};

/**
 * Get structure template by type
 */
export function getStructureTemplate(type: string): StructureTemplate | undefined {
  return STRUCTURE_TEMPLATES[type];
}

/**
 * Get all available structure templates
 */
export function getAllStructureTemplates(): StructureTemplate[] {
  return Object.values(STRUCTURE_TEMPLATES);
}
