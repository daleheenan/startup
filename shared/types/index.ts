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
