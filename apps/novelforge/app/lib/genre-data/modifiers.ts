// Genre modifiers that can combine with any genre
// Extracted from GenrePreferenceForm for reusability

export interface ModifierOption {
  value: string;
  label: string;
  description: string;
}

export const GENRE_MODIFIERS: ModifierOption[] = [
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
