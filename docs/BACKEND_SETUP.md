# Backend Setup Guide

Step-by-step guide for setting up the Express backend template.

## Quick Start

```bash
# 1. Copy template to your project
cp -r templates/backend-express/* my-project/backend/

# 2. Install dependencies
cd my-project/backend
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your values

# 4. Run development server
npm run dev
```

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   └── rate-limits.config.ts
│   ├── middleware/       # Express middleware
│   │   └── auth.ts       # JWT authentication
│   ├── routes/           # API routes
│   │   └── health.ts     # Health check endpoints
│   ├── services/         # Business logic
│   │   ├── logger.service.ts
│   │   ├── server-state.service.ts
│   │   └── circuit-breaker.service.ts
│   └── server.ts         # Entry point
├── package.json
├── tsconfig.json
├── .env.example
├── .nvmrc
└── .gitignore
```

## Adding Features

### Add a New Route

1. Create route file:

```typescript
// src/routes/users.ts
import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  res.json({ users: [] });
});

export default router;
```

2. Register in server.ts:

```typescript
import usersRouter from './routes/users.js';

// In routes section:
app.use('/api/users', usersRouter);
```

### Add a New Service

1. Create service file:

```typescript
// src/services/email.service.ts
import { createLogger } from './logger.service.js';

const log = createLogger('EmailService');

export async function sendEmail(to: string, subject: string, body: string) {
  log.info({ to, subject }, 'Sending email');
  // Implementation
}
```

2. Import where needed:

```typescript
import { sendEmail } from '../services/email.service.js';
```

### Add Database (SQLite)

1. Install better-sqlite3:

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

2. Create connection file:

```typescript
// src/db/connection.ts
import Database from 'better-sqlite3';
import { createLogger } from '../services/logger.service.js';

const log = createLogger('Database');

const dbPath = process.env.DATABASE_PATH || './data/app.db';
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

log.info({ path: dbPath }, 'Database connected');

export default db;
```

3. Update health check to verify DB:

```typescript
// In routes/health.ts
import db from '../db/connection.js';

router.get('/', (req, res) => {
  try {
    const result = db.prepare('SELECT 1 as test').get();
    if (!result) throw new Error('Database check failed');

    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});
```

### Add Background Queue

1. Create queue worker:

```typescript
// src/queue/worker.ts
import { createLogger } from '../services/logger.service.js';

const log = createLogger('QueueWorker');

let isRunning = false;

export async function start() {
  isRunning = true;
  log.info('Queue worker started');

  while (isRunning) {
    try {
      // Poll for jobs
      await processNextJob();
    } catch (error) {
      log.error({ error }, 'Job processing error');
    }

    await sleep(1000); // Poll interval
  }
}

export async function stop() {
  isRunning = false;
  log.info('Queue worker stopped');
}

async function processNextJob() {
  // Implementation
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

2. Integrate with server.ts (see commented section).

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | Server port |
| `NODE_ENV` | No | development | Environment |
| `FRONTEND_URL` | No | http://localhost:3000 | CORS origin |
| `JWT_SECRET` | Yes (prod) | - | JWT signing secret |
| `DATABASE_PATH` | No | - | SQLite database path |
| `LOG_LEVEL` | No | debug/info | Logging level |
| `SERVICE_NAME` | No | api | Service name in logs |

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Example Test

```typescript
// src/routes/__tests__/health.test.ts
import request from 'supertest';
import { app } from '../../server.js';

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
```

## Deployment

### Railway

1. Copy Railway config:

```bash
cp templates/railway/* backend/
```

2. Push to GitHub (Railway auto-deploys)

3. Set environment variables in Railway dashboard

### Docker

```bash
# Build
docker build -t my-backend .

# Run
docker run -p 3001:3001 \
  -e JWT_SECRET=your-secret \
  -e NODE_ENV=production \
  my-backend
```

## Troubleshooting

### "Cannot find module" errors

Ensure you're using `.js` extensions in imports:

```typescript
// Wrong
import { logger } from './services/logger.service';

// Correct
import { logger } from './services/logger.service.js';
```

### TypeScript compilation errors

Run type check to see all errors:

```bash
npm run typecheck
```

### Port already in use

Kill existing process:

```bash
# Find process
lsof -i :3001

# Kill it
kill -9 <PID>
```

## Best Practices

1. **Environment validation**: Always validate required env vars at startup
2. **Structured logging**: Use `req.log` for request-scoped logs
3. **Error handling**: Use the circuit breaker for external API calls
4. **Health checks**: Keep `/api/health` fast, use `/api/health/detailed` for debugging
5. **Graceful shutdown**: Handle SIGTERM for clean Railway restarts
