---
description: Execute complete deployment workflow - commit changes, deploy to production via Railway CLI, push to GitHub for version control, monitor health, and handle failures with automatic remediation
argument-hint: [commit-message-or-sprint-name] [optional: --canary|--full|--rollback]
allowed-tools: Bash(git:*), Bash(npm:*), Bash(railway:*), Bash(gh:*), Bash(curl:*), Read, Write, Edit, Grep, Glob
---

# Deployment Workflow

Execute the complete deployment pipeline from code changes to verified production deployment.

**Deployment Context**: $ARGUMENTS

**IMPORTANT**: Railway is disconnected from GitHub. Deployments are triggered via `railway up` CLI command, NOT by pushing to GitHub. This workflow:
1. Deploys via Railway CLI first (for immediate feedback)
2. Pushes to GitHub after (for version control)

---

## Overview

This workflow automates the entire deployment lifecycle with safety gates, canary deployments, automatic rollback, and remediation for failures.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT WORKFLOW PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│  │  Pre-Deploy  │───►│   Deployer   │───►│   Monitor    │                 │
│  │   Checks     │    │  (Pat)       │    │   (Zara)     │                 │
│  └──────────────┘    └──────────────┘    └──────────────┘                 │
│         │                   │                   │                          │
│         │                   │ [Canary Mode]     │                          │
│         │                   ▼                   │                          │
│         │            ┌──────────────┐          │                          │
│         │            │   Canary     │          │                          │
│         │            │  Validation  │──────────┤                          │
│         │            │   (10%)      │          │                          │
│         │            └──────────────┘          │                          │
│         │                   │                   │                          │
│         │ Fail?             │ Fail?             │ Fail?                    │
│         ▼                   ▼                   ▼                          │
│  ┌──────────────────────────────────────────────────────────────┐         │
│  │         🔄 AUTO-ROLLBACK (if error threshold exceeded)        │         │
│  │                    OR                                         │         │
│  │         🔧 Deployment Doctor (automatic remediation)          │         │
│  │                 Diagnose → Fix → Retry                        │         │
│  └──────────────────────────────────────────────────────────────┘         │
│         │                   │                   │                          │
│         ▼                   ▼                   ▼                          │
│  ┌──────────────────────────────────────────────────────────────┐         │
│  │                    ✅ DEPLOYMENT VERIFIED                     │         │
│  │                  Production is healthy                        │         │
│  └──────────────────────────────────────────────────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Modes

### Full Deployment (Default)
Deploy directly to production with health monitoring.
```
/deploy-workflow "feat: Add user authentication"
```

### Canary Deployment
Deploy to a subset of traffic first, validate, then roll out to 100%.
```
/deploy-workflow "feat: New payment flow" --canary
```

### Rollback
Immediately revert to the last known good deployment.
```
/deploy-workflow --rollback
```

---

## Phase 1: Pre-Deployment Verification

Before committing or deploying, verify the codebase is deployment-ready.

### 1a. Code Quality Checks

Run locally to catch issues before they reach CI/CD:

```bash
# TypeScript compilation
cd backend && npx tsc --noEmit && cd ..

# Run tests
cd backend && npm test && cd ..

# Build verification
cd backend && npm run build && cd ..
cd app && npm run build && cd ..
```

### 1b. Git Status Review

Ensure only intended changes are staged:

```bash
# Check what will be committed
git status
git diff --stat

# Review for sensitive data
git diff | grep -i "api_key\|password\|secret\|token" || echo "No secrets found"
```

### 1c. Configuration Validation

Verify deployment configuration:

```bash
# Check Railway config exists
cat backend/railway.toml

# Verify health endpoint path
grep "healthcheckPath" backend/railway.toml
```

### 1d. Record Last Known Good State

Before deploying, record current state for potential rollback:

```bash
# Save current deployment state
git rev-parse HEAD > .last-known-good-commit
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > .last-deploy-timestamp
```

**If any pre-deploy check fails:**
- Stop the workflow
- Report the specific failure
- Do NOT proceed to deployment

**Wait for all pre-deploy checks to pass before proceeding.**

---

## Phase 2: Commit and Deploy via Railway CLI

Have the **deployer** agent (Pat Okonkwo):

1. Stage the appropriate files
2. Create a descriptive commit message
3. **Deploy to Railway using CLI** (`railway up`)
4. Monitor deployment status
5. Push to GitHub for version control (after successful deploy)

**Commit Message Format:**
```
[type]: Brief description

- Change detail 1
- Change detail 2

Co-Authored-By: [Agent(s)] <noreply@anthropic.com>
```

