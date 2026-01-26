/**
 * Published Author Style Library
 *
 * A curated collection of famous author writing styles that can be
 * used as references for AI-assisted novel generation.
 *
 * Note: These are stylistic descriptions, not copyrighted content.
 * The AI uses these to emulate writing characteristics, not to copy text.
 */

export interface AuthorStyle {
  id: string;
  name: string;
  fullName: string;
  era: string;
  nationality: string;
  knownFor: string[];
  genres: string[];
  styleDescription: string;
  characteristics: {
    sentenceStyle: 'short' | 'medium' | 'long' | 'varied';
    vocabularyLevel: 'simple' | 'moderate' | 'complex' | 'literary';
    narrativeVoice: 'close' | 'distant' | 'omniscient' | 'intimate';
    toneSignature: string[];
    pacing: 'fast' | 'moderate' | 'slow' | 'deliberate' | 'varied';
    dialogueStyle: string;
    descriptiveApproach: string;
  };
  sampleDescription: string;
  bestFor: string[];
  icon: string;
}

export const AUTHOR_STYLES: AuthorStyle[] = [
  // Literary Fiction
  {
    id: 'hemingway',
    name: 'Hemingway',
    fullName: 'Ernest Hemingway',
    era: '20th Century',
    nationality: 'American',
    knownFor: ['The Old Man and the Sea', 'A Farewell to Arms', 'For Whom the Bell Tolls'],
    genres: ['literary', 'contemporary', 'historical'],
    styleDescription: 'Sparse, economical prose with minimal adjectives. Short, declarative sentences. Iceberg theory - meaning beneath the surface.',
    characteristics: {
      sentenceStyle: 'short',
      vocabularyLevel: 'simple',
      narrativeVoice: 'close',
      toneSignature: ['stoic', 'understated', 'masculine'],
      pacing: 'deliberate',
      dialogueStyle: 'Clipped, realistic dialogue with minimal tags',
      descriptiveApproach: 'Minimal but precise physical details',
    },
    sampleDescription: 'The man sat at the bar. He ordered a drink. The bartender poured. Outside, it rained.',
    bestFor: ['Action-focused stories', 'War narratives', 'Character studies', 'Literary minimalism'],
    icon: '🎣',
  },
  {
    id: 'austen',
    name: 'Austen',
    fullName: 'Jane Austen',
    era: 'Regency',
    nationality: 'British',
    knownFor: ['Pride and Prejudice', 'Emma', 'Sense and Sensibility'],
    genres: ['romance', 'historical', 'literary'],
    styleDescription: 'Witty, ironic narrative voice with social commentary. Elegant prose with keen psychological insight.',
    characteristics: {
      sentenceStyle: 'long',
      vocabularyLevel: 'literary',
      narrativeVoice: 'omniscient',
      toneSignature: ['ironic', 'witty', 'observant'],
      pacing: 'moderate',
      dialogueStyle: 'Formal, mannered speech revealing character',
      descriptiveApproach: 'Social observations and internal thoughts',
    },
    sampleDescription: 'It is a truth universally acknowledged that narrative wit paired with social observation creates enduring fiction.',
    bestFor: ['Regency romance', 'Social satire', 'Character-driven stories', 'Romantic comedy'],
    icon: '🎀',
  },
  {
    id: 'stephen-king',
    name: 'Stephen King',
    fullName: 'Stephen King',
    era: 'Contemporary',
    nationality: 'American',
    knownFor: ['The Shining', 'It', 'The Stand', 'Misery'],
    genres: ['horror', 'thriller', 'mystery', 'contemporary'],
    styleDescription: 'Accessible, conversational prose. Deep character development. Slow-burn tension building to intense climaxes.',
    characteristics: {
      sentenceStyle: 'varied',
      vocabularyLevel: 'moderate',
      narrativeVoice: 'close',
      toneSignature: ['intimate', 'suspenseful', 'nostalgic'],
      pacing: 'varied',
      dialogueStyle: 'Natural, colloquial speech patterns',
      descriptiveApproach: 'Rich sensory details, small-town Americana',
    },
    sampleDescription: 'Building dread through familiar settings and relatable characters facing extraordinary horrors.',
    bestFor: ['Horror novels', 'Supernatural thrillers', 'Coming-of-age stories', 'Small-town mysteries'],
    icon: '👻',
  },
  {
    id: 'tolkien',
    name: 'Tolkien',
    fullName: 'J.R.R. Tolkien',
    era: '20th Century',
    nationality: 'British',
    knownFor: ['The Lord of the Rings', 'The Hobbit', 'The Silmarillion'],
    genres: ['fantasy', 'literary'],
    styleDescription: 'Epic, mythic prose with detailed world-building. Archaic language patterns. Rich descriptions of landscape and lore.',
    characteristics: {
      sentenceStyle: 'long',
      vocabularyLevel: 'literary',
      narrativeVoice: 'omniscient',
      toneSignature: ['epic', 'nostalgic', 'mythic'],
      pacing: 'slow',
      dialogueStyle: 'Formal, often archaic speech patterns',
      descriptiveApproach: 'Lavish landscape and historical descriptions',
    },
    sampleDescription: 'The mountains rose in majesty, their peaks shrouded in mists older than memory itself.',
    bestFor: ['Epic fantasy', 'World-building heavy stories', 'Quest narratives', 'Mythic fiction'],
    icon: '🧙',
  },
  {
    id: 'agatha-christie',
    name: 'Christie',
    fullName: 'Agatha Christie',
    era: 'Golden Age',
    nationality: 'British',
    knownFor: ['Murder on the Orient Express', 'And Then There Were None', 'The Murder of Roger Ackroyd'],
    genres: ['mystery', 'thriller'],
    styleDescription: 'Clean, efficient prose focused on puzzle construction. Fair-play clues. Surprising but logical revelations.',
    characteristics: {
      sentenceStyle: 'medium',
      vocabularyLevel: 'moderate',
      narrativeVoice: 'close',
      toneSignature: ['precise', 'observant', 'measured'],
      pacing: 'moderate',
      dialogueStyle: 'Revealing dialogue with hidden subtext',
      descriptiveApproach: 'Functional details that serve the mystery',
    },
    sampleDescription: 'Every detail observed serves a purpose; every conversation contains a clue.',
    bestFor: ['Whodunits', 'Cozy mysteries', 'Puzzle plots', 'Classic detective fiction'],
    icon: '🔍',
  },
  {
    id: 'george-rr-martin',
    name: 'G.R.R. Martin',
    fullName: 'George R.R. Martin',
    era: 'Contemporary',
    nationality: 'American',
    knownFor: ['A Song of Ice and Fire', 'A Game of Thrones'],
    genres: ['fantasy', 'grimdark'],
    styleDescription: 'Complex multi-POV narratives. Morally gray characters. Political intrigue. Shocking plot twists.',
    characteristics: {
      sentenceStyle: 'varied',
      vocabularyLevel: 'moderate',
      narrativeVoice: 'close',
      toneSignature: ['dark', 'political', 'unpredictable'],
      pacing: 'deliberate',
      dialogueStyle: 'Scheming, layered conversations',
      descriptiveApproach: 'Rich feasts, brutal battles, political machinations',
    },
    sampleDescription: 'Power lies where men believe it lies. And men believe in many things.',
    bestFor: ['Political fantasy', 'Multi-POV epics', 'Grimdark', 'Intrigue-heavy plots'],
    icon: '🐉',
  },
  {
    id: 'nora-roberts',
    name: 'Nora Roberts',
    fullName: 'Nora Roberts',
    era: 'Contemporary',
    nationality: 'American',
    knownFor: ['The Bride Quartet', 'In Death series', 'Circle Trilogy'],
    genres: ['romance', 'paranormal', 'mystery'],
    styleDescription: 'Emotional, character-driven romance with strong female protagonists. Vivid settings. Satisfying HEAs.',
    characteristics: {
      sentenceStyle: 'varied',
      vocabularyLevel: 'moderate',
      narrativeVoice: 'close',
      toneSignature: ['emotional', 'sensual', 'optimistic'],
      pacing: 'moderate',
      dialogueStyle: 'Witty banter and emotional exchanges',
      descriptiveApproach: 'Sensory details enhancing romantic atmosphere',
    },
    sampleDescription: 'Love found through adversity, passion tempered with wit, happily ever after earned.',
    bestFor: ['Contemporary romance', 'Romantic suspense', 'Strong heroines', 'Series romance'],
    icon: '💕',
  },
  {
    id: 'neil-gaiman',
    name: 'Gaiman',
    fullName: 'Neil Gaiman',
    era: 'Contemporary',
    nationality: 'British',
    knownFor: ['American Gods', 'Neverwhere', 'Good Omens', 'Coraline'],
    genres: ['fantasy', 'horror', 'literary'],
    styleDescription: 'Mythic storytelling with modern sensibilities. Lyrical prose. Dark whimsy and unexpected beauty.',
    characteristics: {
      sentenceStyle: 'varied',
      vocabularyLevel: 'literary',
      narrativeVoice: 'intimate',
      toneSignature: ['whimsical', 'dark', 'mythic'],
      pacing: 'varied',
      dialogueStyle: 'Quirky, memorable character voices',
      descriptiveApproach: 'Poetic imagery mixing mundane and magical',
    },
    sampleDescription: 'Finding magic in shadows, wonder in the ordinary, myths walking among us.',
    bestFor: ['Urban fantasy', 'Fairy tale retellings', 'Dark fantasy', 'Mythic fiction'],
    icon: '🌙',
  },
  {
    id: 'brandon-sanderson',
    name: 'Sanderson',
    fullName: 'Brandon Sanderson',
    era: 'Contemporary',
    nationality: 'American',
    knownFor: ['Mistborn', 'The Stormlight Archive', 'Elantris'],
    genres: ['fantasy', 'science-fiction'],
    styleDescription: 'Clear, efficient prose. Intricate magic systems. Escalating action. Satisfying plot reveals (Sanderson Avalanche).',
    characteristics: {
      sentenceStyle: 'medium',
      vocabularyLevel: 'moderate',
      narrativeVoice: 'close',
      toneSignature: ['epic', 'hopeful', 'systematic'],
      pacing: 'fast',
      dialogueStyle: 'Character-specific voices, often witty',
      descriptiveApproach: 'Clear action sequences and magic system details',
    },
    sampleDescription: 'Magic with rules, heroes with flaws, climaxes that pay off every setup.',
    bestFor: ['Hard magic fantasy', 'Epic fantasy', 'Action-heavy plots', 'Series worldbuilding'],
    icon: '⚔️',
  },
  {
    id: 'ursula-le-guin',
    name: 'Le Guin',
    fullName: 'Ursula K. Le Guin',
    era: '20th Century',
    nationality: 'American',
    knownFor: ['A Wizard of Earthsea', 'The Left Hand of Darkness', 'The Dispossessed'],
    genres: ['fantasy', 'science-fiction', 'literary'],
    styleDescription: 'Thoughtful, philosophical prose. Anthropological world-building. Questions of identity and society.',
    characteristics: {
      sentenceStyle: 'varied',
      vocabularyLevel: 'literary',
      narrativeVoice: 'omniscient',
      toneSignature: ['thoughtful', 'philosophical', 'humane'],
      pacing: 'deliberate',
      dialogueStyle: 'Meaningful exchanges exploring ideas',
      descriptiveApproach: 'Cultural and environmental world-building',
    },
    sampleDescription: 'Stories that ask questions rather than provide answers, exploring what it means to be human.',
    bestFor: ['Philosophical SF', 'Literary fantasy', 'Thought experiments', 'Cultural exploration'],
    icon: '🌍',
  },
  {
    id: 'james-patterson',
    name: 'Patterson',
    fullName: 'James Patterson',
    era: 'Contemporary',
    nationality: 'American',
    knownFor: ['Alex Cross series', "Women's Murder Club", 'Maximum Ride'],
    genres: ['thriller', 'mystery'],
    styleDescription: 'Ultra-short chapters. Fast-paced, cinematic prose. Cliffhanger endings. Page-turner structure.',
    characteristics: {
      sentenceStyle: 'short',
      vocabularyLevel: 'simple',
      narrativeVoice: 'close',
      toneSignature: ['urgent', 'suspenseful', 'cinematic'],
      pacing: 'fast',
      dialogueStyle: 'Punchy, action-oriented exchanges',
      descriptiveApproach: 'Minimal, functional, action-focused',
    },
    sampleDescription: "Short chapters. Quick reads. Can't put it down. What happens next?",
    bestFor: ['Fast-paced thrillers', 'Commercial fiction', 'Page-turners', 'Serial killer plots'],
    icon: '⚡',
  },
  {
    id: 'colleen-hoover',
    name: 'Hoover',
    fullName: 'Colleen Hoover',
    era: 'Contemporary',
    nationality: 'American',
    knownFor: ['It Ends with Us', 'Verity', 'Ugly Love'],
    genres: ['romance', 'contemporary', 'thriller'],
    styleDescription: 'Emotionally intense, first-person narratives. Raw, vulnerable protagonists. Gut-punch twists.',
    characteristics: {
      sentenceStyle: 'varied',
      vocabularyLevel: 'simple',
      narrativeVoice: 'intimate',
      toneSignature: ['emotional', 'raw', 'intense'],
      pacing: 'moderate',
      dialogueStyle: 'Authentic, emotionally charged conversations',
      descriptiveApproach: 'Emotion-forward sensory details',
    },
    sampleDescription: 'Hearts breaking on the page, characters you root for through their worst moments.',
    bestFor: ['Emotional romance', 'New Adult', 'Domestic drama', 'Romantic suspense'],
    icon: '💔',
  },
  {
    id: 'sarah-j-maas',
    name: 'S.J. Maas',
    fullName: 'Sarah J. Maas',
    era: 'Contemporary',
    nationality: 'American',
    knownFor: ['A Court of Thorns and Roses', 'Throne of Glass', 'Crescent City'],
    genres: ['romantasy', 'fantasy', 'romance'],
    styleDescription: 'Lush, sensual prose. Enemies-to-lovers dynamics. Strong female protagonists. Intricate fae worlds.',
    characteristics: {
      sentenceStyle: 'varied',
      vocabularyLevel: 'moderate',
      narrativeVoice: 'close',
      toneSignature: ['sensual', 'dramatic', 'empowering'],
      pacing: 'varied',
      dialogueStyle: 'Charged banter, emotional declarations',
      descriptiveApproach: 'Sumptuous settings and physical tension',
    },
    sampleDescription: 'Courts of magic and desire, where love is as dangerous as any battlefield.',
    bestFor: ['Romantasy', 'Fae romance', 'YA-to-Adult crossover', 'Enemies-to-lovers'],
    icon: '✨',
  },
  {
    id: 'andy-weir',
    name: 'Andy Weir',
    fullName: 'Andy Weir',
    era: 'Contemporary',
    nationality: 'American',
    knownFor: ['The Martian', 'Project Hail Mary', 'Artemis'],
    genres: ['science-fiction'],
    styleDescription: 'Hard SF with humor. Problem-solving narratives. Technical accuracy with accessible explanation.',
    characteristics: {
      sentenceStyle: 'medium',
      vocabularyLevel: 'moderate',
      narrativeVoice: 'close',
      toneSignature: ['humorous', 'technical', 'optimistic'],
      pacing: 'fast',
      dialogueStyle: 'Witty, self-deprecating narrator voice',
      descriptiveApproach: 'Technical details explained engagingly',
    },
    sampleDescription: 'Science problems solved with wit, duct tape, and an irrepressible will to survive.',
    bestFor: ['Hard science fiction', 'Survival stories', 'STEM-focused plots', 'Optimistic SF'],
    icon: '🚀',
  },
  {
    id: 'tamsyn-muir',
    name: 'Tamsyn Muir',
    fullName: 'Tamsyn Muir',
    era: 'Contemporary',
    nationality: 'New Zealand',
    knownFor: ['Gideon the Ninth', 'The Locked Tomb series'],
    genres: ['fantasy', 'science-fiction', 'horror'],
    styleDescription: 'Dense, allusive prose. Dark humor amid horror. Genre-blending. Unreliable narrators.',
    characteristics: {
      sentenceStyle: 'varied',
      vocabularyLevel: 'complex',
      narrativeVoice: 'intimate',
      toneSignature: ['irreverent', 'gothic', 'clever'],
      pacing: 'varied',
      dialogueStyle: 'Sardonic, reference-laden exchanges',
      descriptiveApproach: 'Gothic imagery with modern sensibility',
    },
    sampleDescription: 'Necromancers trading quips in bone palaces, grief and humor intertwined.',
    bestFor: ['Gothic fantasy', 'Genre-blending', 'Sapphic romance', 'Dark humor'],
    icon: '💀',
  },
];

