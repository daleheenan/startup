'use client';

import { useState, useEffect } from 'react';
import { getToken } from '../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface BookStylePreset {
  id: string;
  name: string;
  description?: string;
  genres: string[];
  subgenres: string[];
  modifiers: string[];
  tones: string[];
  themes: string[];
  custom_theme?: string;
  target_length: number;
  is_default: boolean;
}

export interface StoryPreferences {
  genre: string;
  genres: string[]; // Support multi-genre
  subgenres: string[]; // Support multi-subgenre
  modifiers: string[]; // Genre modifiers like Political, Military
  tone: string; // For backward compatibility (first selected tone)
  tones: string[]; // Support multi-tone selection
  themes: string[];
  customTheme?: string; // Free text custom theme
  targetLength: number;
  additionalNotes?: string;
  customIdeas?: string;
  // Project structure
  projectType: 'standalone' | 'trilogy' | 'series';
  bookCount?: number; // For series (4+)
  // Universe linking
  universeId?: string; // Link to existing universe
  sourceProjectId?: string; // Create universe from this project
  timeGapFromSource?: string; // e.g., "5 years later"
}

interface SourceProject {
  id: string;
  title: string;
  type: string;
  genre: string;
  universe_id: string | null;
}

interface Universe {
  id: string;
  name: string;
  description: string | null;
  root_project_id: string | null;
}

interface GenrePreferenceFormProps {
  onSubmit: (preferences: StoryPreferences) => void;
  isLoading: boolean;
}

