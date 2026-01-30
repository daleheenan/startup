// Thriller Pacing System
// Controls tension, hooks, and page-turner mechanics

export interface PacingStyle {
  id: string;
  name: string;
  description: string;
  tensionCurve: string;
  chapterLength: string;
  bestFor: string[];
}

export const THRILLER_PACING_STYLES: PacingStyle[] = [
  {
    id: 'relentless',
    name: 'Relentless',
    description: 'Non-stop action with minimal breathers. Reader barely catches breath.',
    tensionCurve: 'Constant high tension (8-10) with brief dips to 6-7',
    chapterLength: 'Short chapters (1,500-2,500 words) for rapid page turning',
    bestFor: ['Action Thriller', 'Chase narratives', 'Time-pressure plots', '24-style storytelling']
  },
  {
    id: 'escalating',
    name: 'Escalating',
    description: 'Steady build from moderate to explosive. Classic thriller structure.',
    tensionCurve: 'Starts at 4-5, builds steadily to 9-10 at climax',
    chapterLength: 'Standard chapters (3,000-4,000 words) that shorten as tension rises',
    bestFor: ['Conspiracy Thriller', 'Investigation narratives', 'Most mainstream thrillers']
  },
  {
    id: 'rollercoaster',
    name: 'Rollercoaster',
    description: 'Alternating peaks and valleys. High tension followed by breathers.',
    tensionCurve: 'Oscillates between 3-4 (valleys) and 8-9 (peaks)',
    chapterLength: 'Variable chapter length to match tension level',
    bestFor: ['Psychological Thriller', 'Character-driven thriller', 'Complex plots']
  },
  {
    id: 'slow_burn',
    name: 'Slow Burn',
    description: 'Gradual tension building to massive payoff. Dread accumulates.',
    tensionCurve: 'Low start (2-3), very gradual build, explosive finale (10)',
    chapterLength: 'Longer chapters (4,000-5,000 words) initially, shorter at end',
    bestFor: ['Literary Thriller', 'Atmospheric thriller', 'Horror-thriller hybrids']
  }
];

export interface ChapterHookType {
  id: string;
  name: string;
  description: string;
  tensionImpact: 'high' | 'medium' | 'low';
  examples: string[];
  bestFollowedBy: string[];
}