// Group authors by genre for easy filtering
export const AUTHORS_BY_GENRE: Record<string, string[]> = {
  'fantasy': ['tolkien', 'neil-gaiman', 'brandon-sanderson', 'ursula-le-guin', 'sarah-j-maas', 'george-rr-martin', 'tamsyn-muir'],
  'science-fiction': ['andy-weir', 'ursula-le-guin', 'brandon-sanderson', 'tamsyn-muir'],
  'romance': ['austen', 'nora-roberts', 'colleen-hoover', 'sarah-j-maas'],
  'mystery': ['agatha-christie', 'james-patterson'],
  'thriller': ['stephen-king', 'james-patterson', 'agatha-christie', 'colleen-hoover'],
  'horror': ['stephen-king', 'neil-gaiman', 'tamsyn-muir'],
  'literary': ['hemingway', 'austen', 'ursula-le-guin', 'neil-gaiman', 'tolkien'],
  'historical': ['hemingway', 'austen'],
  'contemporary': ['stephen-king', 'nora-roberts', 'colleen-hoover', 'james-patterson'],
  'grimdark': ['george-rr-martin'],
  'romantasy': ['sarah-j-maas'],
};

// Get recommended authors for a set of genres
export function getRecommendedAuthors(genres: string[]): AuthorStyle[] {
  const authorIds = new Set<string>();
  genres.forEach(genre => {
    const authors = AUTHORS_BY_GENRE[genre] || [];
    authors.forEach(id => authorIds.add(id));
  });
  return AUTHOR_STYLES.filter(a => authorIds.has(a.id));
}

// Get author by ID
export function getAuthorById(id: string): AuthorStyle | undefined {
  return AUTHOR_STYLES.find(a => a.id === id);
}
