/**
 * AI Request Types
 *
 * Defines all types of AI requests for cost tracking and audit logging.
 * Each request type corresponds to a specific AI operation in the system.
 */

export const AI_REQUEST_TYPES = {
  // Chapter Generation & Editing
  CHAPTER_GENERATION: 'chapter_generation',
  CHAPTER_GENERATION_HISTORICAL: 'chapter_generation_historical',
  DEVELOPMENTAL_EDIT: 'developmental_edit',
  AUTHOR_REVISION: 'author_revision',
  LINE_EDIT: 'line_edit',
  CONTINUITY_CHECK: 'continuity_check',
  COPY_EDIT: 'copy_edit',
  PROOFREAD: 'proofread',
  GENERATE_SUMMARY: 'generate_summary',
  UPDATE_STATES: 'update_states',

  // Specialist Reviews
  SENSITIVITY_REVIEW: 'sensitivity_review',
  RESEARCH_REVIEW: 'research_review',
  BETA_READER_REVIEW: 'beta_reader_review',
  OPENING_REVIEW: 'opening_review',
  DIALOGUE_REVIEW: 'dialogue_review',
  HOOK_REVIEW: 'hook_review',

  // VEB (Virtual Editorial Board)
  VEB_BETA_SWARM: 'veb_beta_swarm',
  VEB_RUTHLESS_EDITOR: 'veb_ruthless_editor',
  VEB_MARKET_ANALYST: 'veb_market_analyst',

  // Outline Editorial Board
  OUTLINE_STRUCTURE_ANALYST: 'outline_structure_analyst',
  OUTLINE_CHARACTER_ARC: 'outline_character_arc',
  OUTLINE_MARKET_FIT: 'outline_market_fit',
  OUTLINE_REWRITE: 'outline_rewrite',

  // Coherence & Validation
  COHERENCE_CHECK: 'coherence_check',
  ORIGINALITY_CHECK: 'originality_check',

  // Generators
  STORY_DNA_GENERATION: 'story_dna_generation',
  CHARACTER_GENERATION: 'character_generation',
  WORLD_GENERATION: 'world_generation',
  OUTLINE_GENERATION: 'outline_generation',
  CONCEPT_GENERATION: 'concept_generation',
  STORY_IDEA_GENERATION: 'story_idea_generation',
  PLOT_GENERATION: 'plot_generation',

  // Follow-up Features
  SEQUEL_IDEAS: 'sequel_ideas',
  UNRESOLVED_THREADS: 'unresolved_threads',
  CHARACTER_CONTINUATIONS: 'character_continuations',
  WORLD_EXPANSIONS: 'world_expansions',
  SERIES_STRUCTURE: 'series_structure',
  TONE_VARIATIONS: 'tone_variations',

  // Word Count Revision
  WORD_COUNT_ANALYSIS: 'word_count_analysis',
  CHAPTER_REDUCTION: 'chapter_reduction',

  // Other
  PROSE_TIGHTENING: 'prose_tightening',
  MYSTERY_TRACKING: 'mystery_tracking',
  BOOK_TRANSITION: 'book_transition',
  CROSS_BOOK_CONTINUITY: 'cross_book_continuity',
  CHAPTER_BRIEF: 'chapter_brief',
  REGENERATION: 'regeneration',
  COMMERCIAL_BEAT_ANALYSIS: 'commercial_beat_analysis',

  // Lesson Curation
  LESSON_CURATION: 'lesson_curation',

  // Additional Generators & Utilities
  NAME_GENERATION: 'name_generation',
  GENRE_INFERENCE: 'genre_inference',
  AUTHOR_STYLE_LOOKUP: 'author_style_lookup',
  EDITORIAL_INTENT_DETECTION: 'editorial_intent_detection',
  EDITORIAL_RESPONSE: 'editorial_response',
  EDITORIAL_ASSISTANT: 'editorial_assistant',
  CHARACTER_DEPENDENT_FIELDS: 'character_dependent_fields',
  PLOT_ANALYSIS: 'plot_analysis',
  PLOT_THREAD_GENERATION: 'plot_thread_generation',
  SUBPLOT_GENERATION: 'subplot_generation',
  CHARACTER_ARC_GENERATION: 'character_arc_generation',
  ROMANCE_ARC_GENERATION: 'romance_arc_generation',
  MYSTERY_THREAD_GENERATION: 'mystery_thread_generation',
  ACT_BREAKDOWN: 'act_breakdown',
  CHAPTER_OUTLINE: 'chapter_outline',
  SCENE_CARD_GENERATION: 'scene_card_generation',
  CHAPTER_PROCESSING: 'chapter_processing',
} as const;

