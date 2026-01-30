/**
 * Shared constants for genre preference form components
 * Contains genre definitions, modifiers, tones, themes, and recipes
 */

// Market trend indicators (2026 data)
export const MARKET_TRENDS: Record<string, 'trending' | 'rising' | 'stable'> = {
  'romantasy': 'trending',          // Extremely hot in 2024-2026
  'cozy-fantasy': 'trending',       // Major growth in 2025-2026
  'litrpg': 'rising',               // Steady growth, especially on Kindle Unlimited
  'climate-fiction': 'rising',      // Growing interest due to real-world events
  'afrofuturism': 'rising',         // Increasing representation and demand
  'grimdark': 'stable',             // Consistent fanbase
  'solarpunk': 'rising',            // Alternative to dystopian narratives
  'romance': 'trending',            // Romance dominates market share
  'fantasy': 'trending',            // Perennial bestseller
  'thriller': 'stable',             // Consistently popular
  'mystery': 'stable',              // Reliable genre
};

// Classic genres - traditional, well-established categories
export const CLASSIC_GENRES = [
  { value: 'fantasy', label: 'Fantasy', description: 'Magic, mythical creatures, epic quests in imagined worlds', trend: MARKET_TRENDS.fantasy },
  { value: 'science-fiction', label: 'Science Fiction', description: 'Future technology, space exploration, scientific speculation' },
  { value: 'romance', label: 'Romance', description: 'Love stories, emotional connection, relationship journeys', trend: MARKET_TRENDS.romance },
  { value: 'mystery', label: 'Mystery', description: 'Clues, investigation, puzzles to solve, whodunit revelations', trend: MARKET_TRENDS.mystery },
  { value: 'thriller', label: 'Thriller', description: 'Suspense, danger, high stakes, and pulse-pounding tension', trend: MARKET_TRENDS.thriller },
  { value: 'horror', label: 'Horror', description: 'Fear, terror, supernatural threats, and disturbing events' },
  { value: 'historical', label: 'Historical Fiction', description: 'Past eras brought to life, period detail, real historical events' },
  { value: 'literary', label: 'Literary Fiction', description: 'Character depth, beautiful prose, exploration of the human condition' },
  { value: 'contemporary', label: 'Contemporary Fiction', description: 'Modern-day settings, relatable issues, realistic characters' },
  { value: 'western', label: 'Western', description: 'Frontier life, cowboys, outlaws, and the American Old West' },
];

// Specialist genres - niche, emerging, or cross-genre categories
export const SPECIALIST_GENRES = [
  { value: 'romantasy', label: 'Romantasy', description: 'Fantasy with strong romantic subplot, often fae or magical courts', trend: MARKET_TRENDS.romantasy },
  { value: 'cozy-fantasy', label: 'Cozy Fantasy', description: 'Low stakes, comfort, slice-of-life in magical settings', trend: MARKET_TRENDS['cozy-fantasy'] },
  { value: 'grimdark', label: 'Grimdark', description: 'Morally grey characters, violence, cynicism, and bleak worldviews', trend: MARKET_TRENDS.grimdark },
  { value: 'litrpg', label: 'LitRPG / GameLit', description: 'Game mechanics, leveling systems, stats, and RPG-style progression', trend: MARKET_TRENDS.litrpg },
  { value: 'afrofuturism', label: 'Afrofuturism', description: 'African diaspora culture blended with sci-fi and fantasy elements', trend: MARKET_TRENDS.afrofuturism },
  { value: 'climate-fiction', label: 'Climate Fiction (Cli-Fi)', description: 'Climate change impacts, environmental disasters, ecological themes', trend: MARKET_TRENDS['climate-fiction'] },
  { value: 'solarpunk', label: 'Solarpunk', description: 'Optimistic futures, sustainable technology, eco-friendly societies', trend: MARKET_TRENDS.solarpunk },
  { value: 'steampunk', label: 'Steampunk', description: 'Victorian era aesthetics, steam-powered technology, industrial revolution' },
  { value: 'new-weird', label: 'New Weird', description: 'Surreal, transgressive, genre-blending with bizarre elements' },
  { value: 'paranormal', label: 'Paranormal', description: 'Ghosts, psychics, supernatural abilities in modern settings' },
  { value: 'wuxia', label: 'Wuxia / Xianxia', description: 'Chinese martial arts, cultivation, immortals, and Eastern fantasy' },
  { value: 'legal-drama', label: 'Legal Drama', description: 'Courtrooms, lawyers, legal battles, and justice system conflicts' },
  { value: 'medical-drama', label: 'Medical Drama', description: 'Hospitals, doctors, medical crises, and healthcare professionals' },
  { value: 'sports-fiction', label: 'Sports Fiction', description: 'Athletic competition, training, teamwork, and sports culture' },
];