export const CHAPTER_HOOK_TYPES: ChapterHookType[] = [
  {
    id: 'cliffhanger',
    name: 'Cliffhanger',
    description: 'End mid-action or mid-crisis. The classic page-turner.',
    tensionImpact: 'high',
    examples: [
      'Gunshot rings out as chapter ends',
      'Character opens door to find...',
      'Phone rings with the call they dreaded'
    ],
    bestFollowedBy: ['Immediate resolution', 'Cut to different POV (increases tension)']
  },
  {
    id: 'revelation',
    name: 'Revelation',
    description: 'Shocking information revealed in final lines.',
    tensionImpact: 'high',
    examples: [
      'Discovery of the body',
      'Realisation the ally is the enemy',
      'Finding evidence that changes everything'
    ],
    bestFollowedBy: ['Character reaction', 'Implications explored']
  },
  {
    id: 'question',
    name: 'Compelling Question',
    description: 'Raise a question the reader desperately wants answered.',
    tensionImpact: 'medium',
    examples: [
      'Who sent the mysterious message?',
      'What did the dying victim mean?',
      'Where does this evidence lead?'
    ],
    bestFollowedBy: ['Investigation', 'Red herring', 'Partial answer']
  },
  {
    id: 'threat',
    name: 'New Threat',
    description: 'Introduce a new danger or complication.',
    tensionImpact: 'high',
    examples: [
      'A new player enters the game',
      'The villain escalates',
      'Unexpected obstacle appears'
    ],
    bestFollowedBy: ['Character response', 'Stakes raising']
  },
  {
    id: 'betrayal',
    name: 'Betrayal',
    description: 'Trust broken, loyalty questioned.',
    tensionImpact: 'high',
    examples: [
      'Ally revealed as traitor',
      'Information was deliberately false',
      'Character discovers they were used'
    ],
    bestFollowedBy: ['Confrontation', 'Escape', 'Recalculation']
  },
  {
    id: 'countdown',
    name: 'Countdown Established',
    description: 'Time pressure introduced or reminded.',
    tensionImpact: 'medium',
    examples: [
      'The bomb has 24 hours',
      'Victim has three days to live',
      'Deadline for ransom'
    ],
    bestFollowedBy: ['Race against time', 'Failed attempt', 'New complications']
  },
  {
    id: 'mystery_deepens',
    name: 'Mystery Deepens',
    description: 'What seemed simple becomes far more complex.',
    tensionImpact: 'medium',
    examples: [
      'Evidence points to conspiracy',
      'Pattern reveals serial killer',
      'Simple crime connects to larger plot'
    ],
    bestFollowedBy: ['Investigation', 'Danger escalation']
  },
  {
    id: 'reversal',
    name: 'Reversal',
    description: 'Situation completely inverts expectations.',
    tensionImpact: 'high',
    examples: [
      'Hunter becomes the hunted',
      'Safe house is compromised',
      'Victory turns to defeat'
    ],
    bestFollowedBy: ['Survival mode', 'New strategy', 'Retreat and regroup']
  },
  {
    id: 'emotional_gut_punch',
    name: 'Emotional Gut Punch',
    description: 'Devastating emotional moment.',
    tensionImpact: 'medium',
    examples: [
      'Loss of ally or loved one',
      'Devastating news received',
      'Moral line crossed'
    ],
    bestFollowedBy: ['Processing', 'Motivation renewal', 'Changed approach']
  },
  {
    id: 'foreshadowing',
    name: 'Ominous Foreshadowing',
    description: 'Subtle hint of worse to come.',
    tensionImpact: 'low',
    examples: [
      'Something feels wrong but character can\'t identify it',
      'Background detail reader notices',
      'Casual mention that gains significance later'
    ],
    bestFollowedBy: ['Normal activity (contrast)', 'Gradual revelation']
  }
];

export interface TwistType {
  id: string;
  name: string;
  description: string;
  impactLevel: 'low' | 'medium' | 'high' | 'extreme';
  setupRequired: string;
  commonMistakes: string[];
}

