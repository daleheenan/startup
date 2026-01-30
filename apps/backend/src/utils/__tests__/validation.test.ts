import { describe, it, expect } from '@jest/globals';
import {
  validateRequired,
  validateNonEmptyArray,
  validateNonEmptyString,
} from '../validation.js';

describe('validation', () => {
  describe('validateRequired', () => {
    it('should return null when all required fields are present', () => {
      // Arrange
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      };

      // Act
      const result = validateRequired(data, 'name', 'email', 'age');

      // Assert
      expect(result).toBeNull();
    });

    it('should return error message when a field is missing', () => {
      // Arrange
      const data = {
        name: 'John Doe',
        age: 30,
      };

      // Act
      const result = validateRequired(data, 'name', 'email', 'age');

      // Assert
      expect(result).toBe('Missing required field: email');
    });

    it('should return error for first missing field', () => {
      // Arrange
      const data = {
        name: 'John Doe',
      };

      // Act
      const result = validateRequired(data, 'name', 'email', 'phone', 'address');

      // Assert
      expect(result).toBe('Missing required field: email');
    });

    it('should return null when no fields are required', () => {
      // Arrange
      const data = {};

      // Act
      const result = validateRequired(data);

      // Assert
      expect(result).toBeNull();
    });

    it('should treat undefined values as missing', () => {
      // Arrange
      const data = {
        name: 'John Doe',
        email: undefined,
      };

      // Act
      const result = validateRequired(data, 'name', 'email');

      // Assert
      expect(result).toBe('Missing required field: email');
    });

    it('should treat null values as missing', () => {
      // Arrange
      const data = {
        name: 'John Doe',
        email: null,
      };

      // Act
      const result = validateRequired(data, 'name', 'email');

      // Assert
      expect(result).toBe('Missing required field: email');
    });

    it('should treat empty string as missing', () => {
      // Arrange
      const data = {
        name: 'John Doe',
        email: '',
      };

      // Act
      const result = validateRequired(data, 'name', 'email');

      // Assert
      expect(result).toBe('Missing required field: email');
    });

    it('should treat 0 as missing (falsy check)', () => {
      // Arrange
      const data = {
        count: 0,
        total: 100,
      };

      // Act
      const result = validateRequired(data, 'count', 'total');

      // Assert
      // Note: Implementation uses !data[field], so 0 is considered missing
      expect(result).toBe('Missing required field: count');
    });

    it('should treat false as missing (falsy check)', () => {
      // Arrange
      const data = {
        isActive: false,
        isVerified: true,
      };

      // Act
      const result = validateRequired(data, 'isActive', 'isVerified');

      // Assert
      // Note: Implementation uses !data[field], so false is considered missing
      expect(result).toBe('Missing required field: isActive');
    });

    it('should handle nested field names', () => {
      // Arrange
      const data = {
        'user.name': 'John',
        'user.email': '',
      };

      // Act
      const result = validateRequired(data, 'user.name', 'user.email');

      // Assert
      expect(result).toBe('Missing required field: user.email');
    });
  });

  describe('validateNonEmptyArray', () => {
    it('should return null for non-empty array', () => {
      // Arrange
      const value = ['item1', 'item2', 'item3'];

      // Act
      const result = validateNonEmptyArray(value, 'items');

      // Assert
      expect(result).toBeNull();
    });

    it('should return error message for empty array', () => {
      // Arrange
      const value: string[] = [];

      // Act
      const result = validateNonEmptyArray(value, 'items');

      // Assert
      expect(result).toBe('items must be a non-empty array');
    });

    it('should return error message for non-array value', () => {
      // Arrange
      const value = 'not an array';

      // Act
      const result = validateNonEmptyArray(value, 'items');

      // Assert
      expect(result).toBe('items must be an array');
    });

    it('should return error message for null', () => {
      // Arrange
      const value = null;

      // Act
      const result = validateNonEmptyArray(value, 'tags');

      // Assert
      expect(result).toBe('tags must be an array');
    });

    it('should return error message for undefined', () => {
      // Arrange
      const value = undefined;

      // Act
      const result = validateNonEmptyArray(value, 'categories');

      // Assert
      expect(result).toBe('categories must be an array');
    });

    it('should return error message for object', () => {
      // Arrange
      const value = { length: 5 };

      // Act
      const result = validateNonEmptyArray(value, 'data');

      // Assert
      expect(result).toBe('data must be an array');
    });

    it('should return null for array with single element', () => {
      // Arrange
      const value = [42];

      // Act
      const result = validateNonEmptyArray(value, 'numbers');

      // Assert
      expect(result).toBeNull();
    });

    it('should accept array of different types', () => {
      // Arrange
      const value = [1, 'two', { three: 3 }, [4]];

      // Act
      const result = validateNonEmptyArray(value, 'mixed');

      // Assert
      expect(result).toBeNull();
    });

    it('should return error for number', () => {
      // Arrange
      const value = 123;

      // Act
      const result = validateNonEmptyArray(value, 'count');

      // Assert
      expect(result).toBe('count must be an array');
    });
  });

  describe('validateNonEmptyString', () => {
    it('should return null for non-empty string', () => {
      // Arrange
      const value = 'Hello World';

      // Act
      const result = validateNonEmptyString(value, 'message');

      // Assert
      expect(result).toBeNull();
    });

    it('should return error message for empty string', () => {
      // Arrange
      const value = '';

      // Act
      const result = validateNonEmptyString(value, 'name');

      // Assert
      expect(result).toBe('name must be a non-empty string');
    });

    it('should return error message for whitespace-only string', () => {
      // Arrange
      const value = '   ';

      // Act
      const result = validateNonEmptyString(value, 'title');

      // Assert
      expect(result).toBe('title must be a non-empty string');
    });

    it('should return error message for non-string value', () => {
      // Arrange
      const value = 123;

      // Act
      const result = validateNonEmptyString(value, 'description');

      // Assert
      expect(result).toBe('description must be a string');
    });

    it('should return error message for null', () => {
      // Arrange
      const value = null;

      // Act
      const result = validateNonEmptyString(value, 'content');

      // Assert
      expect(result).toBe('content must be a string');
    });

    it('should return error message for undefined', () => {
      // Arrange
      const value = undefined;

      // Act
      const result = validateNonEmptyString(value, 'text');

      // Assert
      expect(result).toBe('text must be a string');
    });

    it('should return error message for array', () => {
      // Arrange
      const value = ['hello'];

      // Act
      const result = validateNonEmptyString(value, 'label');

      // Assert
      expect(result).toBe('label must be a string');
    });

    it('should return error message for object', () => {
      // Arrange
      const value = { text: 'hello' };

      // Act
      const result = validateNonEmptyString(value, 'data');

      // Assert
      expect(result).toBe('data must be a string');
    });

    it('should return null for string with leading/trailing whitespace and content', () => {
      // Arrange
      const value = '  Hello  ';

      // Act
      const result = validateNonEmptyString(value, 'greeting');

      // Assert
      expect(result).toBeNull();
    });

    it('should return error for tab-only string', () => {
      // Arrange
      const value = '\t\t\t';

      // Act
      const result = validateNonEmptyString(value, 'code');

      // Assert
      expect(result).toBe('code must be a non-empty string');
    });

    it('should return error for newline-only string', () => {
      // Arrange
      const value = '\n\n';

      // Act
      const result = validateNonEmptyString(value, 'content');

      // Assert
      expect(result).toBe('content must be a non-empty string');
    });

    it('should return null for single character string', () => {
      // Arrange
      const value = 'a';

      // Act
      const result = validateNonEmptyString(value, 'char');

      // Assert
      expect(result).toBeNull();
    });

    it('should return error message for boolean', () => {
      // Arrange
      const value = true;

      // Act
      const result = validateNonEmptyString(value, 'flag');

      // Assert
      expect(result).toBe('flag must be a string');
    });
  });
});