// Combined for lookups
export const GENRES = [...CLASSIC_GENRES, ...SPECIALIST_GENRES];

export interface SubgenreOption {
  value: string;
  description: string;
}

export const SUBGENRES: Record<string, SubgenreOption[]> = {
  afrofuturism: [
    { value: 'Afrofuturist SF', description: 'African diaspora perspectives on future technology and society' },
    { value: 'Afrofuturist Fantasy', description: 'African mythology and magic in speculative settings' },
    { value: 'Afro-Cyberpunk', description: 'High-tech, low-life through an African lens' },
    { value: 'African Mythology SF', description: 'Traditional African gods and spirits in science fiction' },
    { value: 'Black Space Opera', description: 'Epic galactic adventures centering Black characters' },
    { value: 'Afrofuturist Horror', description: 'Horror drawing on African folklore and diaspora fears' },
  ],
  'climate-fiction': [
    { value: 'Near Future Climate', description: 'Climate change impacts in the next 20-50 years' },
    { value: 'Climate Disaster', description: 'Catastrophic weather events and their aftermath' },
    { value: 'Eco-Thriller', description: 'Environmental stakes with suspenseful pacing' },
    { value: 'Solarpunk Utopia', description: 'Optimistic sustainable futures achieved' },
    { value: 'Post-Climate Collapse', description: 'Survival after environmental catastrophe' },
    { value: 'Climate Mystery', description: 'Solving crimes or puzzles in a changed climate' },
  ],
  contemporary: [
    { value: 'Family Drama', description: 'Complex family relationships and generational dynamics' },
    { value: 'Coming of Age', description: 'Young protagonists navigating growth and identity' },
    { value: 'Social Issues', description: 'Stories addressing contemporary societal challenges' },
    { value: 'Workplace Drama', description: 'Office politics, career struggles, and professional life' },
    { value: 'Slice of Life', description: 'Everyday moments that reveal deeper truths' },
  ],
  'cozy-fantasy': [
    { value: 'Slice of Life Fantasy', description: 'Daily life in magical settings without major conflict' },
    { value: 'Cozy Mystery Fantasy', description: 'Low-stakes puzzles in warm, magical communities' },
    { value: 'Cozy Romance Fantasy', description: 'Sweet love stories in comfortable magical worlds' },
    { value: 'Low Stakes Adventure', description: 'Gentle quests without world-ending consequences' },
    { value: 'Found Family Fantasy', description: 'Building chosen families in magical settings' },
    { value: 'Cottage Core Fantasy', description: 'Rural, pastoral magic with simple pleasures' },
  ],
  fantasy: [
    { value: 'Epic Fantasy', description: 'World-spanning quests with multiple POVs and high stakes' },
    { value: 'Urban Fantasy', description: 'Magic hidden in modern cities and urban environments' },
    { value: 'Dark Fantasy', description: 'Grim settings where magic has terrible costs' },
    { value: 'High Fantasy', description: 'Secondary worlds with elaborate magic systems' },
    { value: 'Low Fantasy', description: 'Subtle magic in realistic or historical settings' },
    { value: 'Sword & Sorcery', description: 'Action-focused adventures with warriors and wizards' },
  ],
  grimdark: [
    { value: 'Grimdark Fantasy', description: 'Morally grey characters in brutal fantasy worlds' },
    { value: 'Grimdark Sci-Fi', description: 'Cynical, violent science fiction futures' },
    { value: 'Military Grimdark', description: 'The horrors of warfare without glorification' },
    { value: 'Cosmic Grimdark', description: 'Nihilistic horror at the scale of the universe' },
    { value: 'Historical Grimdark', description: 'Real history shown at its darkest' },
    { value: 'Post-Apocalyptic Grimdark', description: 'Humanity at its worst after collapse' },
  ],
  historical: [
    { value: 'Ancient History', description: 'Greece, Rome, Egypt, or other ancient civilisations' },
    { value: 'Medieval', description: 'Knights, castles, and feudal society' },
    { value: 'Victorian Era', description: '19th century manners, industry, and empire' },
    { value: 'World War Era', description: 'Stories set during WWI or WWII' },
    { value: '20th Century', description: 'Modern history from 1900-1999' },
    { value: 'Alternate History', description: 'What if key historical events went differently?' },
  ],
  horror: [
    { value: 'Supernatural Horror', description: 'Ghosts, demons, and things that go bump in the night' },
    { value: 'Psychological Horror', description: 'Terror from within the mind' },
    { value: 'Gothic Horror', description: 'Atmospheric dread in crumbling mansions and moors' },
    { value: 'Cosmic Horror', description: 'Incomprehensible entities and existential dread' },
    { value: 'Body Horror', description: 'Disturbing transformations of the human form' },
  ],
  'legal-drama': [
    { value: 'Courtroom Drama', description: 'Tension and revelation in the courtroom' },
    { value: 'Legal Thriller', description: 'High-stakes legal battles with suspense' },
    { value: 'Corporate Law', description: 'Business litigation, mergers, and corporate ethics' },
    { value: 'Criminal Defense', description: 'Defending the accused, moral dilemmas in justice' },
  ],
  'litrpg': [
    { value: 'Dungeon Crawling', description: 'Exploring dungeons, looting, and leveling up' },
    { value: 'Progression Fantasy', description: 'Power growth through levels, stats, and skills' },
    { value: 'Virtual Reality', description: 'Trapped or competing in game worlds' },
    { value: 'Cultivation', description: 'Eastern-inspired power progression and immortality' },
  ],
  literary: [
    { value: 'Character Study', description: 'Deep exploration of complex personalities' },
    { value: 'Stream of Consciousness', description: 'Inner monologue, experimental prose' },
    { value: 'Philosophical Fiction', description: 'Ideas and concepts explored through narrative' },
    { value: 'Magical Realism', description: 'Subtle fantastical elements in realistic settings' },
  ],
  'medical-drama': [
    { value: 'Emergency Medicine', description: 'Fast-paced life-or-death hospital scenarios' },
    { value: 'Surgical Drama', description: 'Operating rooms, complex procedures, and high stakes' },
    { value: 'Medical Mystery', description: 'Diagnosing rare diseases and solving medical puzzles' },
    { value: 'Medical Ethics', description: 'Moral dilemmas in healthcare and research' },
  ],
  mystery: [
    { value: 'Cozy Mystery', description: 'Amateur sleuths in charming settings, no graphic violence' },
    { value: 'Hardboiled Detective', description: 'Cynical investigators in gritty urban environments' },
    { value: 'Whodunit', description: 'Classic puzzle mysteries with red herrings and reveals' },
    { value: 'Police Procedural', description: 'Realistic investigation techniques and law enforcement' },
    { value: 'Locked Room', description: 'Impossible crimes in closed environments' },
  ],
  'new-weird': [
    { value: 'Weird Horror', description: 'Surreal, transgressive horror with bizarre elements' },
    { value: 'New Weird Fantasy', description: 'Genre-bending fantasy with surreal imagery' },
    { value: 'Slipstream', description: 'Reality-bending narratives that defy categorisation' },
  ],
  paranormal: [
    { value: 'Ghost Stories', description: 'Hauntings, spirits, and spectral encounters' },
    { value: 'Psychic Powers', description: 'Telepathy, telekinesis, and ESP abilities' },
    { value: 'Urban Paranormal', description: 'Supernatural elements in modern city settings' },
    { value: 'Paranormal Romance', description: 'Love stories with supernatural beings' },
  ],
  romance: [
    { value: 'Contemporary Romance', description: 'Modern-day love stories in relatable settings' },
    { value: 'Historical Romance', description: 'Love in bygone eras, period detail' },
    { value: 'Paranormal Romance', description: 'Romance with vampires, werewolves, or supernatural beings' },
    { value: 'Slow Burn', description: 'Gradual relationship development with delayed gratification' },
    { value: 'Enemies to Lovers', description: 'Antagonistic relationships transforming into love' },
    { value: 'Second Chance', description: 'Rekindling past relationships, overcoming history' },
  ],
  romantasy: [
    { value: 'Fae Romance', description: 'Love stories with fae, magical courts, and bargains' },
    { value: 'Vampire Romance', description: 'Eternal love with vampires and immortal beings' },
    { value: 'Witch Romance', description: 'Magic users finding love whilst wielding power' },
    { value: 'Dragon Romance', description: 'Romance with dragon shifters or dragon riders' },
  ],
  'science-fiction': [
    { value: 'Space Opera', description: 'Epic galactic adventures, starships, and alien civilisations' },
    { value: 'Cyberpunk', description: 'High-tech, low-life, corporate dystopias' },
    { value: 'Hard SF', description: 'Scientifically rigorous speculation and plausible technology' },
    { value: 'Post-Apocalyptic', description: 'Survival after societal collapse' },
    { value: 'Time Travel', description: 'Temporal paradoxes, alternate timelines, and causality' },
    { value: 'First Contact', description: 'Humanity meeting alien species for the first time' },
  ],
  solarpunk: [
    { value: 'Eco-Utopia', description: 'Achieved sustainable futures, green technology' },
    { value: 'Community-Focused SF', description: 'Collective action, mutual aid, and cooperation' },
    { value: 'Hopepunk', description: 'Optimistic resistance, choosing kindness despite hardship' },
  ],
  'sports-fiction': [
    { value: 'Team Sports', description: 'Football, basketball, baseball - teamwork and camaraderie' },
    { value: 'Individual Sports', description: 'Tennis, boxing, running - personal achievement' },
    { value: 'Underdog Story', description: 'Against-all-odds victories and comebacks' },
  ],
  steampunk: [
    { value: 'Victorian Steampunk', description: '19th century with steam-powered technology' },
    { value: 'Dieselpunk', description: 'Interwar period with diesel and combustion tech' },
    { value: 'Clockpunk', description: 'Renaissance-era with clockwork mechanisms' },
  ],
  thriller: [
    { value: 'Psychological Thriller', description: 'Mind games, unreliable narrators, mental manipulation' },
    { value: 'Action Thriller', description: 'Fast-paced, physical confrontations, high-octane scenes' },
    { value: 'Political Thriller', description: 'Government conspiracies, espionage, power plays' },
    { value: 'Techno-Thriller', description: 'Technology-driven threats and cyber warfare' },
    { value: 'Survival Thriller', description: 'Life-or-death situations, resource scarcity' },
  ],
  western: [
    { value: 'Classic Western', description: 'Cowboys, outlaws, frontier justice' },
    { value: 'Revisionist Western', description: 'Challenging western myths, complex morality' },
    { value: 'Weird West', description: 'Western setting with supernatural or fantastical elements' },
  ],
  wuxia: [
    { value: 'Wuxia Romance', description: 'Love among martial artists and honour-bound warriors' },
    { value: 'Cultivation', description: 'Eastern fantasy with power progression and immortality' },
    { value: 'Jianghu Adventures', description: 'Wandering heroes in the martial arts underworld' },
  ],
};

