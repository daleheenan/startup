import { Character, Relationship, CharacterState } from '../../shared/types';

/**
 * Creates a test Relationship object with sensible defaults
 */
export const createTestRelationship = (overrides?: Partial<Relationship>): Relationship => ({
  characterId: 'character-2',
  type: 'mentor',
  description: 'A trusted advisor who has guided the protagonist since childhood',
  ...overrides,
});

/**
 * Creates multiple test Relationships
 */
export const createTestRelationships = (count: number = 3): Relationship[] => {
  const relationshipTypes = [
    { characterId: 'character-2', type: 'mentor', description: 'A trusted advisor and guide' },
    { characterId: 'character-3', type: 'ally', description: 'A loyal friend and companion' },
    { characterId: 'character-4', type: 'rival', description: 'A competitive peer with conflicting goals' },
    { characterId: 'character-5', type: 'love interest', description: 'A romantic interest with complicated feelings' },
    { characterId: 'character-6', type: 'antagonist', description: 'A sworn enemy seeking their downfall' },
  ];

  return relationshipTypes.slice(0, count).map(createTestRelationship);
};

/**
 * Creates a test CharacterState object with sensible defaults
 */
export const createTestCharacterState = (overrides?: Partial<CharacterState>): CharacterState => ({
  location: 'The Capital',
  emotionalState: 'Determined but anxious',
  goals: ['Master swordsmanship', 'Earn father\'s respect', 'Protect the kingdom'],
  conflicts: ['Self-doubt', 'Fear of failure', 'Romantic tension'],
  ...overrides,
});

/**
 * Creates a test Character object with sensible defaults (protagonist)
 */
export const createTestCharacter = (overrides?: Partial<Character>): Character => ({
  id: 'character-1',
  name: 'John Smith',
  role: 'protagonist',
  ethnicity: 'British',
  nationality: 'England',
  physicalDescription: 'A tall young man in his early twenties with dark hair, grey eyes, and a determined expression. Athletic build from years of training.',
  personalityTraits: ['brave', 'stubborn', 'loyal', 'introspective', 'compassionate'],
  voiceSample: '"I won\'t let you down," he said firmly, his voice steady despite the fear gnawing at his insides. "Not this time."',
  goals: ['Save the kingdom from darkness', 'Prove himself worthy of leadership', 'Master his magical abilities'],
  conflicts: ['Struggles with self-doubt', 'Torn between duty and personal desires', 'Fears repeating his father\'s mistakes'],
  relationships: createTestRelationships(3),
  characterArc: 'Transforms from an uncertain, self-doubting youth into a confident leader who learns to trust his own judgement and embrace his destiny',
  currentState: createTestCharacterState(),
  ...overrides,
});

/**
 * Creates a mentor character
 */
export const createTestMentor = (overrides?: Partial<Character>): Character => {
  return createTestCharacter({
    id: 'character-mentor',
    name: 'Eleanor Greystone',
    role: 'mentor',
    physicalDescription: 'A wise woman in her sixties with silver hair, keen blue eyes, and a commanding presence. Wears traditional scholar\'s robes.',
    personalityTraits: ['wise', 'patient', 'stern', 'protective', 'knowledgeable'],
    voiceSample: '"The path ahead will test you in ways you cannot yet imagine," she said quietly, her eyes reflecting decades of experience. "But I believe you have the strength to endure."',
    goals: ['Guide the protagonist to his destiny', 'Protect ancient knowledge', 'Atone for past failures'],
    conflicts: ['Guilt over past mistakes', 'Knows dangerous secrets', 'Failing health'],
    relationships: [
      {
        characterId: 'character-1',
        type: 'student',
        description: 'Her most promising pupil, whom she views as a surrogate child',
      },
    ],
    characterArc: 'Learns to let go and trust her student to make his own choices, even when they differ from her advice',
    currentState: {
      location: 'The Academy',
      emotionalState: 'Concerned but hopeful',
      goals: ['Prepare the protagonist for the trials ahead', 'Pass on her knowledge'],
      conflicts: ['Knows more than she can safely reveal', 'Torn between protecting and preparing'],
    },
    ...overrides,
  });
};

/**
 * Creates an antagonist character
 */
export const createTestAntagonist = (overrides?: Partial<Character>): Character => {
  return createTestCharacter({
    id: 'character-antagonist',
    name: 'Lord Malachar',
    role: 'antagonist',
    physicalDescription: 'A tall, imposing figure cloaked in shadow. Pale skin, sharp features, and eyes that seem to pierce through souls. Always wears dark robes adorned with arcane symbols.',
    personalityTraits: ['cunning', 'ruthless', 'charismatic', 'patient', 'manipulative'],
    voiceSample: '"You call me a villain," he said with a cold smile, "but I am simply someone who understands that true power requires sacrifice. The weak will always fear what they cannot comprehend."',
    goals: ['Seize control of the kingdom', 'Unlock forbidden magical powers', 'Reshape the world according to his vision'],
    conflicts: ['Obsessed with past betrayals', 'Believes the ends justify any means', 'Isolated by his quest for power'],
    relationships: [
      {
        characterId: 'character-1',
        type: 'nemesis',
        description: 'Sees the protagonist as both a threat and a potential successor',
      },
    ],
    characterArc: 'Descends further into darkness as his schemes unfold, but ultimately faces the consequences of his ambition',
    currentState: {
      location: 'The Dark Tower',
      emotionalState: 'Calculating and confident',
      goals: ['Execute the final phase of his plan', 'Eliminate all opposition'],
      conflicts: ['Underestimates the protagonist\'s determination', 'Growing paranoia'],
    },
    ...overrides,
  });
};

