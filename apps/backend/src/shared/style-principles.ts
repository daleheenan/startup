/**
 * Style Principles for Prose Generation and Editorial Review
 *
 * These principles guide both initial chapter generation and post-generation
 * editorial passes. They encode the craft wisdom of professional editors
 * distilled into actionable rules.
 *
 * Based on editorial feedback analysis - the goal is tighter, cleaner prose
 * that trusts the reader.
 */

/**
 * Core style principles - injected into generation prompts
 */
export const PROSE_STYLE_PRINCIPLES = `
PROSE ECONOMY PRINCIPLES (CRITICAL):

1. ELIMINATE REDUNDANT ENUMERATION
   - DON'T: "every erasure, every anachronism, every telltale sign of forgery"
   - DO: "every telltale sign of forgery" (let the payoff deliver specifics)
   - RULE: Don't list examples then restate them as a category

2. TRUST THE CONCRETE
   - Details in the payoff don't need setup in the premise
   - If you'll show moved erasures and missing anachronisms later, don't preview them
   - The reader can infer from concrete details

3. CUT THE OBVIOUS
   - Don't explain what the reader just witnessed
   - "He slammed the door. He was angry." → "He slammed the door."
   - Action reveals emotion; don't caption it

4. ONE THOUGHT PER CONSTRUCTION
   - A sentence should do one job well
   - Split compound ideas into separate sentences
   - Commas for breathing, not for cramming

5. TRUST SUBTEXT
   - Characters don't need to state their feelings explicitly
   - Readers enjoy inferring meaning from context
   - The unsaid is often more powerful than the said

6. END ON STRENGTH
   - Put the punch word at the end of the sentence
   - "The erasures were in different places, and the anachronisms were gone."
   - The revelation lands at the period

7. VARY RHYTHM
   - Mix short punchy sentences with longer flowing ones
   - Three shorts in a row feel choppy
   - Three longs in a row feel dense
   - Alternate for pace

8. PREFER ACTIVE CONSTRUCTIONS
   - "She noticed the discrepancy" → "The discrepancy caught her eye"
   - Passive weakens impact unless deliberately used for effect
   - Characters act; they don't "seem to" or "appear to"

9. CUT QUALIFIERS
   - "very", "really", "quite", "rather", "somewhat" → usually delete
   - "He was quite angry" → "He was furious" or just show the anger
   - Qualifiers dilute instead of strengthen

10. SPECIFICITY OVER GENERALITY
    - "bird" → "crow" (if it matters)
    - "walked" → "strode" or "shuffled" (if the manner matters)
    - Generic words signal the detail doesn't matter
`;

/**
 * Anti-patterns to detect and flag during editorial review
 */
