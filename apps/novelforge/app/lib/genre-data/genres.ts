// Genre definitions - Classic and Specialist genres
// Extracted from GenrePreferenceForm for reusability

import { MARKET_TRENDS } from './market-trends';

export interface GenreOption {
  value: string;
  label: string;
  description: string;
  trend?: 'trending' | 'rising' | 'stable';
}

// Classic genres - traditional, well-established categories
export const CLASSIC_GENRES: GenreOption[] = [
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
export const SPECIALIST_GENRES: GenreOption[] = [
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
export const GENRES: GenreOption[] = [...CLASSIC_GENRES, ...SPECIALIST_GENRES];
