// Shared types for NovelForge

// Project Types
export type ProjectType = 'standalone' | 'trilogy';
export type ProjectStatus = 'setup' | 'generating' | 'completed';

export interface Project {
  id: string;
  title: string;
  type: ProjectType;
  genre: string;
  status: ProjectStatus;
  story_dna: StoryDNA | null;
  story_bible: StoryBible | null;
  series_bible: SeriesBible | null;  // Sprint 8: Aggregated trilogy data
  book_count: number;                 // Sprint 8: Number of books in series
  created_at: string;
  updated_at: string;
}

export interface StoryDNA {
  genre: string;
  subgenre: string;
  tone: string;
  themes: string[];
  proseStyle: string;
}

export interface StoryBible {
  characters: Character[];
  world: WorldElements;
  timeline: TimelineEvent[];
}

export interface Character {
  id: string;
  name: string;
  role: string;
  ethnicity?: string;          // Cultural/ethnic background
  nationality?: string;        // Country/region of origin
  physicalDescription?: string;
  personalityTraits: string[];
  voiceSample: string;
  goals: string[];
  conflicts: string[];
  relationships: Relationship[];
  characterArc?: string;
  currentState?: CharacterState;
}

export interface CharacterState {
  location: string;
  emotionalState: string;
  goals: string[];
  conflicts: string[];
}

export interface Relationship {
  characterId: string;
  type: string;
  description: string;
}

export interface WorldElements {
  locations: Location[];
  factions: Faction[];
  systems: System[];
}

export interface Location {
  id: string;
  name: string;
  description: string;
  significance: string;
}

export interface Faction {
  id: string;
  name: string;
  description: string;
  goals: string[];
}

export interface System {
  id: string;
  type: 'magic' | 'technology' | 'social' | 'other';
  name: string;
  description: string;
  rules: string[];
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  description: string;
  participants: string[];
}

// Book Types
export type BookStatus = 'setup' | 'generating' | 'completed';

export interface Book {
  id: string;
  project_id: string;
  book_number: number;
  title: string;
  status: BookStatus;
  word_count: number;
  ending_state: BookEndingState | null;  // Sprint 8: Snapshot of character/world state at book end
  book_summary: string | null;           // Sprint 8: Comprehensive summary for next book
  timeline_end: string | null;           // Sprint 8: When this book ends in story timeline
  created_at: string;
  updated_at: string;
}

// Chapter Types
export type ChapterStatus = 'pending' | 'writing' | 'editing' | 'completed';

export interface Chapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string | null;
  scene_cards: SceneCard[];
  content: string | null;
  summary: string | null;
  status: ChapterStatus;
  word_count: number;
  flags: Flag[];
  created_at: string;
  updated_at: string;
}

export interface SceneCard {
  id: string;
  order: number;
  location: string;
  characters: string[];
  povCharacter: string;
  timeOfDay?: string;
  goal: string;
  conflict: string;
  outcome: string;
  emotionalBeat: string;
  notes?: string;
}

export interface Flag {
  id: string;
  type: string;
  severity: 'minor' | 'major' | 'critical';
  description: string;
  location?: string;
  resolved: boolean;
}

// Job Types
export type JobType =
  | 'generate_chapter'
  | 'dev_edit'
  | 'author_revision'
  | 'line_edit'
  | 'continuity_check'
  | 'copy_edit'
  | 'generate_summary'
  | 'update_states';

export type JobStatus = 'pending' | 'running' | 'completed' | 'paused' | 'failed';