export const PROSE_ANTI_PATTERNS = [
  {
    id: 'redundant_enumeration',
    name: 'Redundant Enumeration',
    description: 'Listing specific examples then restating them as a general category',
    examples: [
      {
        bad: 'every erasure, every anachronism, every telltale sign of forgery',
        good: 'every telltale sign of forgery',
        explanation: 'Let the later payoff deliver the specifics',
      },
      {
        bad: 'happiness, joy, and positive emotions filled her',
        good: 'joy filled her',
        explanation: 'Pick the strongest word; the category adds nothing',
      },
    ],
    regex: /\b(every|all the|various|different)\s+\w+,\s+(every|all the|various|different)\s+\w+,\s+(every|all the|and various|and different|and every|and all)/gi,
    severity: 'moderate',
  },
  {
    id: 'telling_after_showing',
    name: 'Telling After Showing',
    description: 'Explaining what the reader just witnessed through action',
    examples: [
      {
        bad: 'He slammed the door. He was angry.',
        good: 'He slammed the door.',
        explanation: 'The action already conveyed the emotion',
      },
      {
        bad: 'She smiled warmly. She was happy to see him.',
        good: 'She smiled warmly.',
        explanation: 'Trust the reader to understand warmth means happiness',
      },
    ],
    // Matches action followed by emotion statement with same subject
    regex: /\.\s+(He|She|They|It)\s+(was|were|felt|seemed)\s+(angry|happy|sad|frustrated|relieved|excited|nervous|anxious)/gi,
    severity: 'moderate',
  },
  {
    id: 'weak_qualifiers',
    name: 'Weak Qualifiers',
    description: 'Words that dilute instead of strengthen',
    examples: [
      {
        bad: 'She was very tired.',
        good: 'She was exhausted.',
        explanation: 'Find a stronger word or show the tiredness',
      },
      {
        bad: 'He was quite angry.',
        good: 'His jaw clenched.',
        explanation: 'Show the anger rather than telling with qualifiers',
      },
    ],
    regex: /\b(very|really|quite|rather|somewhat|a bit|a little|kind of|sort of)\s+(angry|happy|sad|tired|scared|excited|nervous|worried|upset|annoyed|frustrated|surprised|confused|certain|sure|obvious)\b/gi,
    severity: 'minor',
  },
  {
    id: 'overexplanation',
    name: 'Overexplanation',
    description: 'Spelling out what subtext already conveys',
    examples: [
      {
        bad: '"I\'m fine," she said, lying through her teeth because she didn\'t want him to worry.',
        good: '"I\'m fine," she said, not meeting his eyes.',
        explanation: 'The reader can infer the lie and motive',
      },
    ],
    // Hard to regex - flag candidates for manual review
    regex: /because\s+(she|he|they)\s+(didn't want|wanted to|needed to|had to|was trying to)/gi,
    severity: 'minor',
  },
  {
    id: 'triple_adjectives',
    name: 'Triple Adjectives',
    description: 'Lists of three adjectives in a row',
    examples: [
      {
        bad: 'the dark, cold, empty room',
        good: 'the cold room' + ' (pick the one that matters most)',
        explanation: 'One precise adjective beats three generic ones',
      },
    ],
    regex: /\b\w+,\s+\w+,\s+(and\s+)?\w+\s+(room|house|building|street|sky|eyes|face|voice|silence|darkness|light)\b/gi,
    severity: 'minor',
  },
  {
    id: 'sense_of_phrases',
    name: '"Sense of" Phrases',
    description: 'Distancing phrases that weaken description',
    examples: [
      {
        bad: 'She felt a sense of dread.',
        good: 'Dread coiled in her stomach.',
        explanation: 'Direct emotional description is more visceral',
      },
    ],
    regex: /\b(a sense of|felt a wave of|a feeling of|the weight of|washed over)\b/gi,
    severity: 'moderate',
  },
  {
    id: 'passive_perception',
    name: 'Passive Perception',
    description: 'Characters "seem to" instead of acting',
    examples: [
      {
        bad: 'He seemed to hesitate.',
        good: 'He hesitated.',
        explanation: 'Commit to the action; POV character certainty',
      },
      {
        bad: 'She appeared to be nervous.',
        good: 'Her hands trembled.',
        explanation: 'Show the nervousness directly',
      },
    ],
    regex: /\b(seemed to|appeared to|looked like|as if|as though)\s+(be|have|hesitate|pause|consider|think|wonder|know|understand|feel)\b/gi,
    severity: 'minor',
  },
  {
    id: 'filter_words',
    name: 'Filter Words',
    description: 'Words that distance reader from character experience',
    examples: [
      {
        bad: 'She noticed the door was open.',
        good: 'The door stood open.',
        explanation: 'In deep POV, we experience through the character directly',
      },
      {
        bad: 'He could hear footsteps in the hall.',
        good: 'Footsteps echoed in the hall.',
        explanation: 'Skip the character noticing; we\'re already in their head',
      },
    ],
    regex: /\b(she|he|I)\s+(noticed|saw|heard|felt|watched|observed|realized|knew|thought|wondered)\s+(that|the|a|how)/gi,
    severity: 'minor',
  },
  {
    id: 'weak_verbs',
    name: 'Weak Verb + Adverb',
    description: 'Using adverbs to prop up weak verbs',
    examples: [
      {
        bad: 'He walked slowly.',
        good: 'He shuffled.' + ' or ' + 'He trudged.',
        explanation: 'Find a verb that carries the meaning',
      },
      {
        bad: 'She said angrily.',
        good: 'She snapped.' + ' or ' + 'She spat.',
        explanation: 'Dialogue tags with manner adverbs are weak',
      },
    ],
    regex: /\b(walked|ran|said|looked|moved|went|came)\s+(slowly|quickly|quietly|loudly|angrily|sadly|happily|nervously)\b/gi,
    severity: 'minor',
  },
  {
    id: 'began_started',
    name: 'Began/Started',
    description: 'Unnecessary preamble to action',
    examples: [
      {
        bad: 'She began to run.',
        good: 'She ran.',
        explanation: 'Just show the action happening',
      },
      {
        bad: 'He started walking toward the door.',
        good: 'He walked toward the door.',
        explanation: 'The beginning is implied in the action',
      },
    ],
    regex: /\b(began|started)\s+to\s+\w+/gi,
    severity: 'minor',
  },
];

/**
 * Categories for organising style issues
 */
export type StyleCategory =
  | 'redundancy'      // Saying the same thing twice
  | 'economy'         // Using more words than needed
  | 'trust_reader'    // Over-explaining or hand-holding
  | 'precision'       // Vague or generic language
  | 'rhythm'          // Sentence flow and variety
  | 'voice'           // POV violations or filter words
  | 'strength';       // Weak verbs, qualifiers, passive

/**
 * Severity levels for style issues
 */
export type StyleSeverity = 'minor' | 'moderate' | 'major';

/**
 * Style issue detected during editorial review
 */
export interface StyleIssue {
  patternId: string;
  name: string;
  text: string;
  location: {
    paragraph: number;
    offset: number;
    length: number;
  };
  suggestion?: string;
  severity: StyleSeverity;
  category: StyleCategory;
}

/**
 * Map anti-patterns to categories
 */
export const PATTERN_CATEGORIES: Record<string, StyleCategory> = {
  redundant_enumeration: 'redundancy',
  telling_after_showing: 'trust_reader',
  weak_qualifiers: 'strength',
  overexplanation: 'trust_reader',
  triple_adjectives: 'economy',
  sense_of_phrases: 'strength',
  passive_perception: 'strength',
  filter_words: 'voice',
  weak_verbs: 'strength',
  began_started: 'economy',
};

/**
 * Get a compact version of style principles for generation prompts
 * (Shorter than the full version to conserve tokens)
 */
export function getCompactStylePrinciples(): string {
  return `
PROSE ECONOMY (apply throughout):
- Don't list examples then restate as a category (redundant enumeration)
- Trust concrete details to carry meaning; skip the preview
- Don't explain what action already showed (no captioning emotions)
- Cut "very/quite/rather" - find stronger words or show instead
- Delete "began to/started to" - just show the action
- Avoid "a sense of", "felt a wave of", "the weight of"
- Skip "seemed to/appeared to" - commit to the action
- Reduce filter words: "she noticed", "he could hear" - just describe directly
- One precise adjective beats three generic ones
- Put the punch word at end of sentence
`.trim();
}

/**
 * Get the full style principles for the system prompt
 */
export function getFullStylePrinciples(): string {
  return PROSE_STYLE_PRINCIPLES.trim();
}

/**
 * Export anti-patterns for use by editorial agent
 */
export function getAntiPatterns() {
  return PROSE_ANTI_PATTERNS;
}
