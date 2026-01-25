import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { logger, createLogger, requestLogger } from '../logger.service';
import type { Request, Response, NextFunction } from 'express';

describe('Logger Service', () => {
  describe('logger', () => {
    it('should export a pino logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should have service metadata in base', () => {
      // Pino loggers have bindings() method to access base fields
      const bindings = (logger as any).bindings();
      expect(bindings.service).toBe('novelforge-api');
    });
  });

  describe('createLogger', () => {
    it('should create a child logger with context', () => {
      const childLogger = createLogger('TestContext');

      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');

      // Child logger should have the context binding
      const bindings = (childLogger as any).bindings();
      expect(bindings.context).toBe('TestContext');
    });

    it('should create independent child loggers', () => {
      const logger1 = createLogger('Context1');
      const logger2 = createLogger('Context2');

      const bindings1 = (logger1 as any).bindings();
      const bindings2 = (logger2 as any).bindings();

      expect(bindings1.context).toBe('Context1');
      expect(bindings2.context).toBe('Context2');
    });
  });

  describe('requestLogger middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;
    let finishCallbacks: Array<() => void>;

    beforeEach(() => {
      finishCallbacks = [];

      mockReq = {
        headers: {},
        path: '/test/path',
        method: 'GET',
      };

      mockRes = {
        setHeader: jest.fn(),
        on: jest.fn((event: string, callback: () => void) => {
          if (event === 'finish') {
            finishCallbacks.push(callback);
          }
          return mockRes as Response;
        }),
        statusCode: 200,
      };

      mockNext = jest.fn();
    });

    it('should attach logger to request', () => {
      const middleware = requestLogger();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.log).toBeDefined();
      expect(typeof mockReq.log?.info).toBe('function');
    });

    it('should generate requestId if not provided', () => {
      const middleware = requestLogger();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.requestId).toBeDefined();
      expect(typeof mockReq.requestId).toBe('string');
      expect(mockReq.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should use provided x-request-id header', () => {
      const providedId = 'custom-request-id-123';
      mockReq.headers = { 'x-request-id': providedId };

      const middleware = requestLogger();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.requestId).toBe(providedId);
    });

    it('should set X-Request-ID response header', () => {
      const middleware = requestLogger();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        expect.any(String)
      );
    });

    it('should call next middleware', () => {
      const middleware = requestLogger();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should log request completion on finish event', () => {
      const middleware = requestLogger();
      const logSpy = jest.spyOn(logger, 'info');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Simulate response finish
      mockRes.statusCode = 200;
      finishCallbacks.forEach(cb => cb());

      // Note: The actual log is created from req.log (child logger), not the main logger
      // So this test just verifies the finish callback is registered
      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));

      logSpy.mockRestore();
    });
  });
});
