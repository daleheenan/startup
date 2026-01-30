# Sentry Integration Guide

## Overview

Sentry is integrated into the NovelForge backend for error tracking and monitoring. This integration was added in Sprint 14, Task 14.6.

## Configuration

Add your Sentry DSN to the `.env` file:

```bash
SENTRY_DSN=your-sentry-dsn-here
```

Get your DSN from: https://sentry.io/settings/projects/

## What's Already Integrated

### Core Integration (server.ts)

- Sentry initializes at the very top of `server.ts` (before all other imports)
- Error handler middleware is installed after all routes
- Critical error handlers have Sentry integration:
  - Database migration failures
  - Queue worker startup failures
  - Graceful shutdown errors

### Service Layer (sentry.service.ts)

The Sentry service provides:

- `initSentry()` - Initializes Sentry (auto-configured for environment)
- `captureException(error, context?)` - Capture errors with optional context
- `captureMessage(message, level)` - Capture messages
- `errorHandler()` - Express error handler middleware

## Adding Sentry to Route Files

To add error tracking to route error handlers:

### 1. Import the service

```typescript
import { captureException } from '../services/sentry.service.js';
```

### 2. Add to catch blocks

For **critical operations** (database writes, external API calls, data corruption risks):

```typescript
try {
  // Critical operation
  const result = await someImportantOperation();
  res.json(result);
} catch (error: any) {
  logger.error({ error: error.message, stack: error.stack }, 'Operation failed');

  // Capture to Sentry with context
  if (error instanceof Error) {
    captureException(error, {
      operation: 'someImportantOperation',
      projectId: req.params.id,
      userId: req.user?.id
    });
  }

  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
}
```

### Guidelines

**DO capture these errors:**
- Database failures (write operations especially)
- External API failures (Claude API, etc.)
- File I/O failures
- Queue processing failures
- Authentication/authorization failures
- Data validation failures that shouldn't happen

**DON'T capture these:**
- Expected validation errors (400 Bad Request)
- Not found errors (404)
- Authentication errors from invalid credentials (expected)
- Rate limiting (expected behavior)

## Environment-Specific Behavior

### Development
- Traces: 100% of transactions sampled
- Errors: All errors captured
- Logging: Console shows Sentry skip/init messages

### Production
- Traces: 10% of transactions sampled (configurable)
- Errors: All errors captured
- Logging: Only init confirmation

## Testing

The integration is tested by:

1. **Build verification**: `npm run build` compiles without errors
2. **Startup verification**: Server logs show Sentry initialization
3. **Skip verification**: Without SENTRY_DSN, Sentry skips cleanly

## Troubleshooting

### "Sentry Skipped" message
- Check `.env` file has `SENTRY_DSN` configured
- Verify DSN is valid (starts with `https://`)

### Errors not appearing in Sentry
- Check the DSN is correct
- Verify network connectivity to Sentry
- Check `captureException` is being called in catch blocks
- Look for errors in server logs

### Build errors
- Ensure `@sentry/node` is installed: `npm install @sentry/node`
- Check TypeScript version compatibility

## Example Routes with Sentry

Critical routes that should have Sentry integration:

- `/api/projects/:id/story-dna` - Story DNA generation
- `/api/projects/:id/characters` - Character generation
- `/api/generation/*` - All generation endpoints
- `/api/chapters/:id/generate` - Chapter generation
- `/api/export/*` - Export operations
- `/api/queue/*` - Queue operations

Non-critical routes (may skip Sentry):

- `/api/health` - Health checks
- `/api/projects` - Simple CRUD reads
- `/api/analytics` - Analytics queries (non-critical)

## Performance Impact

Sentry's performance impact:

- **Minimal**: <5ms overhead per request
- **Async**: Error capture doesn't block responses
- **Sampling**: Production traces only 10% of requests
- **Smart**: Only active when SENTRY_DSN is configured

## Future Enhancements

Potential improvements:

1. Add performance monitoring for slow endpoints
2. Set up alerts for error spikes
3. Configure release tracking for deployments
4. Add user context to error reports
5. Create custom integrations for Claude API tracking