export const GENRE_MODIFIERS = [
  { value: 'political', label: 'Political', description: 'Power struggles, diplomacy, court intrigue, and ideological conflict' },
  { value: 'military', label: 'Military', description: 'Warfare, combat tactics, soldier experiences, and chain of command' },
  { value: 'espionage', label: 'Espionage', description: 'Spies, secret missions, double agents, and covert operations' },
  { value: 'heist', label: 'Heist', description: 'Elaborate thefts, planning, teamwork, and high-stakes capers' },
  { value: 'action', label: 'Action', description: 'Fast-paced sequences, physical confrontations, and adrenaline-fuelled scenes' },
  { value: 'adventure', label: 'Adventure', description: 'Exploration, discovery, quests, and journeys into the unknown' },
  { value: 'romantic', label: 'Romantic', description: 'Love stories, emotional connections, and relationship development' },
  { value: 'comedic', label: 'Comedic', description: 'Humour, wit, satire, and lighthearted moments throughout' },
  { value: 'dark', label: 'Dark', description: 'Grim themes, moral ambiguity, disturbing content, and bleak atmosphere' },
  { value: 'epic', label: 'Epic', description: 'Grand scale, sweeping narratives, world-changing events, and heroic journeys' },
  { value: 'survival', label: 'Survival', description: 'Life-or-death stakes, resource scarcity, and struggle against the elements' },
  { value: 'psychological', label: 'Psychological', description: 'Mental states, inner conflict, perception versus reality, and mind games' },
];

