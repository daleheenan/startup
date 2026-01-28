# Railway Deployment Patterns

Reusable patterns for resilient Node.js deployments on Railway, extracted from NovelForge.

## Quick Start Checklist

Before deploying to Railway, ensure you have:

- [ ] `railway.toml` with 180s health check timeout
- [ ] Health endpoint at `/api/health` with database check
- [ ] Global exception handlers (uncaughtException, unhandledRejection)
- [ ] Graceful shutdown handlers (SIGTERM, SIGINT)
- [ ] Environment validation at startup
- [ ] Persistent volume mount for database

---

## 1. Railway Configuration

**File:** `railway.toml`

```toml
[build]
builder = "nixpacks"
buildCommand = "npm ci && npm run build"

[build.env]
NIXPACKS_NODE_VERSION = "20"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 180
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[mounts]]
source = "myapp_data"
destination = "/data"
```

**Key Settings:**

| Setting | Value | Why |
|---------|-------|-----|
| `healthcheckTimeout` | 180 | Allows time for database migrations on cold start |
| `restartPolicyMaxRetries` | 10 | Recovers from transient failures without manual intervention |
| `mounts` | `/data` | Persists SQLite/data across container restarts |

---

## 2. Health Check Endpoint

**File:** `src/routes/health.ts`

```typescript
import express from 'express';
import db from '../db/connection.js';

const router = express.Router();

// Basic health check - used by Railway
router.get('/', (req, res) => {
  try {
    // Verify database connectivity
    const result = db.prepare('SELECT 1 as test').get();
    if (!result) {
      throw new Error('Database query returned no result');
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

export default router;
```

**Best Practice:** Add detailed health endpoint for debugging:

```typescript
router.get('/detailed', (req, res) => {
  const checks: Record<string, any> = {};

  // Database latency
  const dbStart = Date.now();
  db.prepare('SELECT 1').get();
  checks.database = { status: 'ok', latency: Date.now() - dbStart };

  // Memory usage
  const mem = process.memoryUsage();
  checks.memory = {
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
    rss: Math.round(mem.rss / 1024 / 1024) + 'MB'
  };

  // Uptime
  checks.uptime = Math.round(process.uptime()) + 's';

  res.json({ status: 'ok', checks });
});
```

---

## 3. Global Exception Handlers

**File:** `src/server.ts` (at the very top, before other imports)

```typescript
import dotenv from 'dotenv';
dotenv.config();

// Must be registered before any other initialisation
process.on('uncaughtException', (error) => {
  console.error('[Server] UNCAUGHT EXCEPTION:', error);
  // Give error tracking (Sentry) time to flush
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] UNHANDLED REJECTION:', reason);
  // Log but don't exit - background task failures shouldn't kill server
});

// ... rest of imports
```

**Why This Matters:**
- Node 20+ terminates on unhandled rejections by default
- Without handlers, Railway logs show nothing useful
- 1-second delay allows Sentry to flush before exit

---

## 4. Graceful Shutdown

**File:** `src/server.ts`

```typescript
async function shutdown(signal: string) {
  console.log(`[Server] ${signal} received, shutting down gracefully`);

  try {
    // 1. Stop accepting new connections
    await new Promise<void>((resolve) => {
      server.close((err) => {
        if (err) console.warn('[Server] HTTP close error:', err);
        console.log('[Server] HTTP server closed');
        resolve();
      });
    });

    // 2. Stop background workers (with timeout)
    if (queueWorker) {
      await Promise.race([
        queueWorker.stop(),
        new Promise(resolve => setTimeout(resolve, 30000)) // 30s timeout
      ]);
    }

    // 3. Close database connection
    if (db) {
      db.close();
    }

    console.log('[Server] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Server] Shutdown error:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
```

**Why This Matters:**
- Railway sends SIGTERM on deployments/restarts
- Without graceful shutdown, in-flight requests are dropped
- Queue workers need time to finish current job

---

## 5. Environment Validation

**File:** `src/server.ts`

```typescript
function validateEnvironment(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.DATABASE_URL && !process.env.DATABASE_PATH) {
      errors.push('DATABASE_URL or DATABASE_PATH required');
    }
    if (!process.env.JWT_SECRET) {
      errors.push('JWT_SECRET required');
    }
    if (!process.env.API_KEY) {
      errors.push('API_KEY required');
    }
  }

  // Development defaults
  if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
    warnings.push('JWT_SECRET not set - using insecure default');
    process.env.JWT_SECRET = 'dev-only-insecure-secret';
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Run at startup
const env = validateEnvironment();
if (env.warnings.length) {
  console.warn('[Server] Warnings:', env.warnings);
}
if (!env.valid) {
  console.error('[Server] Missing required environment variables:', env.errors);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}
```

**Why This Matters:**
- Fails fast with clear error messages
- Prevents cryptic runtime errors from missing config
- Development mode allows insecure defaults for local testing

---

## 6. Background Worker Resilience

**Pattern:** Don't exit the process when background workers fail.

```typescript
// Start queue worker after server is listening
server.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);

  setImmediate(() => {
    queueWorker.start()
      .then(() => {
        console.log('[Server] Queue worker started');
      })
      .catch((error) => {
        console.error('[Server] Queue worker failed:', error);

        // DO NOT call process.exit(1) here!
        // The HTTP server is healthy - don't kill it

        // Retry after delay
        const retryDelay = process.env.NODE_ENV === 'production' ? 30000 : 10000;
        console.log(`[Server] Retrying worker in ${retryDelay / 1000}s`);

        setTimeout(() => {
          queueWorker.start()
            .then(() => console.log('[Server] Worker started on retry'))
            .catch((err) => console.error('[Server] Worker retry failed:', err));
        }, retryDelay);
      });
  });
});
```

