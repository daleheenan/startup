import {
  CircuitBreaker,
  CircuitState,
  CircuitOpenError,
  createCircuitBreaker,
} from '../circuit-breaker.service.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker<string>;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 100, // Short timeout for testing
      windowSize: 1000, // 1 second window
      name: 'test-breaker',
    });
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should have zero failures and successes initially', () => {
      const stats = breaker.getStats();
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.lastFailure).toBeUndefined();
      expect(stats.lastSuccess).toBeUndefined();
      expect(stats.openedAt).toBeUndefined();
    });
  });

  describe('CLOSED state behavior', () => {
    it('should stay CLOSED on successful execution', async () => {
      const result = await breaker.execute(async () => 'success');

      expect(result).toBe('success');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should record lastSuccess on successful execution', async () => {
      const beforeExec = new Date();
      await breaker.execute(async () => 'success');
      const afterExec = new Date();

      const stats = breaker.getStats();
      expect(stats.lastSuccess).toBeDefined();
      expect(stats.lastSuccess!.getTime()).toBeGreaterThanOrEqual(beforeExec.getTime());
      expect(stats.lastSuccess!.getTime()).toBeLessThanOrEqual(afterExec.getTime());
    });

    it('should stay CLOSED with failures below threshold', async () => {
      // 2 failures, threshold is 3
      await expect(breaker.execute(async () => { throw new Error('fail 1'); })).rejects.toThrow();
      await expect(breaker.execute(async () => { throw new Error('fail 2'); })).rejects.toThrow();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getStats().failures).toBe(2);
    });

    it('should record lastFailure on failed execution', async () => {
      const beforeExec = new Date();
      await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
      const afterExec = new Date();

      const stats = breaker.getStats();
      expect(stats.lastFailure).toBeDefined();
      expect(stats.lastFailure!.getTime()).toBeGreaterThanOrEqual(beforeExec.getTime());
      expect(stats.lastFailure!.getTime()).toBeLessThanOrEqual(afterExec.getTime());
    });
  });

  describe('CLOSED -> OPEN transition', () => {
    it('should transition to OPEN after reaching failure threshold', async () => {
      // 3 failures to reach threshold
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(async () => { throw new Error(`fail ${i}`); })).rejects.toThrow();
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should record openedAt timestamp when transitioning to OPEN', async () => {
      const beforeTransition = new Date();

      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(async () => { throw new Error(`fail ${i}`); })).rejects.toThrow();
      }

      const afterTransition = new Date();
      const stats = breaker.getStats();

      expect(stats.openedAt).toBeDefined();
      expect(stats.openedAt!.getTime()).toBeGreaterThanOrEqual(beforeTransition.getTime());
      expect(stats.openedAt!.getTime()).toBeLessThanOrEqual(afterTransition.getTime());
    });
  });

  describe('OPEN state behavior', () => {
    beforeEach(async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(async () => { throw new Error(`fail ${i}`); })).rejects.toThrow();
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should reject immediately with CircuitOpenError', async () => {
      await expect(breaker.execute(async () => 'should not execute')).rejects.toThrow(CircuitOpenError);
    });

    it('should include nextAttemptTime in CircuitOpenError', async () => {
      try {
        await breaker.execute(async () => 'should not execute');
        fail('Expected CircuitOpenError');
      } catch (error) {
        expect(error).toBeInstanceOf(CircuitOpenError);
        const circuitError = error as CircuitOpenError;
        expect(circuitError.nextAttemptTime).toBeInstanceOf(Date);
        expect(circuitError.nextAttemptTime.getTime()).toBeGreaterThan(Date.now());
      }
    });

    it('should not execute the provided function when open', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');

      await expect(breaker.execute(mockFn)).rejects.toThrow(CircuitOpenError);
      expect(mockFn).not.toHaveBeenCalled();
    });
  });

  describe('OPEN -> HALF_OPEN transition', () => {
    beforeEach(async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(async () => { throw new Error(`fail ${i}`); })).rejects.toThrow();
      }
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for timeout (100ms)
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Execute should trigger transition to HALF_OPEN
      await breaker.execute(async () => 'success');

      // After success in HALF_OPEN, it's still HALF_OPEN (need 2 successes)
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should allow request after timeout expires', async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));

      const result = await breaker.execute(async () => 'success after timeout');
      expect(result).toBe('success after timeout');
    });
  });

  describe('HALF_OPEN state behavior', () => {
    beforeEach(async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(async () => { throw new Error(`fail ${i}`); })).rejects.toThrow();
      }

      // Wait for timeout to transition to HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Execute once to transition to HALF_OPEN
      await breaker.execute(async () => 'trigger half-open');
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should allow requests in HALF_OPEN state', async () => {
      const result = await breaker.execute(async () => 'half-open request');
      expect(result).toBe('half-open request');
    });
  });

  describe('HALF_OPEN -> CLOSED transition', () => {
    beforeEach(async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(async () => { throw new Error(`fail ${i}`); })).rejects.toThrow();
      }

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    it('should transition to CLOSED after success threshold in HALF_OPEN', async () => {
      // First success transitions to HALF_OPEN
      await breaker.execute(async () => 'success 1');
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      // Second success should close the circuit (threshold is 2)
      await breaker.execute(async () => 'success 2');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should clear failures and openedAt when transitioning to CLOSED', async () => {
      await breaker.execute(async () => 'success 1');
      await breaker.execute(async () => 'success 2');

      const stats = breaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failures).toBe(0);
      expect(stats.openedAt).toBeUndefined();
    });
  });

  describe('HALF_OPEN -> OPEN transition', () => {
    beforeEach(async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(async () => { throw new Error(`fail ${i}`); })).rejects.toThrow();
      }

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // First success transitions to HALF_OPEN
      await breaker.execute(async () => 'success 1');
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should transition to OPEN on any failure in HALF_OPEN', async () => {
      await expect(breaker.execute(async () => { throw new Error('fail in half-open'); })).rejects.toThrow();

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should set new openedAt timestamp when reopening', async () => {
      const statsBeforeReopen = breaker.getStats();
      const openedAtBeforeReopen = statsBeforeReopen.openedAt;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();

      const statsAfterReopen = breaker.getStats();
      expect(statsAfterReopen.openedAt).toBeDefined();
      expect(statsAfterReopen.openedAt!.getTime()).toBeGreaterThan(openedAtBeforeReopen!.getTime());
    });
  });

  describe('rolling window failure tracking', () => {
    it('should not count failures outside the window', async () => {
      // Create breaker with very short window
      const shortWindowBreaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 100,
        windowSize: 100, // 100ms window
        name: 'short-window-breaker',
      });

      // Record 2 failures
      await expect(shortWindowBreaker.execute(async () => { throw new Error('fail 1'); })).rejects.toThrow();
      await expect(shortWindowBreaker.execute(async () => { throw new Error('fail 2'); })).rejects.toThrow();

      expect(shortWindowBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(shortWindowBreaker.getStats().failures).toBe(2);

      // Wait for failures to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Check that old failures are pruned
      const stats = shortWindowBreaker.getStats();
      expect(stats.failures).toBe(0);

      // Circuit should still be closed
      expect(shortWindowBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should only count recent failures toward threshold', async () => {
      const shortWindowBreaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 100,
        windowSize: 100, // 100ms window
        name: 'short-window-breaker',
      });

      // Record 2 failures
      await expect(shortWindowBreaker.execute(async () => { throw new Error('fail 1'); })).rejects.toThrow();
      await expect(shortWindowBreaker.execute(async () => { throw new Error('fail 2'); })).rejects.toThrow();

      // Wait for these failures to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Record 2 more failures (should not open circuit since old ones expired)
      await expect(shortWindowBreaker.execute(async () => { throw new Error('fail 3'); })).rejects.toThrow();
      await expect(shortWindowBreaker.execute(async () => { throw new Error('fail 4'); })).rejects.toThrow();

      // Should still be closed because only 2 failures are in window
      expect(shortWindowBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(shortWindowBreaker.getStats().failures).toBe(2);
    });

    it('should prune old failures on success', async () => {
      const shortWindowBreaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 100,
        windowSize: 100, // 100ms window
        name: 'short-window-breaker',
      });

      // Record 2 failures
      await expect(shortWindowBreaker.execute(async () => { throw new Error('fail 1'); })).rejects.toThrow();
      await expect(shortWindowBreaker.execute(async () => { throw new Error('fail 2'); })).rejects.toThrow();

      // Wait for failures to age out
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Success should prune old failures
      await shortWindowBreaker.execute(async () => 'success');

      const stats = shortWindowBreaker.getStats();
      expect(stats.failures).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct state', () => {
      expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
    });

    it('should return correct failure count', async () => {
      await expect(breaker.execute(async () => { throw new Error('fail 1'); })).rejects.toThrow();
      await expect(breaker.execute(async () => { throw new Error('fail 2'); })).rejects.toThrow();

      expect(breaker.getStats().failures).toBe(2);
    });

    it('should return correct success count in HALF_OPEN', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(async () => { throw new Error(`fail ${i}`); })).rejects.toThrow();
      }

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // First success
      await breaker.execute(async () => 'success');

      expect(breaker.getStats().successes).toBe(1);
    });

    it('should return lastFailure timestamp', async () => {
      await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();

      const stats = breaker.getStats();
      expect(stats.lastFailure).toBeInstanceOf(Date);
    });

    it('should return lastSuccess timestamp', async () => {
      await breaker.execute(async () => 'success');

      const stats = breaker.getStats();
      expect(stats.lastSuccess).toBeInstanceOf(Date);
    });

    it('should return openedAt when circuit is OPEN', async () => {
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(async () => { throw new Error(`fail ${i}`); })).rejects.toThrow();
      }

      const stats = breaker.getStats();
      expect(stats.state).toBe(CircuitState.OPEN);
      expect(stats.openedAt).toBeInstanceOf(Date);
    });
  });

  describe('reset', () => {
    it('should reset state to CLOSED', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(async () => { throw new Error(`fail ${i}`); })).rejects.toThrow();
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      breaker.reset();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should clear all failures', async () => {
      await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
      expect(breaker.getStats().failures).toBe(1);

      breaker.reset();

      expect(breaker.getStats().failures).toBe(0);
    });

    it('should clear success count', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(async () => { throw new Error(`fail ${i}`); })).rejects.toThrow();
      }

      // Wait for timeout and get a success
      await new Promise((resolve) => setTimeout(resolve, 150));
      await breaker.execute(async () => 'success');

      expect(breaker.getStats().successes).toBe(1);

      breaker.reset();

      expect(breaker.getStats().successes).toBe(0);
    });

    it('should clear openedAt', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(async () => { throw new Error(`fail ${i}`); })).rejects.toThrow();
      }

      expect(breaker.getStats().openedAt).toBeDefined();

      breaker.reset();

      expect(breaker.getStats().openedAt).toBeUndefined();
    });

    it('should clear lastFailure and lastSuccess', async () => {
      await breaker.execute(async () => 'success');
      await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();

      expect(breaker.getStats().lastFailure).toBeDefined();
      expect(breaker.getStats().lastSuccess).toBeDefined();

      breaker.reset();

      expect(breaker.getStats().lastFailure).toBeUndefined();
      expect(breaker.getStats().lastSuccess).toBeUndefined();
    });

    it('should allow requests after reset from OPEN state', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(async () => { throw new Error(`fail ${i}`); })).rejects.toThrow();
      }

      // Verify circuit is open
      await expect(breaker.execute(async () => 'should fail')).rejects.toThrow(CircuitOpenError);

      breaker.reset();

      // Should be able to execute now
      const result = await breaker.execute(async () => 'success after reset');
      expect(result).toBe('success after reset');
    });
  });

  describe('CircuitOpenError', () => {
    it('should have correct name property', () => {
      const error = new CircuitOpenError('test', new Date());
      expect(error.name).toBe('CircuitOpenError');
    });

    it('should have correct message', () => {
      const error = new CircuitOpenError('Circuit is open', new Date());
      expect(error.message).toBe('Circuit is open');
    });

    it('should have nextAttemptTime', () => {
      const nextAttempt = new Date(Date.now() + 1000);
      const error = new CircuitOpenError('test', nextAttempt);
      expect(error.nextAttemptTime).toEqual(nextAttempt);
    });

    it('should be an instance of Error', () => {
      const error = new CircuitOpenError('test', new Date());
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('createCircuitBreaker factory', () => {
    it('should create a circuit breaker with provided options', () => {
      const cb = createCircuitBreaker({
        name: 'factory-breaker',
        failureThreshold: 10,
        successThreshold: 5,
        timeout: 5000,
        windowSize: 30000,
      });

      expect(cb).toBeInstanceOf(CircuitBreaker);
      expect(cb.getState()).toBe(CircuitState.CLOSED);
    });

    it('should use default values for unspecified options', () => {
      const cb = createCircuitBreaker({ name: 'defaults-breaker' });

      expect(cb).toBeInstanceOf(CircuitBreaker);
      // The breaker should work with default values
      expect(cb.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('error propagation', () => {
    it('should propagate the original error when function fails', async () => {
      const originalError = new Error('Original error message');

      await expect(breaker.execute(async () => { throw originalError; })).rejects.toThrow(originalError);
    });

    it('should preserve error stack trace', async () => {
      const error = new Error('Test error');

      try {
        await breaker.execute(async () => { throw error; });
        fail('Expected error to be thrown');
      } catch (e) {
        expect((e as Error).stack).toBeDefined();
        expect((e as Error).stack).toContain('Test error');
      }
    });
  });

  describe('concurrent requests', () => {
    it('should handle multiple concurrent successful requests', async () => {
      const results = await Promise.all([
        breaker.execute(async () => 'result 1'),
        breaker.execute(async () => 'result 2'),
        breaker.execute(async () => 'result 3'),
      ]);

      expect(results).toEqual(['result 1', 'result 2', 'result 3']);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should handle multiple concurrent failing requests', async () => {
      const promises = [
        breaker.execute(async () => { throw new Error('fail 1'); }),
        breaker.execute(async () => { throw new Error('fail 2'); }),
        breaker.execute(async () => { throw new Error('fail 3'); }),
      ];

      await expect(Promise.all(promises)).rejects.toThrow();

      // After 3 failures, circuit should be open
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('edge cases', () => {
    it('should handle function returning undefined', async () => {
      const undefinedBreaker = new CircuitBreaker<undefined>({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 100,
        windowSize: 1000,
        name: 'undefined-breaker',
      });

      const result = await undefinedBreaker.execute(async () => undefined);
      expect(result).toBeUndefined();
      expect(undefinedBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should handle function returning null', async () => {
      const nullBreaker = new CircuitBreaker<null>({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 100,
        windowSize: 1000,
        name: 'null-breaker',
      });

      const result = await nullBreaker.execute(async () => null);
      expect(result).toBeNull();
    });

    it('should handle synchronous-like async functions', async () => {
      const result = await breaker.execute(async () => {
        return 'immediate result';
      });

      expect(result).toBe('immediate result');
    });

    it('should handle long-running async functions', async () => {
      const result = await breaker.execute(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'delayed result';
      });

      expect(result).toBe('delayed result');
    });
  });
});
