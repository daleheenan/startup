import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface StoryPreferences {
  genre: string;
  subgenre: string;
  tone: string;
  themes: string[];
  targetLength: number;
  additionalNotes?: string;
}

export interface StoryConcept {
  id: string;
  title: string;
  logline: string;
  synopsis: string;
  hook: string;
  protagonistHint: string;
  conflictType: string;
}

/**
 * Generate 5 diverse story concepts based on user preferences
 */
export async function generateConcepts(
  preferences: StoryPreferences
): Promise<StoryConcept[]> {
  const { genre, subgenre, tone, themes, targetLength, additionalNotes } = preferences;

  // Build the prompt for concept generation
  const prompt = buildConceptPrompt(preferences);

  console.log('[ConceptGenerator] Calling Claude API...');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 4000,
      temperature: 1.0, // High creativity for diverse concepts
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract the response text
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse the JSON response
    const concepts = parseConceptsResponse(responseText);

    if (!concepts || concepts.length === 0) {
      throw new Error('Failed to parse concepts from Claude response');
    }

    console.log(`[ConceptGenerator] Successfully generated ${concepts.length} concepts`);

    return concepts;
  } catch (error: any) {
    console.error('[ConceptGenerator] Error:', error);
    throw error;
  }
}

/**
 * Build the prompt for concept generation
 */
function buildConceptPrompt(preferences: StoryPreferences): string {
  const { genre, subgenre, tone, themes, targetLength, additionalNotes } = preferences;

  const themesText = themes.join(', ');
  const wordCountContext = getWordCountContext(targetLength);

  return `You are a master storyteller and concept developer. Generate 5 diverse, compelling story concepts based on these preferences:

**Genre:** ${genre}
**Subgenre:** ${subgenre}
**Tone:** ${tone}
**Themes:** ${themesText}
**Target Length:** ${targetLength.toLocaleString()} words (${wordCountContext})
${additionalNotes ? `**Additional Notes:** ${additionalNotes}` : ''}

Generate 5 DISTINCT story concepts that:
1. Fit the genre and subgenre conventions
2. Match the specified tone
3. Explore the selected themes in different ways
4. Have compelling hooks that grab readers immediately
5. Feature unique protagonists with clear goals and conflicts
6. Are appropriate for the target length

For EACH concept, provide:
- **title**: A compelling, genre-appropriate title
- **logline**: A one-sentence hook (25-40 words)
- **synopsis**: A 3-paragraph synopsis covering setup, conflict, and stakes (150-200 words)
- **hook**: What makes this story unique and compelling (1-2 sentences)
- **protagonistHint**: Brief description of the protagonist (name, role, key trait)
- **conflictType**: The primary conflict type (internal, external, both)

IMPORTANT:
- Make each concept VERY DIFFERENT from the others
- Vary the protagonist types, conflict structures, and story approaches
- Ensure strong story hooks that intrigue readers
- Match the genre conventions and tone precisely
- Make concepts appropriate for the target word count

Return ONLY a JSON array of 5 concepts in this exact format:
[
  {
    "id": "concept-1",
    "title": "The Shadow's Bargain",
    "logline": "When a street thief discovers she can steal memories, she must choose between saving her dying sister or preventing a tyrannical emperor from erasing an entire rebellion from history.",
    "synopsis": "Kira has survived the slums of Ashenthal by stealing what she can and staying invisible. But when she accidentally absorbs a dying woman's memories, she discovers an ability she never wanted: memory theft. Each stolen memory comes with its own burden, forcing Kira to live fragments of other lives.\n\nHer world shatters when her younger sister falls ill with the same wasting disease that killed their mother. The only cure lies in the imperial palace, where the Emperor hoards magical remedies for his elite. To save her sister, Kira must infiltrate the palace and steal the cure—but she discovers something far more sinister. The Emperor is using memory magic to erase all knowledge of a growing rebellion, condemning thousands to forget why they fight.\n\nNow Kira faces an impossible choice: save her sister with the cure she came for, or risk everything to preserve the memories of a revolution. If she fails, an entire people will forget they were ever oppressed. If she succeeds, her sister dies. And the Emperor's memory hunters are already on her trail.",
    "hook": "A thief who steals memories must choose between family and revolution in a world where forgetting is the ultimate weapon.",
    "protagonistHint": "Kira - street thief with newly discovered memory-stealing powers, fiercely protective of her sister",
    "conflictType": "both"
  },
  ...
]`;
}

/**
 * Get context about the target word count
 */
function getWordCountContext(targetLength: number): string {
  if (targetLength < 60000) {
    return 'novella or short novel';
  } else if (targetLength < 90000) {
    return 'standard novel';
  } else if (targetLength < 120000) {
    return 'longer novel';
  } else {
    return 'epic-length novel';
  }
}

/**
 * Parse concepts from Claude's JSON response
 */
function parseConceptsResponse(responseText: string): StoryConcept[] {
  try {
    // Try to extract JSON from the response
    // Claude might wrap it in markdown code blocks
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const concepts = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(concepts)) {
      throw new Error('Response is not an array');
    }

    // Validate each concept has required fields
    for (const concept of concepts) {
      if (!concept.id || !concept.title || !concept.logline || !concept.synopsis) {
        throw new Error('Concept missing required fields');
      }
    }

    return concepts;
  } catch (error: any) {
    console.error('[ConceptGenerator] Parse error:', error);
    console.error('[ConceptGenerator] Response text:', responseText);
    throw new Error(`Failed to parse concepts: ${error.message}`);
  }
}
