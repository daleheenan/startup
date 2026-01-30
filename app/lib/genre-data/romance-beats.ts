// Romance Emotional Beats
// The key emotional moments every romance reader expects

export interface RomanceBeat {
  id: string;
  name: string;
  description: string;
  typicalPlacement: string;
  required: boolean;
  emotionalFunction: string;
  variations: string[];
  tips: string[];
}

export const ROMANCE_BEATS: RomanceBeat[] = [
  {
    id: 'meet_cute',
    name: 'Meet Cute',
    description: 'The first meeting between romantic leads, often with chemistry, comedy, or conflict.',
    typicalPlacement: 'Chapter 1-2 (first 10%)',
    required: true,
    emotionalFunction: 'Establishes the spark and hooks the reader into the relationship potential.',
    variations: [
      'Classic meet cute - charming, humorous first encounter',
      'Meet ugly - antagonistic first meeting (enemies to lovers)',
      'Re-meet - characters reconnecting after time apart (second chance)',
      'Slow reveal - gradual awareness of each other',
      'Forced meeting - circumstances push them together'
    ],
    tips: [
      'Create immediate chemistry or tension',
      'Show what makes each character distinctive',
      'Plant seeds for the central conflict',
      'Make it memorable - readers will reference this moment'
    ]
  },
  {
    id: 'first_attraction',
    name: 'First Attraction Acknowledged',
    description: 'The moment a character internally acknowledges attraction to the other.',
    typicalPlacement: 'Within first 15%',
    required: true,
    emotionalFunction: 'Confirms romantic potential for the reader.',
    variations: [
      'Physical attraction noticed',
      'Emotional connection felt',
      'Reluctant attraction despite obstacles',
      'Sudden realisation',
      'Gradual awareness'
    ],
    tips: [
      'Show through internal monologue',
      'Can be one-sided initially',
      'Often paired with denial or resistance',
      'Use sensory details'
    ]
  },
  {
    id: 'first_conflict',
    name: 'First Major Conflict',
    description: 'The first significant obstacle or disagreement threatening the relationship.',
    typicalPlacement: '15-25%',
    required: true,
    emotionalFunction: 'Establishes that this love won\'t come easy, raising stakes.',
    variations: [
      'External obstacle (circumstances, other people)',
      'Internal conflict (fears, past trauma)',
      'Misunderstanding',
      'Value clash',
      'Competing goals'
    ],
    tips: [
      'Make it substantial enough to sustain the story',
      'Connect to character wounds',
      'Should feel insurmountable (at first)',
      'Plants seeds for the black moment'
    ]
  },
  {
    id: 'first_touch',
    name: 'First Significant Touch',
    description: 'The first meaningful physical contact beyond casual interaction.',
    typicalPlacement: '20-35%',
    required: false,
    emotionalFunction: 'Physical intimacy begins, even chastely. Electric moment for readers.',
    variations: [
      'Accidental touch with spark',
      'Protective gesture',
      'Comfort touch (during emotional moment)',
      'Playful touch',
      'Hand holding'
    ],
    tips: [
      'Heighten with sensory details',
      'Show physical reaction (racing heart, breath catch)',
      'Can be brief but powerful',
      'Creates anticipation for more'
    ]
  },
  {
    id: 'first_kiss',
    name: 'First Kiss',
    description: 'The first romantic kiss between the leads.',
    typicalPlacement: '30-50% (varies by heat level)',
    required: true,
    emotionalFunction: 'Major milestone. Confirms romantic feelings are mutual and physical.',
    variations: [
      'Passionate, can\'t-help-it kiss',
      'Tender, sweet kiss',
      'Interrupted kiss (builds tension)',
      'Unexpected kiss',
      'Kiss they immediately regret (temporarily)'
    ],
    tips: [
      'Build anticipation beforehand',
      'Use all senses, not just physical',
      'Show emotional impact after',
      'Often followed by retreat or complication'
    ]
  },
  {
    id: 'first_intimacy',
    name: 'First Intimate Scene',
    description: 'The first sexual or deeply intimate moment (level depends on heat rating).',
    typicalPlacement: '40-60% (highly variable)',
    required: false,
    emotionalFunction: 'Deepens connection. For higher heat levels, major payoff moment.',
    variations: [
      'Full intimate scene (heat level 3-5)',
      'Fade to black (heat level 2)',
      'Implied/morning after (heat level 1-2)',
      'Emotional intimacy in lieu of physical (level 1)'
    ],
    tips: [
      'Match your heat level consistently',
      'Focus on emotion, not just mechanics',
      'Should change the relationship dynamic',
      'Often followed by vulnerability or retreat'
    ]
  },
  {
    id: 'black_moment',
    name: 'Black Moment',
    description: 'The darkest point where the relationship seems impossible. All is lost.',
    typicalPlacement: '75-85%',
    required: true,
    emotionalFunction: 'Maximum tension. Reader must feel the relationship might actually fail.',
    variations: [
      'Breakup (temporary)',
      'Major betrayal revealed',
      'External forces separate them',
      'Character reverts to old wounds',
      'Sacrifice seems necessary'
    ],
    tips: [
      'Must feel earned by earlier conflicts',
      'Reader should feel genuine despair',
      'Often linked to character wound/flaw',
      'This is what the grand gesture must overcome'
    ]
  },
  {
    id: 'grand_gesture',
    name: 'Grand Gesture',
    description: 'A significant action (often public) to win back the love interest.',
    typicalPlacement: '85-95%',
    required: false,
    emotionalFunction: 'Cathartic payoff. Shows character growth and commitment.',
    variations: [
      'Public declaration',
      'Sacrifice of something important',
      'Overcoming fear publicly',
      'Racing to catch them',
      'Quiet, meaningful gesture'
    ],
    tips: [
      'Must address the core conflict',
      'Shows character has grown/changed',
      'Doesn\'t always need to be big - can be perfectly pitched to the character',
      'Reader should feel satisfaction'
    ]
  },
  {
    id: 'declaration',
    name: 'Declaration of Love',
    description: 'The explicit "I love you" moment between the leads.',
    typicalPlacement: '85-95%',
    required: true,
    emotionalFunction: 'The words readers have been waiting for. Major emotional payoff.',
    variations: [
      'Direct "I love you"',
      'Shown through actions',
      'Admission of feelings without exact words',
      'Mutual simultaneous declaration',
      'One then the other'
    ],
    tips: [
      'Build to this - don\'t rush it',
      'Make it emotionally resonant',
      'Should feel earned by everything before',
      'Often pairs with grand gesture'
    ]
  },
  {
    id: 'commitment',
    name: 'Commitment',
    description: 'Clear indication the couple is committed to a future together.',
    typicalPlacement: '90-100%',
    required: true,
    emotionalFunction: 'Reassures reader the relationship will last.',
    variations: [
      'Proposal/engagement',
      'Moving in together',
      'Planning future together',
      'Public acknowledgment of relationship',
      'Overcoming final obstacle as a team'
    ],
    tips: [
      'Level of commitment should match heat/tone',
      'Can be grand or quiet',
      'Should address reader concerns about longevity',
      'Sets up the HEA/HFN'
    ]
  },
  {
    id: 'hea_hfn',
    name: 'HEA/HFN Ending',
    description: 'Happily Ever After or Happy For Now conclusion.',
    typicalPlacement: 'Final chapter/epilogue',
    required: true,
    emotionalFunction: 'The promise of the romance genre. Readers MUST have this.',
    variations: [
      'HEA - Definitive happy ending (marriage, forever commitment)',
      'HFN - Happy for now, relationship continuing positively',
      'Epilogue flash-forward',
      'Wedding/ceremony scene',
      'Domestic bliss glimpse'
    ],
    tips: [
      'This is NON-NEGOTIABLE in romance',
      'Match the tone of your story',
      'Epilogues are beloved by romance readers',
      'Show the couple\'s happy future'
    ]
  }
];

export const BEAT_PLACEMENT_GUIDE = {
  actOne: ['meet_cute', 'first_attraction', 'first_conflict'],
  actTwo: ['first_touch', 'first_kiss', 'first_intimacy'],
  actThree: ['black_moment', 'grand_gesture', 'declaration', 'commitment', 'hea_hfn']
} as const;

// Quick reference for validation
export const REQUIRED_ROMANCE_BEATS = ROMANCE_BEATS
  .filter(beat => beat.required)
  .map(beat => beat.id);