**Deployment Command:**
```bash
# Deploy to Railway (MUST run from project root, NOT backend directory)
# Railway expects /backend as root directory in monorepo settings
railway up --service novelforge-backend

# Check deployment status
railway status

# After successful deployment, push to GitHub for version control
git push origin master
```

**CRITICAL**: Railway is disconnected from GitHub. Pushing to GitHub does NOT trigger deployment. Always use `railway up` first.

**Wait for Railway deployment to complete and verify no errors.**

---

## Phase 3: Deployment Monitoring

Have the **deployment-monitor** agent (Zara Hassan):

1. Watch the deployment pipeline status
2. Monitor for build/deploy failures
3. Once deployed, perform health verification

### 3a. Railway Deployment Monitoring

```bash
# Check Railway deployment status (primary)
railway status

# Watch deployment logs
railway logs --service novelforge-backend -n 50
```

**Note**: GitHub Actions are no longer used for deployment triggers. Railway CLI (`railway up`) is the deployment method.

### 3b. Multi-Layer Health Verification

Perform comprehensive health checks beyond simple HTTP 200:

```bash
# Layer 1: Basic health endpoint
curl -s -w "\n%{http_code}" https://[backend-url]/api/health

# Layer 2: Response time check (must be < 500ms)
RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null https://[backend-url]/api/health)
if (( $(echo "$RESPONSE_TIME > 0.5" | bc -l) )); then
  echo "WARNING: Slow response time: ${RESPONSE_TIME}s"
fi

# Layer 3: Detailed health with dependency checks
curl -s https://[backend-url]/api/health/detailed | jq '{
  database: .database,
  cache: .cache,
  external_apis: .external_apis
}'

# Layer 4: Critical endpoint verification
curl -s -w "%{http_code}" https://[backend-url]/api/projects | head -c 100

# Layer 5: Error rate check (if metrics endpoint exists)
curl -s https://[backend-url]/metrics | grep -E "http_requests_total|http_errors_total"
```

### 3c. Error Scanning

```bash
# Check for errors in deployment logs (last 5 minutes)
railway logs --service novelforge-backend -n 100 | grep -i "error\|exception\|fatal\|panic"

# Check for elevated error rates
ERROR_COUNT=$(railway logs --service novelforge-backend -n 100 | grep -ci "error\|exception")
if [ "$ERROR_COUNT" -gt 5 ]; then
  echo "WARNING: High error count in logs: $ERROR_COUNT"
fi
```

**If deployment or health check fails:**
- Check if error threshold exceeded (> 5% error rate)
- If exceeded: Trigger automatic rollback
- If not exceeded: Invoke **deployment-doctor** for diagnosis
- After 2 failed remediation attempts: Trigger automatic rollback

**Wait for health verification to pass before completing.**

---

## Phase 3b: Canary Deployment (If --canary flag)

For canary deployments, perform a staged rollout:

### Canary Stage 1: Deploy to 10% Traffic

```bash
# Deploy canary instance
railway deploy --environment canary

# Route 10% of traffic to canary
# (Implementation depends on your load balancer/gateway)
```

### Canary Stage 2: Validate Canary (5-minute observation)

Monitor canary instance for:
- Error rate (must be <= baseline + 1%)
- Response time p95 (must be <= baseline + 20%)
- No critical errors in logs

```bash
# Monitor canary metrics
for i in {1..10}; do
  echo "=== Canary check $i/10 ==="

  # Check error rate
  curl -s https://[canary-url]/api/health

  # Check response time
  curl -s -w "Response: %{time_total}s\n" -o /dev/null https://[canary-url]/api/health

  # Check for errors
  ERROR_COUNT=$(railway logs --environment canary -n 20 | grep -ci error)
  echo "Errors in last 20 logs: $ERROR_COUNT"

  sleep 30
done
```

### Canary Decision Gate

| Metric | Threshold | Action if Exceeded |
|--------|-----------|-------------------|
| Error Rate | > 1% | Auto-rollback canary |
| p95 Latency | > 500ms | Auto-rollback canary |
| Critical Errors | > 0 | Auto-rollback canary |

### Canary Stage 3: Progressive Rollout

If canary passes validation:
```
10% → (wait 2 min) → 25% → (wait 2 min) → 50% → (wait 2 min) → 100%
```

At each stage, verify:
- No increase in error rate
- No degradation in response time
- No new critical errors

**If any stage fails, immediately rollback to previous percentage.**

---

## Phase 4: Deployment Verification

After successful deployment, verify everything is working:

### 4a. Functional Verification

```bash
# Test key endpoints
curl -s https://[backend-url]/api/health
curl -s https://[frontend-url]
```