// Market trend indicators (2026 data)
const MARKET_TRENDS: Record<string, 'trending' | 'rising' | 'stable'> = {
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
const CLASSIC_GENRES = [
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
const SPECIALIST_GENRES = [
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
const GENRES = [...CLASSIC_GENRES, ...SPECIALIST_GENRES];

interface SubgenreOption {
  value: string;
  description: string;
}

const SUBGENRES: Record<string, SubgenreOption[]> = {
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
    { value: 'Ancient History', description: 'Greece, Rome, Egypt, or other ancient civilizations' },
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
    { value: 'Legal Thriller', description: 'High-stakes cases with dangerous consequences' },
    { value: 'Criminal Defense', description: 'Defending the accused against the system' },
    { value: 'Corporate Law', description: 'Big business, mergers, and white-collar crime' },
    { value: 'Legal Mystery', description: 'Solving crimes through legal investigation' },
    { value: 'Legal Romance', description: 'Love among lawyers and legal professionals' },
  ],
  literary: [
    { value: 'Contemporary Literary', description: 'Modern life explored with literary depth' },
    { value: 'Experimental', description: 'Breaking narrative conventions and forms' },
    { value: 'Philosophical', description: 'Ideas and big questions drive the narrative' },
    { value: 'Character-Driven', description: 'Deep character studies over plot' },
    { value: 'Magical Realism', description: 'Magic woven seamlessly into realistic settings' },
  ],
  litrpg: [
    { value: 'Dungeon Core', description: 'Protagonist becomes or manages a dungeon' },
    { value: 'GameLit', description: 'Game elements without full stat systems' },
    { value: 'Virtual Reality', description: 'Adventures inside VR game worlds' },
    { value: 'System Apocalypse', description: 'Game mechanics invade the real world' },
    { value: 'Progression Fantasy', description: 'Power growth and leveling as core focus' },
    { value: 'Cultivation', description: 'Eastern-style power cultivation and martial arts' },
  ],
  'medical-drama': [
    { value: 'Hospital Drama', description: 'Day-to-day challenges in medical settings' },
    { value: 'Medical Thriller', description: 'Life-or-death stakes and medical mysteries' },
    { value: 'Medical Mystery', description: 'Diagnosing unusual or mysterious conditions' },
    { value: 'Medical Romance', description: 'Love stories among healthcare workers' },
    { value: 'Emergency Medicine', description: 'High-pressure ER and trauma scenarios' },
    { value: 'Medical Horror', description: 'Body horror and medical nightmares' },
  ],
  mystery: [
    { value: 'Cozy Mystery', description: 'Amateur sleuths solving crimes in charming settings' },
    { value: 'Police Procedural', description: 'Realistic police investigation methods' },
    { value: 'Detective', description: 'Professional or private investigators at work' },
    { value: 'Noir', description: 'Dark, cynical mysteries with morally grey protagonists' },
    { value: 'Whodunit', description: 'Classic puzzle mysteries with clues for readers' },
    { value: 'Legal Mystery', description: 'Crimes solved through legal processes' },
  ],
  'new-weird': [
    { value: 'Urban Weird', description: 'Strange happenings in city environments' },
    { value: 'Weird Horror', description: 'Horror that defies classification' },
    { value: 'Weird Fantasy', description: 'Fantasy that breaks genre conventions' },
    { value: 'Slipstream', description: 'Genre-fluid narratives between realism and fantasy' },
    { value: 'Bizarro Fiction', description: 'Deliberately absurd and transgressive' },
    { value: 'Surreal Fiction', description: 'Dreamlike logic and impossible imagery' },
  ],
  paranormal: [
    { value: 'Paranormal Mystery', description: 'Solving crimes with supernatural elements' },
    { value: 'Paranormal Thriller', description: 'High-stakes supernatural suspense' },
    { value: 'Paranormal Investigation', description: 'Ghost hunters and supernatural researchers' },
    { value: 'Ghost Stories', description: 'Classic tales of haunting and spirits' },
    { value: 'Supernatural Drama', description: 'Character-focused supernatural narratives' },
    { value: 'Paranormal Action', description: 'Fast-paced supernatural combat' },
  ],
  romance: [
    { value: 'Contemporary Romance', description: 'Modern-day love stories and relationships' },
    { value: 'Historical Romance', description: 'Love across historical time periods' },
    { value: 'Paranormal Romance', description: 'Love with vampires, shifters, or other beings' },
    { value: 'Romantic Comedy', description: 'Lighthearted love stories with humor' },
    { value: 'Slow Burn', description: 'Gradually building romantic tension' },
  ],
  romantasy: [
    { value: 'Fae Romance', description: 'Love stories with faeries and magical courts' },
    { value: 'Witch Romance', description: 'Magic users finding love and power' },
    { value: 'Dragon Romance', description: 'Dragons as love interests or shifters' },
    { value: 'Vampire Romance', description: 'Immortal romance with bloodsucking twist' },
    { value: 'Magical Royalty Romance', description: 'Princes, princesses, and magical kingdoms' },
    { value: 'Court Intrigue Romance', description: 'Love amid political machinations' },
  ],
  'science-fiction': [
    { value: 'Space Opera', description: 'Epic adventures across galaxies and star systems' },
    { value: 'Cyberpunk', description: 'High tech, low life in neon-lit futures' },
    { value: 'Hard SF', description: 'Scientifically rigorous speculation' },
    { value: 'Dystopian', description: 'Oppressive future societies and resistance' },
    { value: 'Post-Apocalyptic', description: 'Survival after civilization falls' },
    { value: 'First Contact', description: 'Humanity meeting alien intelligence' },
  ],
  solarpunk: [
    { value: 'Eco-Utopia', description: 'Thriving sustainable societies achieved' },
    { value: 'Green Tech SF', description: 'Environmental technology saving the world' },
    { value: 'Sustainable Future', description: 'Harmony between humanity and nature' },
    { value: 'Hopeful Climate Fiction', description: 'Optimistic takes on environmental challenges' },
    { value: 'Community-Focused SF', description: 'Collective action and community building' },
    { value: 'Biomimicry Fiction', description: 'Technology inspired by nature' },
  ],
  'sports-fiction': [
    { value: 'Sports Drama', description: 'Emotional journeys through athletic competition' },
    { value: 'Sports Romance', description: 'Love on and off the field' },
    { value: 'Underdog Sports', description: 'Against-the-odds athletic triumph' },
    { value: 'Professional Sports', description: 'Life in pro leagues and big-time athletics' },
    { value: 'College Sports', description: 'Competition and growth in collegiate athletics' },
    { value: 'Fantasy Sports', description: 'Fictional sports in imaginary worlds' },
  ],
  steampunk: [
    { value: 'Victorian Steampunk', description: 'Classic steam technology in Victorian settings' },
    { value: 'Dieselpunk', description: 'Art deco aesthetics and diesel technology' },
    { value: 'Clockpunk', description: 'Clockwork and mechanical wonders' },
    { value: 'Gaslamp Fantasy', description: 'Victorian fantasy with gas-lit atmosphere' },
    { value: 'Steampunk Romance', description: 'Love amid gears and goggles' },
    { value: 'Post-Apocalyptic Steampunk', description: 'Steam technology after modern collapse' },
  ],
  thriller: [
    { value: 'Psychological Thriller', description: 'Mind games and unreliable narrators' },
    { value: 'Action Thriller', description: 'Fast-paced physical danger and chases' },
    { value: 'Legal Thriller', description: 'Courtroom stakes and legal danger' },
    { value: 'Medical Thriller', description: 'Life-or-death medical situations' },
    { value: 'Spy Thriller', description: 'Espionage, tradecraft, and international intrigue' },
  ],
  western: [
    { value: 'Classic Western', description: 'Traditional frontier adventures and showdowns' },
    { value: 'Weird West', description: 'Supernatural elements in the Old West' },
    { value: 'Space Western', description: 'Frontier spirit on alien worlds' },
    { value: 'Contemporary Western', description: 'Modern-day stories in the American West' },
    { value: 'Western Romance', description: 'Love on the frontier' },
    { value: 'Revisionist Western', description: 'Challenging western tropes and perspectives' },
  ],
  wuxia: [
    { value: 'Classical Wuxia', description: 'Traditional Chinese martial arts adventure' },
    { value: 'Xianxia Cultivation', description: 'Cultivating immortality and spiritual power' },
    { value: 'Modern Wuxia', description: 'Martial arts in contemporary settings' },
    { value: 'Wuxia Romance', description: 'Love among martial artists' },
    { value: 'Historical Wuxia', description: 'Martial arts in specific Chinese dynasties' },
    { value: 'Mythological Wuxia', description: 'Blending wuxia with Chinese mythology' },
  ],
};

// Genre modifiers that can combine with any genre
const GENRE_MODIFIERS = [
  { value: 'political', label: 'Political', description: 'Power struggles, diplomacy, court intrigue, and ideological conflict' },
  { value: 'military', label: 'Military', description: 'Warfare, combat tactics, soldier experiences, and chain of command' },
  { value: 'espionage', label: 'Espionage', description: 'Spies, secret missions, double agents, and covert operations' },
  { value: 'heist', label: 'Heist', description: 'Elaborate thefts, planning, teamwork, and high-stakes capers' },
  { value: 'action', label: 'Action', description: 'Fast-paced sequences, physical confrontations, and adrenaline-fueled scenes' },
  { value: 'adventure', label: 'Adventure', description: 'Exploration, discovery, quests, and journeys into the unknown' },
  { value: 'romantic', label: 'Romantic', description: 'Love stories, emotional connections, and relationship development' },
  { value: 'comedic', label: 'Comedic', description: 'Humor, wit, satire, and lighthearted moments throughout' },
  { value: 'dark', label: 'Dark', description: 'Grim themes, moral ambiguity, disturbing content, and bleak atmosphere' },
  { value: 'epic', label: 'Epic', description: 'Grand scale, sweeping narratives, world-changing events, and heroic journeys' },
  { value: 'survival', label: 'Survival', description: 'Life-or-death stakes, resource scarcity, and struggle against the elements' },
  { value: 'psychological', label: 'Psychological', description: 'Mental states, inner conflict, perception versus reality, and mind games' },
];

// Tones with descriptions to help users understand each option
const TONES = [
  { value: 'Dark and Gritty', description: 'Harsh realities, moral ambiguity, unflinching portrayal of violence or hardship' },
  { value: 'Light and Humorous', description: 'Comedic moments, witty dialogue, fun and entertaining atmosphere' },
  { value: 'Epic and Grand', description: 'Large scale, sweeping narratives, world-changing stakes and heroic journeys' },
  { value: 'Intimate and Personal', description: 'Character-focused, emotional depth, close relationships and inner journeys' },
  { value: 'Mysterious and Suspenseful', description: 'Secrets, tension, unanswered questions that keep readers guessing' },
  { value: 'Hopeful and Uplifting', description: 'Optimistic outlook, triumph over adversity, feel-good endings' },
  { value: 'Satirical and Witty', description: 'Social commentary, clever humor, ironic observations about society' },
  { value: 'Melancholic and Reflective', description: 'Thoughtful, bittersweet, contemplative exploration of loss or memory' },
  { value: 'Tense and Fast-Paced', description: 'High stakes, quick action, page-turner momentum that builds urgency' },
  { value: 'Morally Complex', description: 'Grey areas, difficult choices, characters who challenge simple right and wrong' },
  { value: 'Romantic and Passionate', description: 'Emotional intensity, love-focused, deep connections and yearning' },
  { value: 'Whimsical and Fantastical', description: 'Playful imagination, magical wonder, dreamlike and enchanting' },
];

const COMMON_THEMES = [
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
  { value: 'Time and Mortality', description: 'Death, aging, legacy, and our finite existence' },
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

export default function GenrePreferenceForm({ onSubmit, isLoading }: GenrePreferenceFormProps) {
  const [genres, setGenres] = useState<string[]>([]);
  const [subgenres, setSubgenres] = useState<string[]>([]);
  const [modifiers, setModifiers] = useState<string[]>([]);
  const [tones, setTones] = useState<string[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [customTheme, setCustomTheme] = useState('');
  const [targetLength, setTargetLength] = useState(80000);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [customIdeas, setCustomIdeas] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Project structure state
  const [projectType, setProjectType] = useState<'standalone' | 'trilogy' | 'series'>('standalone');
  const [bookCount, setBookCount] = useState(4); // For series

  // Universe state
  const [useExistingUniverse, setUseExistingUniverse] = useState(false);
  const [universeSource, setUniverseSource] = useState<'universe' | 'project'>('project');
  const [selectedUniverseId, setSelectedUniverseId] = useState<string>('');
  const [selectedSourceProjectId, setSelectedSourceProjectId] = useState<string>('');
  const [timeGapFromSource, setTimeGapFromSource] = useState('');
  const [sourceProjects, setSourceProjects] = useState<SourceProject[]>([]);
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [loadingUniverseData, setLoadingUniverseData] = useState(false);

  // Preset state
  const [presets, setPresets] = useState<BookStylePreset[]>([]);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);

  // Load presets and universe data on mount
  useEffect(() => {
    fetchPresets();
    fetchUniverseData();
  }, []);

  // Fetch available universes and source projects
  const fetchUniverseData = async () => {
    setLoadingUniverseData(true);
    try {
      const token = getToken();
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch universes and source projects in parallel
      const [universesRes, projectsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/universes`, { headers }),
        fetch(`${API_BASE_URL}/api/universes/source-projects`, { headers }),
      ]);

      if (universesRes.ok) {
        const data = await universesRes.json();
        setUniverses(data.universes || []);
      }

      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setSourceProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Error fetching universe data:', err);
    } finally {
      setLoadingUniverseData(false);
    }
  };

  const fetchPresets = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/presets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPresets(data.presets || []);
      }
    } catch (err) {
      console.error('Error fetching presets:', err);
    }
  };

  const loadPreset = (preset: BookStylePreset) => {
    setGenres(preset.genres || []);
    setSubgenres(preset.subgenres || []);
    setModifiers(preset.modifiers || []);
    setTones(preset.tones || []);
    setThemes(preset.themes || []);
    setCustomTheme(preset.custom_theme || '');
    setTargetLength(preset.target_length || 80000);
    setErrors({});
  };

  const saveCurrentAsPreset = async () => {
    if (!presetName.trim()) {
      return;
    }

    setSavingPreset(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/presets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: presetName.trim(),
          description: presetDescription.trim() || undefined,
          genres,
          subgenres,
          modifiers,
          tones,
          themes,
          customTheme: customTheme.trim() || undefined,
          targetLength,
        }),
      });

      if (response.ok) {
        const newPreset = await response.json();
        setPresets([...presets, newPreset]);
        setShowSavePreset(false);
        setPresetName('');
        setPresetDescription('');
      }
    } catch (err) {
      console.error('Error saving preset:', err);
    } finally {
      setSavingPreset(false);
    }
  };

  const deletePreset = async (presetId: string) => {
    if (!confirm('Delete this preset?')) return;

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/presets/${presetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setPresets(presets.filter(p => p.id !== presetId));
      }
    } catch (err) {
      console.error('Error deleting preset:', err);
    }
  };

  const handleGenreToggle = (genreValue: string) => {
    if (genres.includes(genreValue)) {
      setGenres(genres.filter(g => g !== genreValue));
      // Remove subgenres that belong to the deselected genre
      const genreSubgenreValues = SUBGENRES[genreValue]?.map(sg => sg.value) || [];
      setSubgenres(subgenres.filter(sg => !genreSubgenreValues.includes(sg)));
    } else {
      if (genres.length < 3) {
        setGenres([...genres, genreValue]);
      }
    }
  };

  const handleSubgenreToggle = (subgenre: string) => {
    if (subgenres.includes(subgenre)) {
      setSubgenres(subgenres.filter(sg => sg !== subgenre));
    } else {
      if (subgenres.length < 3) {
        setSubgenres([...subgenres, subgenre]);
      }
    }
  };

  const handleModifierToggle = (modifier: string) => {
    if (modifiers.includes(modifier)) {
      setModifiers(modifiers.filter(m => m !== modifier));
    } else {
      if (modifiers.length < 4) {
        setModifiers([...modifiers, modifier]);
      }
    }
  };

  const handleThemeToggle = (theme: string) => {
    if (themes.includes(theme)) {
      setThemes(themes.filter(t => t !== theme));
    } else {
      if (themes.length < 5) {
        setThemes([...themes, theme]);
      }
    }
  };

  const handleToneToggle = (toneValue: string) => {
    if (tones.includes(toneValue)) {
      setTones(tones.filter(t => t !== toneValue));
    } else {
      if (tones.length < 3) {
        setTones([...tones, toneValue]);
      }
    }
  };

  // Get available subgenres based on selected genres
  const availableSubgenres: SubgenreOption[] = genres.flatMap(g => SUBGENRES[g] || []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (genres.length === 0) newErrors.genres = 'Please select at least one genre';
    if (subgenres.length === 0) newErrors.subgenres = 'Please select at least one subgenre';
    if (tones.length === 0) newErrors.tones = 'Please select at least one tone';
    if (themes.length === 0 && !customTheme.trim()) newErrors.themes = 'Please select at least one theme or add a custom theme';
    if (targetLength < 40000) newErrors.targetLength = 'Target length must be at least 40,000 words';
    if (targetLength > 150000) newErrors.targetLength = 'Target length must be at most 150,000 words';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Build combined genre string for backward compatibility
    const genreLabels = genres.map(g => GENRES.find(genre => genre.value === g)?.label || g);
    const modifierLabels = modifiers.map(m => GENRE_MODIFIERS.find(mod => mod.value === m)?.label || m);
    const combinedGenre = [...modifierLabels, ...genreLabels].join(' ');

    // Combine selected themes with custom theme if provided
    const allThemes = customTheme.trim()
      ? [...themes, customTheme.trim()]
      : themes;

    const preferences: StoryPreferences = {
      genre: combinedGenre,
      genres,
      subgenres,
      modifiers,
      tone: tones[0] || '', // First tone for backward compatibility
      tones,
      themes: allThemes,
      customTheme: customTheme.trim() || undefined,
      targetLength,
      additionalNotes: additionalNotes.trim() || undefined,
      customIdeas: customIdeas.trim() || undefined,
      // Project structure
      projectType,
      bookCount: projectType === 'series' ? bookCount : undefined,
      // Universe linking
      universeId: useExistingUniverse && universeSource === 'universe' ? selectedUniverseId : undefined,
      sourceProjectId: useExistingUniverse && universeSource === 'project' ? selectedSourceProjectId : undefined,
      timeGapFromSource: useExistingUniverse && timeGapFromSource.trim() ? timeGapFromSource.trim() : undefined,
    };

    onSubmit(preferences);
  };

  // Build a preview of the genre combination
  const genrePreview = () => {
    const parts: string[] = [];
    if (modifiers.length > 0) {
      parts.push(modifiers.map(m => GENRE_MODIFIERS.find(mod => mod.value === m)?.label).join(', '));
    }
    if (genres.length > 0) {
      parts.push(genres.map(g => GENRES.find(genre => genre.value === g)?.label).join(' + '));
    }
    if (subgenres.length > 0) {
      parts.push(`(${subgenres.join(', ')})`);
    }
    return parts.join(' ') || 'Select genres and modifiers...';
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.875rem 1rem',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    color: '#1A1A2E',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    appearance: 'none',
    WebkitAppearance: 'none',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748B' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 1rem center',
    paddingRight: '2.5rem',
    cursor: 'pointer',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#374151',
    fontWeight: 600,
    fontSize: '0.875rem',
  };

  const errorStyle: React.CSSProperties = {
    color: '#DC2626',
    fontSize: '0.813rem',
    marginTop: '0.375rem',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '1.75rem',
  };

  const chipStyle = (selected: boolean, disabled: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem',
    background: selected
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : '#F8FAFC',
    border: selected
      ? '1px solid #667eea'
      : '1px solid #E2E8F0',
    borderRadius: '20px',
    color: selected ? '#FFFFFF' : '#374151',
    fontSize: '0.813rem',
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  });

  const getTrendBadge = (trend?: 'trending' | 'rising' | 'stable') => {
    if (!trend) return null;

    const styles: Record<string, React.CSSProperties> = {
      trending: {
        background: '#EF4444',
        color: '#FFFFFF',
        animation: 'pulse 2s infinite',
      },
      rising: {
        background: '#F59E0B',
        color: '#FFFFFF',
      },
      stable: {
        background: '#10B981',
        color: '#FFFFFF',
      },
    };

    const labels: Record<string, string> = {
      trending: '🔥 Hot',
      rising: '📈 Rising',
      stable: '✓ Popular',
    };

    return (
      <span
        style={{
          ...styles[trend],
          fontSize: '0.625rem',
          fontWeight: 600,
          padding: '0.125rem 0.375rem',
          borderRadius: '4px',
          marginLeft: '0.375rem',
          textTransform: 'uppercase',
        }}
      >
        {labels[trend]}
      </span>
    );
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      {/* Book Style Presets */}
      <div style={{
        ...sectionStyle,
        padding: '1rem',
        background: '#F0FDF4',
        border: '1px solid #BBF7D0',
        borderRadius: '8px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            Book Style Presets
            <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Quick start with saved preferences)</span>
          </label>
          {genres.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSavePreset(true)}
              style={{
                padding: '0.5rem 1rem',
                background: '#FFFFFF',
                border: '1px solid #10B981',
                borderRadius: '6px',
                color: '#10B981',
                fontSize: '0.813rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              + Save Current as Preset
            </button>
          )}
        </div>

        {/* Save Preset Form */}
        {showSavePreset && (
          <div style={{
            padding: '1rem',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            marginBottom: '1rem',
          }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name (e.g., My Cozy Fantasy Style)"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <input
                type="text"
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                placeholder="Brief description (optional)"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={saveCurrentAsPreset}
                disabled={!presetName.trim() || savingPreset}
                style={{
                  padding: '0.5rem 1rem',
                  background: presetName.trim() ? '#10B981' : '#94A3B8',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '0.813rem',
                  fontWeight: 500,
                  cursor: presetName.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                {savingPreset ? 'Saving...' : 'Save Preset'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSavePreset(false);
                  setPresetName('');
                  setPresetDescription('');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  color: '#64748B',
                  fontSize: '0.813rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Preset List */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {presets.map(preset => (
            <div
              key={preset.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <button
                type="button"
                onClick={() => loadPreset(preset)}
                disabled={isLoading}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  color: '#374151',
                  fontSize: '0.813rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                }}
                title={preset.description || ''}
              >
                <span style={{ fontWeight: 600 }}>
                  {preset.is_default && '⭐ '}{preset.name}
                </span>
                {preset.description && (
                  <span style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.125rem' }}>
                    {preset.description}
                  </span>
                )}
              </button>
              {!preset.is_default && (
                <button
                  type="button"
                  onClick={() => deletePreset(preset.id)}
                  style={{
                    padding: '0.25rem',
                    background: 'none',
                    border: 'none',
                    color: '#DC2626',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    opacity: 0.6,
                  }}
                  title="Delete preset"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {presets.length === 0 && (
            <span style={{ fontSize: '0.813rem', color: '#64748B', fontStyle: 'italic' }}>
              No presets yet. Save your selections above!
            </span>
          )}
        </div>
      </div>

      {/* Project Structure Selection */}
      <div style={{
        ...sectionStyle,
        padding: '1rem',
        background: '#FEF3C7',
        border: '1px solid #FCD34D',
        borderRadius: '8px',
      }}>
        <label style={{ ...labelStyle, marginBottom: '0.75rem' }}>
          Project Structure
          <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(How many books?)</span>
        </label>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {[
            { value: 'standalone', label: 'Single Novel', desc: 'One complete story' },
            { value: 'trilogy', label: 'Trilogy', desc: '3 connected books' },
            { value: 'series', label: 'Series', desc: '4+ books' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setProjectType(option.value as 'standalone' | 'trilogy' | 'series')}
              disabled={isLoading}
              style={{
                flex: '1 1 150px',
                padding: '0.875rem 1rem',
                background: projectType === option.value
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#FFFFFF',
                border: projectType === option.value
                  ? '1px solid #667eea'
                  : '1px solid #E2E8F0',
                borderRadius: '8px',
                color: projectType === option.value ? '#FFFFFF' : '#374151',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.938rem', marginBottom: '0.25rem' }}>
                {option.label}
              </div>
              <div style={{
                fontSize: '0.75rem',
                opacity: projectType === option.value ? 0.9 : 0.7,
              }}>
                {option.desc}
              </div>
            </button>
          ))}
        </div>

        {/* Series book count */}
        {projectType === 'series' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ ...labelStyle, fontSize: '0.813rem' }}>
              Planned Number of Books
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="number"
                value={bookCount}
                onChange={(e) => setBookCount(Math.max(4, parseInt(e.target.value) || 4))}
                min={4}
                max={20}
                style={{
                  ...inputStyle,
                  width: '100px',
                }}
                disabled={isLoading}
              />
              <span style={{ fontSize: '0.813rem', color: '#64748B' }}>
                books (you can add more later)
              </span>
            </div>
          </div>
        )}

        {/* Universe Selection */}
        <div style={{
          paddingTop: '1rem',
          borderTop: '1px dashed #E2E8F0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <input
              type="checkbox"
              id="useExistingUniverse"
              checked={useExistingUniverse}
              onChange={(e) => setUseExistingUniverse(e.target.checked)}
              disabled={isLoading}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="useExistingUniverse" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>
              Build on an existing story universe
              <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>
                (inherit world, characters, timeline)
              </span>
            </label>
          </div>

          {useExistingUniverse && (
            <div style={{
              padding: '1rem',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
            }}>
              {loadingUniverseData ? (
                <div style={{ textAlign: 'center', color: '#64748B', padding: '1rem' }}>
                  Loading available universes...
                </div>
              ) : (
                <>
                  {/* Source selection */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ ...labelStyle, fontSize: '0.813rem' }}>Select Source</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setUniverseSource('project')}
                        style={{
                          padding: '0.5rem 1rem',
                          background: universeSource === 'project' ? '#667eea' : '#F8FAFC',
                          border: '1px solid ' + (universeSource === 'project' ? '#667eea' : '#E2E8F0'),
                          borderRadius: '6px',
                          color: universeSource === 'project' ? '#FFFFFF' : '#374151',
                          fontSize: '0.813rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        From Project
                      </button>
                      {universes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setUniverseSource('universe')}
                          style={{
                            padding: '0.5rem 1rem',
                            background: universeSource === 'universe' ? '#667eea' : '#F8FAFC',
                            border: '1px solid ' + (universeSource === 'universe' ? '#667eea' : '#E2E8F0'),
                            borderRadius: '6px',
                            color: universeSource === 'universe' ? '#FFFFFF' : '#374151',
                            fontSize: '0.813rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          From Universe
                        </button>
                      )}
                    </div>

                    {universeSource === 'project' && (
                      <select
                        value={selectedSourceProjectId}
                        onChange={(e) => setSelectedSourceProjectId(e.target.value)}
                        style={{
                          ...inputStyle,
                          cursor: 'pointer',
                        }}
                        disabled={isLoading}
                      >
                        <option value="">Select a project...</option>
                        {sourceProjects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.title} ({project.genre})
                          </option>
                        ))}
                      </select>
                    )}

                    {universeSource === 'universe' && (
                      <select
                        value={selectedUniverseId}
                        onChange={(e) => setSelectedUniverseId(e.target.value)}
                        style={{
                          ...inputStyle,
                          cursor: 'pointer',
                        }}
                        disabled={isLoading}
                      >
                        <option value="">Select a universe...</option>
                        {universes.map((universe) => (
                          <option key={universe.id} value={universe.id}>
                            {universe.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Time gap */}
                  {(selectedSourceProjectId || selectedUniverseId) && (
                    <div>
                      <label style={{ ...labelStyle, fontSize: '0.813rem' }}>
                        Time Gap from Previous Story
                        <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={timeGapFromSource}
                        onChange={(e) => setTimeGapFromSource(e.target.value)}
                        placeholder="e.g., '5 years later', '100 years after', 'Same timeline'"
                        style={inputStyle}
                        disabled={isLoading}
                      />
                    </div>
                  )}

                  {/* Info about inherited elements */}
                  {(selectedSourceProjectId || selectedUniverseId) && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '0.75rem',
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '6px',
                      fontSize: '0.813rem',
                      color: '#15803D',
                    }}>
                      <strong>Inherited elements (read-only):</strong> Characters, locations, factions, world systems, and timeline from the source will be available in your new project. You can add new elements but cannot modify inherited ones.
                    </div>
                  )}
                </>
              )}

              {!loadingUniverseData && sourceProjects.length === 0 && universes.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  color: '#64748B',
                  padding: '1rem',
                  fontStyle: 'italic',
                }}>
                  No projects available yet. Complete a project first to use it as a universe source.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Genre Preview */}
      <div style={{
        ...sectionStyle,
        padding: '1rem',
        background: '#EEF2FF',
        border: '1px solid #C7D2FE',
        borderRadius: '8px',
      }}>
        <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>
          Story Genre:
        </div>
        <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1A1A2E' }}>
          {genrePreview()}
        </div>
      </div>

      {/* Genre Modifiers */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Genre Modifiers
          <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Select up to 4)</span>
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '0.625rem',
        }}>
          {GENRE_MODIFIERS.map(mod => (
            <button
              key={mod.value}
              type="button"
              onClick={() => handleModifierToggle(mod.value)}
              disabled={isLoading || (!modifiers.includes(mod.value) && modifiers.length >= 4)}
              style={{
                padding: '0.75rem 1rem',
                background: modifiers.includes(mod.value)
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#F8FAFC',
                border: modifiers.includes(mod.value)
                  ? '1px solid #667eea'
                  : '1px solid #E2E8F0',
                borderRadius: '8px',
                color: modifiers.includes(mod.value) ? '#FFFFFF' : '#374151',
                cursor: isLoading || (!modifiers.includes(mod.value) && modifiers.length >= 4) ? 'not-allowed' : 'pointer',
                opacity: isLoading || (!modifiers.includes(mod.value) && modifiers.length >= 4) ? 0.5 : 1,
                transition: 'all 0.2s',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                {mod.label}
              </div>
              <div style={{
                fontSize: '0.75rem',
                opacity: modifiers.includes(mod.value) ? 0.9 : 0.7,
                lineHeight: 1.3,
              }}>
                {mod.description}
              </div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: '0.625rem', fontSize: '0.813rem', color: '#64748B' }}>
          Selected: {modifiers.length}/4
        </div>
      </div>

      {/* Primary Genre Selection */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Primary Genre <span style={{ color: '#DC2626' }}>*</span>
          <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Select 1-3)</span>
        </label>
        <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <span>🔥 Hot = Trending now</span>
          <span>📈 Rising = Growing popularity</span>
          <span>✓ Popular = Consistently strong</span>
        </div>

        {/* Classic Genres */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Classic Genres
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '0.625rem',
          }}>
            {CLASSIC_GENRES.map(g => (
              <button
                key={g.value}
                type="button"
                onClick={() => handleGenreToggle(g.value)}
                disabled={isLoading || (!genres.includes(g.value) && genres.length >= 3)}
                style={{
                  padding: '0.75rem 1rem',
                  background: genres.includes(g.value)
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#F8FAFC',
                  border: genres.includes(g.value)
                    ? '1px solid #667eea'
                    : '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: genres.includes(g.value) ? '#FFFFFF' : '#374151',
                  cursor: isLoading || (!genres.includes(g.value) && genres.length >= 3) ? 'not-allowed' : 'pointer',
                  opacity: isLoading || (!genres.includes(g.value) && genres.length >= 3) ? 0.5 : 1,
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{g.label}</span>
                  {getTrendBadge(g.trend)}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  opacity: genres.includes(g.value) ? 0.9 : 0.7,
                  lineHeight: 1.3,
                }}>
                  {g.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Specialist Genres */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Specialist Genres
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '0.625rem',
          }}>
            {SPECIALIST_GENRES.map(g => (
              <button
                key={g.value}
                type="button"
                onClick={() => handleGenreToggle(g.value)}
                disabled={isLoading || (!genres.includes(g.value) && genres.length >= 3)}
                style={{
                  padding: '0.75rem 1rem',
                  background: genres.includes(g.value)
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#F8FAFC',
                  border: genres.includes(g.value)
                    ? '1px solid #667eea'
                    : '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: genres.includes(g.value) ? '#FFFFFF' : '#374151',
                  cursor: isLoading || (!genres.includes(g.value) && genres.length >= 3) ? 'not-allowed' : 'pointer',
                  opacity: isLoading || (!genres.includes(g.value) && genres.length >= 3) ? 0.5 : 1,
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{g.label}</span>
                  {getTrendBadge(g.trend)}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  opacity: genres.includes(g.value) ? 0.9 : 0.7,
                  lineHeight: 1.3,
                }}>
                  {g.description}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: '0.625rem', fontSize: '0.813rem', color: '#64748B' }}>
          Selected: {genres.length}/3
        </div>
        {errors.genres && <div style={errorStyle}>{errors.genres}</div>}
      </div>

      {/* Subgenre Selection */}
      {genres.length > 0 && (
        <div style={sectionStyle}>
          <label style={labelStyle}>
            Subgenre <span style={{ color: '#DC2626' }}>*</span>
            <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Select 1-3)</span>
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '0.625rem',
          }}>
            {availableSubgenres.map(sg => (
              <button
                key={sg.value}
                type="button"
                onClick={() => handleSubgenreToggle(sg.value)}
                disabled={isLoading || (!subgenres.includes(sg.value) && subgenres.length >= 3)}
                style={{
                  padding: '0.75rem 1rem',
                  background: subgenres.includes(sg.value)
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#F8FAFC',
                  border: subgenres.includes(sg.value)
                    ? '1px solid #667eea'
                    : '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: subgenres.includes(sg.value) ? '#FFFFFF' : '#374151',
                  cursor: isLoading || (!subgenres.includes(sg.value) && subgenres.length >= 3) ? 'not-allowed' : 'pointer',
                  opacity: isLoading || (!subgenres.includes(sg.value) && subgenres.length >= 3) ? 0.5 : 1,
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  {sg.value}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  opacity: subgenres.includes(sg.value) ? 0.9 : 0.7,
                  lineHeight: 1.3,
                }}>
                  {sg.description}
                </div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: '0.625rem', fontSize: '0.813rem', color: '#64748B' }}>
            Selected: {subgenres.length}/3
          </div>
          {errors.subgenres && <div style={errorStyle}>{errors.subgenres}</div>}
        </div>
      )}

      {/* Tone Selection - Multi-select with descriptions */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Tone <span style={{ color: '#DC2626' }}>*</span>
          <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Select 1-3 to combine)</span>
        </label>
        <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.75rem' }}>
          Combine tones for richer storytelling - e.g., "Epic and Grand" + "Tense and Fast-Paced" for action-packed epics
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '0.625rem',
        }}>
          {TONES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleToneToggle(t.value)}
              disabled={isLoading || (!tones.includes(t.value) && tones.length >= 3)}
              style={{
                padding: '0.75rem 1rem',
                background: tones.includes(t.value)
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#F8FAFC',
                border: tones.includes(t.value)
                  ? '1px solid #667eea'
                  : '1px solid #E2E8F0',
                borderRadius: '8px',
                color: tones.includes(t.value) ? '#FFFFFF' : '#374151',
                cursor: isLoading || (!tones.includes(t.value) && tones.length >= 3) ? 'not-allowed' : 'pointer',
                opacity: isLoading || (!tones.includes(t.value) && tones.length >= 3) ? 0.5 : 1,
                transition: 'all 0.2s',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                {t.value}
              </div>
              <div style={{
                fontSize: '0.75rem',
                opacity: tones.includes(t.value) ? 0.9 : 0.7,
                lineHeight: 1.3,
              }}>
                {t.description}
              </div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: '0.625rem', fontSize: '0.813rem', color: '#64748B' }}>
          Selected: {tones.length}/3
        </div>
        {errors.tones && <div style={errorStyle}>{errors.tones}</div>}
      </div>

      {/* Themes Selection */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Themes <span style={{ color: '#DC2626' }}>*</span>
          <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Select up to 5, or add your own)</span>
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '0.625rem',
        }}>
          {COMMON_THEMES.map(theme => (
            <button
              key={theme.value}
              type="button"
              onClick={() => handleThemeToggle(theme.value)}
              disabled={isLoading || (!themes.includes(theme.value) && themes.length >= 5)}
              style={{
                padding: '0.75rem 1rem',
                background: themes.includes(theme.value)
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#F8FAFC',
                border: themes.includes(theme.value)
                  ? '1px solid #667eea'
                  : '1px solid #E2E8F0',
                borderRadius: '8px',
                color: themes.includes(theme.value) ? '#FFFFFF' : '#374151',
                cursor: isLoading || (!themes.includes(theme.value) && themes.length >= 5) ? 'not-allowed' : 'pointer',
                opacity: isLoading || (!themes.includes(theme.value) && themes.length >= 5) ? 0.5 : 1,
                transition: 'all 0.2s',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                {theme.value}
              </div>
              <div style={{
                fontSize: '0.75rem',
                opacity: themes.includes(theme.value) ? 0.9 : 0.7,
                lineHeight: 1.3,
              }}>
                {theme.description}
              </div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: '0.625rem', fontSize: '0.813rem', color: '#64748B' }}>
          Selected: {themes.length}/5
        </div>

        {/* Custom Theme Input */}
        <div style={{ marginTop: '1rem' }}>
          <label style={{ ...labelStyle, fontSize: '0.813rem' }}>
            Add Your Own Theme
            <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Optional)</span>
          </label>
          <input
            type="text"
            value={customTheme}
            onChange={(e) => setCustomTheme(e.target.value)}
            placeholder="e.g., 'Technology as liberation', 'Urban decay and renewal', 'Generational trauma'..."
            style={inputStyle}
            disabled={isLoading}
          />
          <div style={{ marginTop: '0.375rem', fontSize: '0.75rem', color: '#64748B' }}>
            Describe a specific thematic focus not covered above. Be as specific as you like.
          </div>
        </div>
        {errors.themes && <div style={errorStyle}>{errors.themes}</div>}
      </div>

      {/* Target Length */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Target Length (words) <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <input
          type="number"
          value={targetLength}
          onChange={(e) => setTargetLength(Number(e.target.value))}
          min={40000}
          max={150000}
          step={1000}
          style={inputStyle}
          disabled={isLoading}
        />
        <div style={{ marginTop: '0.5rem', fontSize: '0.813rem', color: '#64748B' }}>
          Typical novel: 70,000-100,000 words. Epic fantasy: 100,000-150,000 words.
        </div>
        {errors.targetLength && <div style={errorStyle}>{errors.targetLength}</div>}
      </div>

      {/* Custom Story Ideas */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Your Story Ideas
          <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Optional - describe concepts you want explored)</span>
        </label>
        <textarea
          value={customIdeas}
          onChange={(e) => setCustomIdeas(e.target.value)}
          placeholder="Describe specific story ideas, character concepts, plot elements, or unique twists you want the AI to incorporate. For example: 'A librarian who discovers books can predict the future' or 'A heist involving magical artifacts in a steampunk city'..."
          rows={4}
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: '100px',
          }}
          disabled={isLoading}
        />
        <div style={{ marginTop: '0.5rem', fontSize: '0.813rem', color: '#64748B' }}>
          Be specific! The more detail you provide, the more tailored your concepts will be.
        </div>
      </div>

      {/* Additional Notes */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Additional Notes
          <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Optional)</span>
        </label>
        <textarea
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Any other preferences, inspirations, or style guidelines..."
          rows={3}
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: '80px',
          }}
          disabled={isLoading}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '1rem',
          background: isLoading
            ? '#94A3B8'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '8px',
          color: '#FFFFFF',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          boxShadow: isLoading ? 'none' : '0 4px 14px rgba(102, 126, 234, 0.4)',
        }}
      >
        {isLoading ? 'Generating Concepts...' : 'Generate Story Concepts'}
      </button>
    </form>
  );
}
