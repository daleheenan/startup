/**
 * Shared TypeScript types for genre preference form components
 */

import type { TimePeriod, TimePeriodType } from '../../../shared/types';
import type { NationalityConfig } from '../NationalitySelector';

export interface BookStylePreset {
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
  // Author style reference
  authorStyleId?: string; // ID of author style to emulate
  // Timeframe/Era
  timeframe?: string; // Story time period (e.g., "1920s", "Medieval Era", "Year 2350")
  // Structured Time Period (Phase 4)
  timePeriod?: TimePeriod;
  timePeriodType?: TimePeriodType;
  specificYear?: number;
  // Character Nationality Configuration
  nationalityConfig?: NationalityConfig;
  // Generation mode for concept creation
  generateMode?: 'full' | 'summaries' | 'quick20';
}

export interface SourceProject {
  id: string;
  title: string;
  type: string;
  genre: string;
  universe_id: string | null;
}

export interface Universe {
  id: string;
  name: string;
  description: string | null;
  root_project_id: string | null;
}

export interface GenrePreferenceFormProps {
  onSubmit: (preferences: StoryPreferences) => void;
  isLoading: boolean;
}

/**
 * Common style types used across all tab components
 */
export interface CommonStyles {
  inputStyle: React.CSSProperties;
  selectStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  errorStyle: React.CSSProperties;
  sectionStyle: React.CSSProperties;
  chipStyle: (selected: boolean, disabled: boolean) => React.CSSProperties;
}