### 4b. Performance Baseline

```bash
# Establish response time baseline (5 samples)
for i in {1..5}; do
  curl -s -w "%{time_total}\n" -o /dev/null https://[backend-url]/api/health
  sleep 1
done
```

### 4c. Update Deployment Record

```bash
# Update last known good state on successful deploy
git rev-parse HEAD > .last-known-good-commit
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > .last-deploy-timestamp
echo "SUCCESS" > .last-deploy-status
```

### 4d. Final Status

Provide deployment summary:

```markdown
## Deployment Complete

**Status**: SUCCESS / FAILED
**Mode**: Full / Canary
**Commit**: [hash] - [message]
**Timestamp**: [datetime]

### Verification Results
| Check | Status |
|-------|--------|
| Build | PASS |
| Deploy | PASS |
| Health Check | PASS |
| Response Time | [X]ms |
| Error Rate | [X]% |
| Canary Stages | [if applicable] |

### Production URLs
- Backend: [url]
- Frontend: [url]

### Rollback Info
- Last Known Good: [commit hash]
- Rollback Command: `/deploy-workflow --rollback`

### Next Steps
- [If applicable] Run smoke tests
- [If applicable] Monitor for 30 minutes
- [If applicable] Notify team
```

---

## Phase 5: Automatic Rollback

Triggered automatically when:
- Error rate > 5% for 2+ minutes
- Health check fails 3 consecutive times
- Critical errors detected in logs
- Canary validation fails
- Manual trigger via `--rollback`

### Rollback Process

```bash
# Step 1: Get last known good commit
LAST_GOOD=$(cat .last-known-good-commit 2>/dev/null || git rev-parse HEAD~1)

# Step 2: Create rollback commit
git revert --no-edit HEAD

# Step 3: Deploy rollback via Railway CLI (from project root)
railway up --service novelforge-backend

# Step 4: Verify rollback deployment succeeded
railway status
railway logs --service novelforge-backend -n 20

# Step 5: Push rollback commit to GitHub for version control
git push origin HEAD

# Step 6: Verify health
curl -s https://[backend-url]/api/health
```

**Note**: Rollback deploys via Railway CLI, not by pushing to GitHub.

### Rollback Report

```markdown
## 🔄 AUTOMATIC ROLLBACK EXECUTED

**Reason**: [Error threshold exceeded / Health check failure / Manual trigger]
**Reverted From**: [commit hash]
**Reverted To**: [commit hash]
**Timestamp**: [datetime]

### Trigger Details
| Metric | Value | Threshold |
|--------|-------|-----------|
| Error Rate | [X]% | 5% |
| Failed Health Checks | [N] | 3 |
| Response Time p95 | [X]ms | 500ms |

### Post-Rollback Status
| Check | Status |
|-------|--------|
| Health Check | PASS/FAIL |
| Error Rate | [X]% |
| Response Time | [X]ms |

### Required Actions
1. Investigate root cause of failed deployment
2. Fix issues in development environment
3. Re-run full test suite
4. Re-deploy with `/deploy-workflow`

### Incident Log
- [timestamp] Deployment started
- [timestamp] Anomaly detected: [description]
- [timestamp] Rollback initiated
- [timestamp] Rollback completed
```

---

## Phase 6: Failure Remediation (If Not Rolling Back)

If issues are detected but don't exceed rollback threshold:

### 6a. Invoke Deployment Doctor

Have the **deployment-doctor** agent:
1. Analyze the failure
2. Identify root cause
3. Recommend or implement fix

### 6b. Retry Logic

```
Retry attempts: 2
Between retries: Fix identified issue
After 2 failures: Trigger automatic rollback
```

---

## Workflow Output

### Success Output
```
╔══════════════════════════════════════════════════════════════════════════════╗
║ ✅ DEPLOYMENT WORKFLOW COMPLETE                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Commit: [hash]                                                               ║
║ Branch: [branch]                                                             ║
║ Mode: Full / Canary                                                          ║
║ Time: [duration]                                                             ║
╚══════════════════════════════════════════════════════════════════════════════╝

Production is healthy. Deployment verified.

Summary:
- Files changed: [N]
- Tests: All passing
- Build: Successful
- Health check: Passing
- Response time: [X]ms
- Error rate: [X]%

No further action required.
```

### Failure Output
```
╔══════════════════════════════════════════════════════════════════════════════╗
║ ❌ DEPLOYMENT WORKFLOW FAILED                                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Failed at: Phase [N] - [Phase Name]                                          ║
║ Error: [Error summary]                                                       ║
║ Attempts: [N] retries attempted                                              ║
║ Rollback: [Executed / Not Required]                                          ║
╚══════════════════════════════════════════════════════════════════════════════╝

Root Cause: [Analysis]

Recommended Actions:
1. [Action 1]
2. [Action 2]

Manual intervention required.
```