export const THRILLER_TWIST_TYPES: TwistType[] = [
  {
    id: 'major_reveal',
    name: 'Major Revelation',
    description: 'Game-changing information that recontextualises everything.',
    impactLevel: 'extreme',
    setupRequired: 'Extensive foreshadowing, planted clues reader can verify on reread',
    commonMistakes: ['No setup (feels cheap)', 'Too obvious', 'Contradicts established facts']
  },
  {
    id: 'minor_reveal',
    name: 'Minor Revelation',
    description: 'Important information that advances plot but doesn\'t reshape story.',
    impactLevel: 'medium',
    setupRequired: 'Some setup, natural progression of investigation',
    commonMistakes: ['Treated as bigger than it is', 'Overly telegraphed']
  },
  {
    id: 'red_herring',
    name: 'Red Herring',
    description: 'Deliberate misdirection that is later revealed as false.',
    impactLevel: 'medium',
    setupRequired: 'Must be plausible enough to deceive, fair play clues it\'s wrong',
    commonMistakes: ['Too obvious', 'Never resolved', 'Feels like cheating']
  },
  {
    id: 'false_victory',
    name: 'False Victory',
    description: 'Apparent success that turns to failure.',
    impactLevel: 'high',
    setupRequired: 'Victory must feel genuine, failure must be logical consequence',
    commonMistakes: ['Victory too brief', 'Failure arbitrary', 'Used too often']
  },
  {
    id: 'betrayal',
    name: 'Character Betrayal',
    description: 'Trusted character revealed as enemy.',
    impactLevel: 'high',
    setupRequired: 'Character must be established and trusted, hints in hindsight',
    commonMistakes: ['Character wasn\'t established enough', 'Motivation unclear', 'No foreshadowing']
  },
  {
    id: 'hidden_identity',
    name: 'Hidden Identity',
    description: 'Character\'s true identity revealed.',
    impactLevel: 'high',
    setupRequired: 'Identity must make sense, explains earlier oddities',
    commonMistakes: ['Physically impossible', 'Doesn\'t explain enough', 'Too predictable']
  },
  {
    id: 'plot_reversal',
    name: 'Complete Reversal',
    description: 'Situation inverts entirely.',
    impactLevel: 'extreme',
    setupRequired: 'Mechanics of reversal must be in place, reader can verify',
    commonMistakes: ['Comes from nowhere', 'Too convenient', 'Negates previous progress']
  },
  {
    id: 'unreliable_info',
    name: 'Information Revealed False',
    description: 'What characters (and readers) believed is proven wrong.',
    impactLevel: 'medium',
    setupRequired: 'Source of false info established, truth must be discoverable',
    commonMistakes: ['Feels like author cheating', 'No way reader could have known']
  },
  {
    id: 'connection_reveal',
    name: 'Hidden Connection',
    description: 'Previously unrelated elements revealed to be connected.',
    impactLevel: 'medium',
    setupRequired: 'Both elements established, connection logical',
    commonMistakes: ['Connection arbitrary', 'Too convoluted', 'Doesn\'t add anything']
  },
  {
    id: 'stakes_escalation',
    name: 'Stakes Escalation',
    description: 'Stakes suddenly revealed to be much higher.',
    impactLevel: 'high',
    setupRequired: 'Higher stakes must be plausible extension of established situation',
    commonMistakes: ['Feels tacked on', 'Previous stakes now trivial', 'Escalation arbitrary']
  }
];

export interface TickingClockType {
  id: string;
  name: string;
  description: string;
  tensionStyle: string;
  examples: string[];
}

export const TICKING_CLOCK_TYPES: TickingClockType[] = [
  {
    id: 'deadline',
    name: 'Hard Deadline',
    description: 'Specific time by which something must be achieved.',
    tensionStyle: 'Constant pressure with periodic reminders',
    examples: ['24 hours to find the bomb', 'Court date approaching', 'Ransom deadline']
  },
  {
    id: 'countdown',
    name: 'Visible Countdown',
    description: 'Reader and characters can see time running out.',
    tensionStyle: 'Escalating tension as numbers decrease',
    examples: ['Timer on explosive', 'Countdown to launch', 'Days until execution']
  },
  {
    id: 'racing',
    name: 'Racing Against Antagonist',
    description: 'Competition where enemy might get there first.',
    tensionStyle: 'Pressure from competitor progress',
    examples: ['Both seeking same evidence', 'Racing to witness', 'Competing for same goal']
  },
  {
    id: 'decay',
    name: 'Situation Decay',
    description: 'Things getting progressively worse over time.',
    tensionStyle: 'Mounting desperation as situation deteriorates',
    examples: ['Poison spreading', 'Public opinion turning', 'Evidence disappearing']
  },
  {
    id: 'opportunity',
    name: 'Closing Window',
    description: 'Opportunity that will disappear if not seized.',
    tensionStyle: 'Fear of missing the chance',
    examples: ['Witness leaving country', 'Target accessible for limited time', 'Weather window']
  },
  {
    id: 'survival',
    name: 'Survival Timer',
    description: 'Someone will die if not saved in time.',
    tensionStyle: 'Life-or-death urgency',
    examples: ['Kidnap victim running out of air', 'Injured person bleeding out', 'Hostage execution threat']
  }
];

export const CLIFFHANGER_FREQUENCY = [
  { value: 'every', label: 'Every Chapter', description: 'Maximum page-turner effect, relentless pacing' },
  { value: 'most', label: 'Most Chapters', description: 'Strong pacing with occasional breather chapters' },
  { value: 'some', label: 'Some Chapters', description: 'Key moments only, more varied rhythm' }
] as const;