export interface Job {
  id: string;
  type: JobType;
  target_id: string;
  status: JobStatus;
  checkpoint: string | null;
  error: string | null;
  attempts: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface Checkpoint {
  jobId: string;
  step: string;
  data: any;
  completedSteps: string[];
  timestamp: string;
}

// Session Tracking Types
export interface SessionTracking {
  id: number;
  session_started_at: string | null;
  session_resets_at: string | null;
  is_active: number;
  requests_this_session: number;
}

// Context Types
export interface GenerationContext {
  storyDNA: StoryDNA;
  povCharacter: Character;
  sceneCard: SceneCard;
  otherCharacters: Character[];
  lastChapterSummary?: string;
  systemPrompts: string[];
}

// Export Types
export type ExportFormat = 'docx' | 'pdf' | 'bible';

// Progress Types
export interface GenerationProgress {
  chaptersCompleted: number;
  chaptersTotal: number;
  percentComplete: number;
  wordCount: number;
  targetWordCount: number;
  avgChapterTime: number;
  estimatedTimeRemaining: number;
  sessionsUsed: number;
  currentChapter?: {
    number: number;
    status: ChapterStatus;
  };
  recentEvents: ProgressEvent[];
  rateLimitStatus?: {
    isActive: boolean;
    requestsThisSession: number;
    timeRemaining: string;
    resetTime: string | null;
  };
}

export interface ProgressEvent {
  timestamp: string;
  type: string;
  description: string;
  chapterNumber?: number;
}

// Story Structure Types
export type StoryStructureType = 'three_act' | 'save_the_cat' | 'heros_journey' | 'seven_point' | 'freytag';

export interface StoryStructure {
  type: StoryStructureType;
  acts: Act[];
}

export interface Act {
  number: number;
  name: string;
  description: string;
  beats: Beat[];
  targetWordCount: number;
  chapters: ChapterOutline[];
}

export interface Beat {
  name: string;
  description: string;
  percentagePoint: number; // Where in the story this beat occurs (0-100)
}

export interface ChapterOutline {
  number: number;
  title: string;
  summary: string;
  actNumber: number;
  beatName?: string;
  povCharacter: string;
  wordCountTarget: number;
  scenes: SceneCard[];
}

// Outline Types
export interface Outline {
  id: string;
  book_id: string;
  structure_type: StoryStructureType;
  structure: StoryStructure;
  total_chapters: number;
  target_word_count: number;
  created_at: string;
  updated_at: string;
}

// Structure Templates
export interface StructureTemplate {
  type: StoryStructureType;
  name: string;
  description: string;
  acts: ActTemplate[];
}

export interface ActTemplate {
  number: number;
  name: string;
  description: string;
  percentageOfStory: number;
  beats: Beat[];
}

// Sprint 8: Trilogy Support Types

export interface BookEndingState {
  characters: CharacterEndingState[];
  world: WorldEndingState;
  timeline: string;  // e.g., "End of summer, Year 1024"
  unresolved: string[];  // Plot threads left open for next book
}

export interface CharacterEndingState {
  characterId: string;
  characterName: string;
  location: string;
  emotionalState: string;
  physicalState: string;
  relationships: RelationshipState[];
  goals: string[];  // What they want going into next book
  knowledge: string[];  // What they now know
  possessions: string[];  // Important items they have
}

export interface RelationshipState {
  withCharacterId: string;
  withCharacterName: string;
  status: string;  // e.g., "allies", "enemies", "estranged", "in love"
  notes: string;
}

export interface WorldEndingState {
  politicalChanges: string[];  // e.g., "King overthrown", "New alliance formed"
  physicalChanges: string[];  // e.g., "Castle destroyed", "Forest burned"
  socialChanges: string[];  // e.g., "Magic outlawed", "Trade routes opened"
  activeThreats: string[];  // Ongoing dangers
  knownSecrets: string[];  // Secrets revealed during this book
}

export interface SeriesBible {
  characters: SeriesCharacterEntry[];
  world: SeriesWorldEntry[];
  timeline: SeriesTimelineEntry[];
  themes: string[];
  mysteries: SeriesMystery[];
}

export interface SeriesCharacterEntry {
  characterId: string;
  name: string;
  role: string;
  firstAppearance: { bookNumber: number; chapterNumber: number };
  lastAppearance: { bookNumber: number; chapterNumber: number };
  status: 'alive' | 'dead' | 'unknown';
  development: CharacterDevelopment[];
}

export interface CharacterDevelopment {
  bookNumber: number;
  changes: string[];  // Key character changes in this book
  relationships: string[];  // Relationship changes
  arc: string;  // Arc progress in this book
}

export interface SeriesWorldEntry {
  elementId: string;
  type: 'location' | 'faction' | 'system' | 'other';
  name: string;
  introduced: number;  // Book number
  evolution: WorldEvolution[];
}

export interface WorldEvolution {
  bookNumber: number;
  changes: string[];
  significance: string;
}

export interface SeriesTimelineEntry {
  bookNumber: number;
  timespan: string;  // e.g., "3 months", "1 year"
  startDate: string;
  endDate: string;
  majorEvents: string[];
}

export interface SeriesMystery {
  id: string;
  question: string;
  introducedInBook: number;
  answeredInBook: number | null;
  answer: string | null;
  relatedCharacters: string[];
}

export interface BookTransition {
  id: string;
  project_id: string;
  from_book_id: string;
  to_book_id: string;
  time_gap: string;  // e.g., "3 months", "2 years"
  gap_summary: string;  // What happened during the gap
  character_changes: CharacterTransitionChange[];
  world_changes: WorldTransitionChange[];
  created_at: string;
  updated_at: string;
}

export interface CharacterTransitionChange {
  characterId: string;
  characterName: string;
  changes: string[];  // What happened to them during the gap
  newLocation: string;
  newStatus: string;
}

export interface WorldTransitionChange {
  type: string;
  description: string;
  impact: string;
}