export type AIRequestType = (typeof AI_REQUEST_TYPES)[keyof typeof AI_REQUEST_TYPES];

/**
 * Friendly display names for AI request types.
 * Used in the UI for human-readable labels.
 */
export const AI_REQUEST_TYPE_LABELS: Record<AIRequestType, string> = {
  // Chapter Generation & Editing
  [AI_REQUEST_TYPES.CHAPTER_GENERATION]: 'Chapter Generation',
  [AI_REQUEST_TYPES.CHAPTER_GENERATION_HISTORICAL]: 'Chapter Generation (Historical)',
  [AI_REQUEST_TYPES.DEVELOPMENTAL_EDIT]: 'Developmental Edit',
  [AI_REQUEST_TYPES.AUTHOR_REVISION]: 'Author Revision',
  [AI_REQUEST_TYPES.LINE_EDIT]: 'Line Edit',
  [AI_REQUEST_TYPES.CONTINUITY_CHECK]: 'Continuity Check',
  [AI_REQUEST_TYPES.COPY_EDIT]: 'Copy Edit',
  [AI_REQUEST_TYPES.PROOFREAD]: 'Proofread',
  [AI_REQUEST_TYPES.GENERATE_SUMMARY]: 'Generate Summary',
  [AI_REQUEST_TYPES.UPDATE_STATES]: 'Update States',

  // Specialist Reviews
  [AI_REQUEST_TYPES.SENSITIVITY_REVIEW]: 'Sensitivity Review',
  [AI_REQUEST_TYPES.RESEARCH_REVIEW]: 'Research Review',
  [AI_REQUEST_TYPES.BETA_READER_REVIEW]: 'Beta Reader Review',
  [AI_REQUEST_TYPES.OPENING_REVIEW]: 'Opening Review',
  [AI_REQUEST_TYPES.DIALOGUE_REVIEW]: 'Dialogue Review',
  [AI_REQUEST_TYPES.HOOK_REVIEW]: 'Hook Review',

  // VEB
  [AI_REQUEST_TYPES.VEB_BETA_SWARM]: 'VEB: Beta Swarm',
  [AI_REQUEST_TYPES.VEB_RUTHLESS_EDITOR]: 'VEB: Ruthless Editor',
  [AI_REQUEST_TYPES.VEB_MARKET_ANALYST]: 'VEB: Market Analyst',

  // Outline Editorial
  [AI_REQUEST_TYPES.OUTLINE_STRUCTURE_ANALYST]: 'Outline: Structure Analyst',
  [AI_REQUEST_TYPES.OUTLINE_CHARACTER_ARC]: 'Outline: Character Arc',
  [AI_REQUEST_TYPES.OUTLINE_MARKET_FIT]: 'Outline: Market Fit',
  [AI_REQUEST_TYPES.OUTLINE_REWRITE]: 'Outline Rewrite',

  // Coherence & Validation
  [AI_REQUEST_TYPES.COHERENCE_CHECK]: 'Coherence Check',
  [AI_REQUEST_TYPES.ORIGINALITY_CHECK]: 'Originality Check',

  // Generators
  [AI_REQUEST_TYPES.STORY_DNA_GENERATION]: 'Story DNA Generation',
  [AI_REQUEST_TYPES.CHARACTER_GENERATION]: 'Character Generation',
  [AI_REQUEST_TYPES.WORLD_GENERATION]: 'World Generation',
  [AI_REQUEST_TYPES.OUTLINE_GENERATION]: 'Outline Generation',
  [AI_REQUEST_TYPES.CONCEPT_GENERATION]: 'Concept Generation',
  [AI_REQUEST_TYPES.STORY_IDEA_GENERATION]: 'Story Idea Generation',
  [AI_REQUEST_TYPES.PLOT_GENERATION]: 'Plot Generation',

  // Follow-up
  [AI_REQUEST_TYPES.SEQUEL_IDEAS]: 'Sequel Ideas',
  [AI_REQUEST_TYPES.UNRESOLVED_THREADS]: 'Unresolved Threads',
  [AI_REQUEST_TYPES.CHARACTER_CONTINUATIONS]: 'Character Continuations',
  [AI_REQUEST_TYPES.WORLD_EXPANSIONS]: 'World Expansions',
  [AI_REQUEST_TYPES.SERIES_STRUCTURE]: 'Series Structure',
  [AI_REQUEST_TYPES.TONE_VARIATIONS]: 'Tone Variations',

  // Word Count
  [AI_REQUEST_TYPES.WORD_COUNT_ANALYSIS]: 'Word Count Analysis',
  [AI_REQUEST_TYPES.CHAPTER_REDUCTION]: 'Chapter Reduction',

  // Other
  [AI_REQUEST_TYPES.PROSE_TIGHTENING]: 'Prose Tightening',
  [AI_REQUEST_TYPES.MYSTERY_TRACKING]: 'Mystery Tracking',
  [AI_REQUEST_TYPES.BOOK_TRANSITION]: 'Book Transition',
  [AI_REQUEST_TYPES.CROSS_BOOK_CONTINUITY]: 'Cross-Book Continuity',
  [AI_REQUEST_TYPES.CHAPTER_BRIEF]: 'Chapter Brief',
  [AI_REQUEST_TYPES.REGENERATION]: 'Regeneration',
  [AI_REQUEST_TYPES.COMMERCIAL_BEAT_ANALYSIS]: 'Commercial Beat Analysis',

  // Lesson Curation
  [AI_REQUEST_TYPES.LESSON_CURATION]: 'Lesson Curation',

  // Additional Generators & Utilities
  [AI_REQUEST_TYPES.NAME_GENERATION]: 'Name Generation',
  [AI_REQUEST_TYPES.GENRE_INFERENCE]: 'Genre Inference',
  [AI_REQUEST_TYPES.AUTHOR_STYLE_LOOKUP]: 'Author Style Lookup',
  [AI_REQUEST_TYPES.EDITORIAL_INTENT_DETECTION]: 'Editorial Intent Detection',
  [AI_REQUEST_TYPES.EDITORIAL_RESPONSE]: 'Editorial Response',
  [AI_REQUEST_TYPES.EDITORIAL_ASSISTANT]: 'Editorial Assistant',
  [AI_REQUEST_TYPES.CHARACTER_DEPENDENT_FIELDS]: 'Character Dependent Fields',
  [AI_REQUEST_TYPES.PLOT_ANALYSIS]: 'Plot Analysis',
  [AI_REQUEST_TYPES.PLOT_THREAD_GENERATION]: 'Plot Thread Generation',
  [AI_REQUEST_TYPES.SUBPLOT_GENERATION]: 'Subplot Generation',
  [AI_REQUEST_TYPES.CHARACTER_ARC_GENERATION]: 'Character Arc Generation',
  [AI_REQUEST_TYPES.ROMANCE_ARC_GENERATION]: 'Romance Arc Generation',
  [AI_REQUEST_TYPES.MYSTERY_THREAD_GENERATION]: 'Mystery Thread Generation',
  [AI_REQUEST_TYPES.ACT_BREAKDOWN]: 'Act Breakdown',
  [AI_REQUEST_TYPES.CHAPTER_OUTLINE]: 'Chapter Outline',
  [AI_REQUEST_TYPES.SCENE_CARD_GENERATION]: 'Scene Card Generation',
  [AI_REQUEST_TYPES.CHAPTER_PROCESSING]: 'Chapter Processing',
};

