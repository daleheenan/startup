/**
 * Validate required fields are present
 */
export function validateRequired(data: any, ...fields: string[]): string | null {
  for (const field of fields) {
    if (!data[field]) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

/**
 * Validate array field is non-empty
 */
export function validateNonEmptyArray(value: any, fieldName: string): string | null {
  if (!Array.isArray(value)) {
    return `${fieldName} must be an array`;
  }
  if (value.length === 0) {
    return `${fieldName} must be a non-empty array`;
  }
  return null;
}

/**
 * Validate string field is non-empty
 */
export function validateNonEmptyString(value: any, fieldName: string): string | null {
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }
  if (value.trim().length === 0) {
    return `${fieldName} must be a non-empty string`;
  }
  return null;
}
