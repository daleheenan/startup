// Common story themes for narrative focus
// Extracted from GenrePreferenceForm for reusability

export interface ThemeOption {
  value: string;
  description: string;
}

export const COMMON_THEMES: ThemeOption[] = [
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
