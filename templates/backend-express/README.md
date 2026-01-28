# Backend Express Template

Production-ready Express server template with Railway deployment patterns.

## Features

- **Structured Logging** - Pino with request correlation
- **Circuit Breaker** - Protect external API calls
- **JWT Authentication** - Ready-to-use auth middleware
- **Rate Limiting** - Configurable per-endpoint limits
- **Health Checks** - Basic and detailed endpoints
- **Graceful Shutdown** - Clean container restarts
- **Environment Validation** - Fail fast on missing config
- **TypeScript** - Full type safety

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Development
npm run dev

# Production build
npm run build
npm start
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development with hot reload |
| `npm run build` | TypeScript compilation |
| `npm start` | Production server |
| `npm test` | Run tests |
| `npm run typecheck` | Type check without emit |

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Basic health check |
| `/api/health/detailed` | GET | No | Detailed health with stats |
| `/api/health/ready` | GET | No | Readiness probe |

## Environment Variables

See `.env.example` for all options.

Required in production:
- `JWT_SECRET` - JWT signing secret (32+ chars)
- `NODE_ENV=production`

## Deployment

### Railway

1. Copy `railway.toml`, `Dockerfile`, `nixpacks.toml` from `templates/railway/`
2. Push to GitHub
3. Connect to Railway
4. Set environment variables in Railway dashboard

### Docker

```bash
docker build -t my-backend .
docker run -p 3001:3001 -e JWT_SECRET=your-secret my-backend
```

## Documentation

- [Backend Setup Guide](../../docs/BACKEND_SETUP.md)
- [Environment Variables](../../docs/ENVIRONMENT_VARIABLES.md)
- [Railway Deployment Patterns](../../docs/RAILWAY_DEPLOYMENT_PATTERNS.md)
