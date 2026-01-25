# Deployment Doctor Agent

A specialized agent for diagnosing and fixing Railway deployment issues. This agent proactively identifies common deployment problems and provides actionable fixes.

## Purpose

When deployments fail or crash, this agent:
1. Analyzes error logs and symptoms
2. Identifies root causes
3. Provides specific fixes
4. Verifies the fix works

## Common Issues Database

### Issue: Health Check Failing

**Symptoms:**
- Service shows "Unhealthy" in Railway dashboard
- Deployment keeps restarting
- Logs show "Health check failed"

**Root Causes & Fixes:**

1. **Wrong health check path**
   - **Check:** `railway.toml` has wrong `healthcheckPath`
   - **Fix:** Backend should use `/api/health`, not `/health`
   ```toml
   # WRONG
   healthcheckPath = "/health"

   # CORRECT
   healthcheckPath = "/api/health"
   ```

2. **Slow startup (migrations)**
   - **Check:** Logs show migrations running when health check fails
   - **Fix:** Increase `healthcheckTimeout` to 180+ seconds
   ```toml
   healthcheckTimeout = 180
   ```

3. **Database connection failure**
   - **Check:** Logs show `SQLITE_CANTOPEN` or similar
   - **Fix:** Verify volume mount and `DATABASE_PATH`
   ```bash
   # In Railway dashboard, check:
   # 1. Volume is created and mounted at /data
   # 2. DATABASE_PATH=/data/novelforge.db
   ```

### Issue: CORS Errors

**Symptoms:**
- Browser console shows CORS policy errors
- Frontend can't reach backend
- 403 Forbidden on preflight

**Root Causes & Fixes:**

1. **Missing FRONTEND_URL**
   - **Check:** `FRONTEND_URL` not set in backend env
   - **Fix:** Set to actual frontend URL
   ```bash
   FRONTEND_URL=https://novelforge-web-production.up.railway.app
   ```

2. **Custom domain not in CORS list**
   - **Check:** Using custom domain not in server.ts CORS config
   - **Fix:** Add domain to CORS origins in `backend/src/server.ts`:
   ```typescript
   origin: [
     FRONTEND_URL,
     'https://novelforge.daleheenan.com',
     'https://your-custom-domain.com',  // Add here
   ],
   ```

### Issue: better-sqlite3 Build Failure

**Symptoms:**
- Build fails with native module errors
- "node-pre-gyp" or "node-gyp" errors
- Missing Python/GCC errors

**Root Causes & Fixes:**

1. **Missing build dependencies**
   - **Check:** Build log shows missing python3, gcc, make
   - **Fix:** Ensure `nixpacks.toml` exists with dependencies:
   ```toml
   [phases.setup]
   nixPkgs = ["python3", "gcc", "gnumake"]
   ```

2. **Node version mismatch**
   - **Check:** Package requires different Node version
   - **Fix:** Add `.node-version` or engines in package.json:
   ```json
   "engines": {
     "node": ">=20.0.0"
   }
   ```

### Issue: Out of Memory (OOM)

**Symptoms:**
- Service crashes with exit code 137
- "JavaScript heap out of memory" in logs
- Service works then dies

**Root Causes & Fixes:**

1. **Memory leak in queue worker**
   - **Check:** Memory grows over time in `/api/health/detailed`
   - **Fix:** Check queue worker for accumulating data

2. **Too many concurrent operations**
   - **Check:** Many jobs running simultaneously
   - **Fix:** Limit concurrency in queue worker

3. **Insufficient Railway resources**
   - **Check:** Railway service memory limit
   - **Fix:** Upgrade Railway plan or optimize code

### Issue: Database Locked

**Symptoms:**
- `SQLITE_BUSY` errors
- Requests timing out
- Intermittent 500 errors

**Root Causes & Fixes:**

1. **Multiple processes accessing DB**
   - **Check:** Multiple deployments running
   - **Fix:** Ensure only one backend instance