// Tones with descriptions to help users understand each option
export const TONES = [
  { value: 'Dark and Gritty', description: 'Harsh realities, moral ambiguity, unflinching portrayal of violence or hardship' },
  { value: 'Light and Humorous', description: 'Comedic moments, witty dialogue, fun and entertaining atmosphere' },
  { value: 'Epic and Grand', description: 'Large scale, sweeping narratives, world-changing stakes and heroic journeys' },
  { value: 'Intimate and Personal', description: 'Character-focused, emotional depth, close relationships and inner journeys' },
  { value: 'Mysterious and Suspenseful', description: 'Secrets, tension, unanswered questions that keep readers guessing' },
  { value: 'Hopeful and Uplifting', description: 'Optimistic outlook, triumph over adversity, feel-good endings' },
  { value: 'Satirical and Witty', description: 'Social commentary, clever humour, ironic observations about society' },
  { value: 'Melancholic and Reflective', description: 'Thoughtful, bittersweet, contemplative exploration of loss or memory' },
  { value: 'Tense and Fast-Paced', description: 'High stakes, quick action, page-turner momentum that builds urgency' },
  { value: 'Morally Complex', description: 'Grey areas, difficult choices, characters who challenge simple right and wrong' },
  { value: 'Romantic and Passionate', description: 'Emotional intensity, love-focused, deep connections and yearning' },
  { value: 'Whimsical and Fantastical', description: 'Playful imagination, magical wonder, dreamlike and enchanting' },
];

