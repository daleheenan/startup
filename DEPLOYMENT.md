# NovelForge Deployment Guide

This guide covers deploying NovelForge to Railway with both frontend and backend services.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Railway Project                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐      ┌─────────────────────┐           │
│  │   novelforge-web    │      │  novelforge-backend │           │
│  │   (Next.js 14+)     │ ───▶ │  (Express/Node.js)  │           │
│  │   Port: 3000        │      │  Port: 3001         │           │
│  └─────────────────────┘      └─────────────────────┘           │
│            │                            │                        │
│            │                            │                        │
│            └────────────┬───────────────┘                        │
│                         │                                        │
│                         ▼                                        │
│              ┌─────────────────────┐                             │
│              │   Shared Volume     │                             │
│              │   novelforge_data   │                             │
│              │   (SQLite DB)       │                             │
│              └─────────────────────┘                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Railway account (https://railway.app)
- Railway CLI installed (`npm install -g @railway/cli`)
- GitHub repository connected to Railway

## Quick Setup (New Installation)

### 1. Create Railway Project

```bash
# Login to Railway
railway login

# Initialize new project (from repo root)
cd novelforge
railway init

# Or link to existing project
railway link
```

### 2. Create Backend Service

```bash
# Create a new service for the backend
railway add --service novelforge-backend --repo your-username/novelforge
```

### 3. Configure Service Root Directories (CRITICAL)

**You MUST configure root directories in Railway Dashboard:**

1. Go to Railway Dashboard: https://railway.app
2. Select your project

**For novelforge-web (Frontend):**
1. Click on `novelforge-web` service
2. Go to Settings → Source
3. Set **Root Directory** to: `/` (empty or root)
4. Build Command: `npm run build && cp -r public .next/standalone/ 2>/dev/null || true && cp -r .next/static .next/standalone/.next/`
5. Start Command: `node .next/standalone/server.js`

**For novelforge-backend (Backend):**
1. Click on `novelforge-backend` service
2. Go to Settings → Source
3. Set **Root Directory** to: `backend`
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`

This is required because Railway deploys from the repo root by default. Without setting the root directory, the backend service will try to run the frontend code.

### 3. Create Volume for Database

In Railway Dashboard:
1. Go to your project
2. Click "New" → "Volume"
3. Name it: `novelforge_data`
4. Mount path: `/data`
5. Attach to both services

### 4. Set Environment Variables

#### Backend Service (novelforge-backend)
```bash
railway variables set ANTHROPIC_API_KEY=sk-ant-api03-xxx
railway variables set DATABASE_PATH=/data/novelforge.db
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set FRONTEND_URL=https://your-frontend-url.railway.app
railway variables set JWT_SECRET=$(openssl rand -base64 48)
railway variables set OWNER_PASSWORD_HASH='$2b$10$...'
```

**Generate password hash:**
```bash
cd backend
npm run hash-password "your-secure-password"
```

#### Frontend Service (novelforge-web)
```bash
railway variables set NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
railway variables set NODE_ENV=production
railway variables set PORT=3000
```

### 5. Configure Custom Domain (Optional)

In Railway Dashboard:
1. Go to novelforge-web service → Settings → Domains
2. Add custom domain: `novelforge.daleheenan.com`
3. Configure DNS CNAME to Railway's domain

## Service Configuration Files

### Frontend (root/railway.toml)
```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build && cp -r public .next/standalone/ 2>/dev/null || true && cp -r .next/static .next/standalone/.next/"

[deploy]
startCommand = "node .next/standalone/server.js"
healthcheckPath = "/"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### Backend (backend/railway.toml)
```toml
[build]
builder = "nixpacks"
buildCommand = "npm ci && npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 120
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[mounts]]
source = "novelforge_data"
destination = "/data"
```

**IMPORTANT:** The health check path is `/api/health` (not `/health`). The backend health routes are mounted at `/api/health`.

## Environment Variables Reference

| Variable | Service | Required | Description |
|----------|---------|----------|-------------|
| `ANTHROPIC_API_KEY` | Backend | Yes | Claude API key |
| `DATABASE_PATH` | Backend | Yes | `/data/novelforge.db` |
| `JWT_SECRET` | Backend | Yes | Random 64-char string for JWT signing |
| `OWNER_PASSWORD_HASH` | Backend | Yes | Bcrypt hash of owner password |
| `NODE_ENV` | Both | Yes | `production` |
| `PORT` | Both | Yes | Backend: 3001, Frontend: 3000 |
| `FRONTEND_URL` | Backend | Yes | Frontend's Railway URL |
| `NEXT_PUBLIC_API_URL` | Frontend | Yes | Backend's Railway URL |

## Troubleshooting

### Healthcheck Failures

**Common Cause:** Health check path mismatch. The backend health endpoint is at `/api/health`, not `/health`.

1. **Verify health check configuration:**
   - Backend `railway.toml` should have: `healthcheckPath = "/api/health"`
   - NOT `/health` (this endpoint doesn't exist)

2. **Test health endpoints manually:**
   ```bash
   # Basic health check (used by Railway)
   curl https://your-backend.railway.app/api/health
   # Expected: {"status":"ok","timestamp":"..."}

   # Detailed health check (includes DB status)
   curl https://your-backend.railway.app/api/health/detailed
   # Expected: {"status":"ok","checks":{"database":{"status":"ok"},...}}

   # Claude API connectivity check
   curl https://your-backend.railway.app/api/health/claude
   # Expected: {"status":"healthy","latency":123,"model":"claude-3-haiku-..."}
   ```

3. **Check build logs:**
   ```bash
   railway logs
   ```

4. **Verify environment variables:**
   ```bash
   railway variables
   ```

5. **Check startup time:**
   - Database migrations run on startup
   - Health check timeout is 120 seconds
   - If migrations are slow, increase timeout

### better-sqlite3 Build Errors

The backend uses `better-sqlite3` which requires native compilation. The `nixpacks.toml` includes the required dependencies (python3, gcc, gnumake).

### Database Connection Issues

1. Verify volume is mounted correctly
2. Check `DATABASE_PATH` is set to `/data/novelforge.db`
3. Ensure both services share the same volume

### CORS Errors

1. Verify `FRONTEND_URL` in backend matches actual frontend domain
2. Check browser console for specific CORS error messages

## Manual Deployment

### Deploy Frontend
```bash
cd novelforge
railway link --service novelforge-web
railway up
```

### Deploy Backend
```bash
cd novelforge/backend
railway link --service novelforge-backend
railway up
```

## Monitoring

### View Logs
```bash
# Frontend logs
railway logs --service novelforge-web

# Backend logs
railway logs --service novelforge-backend
```

### Check Service Status
```bash
railway status
```

## Backup Database

The SQLite database is stored on the Railway volume. To backup:

1. Use Railway's volume snapshot feature, or
2. Add a backup endpoint to the backend API

## Rollback

Railway keeps deployment history. To rollback:
1. Go to service → Deployments
2. Click on a previous successful deployment
3. Click "Redeploy"

## Cost Optimization

- Railway hobby plan: $5/month base + usage
- Database on volume is included in storage
- Consider pausing services when not in use

---

**Last Updated:** January 2026
**Version:** 1.0