/**
 * Creates a supporting character / ally
 */
export const createTestAlly = (overrides?: Partial<Character>): Character => {
  return createTestCharacter({
    id: 'character-ally',
    name: 'Marcus Thorne',
    role: 'supporting',
    physicalDescription: 'A stocky warrior in his thirties with a scarred face, short brown hair, and warm hazel eyes. Wears practical armour with the insignia of the Royal Guard.',
    personalityTraits: ['loyal', 'humorous', 'pragmatic', 'protective', 'straightforward'],
    voiceSample: '"Well, that could\'ve gone better," he said with a wry grin, wiping blood from his sword. "But at least we\'re still breathing. That\'s got to count for something."',
    goals: ['Protect his friends', 'Serve the kingdom with honour', 'Return home to his family'],
    conflicts: ['Struggles with orders that conflict with his morals', 'Fears leaving his family without a father', 'Haunted by fallen comrades'],
    relationships: [
      {
        characterId: 'character-1',
        type: 'friend',
        description: 'Best friend and loyal companion, treats him like a brother',
      },
    ],
    characterArc: 'Learns that true loyalty sometimes means questioning orders and standing up for what\'s right',
    currentState: {
      location: 'The Capital',
      emotionalState: 'Concerned but resolute',
      goals: ['Keep the protagonist safe', 'Uncover the conspiracy'],
      conflicts: ['Suspicious of the council', 'Worried about his family'],
    },
    ...overrides,
  });
};

/**
 * Creates a love interest character
 */
export const createTestLoveInterest = (overrides?: Partial<Character>): Character => {
  return createTestCharacter({
    id: 'character-love',
    name: 'Isabella Nightingale',
    role: 'supporting',
    physicalDescription: 'A striking woman in her twenties with auburn hair, emerald eyes, and an graceful demeanour. Often wears elegant dresses that reflect her noble status.',
    personalityTraits: ['intelligent', 'independent', 'compassionate', 'witty', 'determined'],
    voiceSample: '"You don\'t have to face this alone," she said softly, her hand finding his. "Whatever happens, we\'ll face it together. That\'s what partnership means."',
    goals: ['Use her influence to help those in need', 'Break free from restrictive social expectations', 'Support the protagonist whilst maintaining her independence'],
    conflicts: ['Torn between duty to family and personal desires', 'Frustrated by society\'s limitations on women', 'Fears being seen as merely a romantic interest'],
    relationships: [
      {
        characterId: 'character-1',
        type: 'love interest',
        description: 'Growing romantic connection complicated by circumstances and duty',
      },
    ],
    characterArc: 'Discovers her own strength and refuses to be defined by others, becoming a leader in her own right',
    currentState: {
      location: 'The Capital',
      emotionalState: 'Hopeful but guarded',
      goals: ['Help reform unjust laws', 'Build a genuine partnership with the protagonist'],
      conflicts: ['Family pressure to make a political marriage', 'Wants to be valued for more than her title'],
    },
    ...overrides,
  });
};

/**
 * Creates a minor/background character
 */
export const createTestMinorCharacter = (overrides?: Partial<Character>): Character => {
  return createTestCharacter({
    id: 'character-minor',
    name: 'Thomas the Innkeeper',
    role: 'minor',
    physicalDescription: 'A portly middle-aged man with thinning grey hair, a jovial face, and welcoming smile.',
    personalityTraits: ['friendly', 'gossipy', 'observant', 'discreet'],
    voiceSample: '"Welcome, welcome!" he said cheerfully, wiping his hands on his apron. "What can I get for you today?"',
    goals: ['Run a successful inn', 'Keep his customers happy'],
    conflicts: ['Caught between wanting to help and staying out of danger'],
    relationships: [],
    characterArc: undefined,
    currentState: {
      location: 'The Dragon\'s Rest Inn',
      emotionalState: 'Nervous but curious',
      goals: ['Stay neutral in political conflicts'],
      conflicts: ['Knows dangerous information'],
    },
    ...overrides,
  });
};

/**
 * Creates a set of diverse characters for a story
 */
export const createTestCharacterCast = (): Character[] => {
  return [
    createTestCharacter(), // Protagonist
    createTestMentor(),
    createTestAntagonist(),
    createTestAlly(),
    createTestLoveInterest(),
  ];
};