export const COMMON_THEMES = [
  // Core Themes
  { value: 'Power and Corruption', description: 'How authority corrupts and the temptation of control' },
  { value: 'Love and Sacrifice', description: 'The things we give up for those we care about' },
  { value: 'Revenge and Justice', description: 'Retribution, vengeance, and the price of justice' },
  { value: 'Identity and Self-Discovery', description: 'Finding yourself, understanding who you truly are' },
  { value: 'Good vs Evil', description: 'Moral absolutes, heroes versus villains, clear right and wrong' },
  { value: 'Survival', description: 'Enduring against all odds, the will to live' },
  { value: 'Family and Loyalty', description: 'Bonds of blood and chosen family, staying true to loved ones' },
  { value: 'Freedom and Oppression', description: 'Fighting tyranny, liberation, the cost of liberty' },
  { value: 'Betrayal and Trust', description: 'Broken faith, deception, and the fragility of loyalty' },
  { value: 'Redemption', description: 'Second chances, atonement, earning forgiveness' },
  { value: 'Coming of Age', description: 'Growing up, losing innocence, the transition to adulthood' },
  { value: 'Nature vs Technology', description: 'Natural world versus artificial progress, balance or conflict' },
  { value: 'War and Peace', description: 'Conflict and its aftermath, the cost of violence versus harmony' },
  { value: 'Class and Society', description: 'Social hierarchies, inequality, revolution or acceptance' },
  { value: 'Morality and Ethics', description: 'Right and wrong, difficult choices, philosophical dilemmas' },
  // Additional Themes
  { value: 'Forbidden Love', description: 'Romance that defies social rules or consequences' },
  { value: 'Time and Mortality', description: 'Death, ageing, legacy, and our finite existence' },
  { value: 'Ambition and Hubris', description: 'The drive for greatness and the pride that destroys' },
  { value: 'Faith and Doubt', description: 'Belief systems challenged, spiritual crisis and revelation' },
  { value: 'Memory and Forgetting', description: 'The past haunting us, selective amnesia, what we choose to remember' },
  { value: 'Isolation and Connection', description: 'Loneliness versus belonging, the human need for others' },
  { value: 'Legacy and Heritage', description: 'What we inherit and what we leave behind' },
  { value: 'Secrets and Lies', description: 'Hidden truths, deception, and the burden of knowledge' },
  { value: 'Hope and Despair', description: 'Optimism in darkness, or surrender to hopelessness' },
  { value: 'Transformation', description: 'Change, evolution, becoming something new' },
  { value: 'Obsession', description: 'Unhealthy fixation, consuming passion, losing yourself to desire' },
  { value: 'Fate vs Free Will', description: 'Destiny versus choice, predetermination or agency' },
  { value: 'Truth and Deception', description: 'Seeking reality, manipulation, and hidden agendas' },
  { value: 'Innocence and Experience', description: 'Loss of naivety, wisdom gained through hardship' },
  { value: 'Greed and Generosity', description: 'Selfishness versus selflessness, material versus spiritual wealth' },
];