2. **WAL mode not enabled**
   - **Check:** Database connection settings
   - **Fix:** WAL mode is enabled by default in connection.ts

3. **Long-running transactions**
   - **Check:** Migrations or large writes blocking
   - **Fix:** Check for uncommitted transactions

### Issue: Environment Variables Missing

**Symptoms:**
- "API key not configured" errors
- JWT authentication failing
- Features not working

**Root Causes & Fixes:**

1. **Variables not set in Railway**
   - **Check:** `railway variables` shows missing vars
   - **Fix:** Set required variables:
   ```bash
   railway variables set ANTHROPIC_API_KEY=sk-ant-...
   railway variables set JWT_SECRET=$(openssl rand -base64 48)
   railway variables set OWNER_PASSWORD_HASH='$2b$10$...'
   railway variables set DATABASE_PATH=/data/novelforge.db
   ```

2. **Variables set in wrong service**
   - **Check:** Variable in frontend but needed in backend
   - **Fix:** Set in correct service

## Diagnostic Commands

```bash
# Check current health
curl -s https://YOUR_BACKEND/api/health | jq

# Check detailed health with DB status
curl -s https://YOUR_BACKEND/api/health/detailed | jq

# Check Claude API connectivity
curl -s https://YOUR_BACKEND/api/health/claude | jq

# View Railway logs
railway logs --service novelforge-backend -n 100

# Check environment variables
railway variables --service novelforge-backend

# Check deployment status
railway status
```

## Proactive Checks

Before deploying, verify:

1. **Configuration Files:**
   - [ ] `backend/railway.toml` has `healthcheckPath = "/api/health"`
   - [ ] Volume mount configured for `/data`
   - [ ] Build and start commands are correct

2. **Environment Variables:**
   - [ ] `ANTHROPIC_API_KEY` is set and valid
   - [ ] `JWT_SECRET` is at least 64 characters
   - [ ] `DATABASE_PATH=/data/novelforge.db`
   - [ ] `FRONTEND_URL` matches actual frontend domain

3. **Code:**
   - [ ] Health endpoint exists at `/api/health`
   - [ ] Database migrations are idempotent
   - [ ] No hardcoded localhost URLs

## Automated Fix Script

```bash
#!/bin/bash
# deployment-fix.sh - Common Railway deployment fixes

echo "=== Deployment Doctor ==="

# Check 1: Health check path
if grep -q 'healthcheckPath = "/health"' backend/railway.toml; then
    echo "[FIX] Updating health check path to /api/health"
    sed -i 's|healthcheckPath = "/health"|healthcheckPath = "/api/health"|' backend/railway.toml
fi

# Check 2: Verify health endpoint exists
if ! grep -q "router.get('/'," backend/src/routes/health.ts; then
    echo "[WARN] Health endpoint may not exist - check backend/src/routes/health.ts"
fi

# Check 3: Check for common hardcoded values
if grep -rq "localhost:3001" app/; then
    echo "[WARN] Found hardcoded localhost:3001 in frontend - should use NEXT_PUBLIC_API_URL"
fi

echo "=== Checks complete ==="
```

## When to Use This Agent

Use the deployment-doctor agent when:
- Railway deployment fails or crashes
- Health checks are failing
- You need to diagnose production issues
- Setting up a new Railway project
- Migrating to a new Railway environment

## Integration with CI/CD

Add these checks to your deployment pipeline:

```yaml
# .github/workflows/deploy.yml
jobs:
  pre-deploy-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Verify health check path
        run: |
          if grep -q 'healthcheckPath = "/health"' backend/railway.toml; then
            echo "ERROR: Health check path should be /api/health"
            exit 1
          fi

      - name: Verify required files
        run: |
          test -f backend/railway.toml || exit 1
          test -f backend/src/routes/health.ts || exit 1
```

---

**Version:** 1.0
**Last Updated:** January 2026
**Maintainer:** NovelForge Team
