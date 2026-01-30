// Science Fiction Hardness Classification
// Helps set reader expectations for scientific rigour

export interface HardnessLevel {
  id: string;
  name: string;
  description: string;
  readerExpectation: string;
  exampleAuthors: string[];
  techExplanation: string;
}

export const SCIFI_HARDNESS_LEVELS: HardnessLevel[] = [
  {
    id: 'hard',
    name: 'Hard SF',
    description: 'Rigorous scientific accuracy. Technology follows known physics.',
    readerExpectation: 'Readers expect real science. Will fact-check you.',
    exampleAuthors: ['Andy Weir', 'Kim Stanley Robinson', 'Greg Egan', 'Peter Watts'],
    techExplanation: 'Detailed explanations expected. Science is often central to plot.'
  },
  {
    id: 'firm',
    name: 'Firm SF',
    description: 'Generally plausible with some handwaving. One or two impossibilities allowed.',
    readerExpectation: 'Readers accept FTL or similar but expect internal consistency.',
    exampleAuthors: ['Alastair Reynolds', 'James S.A. Corey', 'Vernor Vinge'],
    techExplanation: 'Moderate explanation. Handwaved tech should be consistent.'
  },
  {
    id: 'medium',
    name: 'Medium SF',
    description: 'Balance of science and speculation. Technology serves the story.',
    readerExpectation: 'Readers want plausibility, not physics lectures.',
    exampleAuthors: ['Becky Chambers', 'Ann Leckie', 'Martha Wells'],
    techExplanation: 'Light touch. Explain what matters, handwave the rest.'
  },
  {
    id: 'soft',
    name: 'Soft SF',
    description: 'Science as backdrop. Focus on characters, society, or philosophy.',
    readerExpectation: 'Readers here for story, not science. Consistency matters more than accuracy.',
    exampleAuthors: ['Ursula K. Le Guin', 'Octavia Butler', 'Ray Bradbury'],
    techExplanation: 'Minimal. Technology is a given, not explained.'
  },
  {
    id: 'science_fantasy',
    name: 'Science Fantasy',
    description: 'Science-flavoured fantasy. Magic with a tech aesthetic.',
    readerExpectation: 'Readers expect spectacle and wonder, not realism.',
    exampleAuthors: ['Frank Herbert (Dune)', 'Star Wars novelists', 'Warhammer 40K authors'],
    techExplanation: 'None required. Mysticism and technology blend.'
  }
];

export interface TechExplanationDepth {
  id: string;
  name: string;
  description: string;
  wordBudget: string;
}

export const TECH_EXPLANATION_DEPTHS: TechExplanationDepth[] = [
  {
    id: 'detailed',
    name: 'Detailed',
    description: 'Full explanations of how technology works. Equations acceptable.',
    wordBudget: 'Up to 500+ words for major tech, ongoing references'
  },
  {
    id: 'moderate',
    name: 'Moderate',
    description: 'Explain core concepts, skip implementation details.',
    wordBudget: '100-200 words for major tech, brief references'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Just enough to understand the story. Effects over mechanisms.',
    wordBudget: '1-2 sentences for major tech, implied for rest'
  },
  {
    id: 'none',
    name: 'None',
    description: 'Technology just works. No explanation offered or expected.',
    wordBudget: 'Zero. Tech is background furniture.'
  }
];

export interface SpeculativeElement {
  category: string;
  elements: string[];
}

export const COMMON_SPECULATIVE_ELEMENTS: SpeculativeElement[] = [
  {
    category: 'Space Travel',
    elements: [
      'FTL travel (warp, hyperspace, wormholes)',
      'Generation ships (no FTL)',
      'Solar system colonisation',
      'Interstellar without FTL (relativistic)',
      'Teleportation/matter transmission'
    ]
  },
  {
    category: 'Artificial Intelligence',
    elements: [
      'Artificial General Intelligence (AGI)',
      'Artificial Superintelligence (ASI)',
      'AI assistants/companions',
      'Uploaded consciousness',
      'Hive minds',
      'Robot servants'
    ]
  },
  {
    category: 'Biotechnology',
    elements: [
      'Genetic engineering',
      'Life extension/immortality',
      'Cloning (human)',
      'Designer organisms',
      'Biological computers',
      'Pandemic/bioweapons'
    ]
  },
  {
    category: 'Cybernetics',
    elements: [
      'Brain-computer interfaces',
      'Cybernetic enhancement',
      'Full body prosthetics',
      'Virtual reality immersion',
      'Memory modification',
      'Consciousness transfer'
    ]
  },
  {
    category: 'Energy & Physics',
    elements: [
      'Fusion power',
      'Antimatter',
      'Zero-point energy',
      'Dyson spheres/swarms',
      'Gravity manipulation',
      'Force fields'
    ]
  },
  {
    category: 'Alien Life',
    elements: [
      'First contact',
      'Alien civilisations',
      'Ancient aliens/precursors',
      'Alien ecosystems',
      'Hive species',
      'Machine intelligences (alien)'
    ]
  },
  {
    category: 'Time',
    elements: [
      'Time travel',
      'Alternate timelines',
      'Time dilation',
      'Precognition',
      'Stasis/suspended animation'
    ]
  },
  {
    category: 'Society',
    elements: [
      'Post-scarcity economy',
      'Totalitarian government',
      'Corporate dominance',
      'Anarchist society',
      'Hive society',
      'Transhumanist culture'
    ]
  }
];

export const SCIFI_SUBGENRE_HARDNESS_DEFAULTS: Record<string, string> = {
  'Hard SF': 'hard',
  'Space Opera': 'firm',
  'Cyberpunk': 'medium',
  'Dystopian': 'soft',
  'Post-Apocalyptic': 'soft',
  'First Contact': 'firm',
  'Military SF': 'firm',
  'Near Future': 'hard',
  'Far Future': 'medium',
  'Biopunk': 'medium'
};