// Popular genre combination recipes - pre-defined combinations that work well
export interface GenreRecipe {
  id: string;
  name: string;
  description: string;
  genres: string[];
  subgenres: string[];
  modifiers: string[];
  tones: string[];
  themes: string[];
  icon: string;
  popularity: 'hot' | 'popular' | 'niche';
}

export const GENRE_RECIPES: GenreRecipe[] = [
  {
    id: 'romantasy-classic',
    name: 'Romantasy',
    description: 'Fantasy romance with magical courts and forbidden love',
    genres: ['romantasy'],
    subgenres: ['Fae Romance'],
    modifiers: ['romantic'],
    tones: ['Romantic and Passionate', 'Epic and Grand'],
    themes: ['Forbidden Love', 'Power and Corruption'],
    icon: '💕✨',
    popularity: 'hot',
  },
  {
    id: 'cozy-mystery',
    name: 'Cozy Fantasy Mystery',
    description: 'Low-stakes magical mysteries in charming settings',
    genres: ['cozy-fantasy', 'mystery'],
    subgenres: ['Cozy Mystery Fantasy', 'Cozy Mystery'],
    modifiers: [],
    tones: ['Light and Humorous', 'Mysterious and Suspenseful'],
    themes: ['Secrets and Lies', 'Family and Loyalty'],
    icon: '🍵🔍',
    popularity: 'hot',
  },
  {
    id: 'space-opera-romance',
    name: 'Sci-Fi Romance',
    description: 'Love among the stars with epic space adventures',
    genres: ['science-fiction', 'romance'],
    subgenres: ['Space Opera', 'Slow Burn'],
    modifiers: ['romantic', 'adventure'],
    tones: ['Epic and Grand', 'Romantic and Passionate'],
    themes: ['Love and Sacrifice', 'Survival'],
    icon: '🚀💫',
    popularity: 'popular',
  },
  {
    id: 'dark-academia',
    name: 'Dark Academia Thriller',
    description: 'Sinister secrets at prestigious institutions',
    genres: ['thriller', 'mystery'],
    subgenres: ['Psychological Thriller', 'Whodunit'],
    modifiers: ['dark', 'psychological'],
    tones: ['Dark and Gritty', 'Mysterious and Suspenseful'],
    themes: ['Secrets and Lies', 'Ambition and Hubris'],
    icon: '📚🖤',
    popularity: 'popular',
  },
  {
    id: 'epic-grimdark',
    name: 'Epic Grimdark Fantasy',
    description: 'Brutal, morally grey epic fantasy with political intrigue',
    genres: ['grimdark', 'fantasy'],
    subgenres: ['Grimdark Fantasy', 'Epic Fantasy'],
    modifiers: ['political', 'military', 'dark'],
    tones: ['Dark and Gritty', 'Epic and Grand'],
    themes: ['Power and Corruption', 'Betrayal and Trust'],
    icon: '⚔️🩸',
    popularity: 'popular',
  },
  {
    id: 'litrpg-cultivation',
    name: 'Progression Fantasy',
    description: 'Power growth, leveling systems, and cultivation',
    genres: ['litrpg', 'fantasy'],
    subgenres: ['Progression Fantasy', 'Cultivation'],
    modifiers: ['action', 'adventure'],
    tones: ['Epic and Grand', 'Tense and Fast-Paced'],
    themes: ['Identity and Self-Discovery', 'Survival'],
    icon: '⚔️📈',
    popularity: 'popular',
  },
  {
    id: 'historical-romance',
    name: 'Historical Romance',
    description: 'Sweeping love stories set in bygone eras',
    genres: ['historical', 'romance'],
    subgenres: ['Victorian Era', 'Historical Romance'],
    modifiers: ['romantic'],
    tones: ['Romantic and Passionate', 'Epic and Grand'],
    themes: ['Forbidden Love', 'Class and Society'],
    icon: '👗💕',
    popularity: 'popular',
  },
  {
    id: 'supernatural-thriller',
    name: 'Supernatural Thriller',
    description: 'Fast-paced horror with relentless supernatural threats',
    genres: ['horror', 'thriller'],
    subgenres: ['Supernatural Horror', 'Action Thriller'],
    modifiers: ['action', 'dark'],
    tones: ['Tense and Fast-Paced', 'Dark and Gritty'],
    themes: ['Survival', 'Good vs Evil'],
    icon: '👻⚡',
    popularity: 'popular',
  },
  {
    id: 'solarpunk-hopeful',
    name: 'Hopepunk Solarpunk',
    description: 'Optimistic eco-futures with community and hope',
    genres: ['solarpunk'],
    subgenres: ['Eco-Utopia', 'Community-Focused SF'],
    modifiers: ['adventure'],
    tones: ['Hopeful and Uplifting', 'Whimsical and Fantastical'],
    themes: ['Nature vs Technology', 'Family and Loyalty'],
    icon: '🌱☀️',
    popularity: 'niche',
  },
  {
    id: 'afrofuturist-epic',
    name: 'Afrofuturist Epic',
    description: 'African diaspora perspectives in sweeping speculative narratives',
    genres: ['afrofuturism', 'fantasy'],
    subgenres: ['Afrofuturist Fantasy', 'African Mythology SF'],
    modifiers: ['epic'],
    tones: ['Epic and Grand', 'Hopeful and Uplifting'],
    themes: ['Legacy and Heritage', 'Identity and Self-Discovery'],
    icon: '🌍✨',
    popularity: 'niche',
  },
  {
    id: 'wuxia-romance',
    name: 'Martial Arts Romance',
    description: 'Love and honour among martial artists',
    genres: ['wuxia', 'romance'],
    subgenres: ['Wuxia Romance', 'Slow Burn'],
    modifiers: ['action', 'romantic'],
    tones: ['Epic and Grand', 'Romantic and Passionate'],
    themes: ['Love and Sacrifice', 'Forbidden Love'],
    icon: '🥋💕',
    popularity: 'niche',
  },
  {
    id: 'weird-horror',
    name: 'Cosmic Weird Horror',
    description: 'Reality-bending horror with cosmic dread',
    genres: ['new-weird', 'horror'],
    subgenres: ['Weird Horror', 'Cosmic Horror'],
    modifiers: ['psychological', 'dark'],
    tones: ['Dark and Gritty', 'Melancholic and Reflective'],
    themes: ['Fate vs Free Will', 'Isolation and Connection'],
    icon: '👁️🌀',
    popularity: 'niche',
  },
];

