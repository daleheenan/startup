// Re-export all genre data for convenient imports
export { MARKET_TRENDS } from './market-trends';
export { CLASSIC_GENRES, SPECIALIST_GENRES, GENRES, type GenreOption } from './genres';
export { SUBGENRES, type SubgenreOption } from './subgenres';
export { GENRE_MODIFIERS, type ModifierOption } from './modifiers';
export { TONES, type ToneOption } from './tones';
export { COMMON_THEMES, type ThemeOption } from './themes';
export { GENRE_RECIPES, type GenreRecipe } from './recipes';
export { GENRE_COMPATIBILITY } from './compatibility';

// Romance commercial enhancements
export {
  ROMANCE_HEAT_LEVELS,
  ROMANCE_SENSUALITY_FOCUS,
  ROMANCE_CONTENT_WARNINGS,
  type HeatLevel,
  type SensualityFocus,
  type ContentWarning
} from './romance-heat-levels';
export {
  ROMANCE_BEATS,
  BEAT_PLACEMENT_GUIDE,
  REQUIRED_ROMANCE_BEATS,
  type RomanceBeat
} from './romance-beats';

// Thriller commercial enhancements
export {
  THRILLER_PACING_STYLES,
  CHAPTER_HOOK_TYPES,
  THRILLER_TWIST_TYPES,
  TICKING_CLOCK_TYPES,
  CLIFFHANGER_FREQUENCY,
  type PacingStyle,
  type ChapterHookType,
  type TwistType,
  type TickingClockType
} from './thriller-pacing';

// Sci-Fi commercial enhancements
export {
  SCIFI_HARDNESS_LEVELS,
  TECH_EXPLANATION_DEPTHS,
  COMMON_SPECULATIVE_ELEMENTS,
  SCIFI_SUBGENRE_HARDNESS_DEFAULTS,
  type HardnessLevel,
  type TechExplanationDepth,
  type SpeculativeElement
} from './scifi-classification';
