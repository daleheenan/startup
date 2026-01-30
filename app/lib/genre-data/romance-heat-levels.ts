// Romance Heat Level Classification
// Allows readers to filter by spiciness preference - crucial for Kindle Unlimited success

export interface HeatLevel {
  level: number;
  name: string;
  description: string;
  contentGuide: string;
  marketingTerms: string[];
  readerExpectations: string[];
}

export const ROMANCE_HEAT_LEVELS: HeatLevel[] = [
  {
    level: 1,
    name: 'Sweet',
    description: 'Clean romance with no explicit content. Focus on emotional connection.',
    contentGuide: 'Closed door. Intimacy may be implied but never shown. Kisses are typically brief.',
    marketingTerms: ['Clean Romance', 'Sweet Romance', 'Wholesome', 'Closed Door', 'No Spice'],
    readerExpectations: [
      'No explicit content whatsoever',
      'Romance focused on emotional journey',
      'Suitable for all audiences',
      'Hand-holding and chaste kisses maximum',
      'Often faith-based or inspirational'
    ]
  },
  {
    level: 2,
    name: 'Warm',
    description: 'Mild sensuality with fade-to-black intimate scenes.',
    contentGuide: 'Door closes before explicit content. Kissing can be passionate. Desire acknowledged.',
    marketingTerms: ['Low Heat', 'Fade to Black', 'Mild', 'Light Steam', 'PG-13'],
    readerExpectations: [
      'Passionate kissing on page',
      'Sexual tension present',
      'Intimate scenes fade to black',
      'Morning after implications acceptable',
      'Physical attraction described but not graphically'
    ]
  },
  {
    level: 3,
    name: 'Steamy',
    description: 'Moderate explicit content with tasteful intimate scenes.',
    contentGuide: 'Some explicit scenes but not overly graphic. Focus on emotion during intimacy.',
    marketingTerms: ['Steamy', 'Sensual', 'Moderate Heat', 'Some Spice', 'R-rated'],
    readerExpectations: [
      '2-4 intimate scenes typically',
      'Explicit but not graphic language',
      'Emotion-focused intimacy',
      'Tasteful sensuality',
      'Mainstream romance heat level'
    ]
  },
  {
    level: 4,
    name: 'Hot',
    description: 'Detailed intimate scenes with explicit content throughout.',
    contentGuide: 'Multiple explicit scenes with graphic detail. Strong sexual themes.',
    marketingTerms: ['Hot', 'Spicy', 'High Heat', 'Explicit', 'Adult Romance'],
    readerExpectations: [
      'Multiple explicit scenes',
      'Graphic language used',
      'Sexual content integral to story',
      'Detailed physical descriptions',
      'For mature readers'
    ]
  },
  {
    level: 5,
    name: 'Scorching',
    description: 'Very explicit content. Erotica-adjacent with strong focus on physical intimacy.',
    contentGuide: 'Frequent, very detailed intimate scenes. May include kink or taboo elements.',
    marketingTerms: ['Scorching', 'Extra Spicy', 'Erotica', 'Very Explicit', '18+ Only'],
    readerExpectations: [
      'Frequent explicit scenes',
      'Very graphic content',
      'May include kink/BDSM elements',
      'Sexual content is primary focus',
      'Erotica or erotica-adjacent'
    ]
  }
];

export const ROMANCE_SENSUALITY_FOCUS = [
  { value: 'emotional', label: 'Emotional Focus', description: 'Intimacy emphasises emotional connection and feelings' },
  { value: 'physical', label: 'Physical Focus', description: 'Intimacy emphasises physical sensations and desire' },
  { value: 'balanced', label: 'Balanced', description: 'Equal emphasis on emotional and physical aspects' }
] as const;

export const ROMANCE_CONTENT_WARNINGS = [
  { value: 'cheating', label: 'Cheating/Infidelity', description: 'Romantic partners cheat on current relationships' },
  { value: 'ow_om_drama', label: 'OW/OM Drama', description: 'Other Woman/Other Man creates conflict' },
  { value: 'dubcon', label: 'Dubious Consent', description: 'Consent may be ambiguous in some scenes' },
  { value: 'power_imbalance', label: 'Power Imbalance', description: 'Significant power dynamic between partners' },
  { value: 'age_gap', label: 'Significant Age Gap', description: 'Large age difference between romantic leads' },
  { value: 'taboo', label: 'Taboo Relationship', description: 'Relationship considered taboo by society' },
  { value: 'dark_themes', label: 'Dark Themes', description: 'Contains dark romantic themes' },
  { value: 'violence', label: 'Violence', description: 'Contains violent scenes' },
  { value: 'trauma', label: 'Past Trauma', description: 'Characters deal with past trauma' },
  { value: 'grief', label: 'Grief/Loss', description: 'Significant grief or loss themes' },
  { value: 'mental_health', label: 'Mental Health', description: 'Mental health themes present' },
  { value: 'cliffhanger', label: 'Cliffhanger Ending', description: 'Story ends on unresolved cliffhanger' }
] as const;

export type SensualityFocus = typeof ROMANCE_SENSUALITY_FOCUS[number]['value'];
export type ContentWarning = typeof ROMANCE_CONTENT_WARNINGS[number]['value'];
