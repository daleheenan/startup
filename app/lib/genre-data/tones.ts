// Tone options with descriptions to help users understand each option
// Extracted from GenrePreferenceForm for reusability

export interface ToneOption {
  value: string;
  description: string;
}

export const TONES: ToneOption[] = [
  { value: 'Dark and Gritty', description: 'Harsh realities, moral ambiguity, unflinching portrayal of violence or hardship' },
  { value: 'Light and Humorous', description: 'Comedic moments, witty dialogue, fun and entertaining atmosphere' },
  { value: 'Epic and Grand', description: 'Large scale, sweeping narratives, world-changing stakes and heroic journeys' },
  { value: 'Intimate and Personal', description: 'Character-focused, emotional depth, close relationships and inner journeys' },
  { value: 'Mysterious and Suspenseful', description: 'Secrets, tension, unanswered questions that keep readers guessing' },
  { value: 'Hopeful and Uplifting', description: 'Optimistic outlook, triumph over adversity, feel-good endings' },
  { value: 'Satirical and Witty', description: 'Social commentary, clever humour, ironic observations about society' },
  { value: 'Melancholic and Reflective', description: 'Thoughtful, bittersweet, contemplative exploration of loss or memory' },
  { value: 'Tense and Fast-Paced', description: 'High stakes, quick action, page-turner momentum that builds urgency' },
  { value: 'Morally Complex', description: 'Grey areas, difficult choices, characters who challenge simple right and wrong' },
  { value: 'Romantic and Passionate', description: 'Emotional intensity, love-focused, deep connections and yearning' },
  { value: 'Whimsical and Fantastical', description: 'Playful imagination, magical wonder, dreamlike and enchanting' },
];
