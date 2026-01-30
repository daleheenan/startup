import { createLogger } from '../services/logger.service.js';

const logger = createLogger('utils:json-extractor');

/**
 * Robustly extract JSON from AI responses that may contain markdown or extra text.
 * Handles:
 * - Markdown code blocks (```json ... ```)
 * - Plain JSON arrays or objects
 * - Text before/after JSON
 * - Nested structures
 */

/**
 * Extract a JSON array from text that may contain markdown or other content
 */
export function extractJsonArray<T = unknown>(text: string): T[] {
  // Strategy 1: Try to find JSON in markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const content = codeBlockMatch[1].trim();
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed as T[];
      }
    } catch {
      // Continue to other strategies
    }
  }

  // Strategy 2: Find balanced JSON array using bracket matching
  const arrayJson = extractBalancedJson(text, '[', ']');
  if (arrayJson) {
    try {
      const parsed = JSON.parse(arrayJson);
      if (Array.isArray(parsed)) {
        return parsed as T[];
      }
    } catch (e) {
      logger.debug({ error: e, json: arrayJson.substring(0, 200) }, 'Failed to parse extracted array');
    }
  }

  // Strategy 3: Try the entire text as JSON
  try {
    const parsed = JSON.parse(text.trim());
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }
  } catch {
    // Not valid JSON
  }

  // Strategy 4: Try with JSON cleaning (handles trailing commas, etc.)
  const cleaned = cleanJsonString(text);
  const cleanedArray = extractBalancedJson(cleaned, '[', ']');
  if (cleanedArray) {
    try {
      const parsed = JSON.parse(cleanedArray);
      if (Array.isArray(parsed)) {
        return parsed as T[];
      }
    } catch {
      // Still not valid
    }
  }

  // Log what we received to help debug
  logger.error({
    textLength: text.length,
    textPreview: text.substring(0, 1000),
    hasOpenBracket: text.includes('['),
    hasCloseBracket: text.includes(']'),
    hasCodeBlock: text.includes('```'),
  }, 'Failed to extract JSON array from response');

  throw new Error('No valid JSON array found in response');
}

/**
 * Extract a JSON object from text that may contain markdown or other content
 */
export function extractJsonObject<T = Record<string, unknown>>(text: string): T {
  // Strategy 1: Try to find JSON in markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const content = codeBlockMatch[1].trim();
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as T;
      }
    } catch {
      // Continue to other strategies
    }
  }

  // Strategy 2: Find balanced JSON object using bracket matching
  const objectJson = extractBalancedJson(text, '{', '}');
  if (objectJson) {
    try {
      const parsed = JSON.parse(objectJson);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as T;
      }
    } catch (e) {
      logger.debug({ error: e, json: objectJson.substring(0, 200) }, 'Failed to parse extracted object');
    }
  }

  // Strategy 3: Try the entire text as JSON
  try {
    const parsed = JSON.parse(text.trim());
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as T;
    }
  } catch {
    // Not valid JSON
  }

  throw new Error('No valid JSON object found in response');
}

/**
 * Extract balanced JSON by counting bracket pairs.
 * This handles nested structures correctly.
 */
function extractBalancedJson(
  text: string,
  openBracket: '[' | '{',
  closeBracket: ']' | '}'
): string | null {
  // Find the first occurrence of the opening bracket
  const startIndex = text.indexOf(openBracket);
  if (startIndex === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === openBracket) {
      depth++;
    } else if (char === closeBracket) {
      depth--;
      if (depth === 0) {
        return text.slice(startIndex, i + 1);
      }
    }
  }

  // If we get here, brackets weren't balanced
  // Try to return what we have anyway and let JSON.parse handle it
  return null;
}

/**
 * Clean common issues in AI-generated JSON before parsing
 */
export function cleanJsonString(json: string): string {
  let cleaned = json;

  // Remove trailing commas before closing brackets (common AI mistake)
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

  // Fix unescaped newlines in string values (but not between elements)
  // This is tricky - we need to be careful not to break valid JSON

  // Remove any BOM or weird unicode
  cleaned = cleaned.replace(/^\uFEFF/, '');

  return cleaned;
}

/**
 * Attempt to repair and parse potentially malformed JSON
 */
export function parseJsonWithRepair<T>(text: string): T {
  // First try normal parsing
  try {
    return JSON.parse(text);
  } catch {
    // Try with cleaning
    const cleaned = cleanJsonString(text);
    return JSON.parse(cleaned);
  }
}