**Why This Matters:**
- HTTP server continues serving requests during worker issues
- Automatic retry catches transient failures (e.g., incomplete migrations)
- Prevents cascading container restarts

---

## 7. Shared Readiness State

**Problem:** Health endpoints need to check if server/workers are ready, but circular imports break this.

**Solution:** Create a shared state module.

**File:** `src/services/server-state.service.ts`

```typescript
let _serverReady = false;
let _queueWorkerReady = false;

export function setServerReady(ready: boolean): void {
  _serverReady = ready;
}

export function setQueueWorkerReady(ready: boolean): void {
  _queueWorkerReady = ready;
}

export function isServerReady(): boolean {
  return _serverReady;
}

export function isQueueWorkerReady(): boolean {
  return _queueWorkerReady;
}
```

**Usage:**

```typescript
// server.ts
import { setServerReady, setQueueWorkerReady } from './services/server-state.service.js';

server.listen(PORT, () => {
  setServerReady(true);
  // ...
  queueWorker.start().then(() => setQueueWorkerReady(true));
});

// health.ts
import { isServerReady, isQueueWorkerReady } from './services/server-state.service.js';

router.get('/detailed', (req, res) => {
  const queueStatus = isQueueWorkerReady() ? 'ok' : 'starting';
  // ...
});
```

---

## 8. Rate Limit Handling

**Pattern:** Detect rate limits and pause intelligently instead of retrying.

```typescript
function isRateLimitError(error: any): boolean {
  if (error?.status === 429) return true;  // Rate limit
  if (error?.status === 529) return true;  // Overloaded
  if (error?.message?.includes('rate limit')) return true;
  if (error?.message?.toLowerCase().includes('too fast')) return true;
  return false;
}

async function handleRateLimit(job: Job): Promise<void> {
  console.warn(`[Worker] Rate limit hit for job ${job.id}`);

  // Pause job instead of failing
  await pauseJob(job.id);

  // Wait for rate limit window to reset (e.g., 60 seconds)
  const waitMs = 60000;
  console.log(`[Worker] Pausing ${waitMs / 1000}s for rate limit reset`);
  await sleep(waitMs);

  // Resume paused jobs
  await resumePausedJobs();
}
```

---

## 9. Dockerfile (Optional)

If using Dockerfile instead of nixpacks:

```dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y \
    python3 make g++ curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --production

RUN mkdir -p /data

EXPOSE 3001

# Critical: start-period must allow for migrations
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["npm", "start"]
```

---

## 10. GitHub Actions Monitoring

**File:** `.github/workflows/railway-monitor.yml`

```yaml
name: Railway Health Monitor

on:
  schedule:
    - cron: '0 8-20 * * 1-5'  # Hourly, 8am-8pm, Mon-Fri
  workflow_dispatch:

env:
  BACKEND_URL: ${{ vars.BACKEND_URL }}

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check backend health
        run: |
          RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/health")
          HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

          if [ "$HTTP_CODE" != "200" ]; then
            echo "Health check failed with status $HTTP_CODE"
            exit 1
          fi

          echo "Backend healthy"

      - name: Create issue on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Railway Backend Health Check Failed',
              body: `Health check failed at ${new Date().toISOString()}`,
              labels: ['production-issue', 'automated']
            });
```

---

## Common Issues & Solutions

### Health Check Fails During Deployment

**Symptom:** Deployment crashes within 30-60 seconds

**Cause:** Health check timeout too short for database migrations

**Solution:** Increase `healthcheckTimeout` to 180s in `railway.toml`

### "Deploy Crashed" Email But Service is Green

**Symptom:** Receive crash email, but deployment succeeded

**Cause:** Railway detects old container termination during blue-green swap

**Solution:** This is normal behaviour. The new container succeeded.

### Queue Worker Crashes on Startup

**Symptom:** Server starts, then immediately exits

**Cause:** `process.exit(1)` called when queue worker fails

**Solution:** Retry worker startup instead of exiting. See pattern #6.

### Silent Crashes with No Logs

**Symptom:** Container restarts with no error output

**Cause:** Unhandled promise rejection (Node 20 default behaviour)

**Solution:** Add global exception handlers. See pattern #3.

### Database Connection Errors

**Symptom:** "SQLITE_ERROR: no such table" or similar

**Cause:** Volume not mounted or migrations not run

**Solution:**
1. Verify `[[mounts]]` in `railway.toml`
2. Ensure migrations run before server starts
3. Check `DATABASE_PATH` points to mounted volume

---

## Environment Variables Checklist

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` for Railway |
| `PORT` | No | Railway sets automatically |
| `DATABASE_PATH` | Yes | Path to SQLite (e.g., `/data/app.db`) |
| `JWT_SECRET` | Yes | Min 32 characters |
| `SENTRY_DSN` | No | Error tracking |

---

## Files to Copy to New Projects

1. `railway.toml` - Railway configuration
2. `src/routes/health.ts` - Health check endpoints
3. `src/services/server-state.service.ts` - Shared readiness state
4. `.github/workflows/railway-monitor.yml` - Health monitoring

---

*Last updated: January 2026*
*Extracted from NovelForge backend deployment patterns*
