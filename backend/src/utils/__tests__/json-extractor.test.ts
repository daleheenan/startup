import { describe, it, expect } from '@jest/globals';
import { extractJsonArray, extractJsonObject, cleanJsonString } from '../json-extractor.js';

describe('json-extractor', () => {
  describe('extractJsonArray', () => {
    it('should extract a simple JSON array', () => {
      const input = '[1, 2, 3]';
      const result = extractJsonArray<number>(input);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should extract JSON array from markdown code block', () => {
      const input = `Here's the data:
\`\`\`json
[{"name": "Alice"}, {"name": "Bob"}]
\`\`\`
That's the list.`;
      const result = extractJsonArray<{ name: string }>(input);
      expect(result).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
    });

    it('should extract JSON array from text with extra content', () => {
      const input = `I've generated the following acts:
[
  {"number": 1, "name": "Act 1"},
  {"number": 2, "name": "Act 2"}
]
Let me know if you need changes.`;
      const result = extractJsonArray(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('number', 1);
    });

    it('should handle nested arrays', () => {
      const input = '[{"items": [1, 2, 3]}, {"items": [4, 5, 6]}]';
      const result = extractJsonArray(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('items');
    });

    it('should handle strings with brackets inside', () => {
      const input = '[{"text": "This has [brackets] inside"}, {"text": "And [more] here"}]';
      const result = extractJsonArray(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('text', 'This has [brackets] inside');
    });

    it('should throw error when no valid JSON array is found', () => {
      const input = 'This is just plain text without any JSON';
      expect(() => extractJsonArray(input)).toThrow('No valid JSON array found');
    });

    it('should handle code block without json label', () => {
      const input = `\`\`\`
[{"id": 1}]
\`\`\``;
      const result = extractJsonArray(input);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('extractJsonObject', () => {
    it('should extract a simple JSON object', () => {
      const input = '{"name": "Test", "value": 42}';
      const result = extractJsonObject(input);
      expect(result).toEqual({ name: 'Test', value: 42 });
    });

    it('should extract JSON object from markdown code block', () => {
      const input = `\`\`\`json
{"status": "success", "data": [1, 2, 3]}
\`\`\``;
      const result = extractJsonObject(input);
      expect(result).toHaveProperty('status', 'success');
    });

    it('should handle nested objects', () => {
      const input = '{"outer": {"inner": {"deep": "value"}}}';
      const result = extractJsonObject<{ outer: { inner: { deep: string } } }>(input);
      expect(result.outer.inner.deep).toBe('value');
    });

    it('should throw error when no valid JSON object is found', () => {
      const input = 'Just some text [with an array]';
      expect(() => extractJsonObject(input)).toThrow('No valid JSON object found');
    });
  });

  describe('cleanJsonString', () => {
    it('should remove trailing commas before closing brackets', () => {
      const input = '{"a": 1, "b": 2,}';
      const result = cleanJsonString(input);
      expect(result).toBe('{"a": 1, "b": 2}');
    });

    it('should remove trailing commas before closing square brackets', () => {
      const input = '[1, 2, 3,]';
      const result = cleanJsonString(input);
      expect(result).toBe('[1, 2, 3]');
    });

    it('should handle multiple trailing commas', () => {
      const input = '{"items": [1, 2,], "other": "value",}';
      const result = cleanJsonString(input);
      expect(result).toBe('{"items": [1, 2], "other": "value"}');
    });

    it('should remove BOM character', () => {
      const input = '\uFEFF{"key": "value"}';
      const result = cleanJsonString(input);
      expect(result).toBe('{"key": "value"}');
    });
  });

  describe('real-world AI response patterns', () => {
    it('should handle Claude-style act breakdown response', () => {
      const input = `Based on your story concept, here's the act breakdown:

\`\`\`json
[
  {
    "number": 1,
    "name": "Setup",
    "description": "Aldric loses his kingdom to his brother's coup",
    "beats": [
      {"name": "Opening Image", "description": "Aldric in exile", "percentagePoint": 0}
    ],
    "targetWordCount": 22500,
    "chapterCount": 10
  },
  {
    "number": 2,
    "name": "Confrontation",
    "description": "Aldric gathers allies and fights back",
    "beats": [
      {"name": "Midpoint", "description": "A major setback", "percentagePoint": 50}
    ],
    "targetWordCount": 45000,
    "chapterCount": 20
  }
]
\`\`\`

This structure follows the classic three-act format while adapting to your epic fantasy setting.`;

      const result = extractJsonArray(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('number', 1);
      expect(result[0]).toHaveProperty('name', 'Setup');
      expect(result[1]).toHaveProperty('chapterCount', 20);
    });

    it('should handle response without code blocks', () => {
      const input = `[
  {
    "title": "The Dark Beginning",
    "summary": "The hero discovers the truth",
    "povCharacter": "Aldric",
    "wordCountTarget": 2200
  }
]`;
      const result = extractJsonArray(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('title', 'The Dark Beginning');
    });

    it('should handle escaped quotes in strings', () => {
      const input = `[{"quote": "He said \\"Hello\\" to her"}]`;
      const result = extractJsonArray(input);
      expect(result[0]).toHaveProperty('quote', 'He said "Hello" to her');
    });
  });
});
