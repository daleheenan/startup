import { CacheService } from '../cache.service.js';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService();
  });

  it('should set and get a value', () => {
    cache.set('test-key', { data: 'test' }, 60);
    const result = cache.get('test-key');

    expect(result).toEqual({ data: 'test' });
  });

  it('should return null for non-existent key', () => {
    const result = cache.get('non-existent');

    expect(result).toBeNull();
  });

  it('should expire entries after TTL', async () => {
    cache.set('expire-test', { data: 'test' }, 0.1); // 100ms TTL

    // Should exist immediately
    expect(cache.get('expire-test')).toEqual({ data: 'test' });

    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should be expired
    expect(cache.get('expire-test')).toBeNull();
  });

  it('should invalidate entries matching pattern', () => {
    cache.set('genre-tropes:1', { data: 1 }, 60);
    cache.set('genre-tropes:2', { data: 2 }, 60);
    cache.set('presets:1', { data: 3 }, 60);

    cache.invalidate('genre-tropes:');

    expect(cache.get('genre-tropes:1')).toBeNull();
    expect(cache.get('genre-tropes:2')).toBeNull();
    expect(cache.get('presets:1')).toEqual({ data: 3 });
  });

  it('should clear all entries', () => {
    cache.set('key1', { data: 1 }, 60);
    cache.set('key2', { data: 2 }, 60);

    cache.clear();

    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });

  it('should return cache stats', () => {
    cache.set('key1', { data: 1 }, 60);
    cache.set('key2', { data: 2 }, 60);

    const stats = cache.getStats();

    expect(stats.size).toBe(2);
    expect(stats.entries).toContain('key1');
    expect(stats.entries).toContain('key2');
  });

  it('should handle different data types', () => {
    cache.set('string', 'test', 60);
    cache.set('number', 42, 60);
    cache.set('object', { nested: { data: true } }, 60);
    cache.set('array', [1, 2, 3], 60);

    expect(cache.get('string')).toBe('test');
    expect(cache.get('number')).toBe(42);
    expect(cache.get('object')).toEqual({ nested: { data: true } });
    expect(cache.get('array')).toEqual([1, 2, 3]);
  });
});