/**
 * Category groupings for AI request types.
 * Used for filtering and organising in the UI.
 */
export const AI_REQUEST_TYPE_CATEGORIES = {
  'Chapter Operations': [
    AI_REQUEST_TYPES.CHAPTER_GENERATION,
    AI_REQUEST_TYPES.CHAPTER_GENERATION_HISTORICAL,
    AI_REQUEST_TYPES.DEVELOPMENTAL_EDIT,
    AI_REQUEST_TYPES.AUTHOR_REVISION,
    AI_REQUEST_TYPES.LINE_EDIT,
    AI_REQUEST_TYPES.CONTINUITY_CHECK,
    AI_REQUEST_TYPES.COPY_EDIT,
    AI_REQUEST_TYPES.PROOFREAD,
    AI_REQUEST_TYPES.GENERATE_SUMMARY,
    AI_REQUEST_TYPES.UPDATE_STATES,
    AI_REQUEST_TYPES.REGENERATION,
  ],
  'Editorial Board': [
    AI_REQUEST_TYPES.VEB_BETA_SWARM,
    AI_REQUEST_TYPES.VEB_RUTHLESS_EDITOR,
    AI_REQUEST_TYPES.VEB_MARKET_ANALYST,
  ],
  'Outline Editorial': [
    AI_REQUEST_TYPES.OUTLINE_STRUCTURE_ANALYST,
    AI_REQUEST_TYPES.OUTLINE_CHARACTER_ARC,
    AI_REQUEST_TYPES.OUTLINE_MARKET_FIT,
    AI_REQUEST_TYPES.OUTLINE_REWRITE,
  ],
  'Specialist Reviews': [
    AI_REQUEST_TYPES.SENSITIVITY_REVIEW,
    AI_REQUEST_TYPES.RESEARCH_REVIEW,
    AI_REQUEST_TYPES.BETA_READER_REVIEW,
    AI_REQUEST_TYPES.OPENING_REVIEW,
    AI_REQUEST_TYPES.DIALOGUE_REVIEW,
    AI_REQUEST_TYPES.HOOK_REVIEW,
  ],
  'Quality Checks': [
    AI_REQUEST_TYPES.COHERENCE_CHECK,
    AI_REQUEST_TYPES.ORIGINALITY_CHECK,
    AI_REQUEST_TYPES.CROSS_BOOK_CONTINUITY,
    AI_REQUEST_TYPES.MYSTERY_TRACKING,
  ],
  Generation: [
    AI_REQUEST_TYPES.STORY_DNA_GENERATION,
    AI_REQUEST_TYPES.CHARACTER_GENERATION,
    AI_REQUEST_TYPES.WORLD_GENERATION,
    AI_REQUEST_TYPES.OUTLINE_GENERATION,
    AI_REQUEST_TYPES.CONCEPT_GENERATION,
    AI_REQUEST_TYPES.STORY_IDEA_GENERATION,
    AI_REQUEST_TYPES.PLOT_GENERATION,
    AI_REQUEST_TYPES.CHAPTER_BRIEF,
    AI_REQUEST_TYPES.NAME_GENERATION,
    AI_REQUEST_TYPES.PLOT_THREAD_GENERATION,
    AI_REQUEST_TYPES.SUBPLOT_GENERATION,
    AI_REQUEST_TYPES.CHARACTER_ARC_GENERATION,
    AI_REQUEST_TYPES.ROMANCE_ARC_GENERATION,
    AI_REQUEST_TYPES.MYSTERY_THREAD_GENERATION,
    AI_REQUEST_TYPES.ACT_BREAKDOWN,
    AI_REQUEST_TYPES.CHAPTER_OUTLINE,
    AI_REQUEST_TYPES.SCENE_CARD_GENERATION,
    AI_REQUEST_TYPES.CHARACTER_DEPENDENT_FIELDS,
  ],
  'Editorial & Analysis': [
    AI_REQUEST_TYPES.EDITORIAL_INTENT_DETECTION,
    AI_REQUEST_TYPES.EDITORIAL_RESPONSE,
    AI_REQUEST_TYPES.EDITORIAL_ASSISTANT,
    AI_REQUEST_TYPES.GENRE_INFERENCE,
    AI_REQUEST_TYPES.AUTHOR_STYLE_LOOKUP,
  ],
  'Background Processing': [
    AI_REQUEST_TYPES.CHAPTER_PROCESSING,
  ],
  'Follow-up': [
    AI_REQUEST_TYPES.SEQUEL_IDEAS,
    AI_REQUEST_TYPES.UNRESOLVED_THREADS,
    AI_REQUEST_TYPES.CHARACTER_CONTINUATIONS,
    AI_REQUEST_TYPES.WORLD_EXPANSIONS,
    AI_REQUEST_TYPES.SERIES_STRUCTURE,
    AI_REQUEST_TYPES.TONE_VARIATIONS,
    AI_REQUEST_TYPES.BOOK_TRANSITION,
  ],
  'Word Count': [
    AI_REQUEST_TYPES.WORD_COUNT_ANALYSIS,
    AI_REQUEST_TYPES.CHAPTER_REDUCTION,
    AI_REQUEST_TYPES.PROSE_TIGHTENING,
  ],
  Analysis: [AI_REQUEST_TYPES.COMMERCIAL_BEAT_ANALYSIS],
  'Lesson Management': [AI_REQUEST_TYPES.LESSON_CURATION],
} as const;

/**
 * Get all request types as an array for dropdown menus.
 */
export function getAllRequestTypes(): Array<{ value: AIRequestType; label: string }> {
  return Object.entries(AI_REQUEST_TYPE_LABELS).map(([value, label]) => ({
    value: value as AIRequestType,
    label,
  }));
}

/**
 * Get request types grouped by category for grouped dropdown menus.
 */
export function getRequestTypesByCategory(): Array<{
  category: string;
  types: Array<{ value: AIRequestType; label: string }>;
}> {
  return Object.entries(AI_REQUEST_TYPE_CATEGORIES).map(([category, types]) => ({
    category,
    types: types.map((type) => ({
      value: type,
      label: AI_REQUEST_TYPE_LABELS[type],
    })),
  }));
}