### Rollback Output
```
╔══════════════════════════════════════════════════════════════════════════════╗
║ 🔄 ROLLBACK COMPLETE                                                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Rolled back from: [new commit]                                               ║
║ Rolled back to: [previous commit]                                            ║
║ Reason: [Error threshold / Manual trigger / Canary failure]                  ║
╚══════════════════════════════════════════════════════════════════════════════╝

Production has been restored to last known good state.

Post-Rollback Status:
- Health check: PASS
- Error rate: [X]%
- Response time: [X]ms

Next Steps:
1. Review failed deployment logs
2. Fix issues locally
3. Re-run tests
4. Re-deploy when ready
```

---

## How to Spawn Agents (CRITICAL)

**You MUST use the Task tool to spawn agents. NEVER use Bash commands with CLI flags.**

### Correct Way - Use Task Tool

**Example - Deployer:**
```
Task tool call:
- subagent_type: "deployer"
- prompt: "Commit and deploy the following changes: [description]. Create a commit message following the standard format, deploy via Railway CLI (railway up), monitor the deployment, then push to GitHub for version control."
- description: "Deploy code changes"
```

**Example - Deployment Monitor:**
```
Task tool call:
- subagent_type: "deployment-monitor"
- prompt: "Monitor the deployment of [commit/description]. Perform multi-layer health verification: basic health, response time, detailed health with dependencies, critical endpoints, and error rate. Report any anomalies."
- description: "Monitor deployment health"
```

**Example - Deployment Doctor (on failure):**
```
Task tool call:
- subagent_type: "deployment-doctor"
- prompt: "Diagnose deployment failure: [error details]. Check common issues, recommend fix, and provide commands to resolve. If error rate exceeds 5%, recommend immediate rollback."
- description: "Diagnose deployment failure"
```

### Agent Names for subagent_type
- `deployer` - Commit and push code
- `deployment-monitor` - Health and performance monitoring
- `deployment-doctor` - Failure diagnosis and remediation

---

## Usage Examples

### After Sprint Completion
```
/deploy-workflow Sprint 5: User Authentication
```

### Single Feature Deployment
```
/deploy-workflow feat: Add dark mode toggle
```

### Bug Fix Deployment
```
/deploy-workflow fix: Resolve login timeout issue
```

### Canary Deployment (High-Risk Changes)
```
/deploy-workflow feat: New payment processing --canary
```

### Immediate Rollback
```
/deploy-workflow --rollback
```

### Rollback to Specific Commit
```
/deploy-workflow --rollback abc123
```

---

## Rollback Thresholds (Configurable)

| Metric | Default Threshold | Description |
|--------|-------------------|-------------|
| Error Rate | > 5% | Percentage of requests returning errors |
| Health Check Failures | 3 consecutive | Failed /api/health responses |
| Response Time p95 | > 1000ms | 95th percentile response time |
| Critical Errors | > 0 | Fatal/panic errors in logs |
| Canary Error Delta | > 1% above baseline | Canary error rate vs production |

To customize thresholds, create `.deploy-config.json`:
```json
{
  "rollback": {
    "errorRateThreshold": 0.05,
    "healthCheckFailures": 3,
    "responseTimeP95Ms": 1000,
    "criticalErrorsAllowed": 0
  },
  "canary": {
    "stages": [10, 25, 50, 100],
    "stageWaitMinutes": 2,
    "errorDeltaThreshold": 0.01
  }
}
```

---

## External Monitoring Integration

The workflow can integrate with external monitoring tools. Add webhooks to `.deploy-config.json`:

```json
{
  "monitoring": {
    "slack_webhook": "https://hooks.slack.com/...",
    "pagerduty_key": "...",
    "datadog_api_key": "..."
  }
}
```

### Notification Events
- Deployment started
- Deployment succeeded
- Deployment failed (with error details)
- Rollback initiated
- Rollback completed

---

## Notes

- This workflow is designed to be autonomous but will escalate if manual intervention is needed
- All deployments are verified before being marked complete
- Failures trigger automatic remediation or rollback
- Full audit trail is maintained for each deployment
- Canary deployments provide additional safety for high-risk changes
- Automatic rollback protects production from prolonged outages
- **Railway is disconnected from GitHub** - deployments use `railway up` CLI, GitHub is for version control only

---

**Version**: 2.0
**Last Updated**: January 2026
**Maintainer**: NovelForge Team