// Genre compatibility suggestions - which genres work well together
export const GENRE_COMPATIBILITY: Record<string, string[]> = {
  'fantasy': ['romance', 'mystery', 'horror', 'historical'],
  'science-fiction': ['thriller', 'mystery', 'horror', 'romance'],
  'romance': ['fantasy', 'mystery', 'historical', 'contemporary'],
  'mystery': ['thriller', 'historical', 'romance', 'horror'],
  'thriller': ['mystery', 'science-fiction', 'horror', 'romance'],
  'horror': ['mystery', 'thriller', 'fantasy', 'science-fiction'],
  'historical': ['romance', 'mystery', 'fantasy', 'literary'],
  'literary': ['contemporary', 'historical', 'romance'],
  'contemporary': ['romance', 'literary', 'mystery', 'thriller'],
  'western': ['romance', 'mystery', 'historical'],
  'romantasy': ['cozy-fantasy', 'fantasy'],
  'cozy-fantasy': ['romantasy', 'mystery'],
  'grimdark': ['fantasy', 'science-fiction'],
  'litrpg': ['fantasy', 'science-fiction'],
  'afrofuturism': ['science-fiction', 'fantasy'],
  'climate-fiction': ['science-fiction', 'thriller'],
  'solarpunk': ['science-fiction', 'romance'],
  'steampunk': ['mystery', 'romance', 'fantasy'],
  'new-weird': ['horror', 'fantasy', 'science-fiction'],
  'paranormal': ['romance', 'mystery', 'thriller'],
  'wuxia': ['fantasy', 'romance'],
  'legal-drama': ['thriller', 'mystery'],
  'medical-drama': ['thriller', 'mystery'],
  'sports-fiction': ['romance', 'contemporary'],
};
